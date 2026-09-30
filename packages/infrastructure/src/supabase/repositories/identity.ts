import { SupabaseClient } from '@supabase/supabase-js';
import type {
  IAuthProvider,
  IRoleRepository,
  ITenantService,
  IUserRepository,
} from '@ordo/application';
import {
  InvalidCredentialsError,
  UserNotFoundError,
  type Role,
  type Tenant,
  type User,
  UserRole,
} from '@ordo/domain';
import { getSupabaseClient } from '../client';
import { SupabaseBaseRepository } from './base';

interface RoleData {
  tenant_id: string;
  roles: { name: string } | { name: string }[];
}

/** Row shape returned by the RLS-scoped `profiles` table. */
interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  tenant_id: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Raised when a browser-side call requires Supabase admin privileges.
 *
 * `auth.admin` needs the service-role key, which must never be shipped to a
 * browser bundle. Operations that need it are routed to a trusted Edge
 * Function instead.
 */
export class PrivilegedOperationError extends Error {
  constructor(operation: string) {
    super(
      `"${operation}" requires a trusted server context. ` +
        'The browser client only has the anon key and RLS-scoped access.',
    );
    this.name = 'PrivilegedOperationError';
  }
}

/** Invokes the admin-users Edge Function with the caller's own session. */
async function callAdminFunction<T>(
  client: SupabaseClient,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client.functions.invoke<{ error?: string } & T>(
    'admin-users',
    { method: 'POST', body },
  );

  if (error) {
    throw new PrivilegedOperationError(`admin-users: ${error.message}`);
  }
  if (!data) {
    throw new Error('admin-users returned an empty response');
  }
  if ('error' in data && data.error) {
    throw new Error(data.error);
  }

  return data;
}

/** Builds a domain User from the authenticated session, which the client can read. */
function userFromSession(
  user: { id: string; email?: string; created_at: string; updated_at?: string; user_metadata?: Record<string, unknown> },
  role: Role,
  tenantId: string,
): User {
  const email = user.email ?? '';
  return {
    id: user.id,
    tenantId,
    email,
    name: (user.user_metadata?.['full_name'] as string | undefined) ?? email.split('@')[0] ?? 'User',
    role,
    isActive: true,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at ?? user.created_at),
  };
}

/**
 * Loads the caller's active tenant and role.
 *
 * Mirrors `current_tenant_id()`: requires exactly one distinct tenant, so a
 * user with several memberships is rejected instead of being assigned an
 * arbitrary tenant.
 */
async function resolveMembership(
  client: SupabaseClient,
  userId: string,
): Promise<{ tenantId: string; role: Role } | null> {
  const { data, error } = await client
    .from('user_roles')
    .select('tenant_id, roles(name)')
    .eq('user_id', userId);

  if (error) return null;

  const rows = (data ?? []) as unknown as RoleData[];
  const tenantIds = new Set(rows.map((row) => row.tenant_id).filter(Boolean));
  if (tenantIds.size !== 1) return null;

  const role: Role = (getRoleName(rows[0]?.roles) as Role) || UserRole.Teacher;
  return { tenantId: [...tenantIds][0]!, role };
}

function getRoleName(roles: { name: string } | { name: string }[] | undefined): string {
  if (!roles) return '';
  if (Array.isArray(roles)) {
    return roles[0]?.name ?? '';
  }
  return roles.name ?? '';
}

export class SupabaseUserRepository extends SupabaseBaseRepository implements IUserRepository {
  constructor() {
    super({ tableName: 'user_roles', tenantIdColumn: 'tenant_id' });
  }

  /**
   * Reads a user profile plus its role.
   *
   * Profiles are RLS-scoped: a user sees their own row, and a tenant_admin sees
   * the roster of their own tenant. No `auth.admin` call is involved.
   */
  async findById(id: string): Promise<User | null> {
    const { data: profile, error } = await this.client
      .from('profiles')
      .select('id, email, full_name, tenant_id, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !profile) return null;

    const row = profile as unknown as ProfileRow;
    if (!row.tenant_id) return null;

    const { data: roleRow } = await this.client
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', id)
      .eq('tenant_id', row.tenant_id)
      .limit(1);

    const role: Role =
      (getRoleName((roleRow ?? [])[0]?.roles as { name: string }[] | undefined) as Role) ||
      UserRole.Teacher;

    return {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      name: row.full_name || row.email.split('@')[0] || 'User',
      role,
      isActive: true,
      createdAt: new Date(row.created_at ?? Date.now()),
      updatedAt: new Date(row.updated_at ?? row.created_at ?? Date.now()),
    };
  }

  /**
   * Finds a user by email inside a tenant.
   *
   * Reads the RLS-scoped `profiles` table, so a caller can only match users in
   * a tenant they are allowed to see. No platform-wide user listing occurs.
   */
  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await this.client
      .from('profiles')
      .select('id, email, full_name, tenant_id, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .ilike('email', normalizedEmail)
      .limit(1);

    if (error) {
      this.handleError(error, 'findByEmail');
      return null;
    }

    const row = (data ?? [])[0] as unknown as ProfileRow | undefined;
    if (!row) return null;

    return {
      id: row.id,
      tenantId,
      email: row.email,
      name: row.full_name || row.email.split('@')[0] || 'User',
      role: UserRole.Teacher,
      isActive: true,
      createdAt: new Date(row.created_at ?? Date.now()),
      updatedAt: new Date(row.updated_at ?? row.created_at ?? Date.now()),
    };
  }

  /**
   * Returns the tenant roster with real emails and names.
   *
   * Profiles and roles are fetched separately and joined in memory: there is no
   * foreign key between `profiles` and `user_roles` (the latter points at
   * auth.users), so PostgREST cannot resolve an embedded join. Both queries are
   * RLS-scoped, so a non-admin sees nothing and a tenant_admin sees exactly
   * their own tenant.
   */
  async findByTenant(tenantId: string): Promise<User[]> {
    const [profilesResult, rolesResult] = await Promise.all([
      this.client
        .from('profiles')
        .select('id, email, full_name, tenant_id, created_at, updated_at')
        .eq('tenant_id', tenantId),
      this.client
        .from('user_roles')
        .select('user_id, tenant_id, roles(name)')
        .eq('tenant_id', tenantId),
    ]);

    if (profilesResult.error) {
      this.handleError(profilesResult.error, 'findByTenant profiles');
      return [];
    }
    if (rolesResult.error) {
      this.handleError(rolesResult.error, 'findByTenant roles');
      return [];
    }

    const rolesByUser = new Map<string, Role>();
    for (const row of (rolesResult.data ?? []) as unknown as Array<{
      user_id: string;
      roles: { name: string } | { name: string }[] | undefined;
    }>) {
      const role: Role = (getRoleName(row.roles) as Role) || UserRole.Teacher;
      rolesByUser.set(row.user_id, role);
    }

    return ((profilesResult.data ?? []) as unknown as ProfileRow[]).map((row) => ({
      id: row.id,
      tenantId,
      email: row.email,
      name: row.full_name || row.email.split('@')[0] || 'User',
      role: rolesByUser.get(row.id) ?? UserRole.Teacher,
      isActive: true,
      createdAt: new Date(row.created_at ?? Date.now()),
      updatedAt: new Date(row.updated_at ?? row.created_at ?? Date.now()),
    }));
  }

  async create(_user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    throw new Error('User creation should be done via Supabase Auth signUp');
  }

  /**
   * Updates the caller's own record.
   *
   * Role changes go through `user_roles`, which RLS limits to tenant_admins in
   * the active tenant. Editing email or auth credentials is an `auth.admin`
   * operation and is rejected here.
   */
  async update(id: string, data: Partial<User>): Promise<User> {
    if (data.email !== undefined || data.name !== undefined) {
      throw new PrivilegedOperationError('update of auth profile fields');
    }

    if (data.role) {
      const { data: roleData, error: roleError } = await this.client
        .from('roles')
        .select('id')
        .eq('name', data.role)
        .single();

      if (roleError) {
        this.handleError(roleError, 'update role lookup');
      }

      if (roleData) {
        const { error: urError } = await this.client
          .from('user_roles')
          .update({ role_id: roleData.id })
          .eq('user_id', id);

        if (urError) {
          this.handleError(urError, 'update role');
        }
      }
    }

    const updated = await this.findById(id);
    if (!updated) throw new UserNotFoundError(id);
    return updated;
  }

  /**
   * Deletes a staff account through the trusted Edge Function.
   *
   * Auth account removal needs the service-role key, so it cannot run in the
   * browser. The function re-checks tenant scope and role server-side.
   */
  async delete(id: string): Promise<void> {
    await callAdminFunction(this.client, { action: 'delete', userId: id });
  }

  /**
   * Invites a staff member into the caller's tenant.
   *
   * The tenant and the caller's admin role are resolved server-side; the
   * request body never carries a tenantId. No SMTP is configured, so the
   * function returns a one-time password that must be passed on manually.
   */
  async invite(
    email: string,
    role: Role,
    fullName?: string,
  ): Promise<{ id: string; email: string; temporaryPassword: string }> {
    const result = await callAdminFunction<{
      id: string;
      email: string;
      temporaryPassword: string;
    }>(this.client, {
      action: 'invite',
      email,
      role,
      fullName,
    });
    return result;
  }

  async findByUserAndTenant(userId: string, tenantId: string): Promise<Role[]> {
    const { data, error } = await this.client
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (error) return [];
    return (data ?? []).map((item: Record<string, unknown>) => {
      const roles = Array.isArray(item.roles) ? item.roles : [item.roles];
      return roles[0]?.name as Role;
    });
  }

  async assign(userId: string, tenantId: string, role: Role): Promise<Role> {
    const { data: roleData, error: roleError } = await this.client
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (roleError) {
      this.handleError(roleError, 'assign - get role');
    }

    if (!roleData) {
      throw new Error(`Role not found: ${role}`);
    }

    const { error: insertError } = await this.client
      .from('user_roles')
      .upsert({
        user_id: userId,
        tenant_id: tenantId,
        role_id: roleData.id,
      }, { onConflict: 'user_id,tenant_id,role_id' });

    if (insertError) {
      this.handleError(insertError, 'assign - create');
    }

    return role;
  }

  async revoke(userId: string, tenantId: string, role: Role): Promise<void> {
    const { data: roleData } = await this.client
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (!roleData) return;

    const { error } = await this.client
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('role_id', roleData.id);

    this.handleError(error, 'revoke');
  }

  async hasRole(userId: string, tenantId: string, role: Role): Promise<boolean> {
    const { data: roleData } = await this.client
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (!roleData) return false;

    const { data, error } = await this.client
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('role_id', roleData.id)
      .single();

    if (error) return false;
    return !!data;
  }
}

export class SupabaseRoleRepository extends SupabaseBaseRepository implements IRoleRepository {
  constructor() {
    super({ tableName: 'roles', tenantIdColumn: 'id' });
  }

  async findById(id: string): Promise<Role | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('name')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data?.name as Role ?? null;
  }

  async findAll(): Promise<Role[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('name')
      .order('name', { ascending: true });

    this.handleError(error, 'findAll');
    return (data ?? []).map(item => item.name as Role);
  }

  async create(name: Role): Promise<Role> {
    const { error } = await this.client
      .from(this.tableName)
      .insert({ name });

    this.handleError(error, 'create');
    return name;
  }

  // IRoleRepository doesn't have these methods - they're in IUserRepository
  async findByUserAndTenant(_userId: string, _tenantId: string): Promise<Role[]> {
    return [];
  }

  async assign(_userId: string, _tenantId: string, _role: Role): Promise<Role> {
    return _role;
  }

  async revoke(_userId: string, _tenantId: string, _role: Role): Promise<void> {
    // no-op
  }

  async hasRole(_userId: string, _tenantId: string, _role: Role): Promise<boolean> {
    return false;
  }
}

export class SupabaseTenantService extends SupabaseBaseRepository implements ITenantService {
  constructor() {
    super({ tableName: 'tenants', tenantIdColumn: 'id' });
  }

  async create(name: string, slug: string): Promise<Tenant> {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert({ name, code: slug })
      .select()
      .single();

    this.handleError(error, 'create');
    return this.toCamelCase<Tenant>(data);
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('code', slug.trim().toLowerCase())
      .single();

    this.handleError(error, 'findBySlug');
    return data ? this.toCamelCase<Tenant>(data) : null;
  }

  async updateSettings(tenantId: string, settings: Record<string, unknown>): Promise<Tenant> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ settings })
      .eq('id', tenantId)
      .select()
      .single();

    this.handleError(error, 'updateSettings');
    return this.toCamelCase<Tenant>(data);
  }
}

export class SupabaseAuthProvider implements IAuthProvider {
  private client: SupabaseClient;

  constructor() {
    this.client = getSupabaseClient();
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      throw new InvalidCredentialsError();
    }

    const membership = await resolveMembership(this.client, data.user.id);
    if (!membership) {
      // Ambiguous or missing tenant membership must not yield a usable session.
      await this.client.auth.signOut();
      throw new InvalidCredentialsError();
    }

    return {
      user: userFromSession(data.user, membership.role, membership.tenantId),
      token: data.session.access_token,
    };
  }

  /**
   * Self-service registration is disabled.
   *
   * Staff accounts are provisioned by a tenant_admin through an invite flow.
   * Allowing sign-up here would let anyone attach themselves to a tenant, and
   * the accompanying `user_roles` insert would (correctly) be rejected by RLS.
   */
  async register(_data: { email: string; password: string; tenantId: string }): Promise<User> {
    throw new Error(
      'Self-registration is disabled. Staff accounts are created by a tenant administrator.',
    );
  }

  async logout(): Promise<void> {
    await this.client.auth.signOut();
  }

  async validateToken(token: string): Promise<User | null> {
    const { data: { user }, error } = await this.client.auth.getUser(token);

    if (error || !user) return null;

    const membership = await resolveMembership(this.client, user.id);
    if (!membership) return null;

    return userFromSession(user, membership.role, membership.tenantId);
  }

  protected handleError(error: unknown, operation: string): void {
    if (error) {
      const err = error as { message?: string; code?: string };
      throw new Error(`${operation} failed: ${err.message ?? 'Unknown error'} (code: ${err.code ?? 'UNKNOWN'})`);
    }
  }
}