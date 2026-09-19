// Edge Function: resolves the current tenant from the authenticated user.
// Deploy with: supabase functions deploy resolve-tenant
// The function sets the `app.tenant_id` claim used by RLS policies.

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_URL and SUPABASE_ANON_KEY must be set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing Authorization header' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: authHeader,
    },
  });

  if (!userResponse.ok) {
    return new Response(
      JSON.stringify({ error: 'Failed to authenticate user' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const user = await userResponse.json();

  // TODO: owner — implement tenant lookup (user_roles.tenant_id) and set
  // the app.tenant_id JWT claim via a custom access token hook.
  return new Response(
    JSON.stringify({ userId: user.id, tenantId: null }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});