import type { IAuditEventRepository, IChangeLogRepository } from '@ordo/application';
import { AuditEventImmutableError, type AuditEvent, type ChangeLog } from '@ordo/domain/audit';
import type { PaginatedResponse } from '@ordo/types';

export class SupabaseAuditEventRepository implements IAuditEventRepository {
  private readonly events = new Map<string, AuditEvent>();

  async findById(id: string): Promise<AuditEvent | null> {
    return this.events.get(id) ?? null;
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<AuditEvent>> {
    const data = [...this.events.values()].filter((event) => event.tenantId === tenantId);
    const start = (page - 1) * pageSize;

    return {
      data: data.slice(start, start + pageSize),
      total: data.length,
      page,
      pageSize,
    };
  }

  async findByEntity(tenantId: string, entity: string, entityId: string): Promise<AuditEvent[]> {
    return [...this.events.values()].filter(
      (event) => event.tenantId === tenantId && event.entity === entity && event.entityId === entityId,
    );
  }

  async findByUser(userId: string, page: number, pageSize: number): Promise<PaginatedResponse<AuditEvent>> {
    const data = [...this.events.values()].filter((event) => event.userId === userId);
    const start = (page - 1) * pageSize;

    return {
      data: data.slice(start, start + pageSize),
      total: data.length,
      page,
      pageSize,
    };
  }

  async create(data: Omit<AuditEvent, 'id' | 'createdAt'>): Promise<AuditEvent> {
    const event: AuditEvent = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.events.set(event.id, event);
    return event;
  }
}

export class SupabaseChangeLogRepository implements IChangeLogRepository {
  private readonly changeLogs = new Map<string, ChangeLog>();

  async findByVersion(versionId: string): Promise<ChangeLog | null> {
    return this.changeLogs.get(versionId) ?? null;
  }

  async create(data: Omit<ChangeLog, 'id' | 'createdAt'>): Promise<ChangeLog> {
    const log: ChangeLog = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.changeLogs.set(log.versionId, log);
    return log;
  }
}

export class AuditEventGuard {
  static assertMutable(): void {
    throw new AuditEventImmutableError();
  }
}
