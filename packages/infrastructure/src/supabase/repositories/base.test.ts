import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSupabaseClient = vi.fn();

vi.mock('../client', () => ({
  getSupabaseClient: () => getSupabaseClient(),
}));

type MembershipRow = { tenant_id: string | null };

function makeClient(options: {
  user: { id: string } | null;
  rows: MembershipRow[];
  userError?: unknown;
  queryError?: unknown;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user },
        error: options.userError ?? null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: options.rows,
          error: options.queryError ?? null,
        }),
      }),
    }),
  };
}

describe('SupabaseBaseRepository.getCurrentTenantId', () => {
  beforeEach(() => {
    vi.resetModules();
    getSupabaseClient.mockReset();
  });

  it('returns null when there is no authenticated user', async () => {
    getSupabaseClient.mockReturnValue(makeClient({ user: null, rows: [] }));
    const { SupabaseBaseRepository } = await import('./base');

    const repo = new SupabaseBaseRepository({ tableName: 'user_roles' });
    const result = await (
      repo as unknown as { getCurrentTenantId(): Promise<string | null> }
    ).getCurrentTenantId();

    expect(result).toBeNull();
  });

  it('returns null when the user has no membership', async () => {
    getSupabaseClient.mockReturnValue(
      makeClient({ user: { id: 'user-1' }, rows: [] }),
    );
    const { SupabaseBaseRepository } = await import('./base');

    const repo = new SupabaseBaseRepository({ tableName: 'user_roles' });
    const result = await (
      repo as unknown as { getCurrentTenantId(): Promise<string | null> }
    ).getCurrentTenantId();

    expect(result).toBeNull();
  });

  it('returns the tenant when exactly one distinct tenant exists', async () => {
    getSupabaseClient.mockReturnValue(
      makeClient({ user: { id: 'user-1' }, rows: [{ tenant_id: 'tenant-a' }] }),
    );
    const { SupabaseBaseRepository } = await import('./base');

    const repo = new SupabaseBaseRepository({ tableName: 'user_roles' });
    const result = await (
      repo as unknown as { getCurrentTenantId(): Promise<string | null> }
    ).getCurrentTenantId();

    expect(result).toBe('tenant-a');
  });

  it('returns the tenant when several roles point at the same tenant', async () => {
    getSupabaseClient.mockReturnValue(
      makeClient({
        user: { id: 'user-1' },
        rows: [{ tenant_id: 'tenant-a' }, { tenant_id: 'tenant-a' }],
      }),
    );
    const { SupabaseBaseRepository } = await import('./base');

    const repo = new SupabaseBaseRepository({ tableName: 'user_roles' });
    const result = await (
      repo as unknown as { getCurrentTenantId(): Promise<string | null> }
    ).getCurrentTenantId();

    expect(result).toBe('tenant-a');
  });

  it('returns null for an ambiguous multi-tenant membership', async () => {
    getSupabaseClient.mockReturnValue(
      makeClient({
        user: { id: 'user-1' },
        rows: [{ tenant_id: 'tenant-a' }, { tenant_id: 'tenant-b' }],
      }),
    );
    const { SupabaseBaseRepository } = await import('./base');

    const repo = new SupabaseBaseRepository({ tableName: 'user_roles' });
    const result = await (
      repo as unknown as { getCurrentTenantId(): Promise<string | null> }
    ).getCurrentTenantId();

    expect(result).toBeNull();
  });

  it('ignores null tenant rows when counting distinct tenants', async () => {
    getSupabaseClient.mockReturnValue(
      makeClient({
        user: { id: 'user-1' },
        rows: [{ tenant_id: null }, { tenant_id: 'tenant-a' }],
      }),
    );
    const { SupabaseBaseRepository } = await import('./base');

    const repo = new SupabaseBaseRepository({ tableName: 'user_roles' });
    const result = await (
      repo as unknown as { getCurrentTenantId(): Promise<string | null> }
    ).getCurrentTenantId();

    expect(result).toBe('tenant-a');
  });
});
