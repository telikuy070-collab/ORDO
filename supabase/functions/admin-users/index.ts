// Edge Function: tenant-scoped user administration.
//
// Creating and deleting auth users requires the service-role key, which must
// never reach a browser bundle. This function performs those operations on
// behalf of a signed-in tenant_admin.
//
// Security rules enforced here:
//   - the caller is resolved from their JWT, never from the request body;
//   - the tenant is always derived from the caller's single membership;
//   - the `owner` role can never be granted through this function;
//   - a target user must already belong to the caller's tenant.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ROLES = ['tenant_admin', 'schedule_owner', 'department_head', 'teacher'] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

interface ActionRequest {
  action: 'invite' | 'delete';
  email?: string;
  fullName?: string;
  role?: string;
  password?: string;
  userId?: string;
}

/** Generates a readable one-time password. Not a secret store: it is shown to
 * the administrator once so it can be handed over out of band. */
function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `Ordo-${body}-1a`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Function environment is not configured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  // Callers authenticate with their own JWT against the anon key, so RLS
  // decides what they can see. The service-role client is created only after
  // authorization succeeds.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) {
    return json({ error: 'Authentication failed' }, 401);
  }
  const callerId = callerData.user.id;

  // Single-membership rule mirrors current_tenant_id(): exactly one tenant.
  const { data: memberships, error: membershipError } = await callerClient
    .from('user_roles')
    .select('tenant_id, roles(name)')
    .eq('user_id', callerId);

  if (membershipError) {
    return json({ error: 'Failed to resolve caller tenant' }, 500);
  }

  const tenantIds = new Set(
    (memberships ?? [])
      .map((row) => row.tenant_id as string | null)
      .filter((id): id is string => Boolean(id)),
  );

  if (tenantIds.size !== 1) {
    return json({ error: 'Caller must belong to exactly one tenant' }, 403);
  }
  const tenantId = [...tenantIds][0]!;

  const callerRole = (memberships ?? [])[0]?.roles as { name?: string } | undefined;
  if (callerRole?.name !== 'tenant_admin') {
    return json({ error: 'Only a tenant_admin can manage users' }, 403);
  }

  let payload: ActionRequest;
  try {
    payload = (await req.json()) as ActionRequest;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (payload.action === 'invite') {
    const email = (payload.email ?? '').trim().toLowerCase();
    const role = (payload.role ?? 'teacher') as AllowedRole;

    if (!email || !email.includes('@')) {
      return json({ error: 'A valid email is required' }, 400);
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return json({ error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` }, 400);
    }

    // No SMTP is configured for this project, so the account is created with a
    // generated one-time password that is returned to the administrator once.
    // Without it the invited user could never sign in.
    const tempPassword =
      typeof payload.password === 'string' && payload.password.length >= 8
        ? payload.password
        : generateTemporaryPassword();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: payload.fullName ?? null },
    });

    if (createError || !created.user) {
      return json({ error: createError?.message ?? 'Failed to create user' }, 400);
    }

    // The profile row is created by the on_auth_user_created trigger and is
    // bound to a tenant by the on_user_role_assigned trigger.
    const { data: roleRow, error: roleError } = await admin
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (roleError || !roleRow) {
      // Do not leave an unassigned user behind.
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: 'Role not found' }, 500);
    }

    const { error: assignError } = await admin.from('user_roles').insert({
      user_id: created.user.id,
      tenant_id: tenantId,
      role_id: roleRow.id,
    });

    if (assignError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: assignError.message }, 400);
    }

    return json({
      id: created.user.id,
      email,
      tenantId,
      role,
      temporaryPassword: tempPassword,
    });
  }

  if (payload.action === 'delete') {
    const userId = payload.userId;
    if (!userId) {
      return json({ error: 'userId is required' }, 400);
    }
    if (userId === callerId) {
      return json({ error: 'You cannot delete your own account' }, 400);
    }

    // Confirm the target actually belongs to the caller's tenant before
    // touching auth, otherwise this would be a cross-tenant delete.
    const { data: target, error: targetError } = await admin
      .from('user_roles')
      .select('user_id, tenant_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .limit(1);

    if (targetError) {
      return json({ error: 'Failed to verify target user' }, 500);
    }
    if (!target || target.length === 0) {
      return json({ error: 'User is not a member of your tenant' }, 404);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return json({ error: deleteError.message }, 400);
    }

    return json({ deleted: userId });
  }

  return json({ error: 'Unknown action' }, 400);
});
