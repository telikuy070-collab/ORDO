import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient } from '../client';

export interface SupabaseRepositoryConfig {
  tableName: string;
  tenantIdColumn?: string;
}

export class SupabaseBaseRepository {
  protected client: SupabaseClient;
  protected tableName: string;
  protected tenantIdColumn: string;

  constructor(config: SupabaseRepositoryConfig) {
    this.client = getSupabaseClient();
    this.tableName = config.tableName;
    this.tenantIdColumn = config.tenantIdColumn ?? 'tenant_id';
  }

  protected handleError(error: PostgrestError | null, operation: string): void;
  protected handleError(error: unknown, operation: string): void;
  protected handleError(error: unknown, operation: string): void {
    if (error) {
      const err = error as { message?: string; code?: string };
      throw new Error(`${operation} failed: ${err.message ?? 'Unknown error'} (code: ${err.code ?? 'UNKNOWN'})`);
    }
  }

  /**
   * Resolves the active tenant for the current session.
   *
   * Mirrors the `current_tenant_id()` database helper: a tenant is returned
   * only when the user has exactly one distinct membership. Zero or multiple
   * memberships resolve to `null` so callers fail closed instead of silently
   * picking an arbitrary tenant.
   */
  protected async getCurrentTenantId(): Promise<string | null> {
    const { data: { user }, error: userError } = await this.client.auth.getUser();
    if (userError || !user) return null;

    const { data, error } = await this.client
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', user.id);

    if (error) {
      this.handleError(error, 'getCurrentTenantId');
      return null;
    }

    const tenantIds = new Set(
      (data ?? [])
        .map((row) => (row as { tenant_id?: string | null }).tenant_id)
        .filter((id): id is string => Boolean(id)),
    );

    return tenantIds.size === 1 ? [...tenantIds][0]! : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async applyTenantFilter(query: any, tenantId?: string): Promise<any> {
    const targetTenantId = tenantId ?? (await this.getCurrentTenantId());
    if (targetTenantId) {
      return query.eq(this.tenantIdColumn, targetTenantId);
    }
    return query;
  }

  protected toCamelCase<T>(obj: Record<string, unknown>): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = value;
    }
    return result as T;
  }

  protected toCamelCaseArray<T>(arr: Record<string, unknown>[]): T[] {
    return arr.map(item => this.toCamelCase<T>(item));
  }

  protected toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = value;
    }
    return result;
  }
}

// Export standalone functions for backward compatibility - use unknown as intermediate
export function toCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result as unknown as T;
}

export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}