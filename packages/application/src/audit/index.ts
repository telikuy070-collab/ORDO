// Audit Application Module

import { AuditEventImmutableError, type AuditAction, type AuditEvent, type ChangeLog } from '@ordo/domain/audit';
import type { PaginatedResponse } from '@ordo/types';

// Ports
export interface IAuditEventRepository {
  findById(id: string): Promise<AuditEvent | null>;
  findByTenant(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<AuditEvent>>;
  findByEntity(tenantId: string, entity: string, entityId: string): Promise<AuditEvent[]>;
  findByUser(userId: string, page: number, pageSize: number): Promise<PaginatedResponse<AuditEvent>>;
  create(data: Omit<AuditEvent, 'id' | 'createdAt'>): Promise<AuditEvent>;
}

export interface IChangeLogRepository {
  findByVersion(versionId: string): Promise<ChangeLog | null>;
  create(data: Omit<ChangeLog, 'id' | 'createdAt'>): Promise<ChangeLog>;
}

// DTOs
export interface LogAuditEventDTO {
  tenantId: string;
  userId: string | null;
  action: AuditAction;
  entity: string;
  entityId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface GetAuditEventsDTO {
  tenantId: string;
  entity?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  page: number;
  pageSize: number;
}

export interface GetChangeLogDTO {
  versionId: string;
}

// Use-cases
export interface LogAuditEventUseCase {
  execute(dto: LogAuditEventDTO): Promise<AuditEvent>;
}

export interface GetAuditEventsUseCase {
  execute(dto: GetAuditEventsDTO): Promise<PaginatedResponse<AuditEvent>>;
}

export interface GetChangeLogUseCase {
  execute(dto: GetChangeLogDTO): Promise<ChangeLog | null>;
}

export interface GetEntityHistoryUseCase {
  execute(tenantId: string, entity: string, entityId: string): Promise<AuditEvent[]>;
}

export class LogAuditEventUseCaseImpl implements LogAuditEventUseCase {
  constructor(private readonly auditEventRepository: IAuditEventRepository) {}

  async execute(dto: LogAuditEventDTO): Promise<AuditEvent> {
    const event = await this.auditEventRepository.create({
      tenantId: dto.tenantId,
      userId: dto.userId,
      action: dto.action,
      entity: dto.entity,
      entityId: dto.entityId,
      before: dto.before,
      after: dto.after,
    });

    return event;
  }
}

export class GetAuditEventsUseCaseImpl implements GetAuditEventsUseCase {
  constructor(private readonly auditEventRepository: IAuditEventRepository) {}

  async execute(dto: GetAuditEventsDTO): Promise<PaginatedResponse<AuditEvent>> {
    if (dto.entityId && dto.entity) {
      const events = await this.auditEventRepository.findByEntity(dto.tenantId, dto.entity, dto.entityId);
      return {
        data: events,
        total: events.length,
        page: dto.page,
        pageSize: dto.pageSize,
      };
    }

    if (dto.userId) {
      return this.auditEventRepository.findByUser(dto.userId, dto.page, dto.pageSize);
    }

    return this.auditEventRepository.findByTenant(dto.tenantId, dto.page, dto.pageSize);
  }
}

export class GetChangeLogUseCaseImpl implements GetChangeLogUseCase {
  constructor(private readonly changeLogRepository: IChangeLogRepository) {}

  async execute(dto: GetChangeLogDTO): Promise<ChangeLog | null> {
    return this.changeLogRepository.findByVersion(dto.versionId);
  }
}

export class GetEntityHistoryUseCaseImpl implements GetEntityHistoryUseCase {
  constructor(private readonly auditEventRepository: IAuditEventRepository) {}

  async execute(tenantId: string, entity: string, entityId: string): Promise<AuditEvent[]> {
    return this.auditEventRepository.findByEntity(tenantId, entity, entityId);
  }
}

export class AuditEventGuard {
  static assertImmutable(): void {
    throw new AuditEventImmutableError();
  }
}