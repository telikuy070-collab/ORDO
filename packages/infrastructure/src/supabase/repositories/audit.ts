import type { IAuditEventRepository, IChangeLogRepository } from '@ordo/application';
import { AuditEventImmutableError, type AuditEvent, type ChangeLog } from '@ordo/domain/audit';
import type { PaginatedResponse } from '@ordo/types';
import { SupabaseBaseRepository, toCamelCase, toSnakeCase } from './base';

export class SupabaseAuditEventRepository extends SupabaseBaseRepository implements IAuditEventRepository {
  constructor() {
    super({ tableName: 'audit_events', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<AuditEvent | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase(data) as AuditEvent : null;
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<AuditEvent>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(from, to);

    this.handleError(error, 'findByTenant');
    return {
      data: (data ?? []).map(toCamelCase) as AuditEvent[],
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async findByEntity(tenantId: string, entity: string, entityId: string): Promise<AuditEvent[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity', entity)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    this.handleError(error, 'findByEntity');
    return (data ?? []).map(toCamelCase) as AuditEvent[];
  }

  async findByUser(userId: string, page: number, pageSize: number): Promise<PaginatedResponse<AuditEvent>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    this.handleError(error, 'findByUser');
    return {
      data: (data ?? []).map(toCamelCase) as AuditEvent[],
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async create(data: Omit<AuditEvent, 'id' | 'createdAt'>): Promise<AuditEvent> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(await this.withTenantId(toSnakeCase(data)))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as AuditEvent;
  }
}

export class SupabaseChangeLogRepository extends SupabaseBaseRepository implements IChangeLogRepository {
  constructor() {
    super({ tableName: 'change_logs', tenantIdColumn: 'tenant_id' });
  }

  async findByVersion(versionId: string): Promise<ChangeLog | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('version_id', versionId)
      .single();

    this.handleError(error, 'findByVersion');
    return data ? toCamelCase(data) as ChangeLog : null;
  }

  async create(data: Omit<ChangeLog, 'id' | 'createdAt'>): Promise<ChangeLog> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(await this.withTenantId(toSnakeCase(data)))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as ChangeLog;
  }
}

export class AuditEventGuard {
  static assertMutable(): void {
    throw new AuditEventImmutableError();
  }
}