// Audit Domain Module

export type AuditAction = 'create' | 'update' | 'delete' | 'publish';

export interface AuditEvent {
  id: string;
  tenantId: string;
  userId: string | null;
  action: AuditAction;
  entity: string;
  entityId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  createdAt: Date;
}

export interface ChangeLog {
  id: string;
  tenantId: string;
  versionId: string;
  changes: Record<string, unknown>[];
  createdAt: Date;
}

export class AuditEventImmutableError extends Error {
  constructor() {
    super('Audit events are immutable and cannot be modified');
    this.name = 'AuditEventImmutableError';
  }
}

export interface AuditLoggedEvent {
  type: 'AuditLogged';
  payload: { eventId: string; tenantId: string; entity: string; action: AuditAction };
  timestamp: Date;
}