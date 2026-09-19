import { describe, expect, it } from 'vitest';

import type { AuditAction, AuditEvent } from '@ordo/domain/audit';

import {
  GetAuditEventsUseCaseImpl,
  LogAuditEventUseCaseImpl,
  type IAuditEventRepository,
} from './index';

class InMemoryAuditEventRepository implements IAuditEventRepository {
  private readonly items: AuditEvent[] = [];

  async findById(id: string): Promise<AuditEvent | null> {
    return this.items.find((event) => event.id === id) ?? null;
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<{ data: AuditEvent[]; total: number; page: number; pageSize: number }> {
    const data = this.items.filter((event) => event.tenantId === tenantId);
    const start = (page - 1) * pageSize;
    return {
      data: data.slice(start, start + pageSize),
      total: data.length,
      page,
      pageSize,
    };
  }

  async findByEntity(tenantId: string, entity: string, entityId: string): Promise<AuditEvent[]> {
    return this.items.filter(
      (event) => event.tenantId === tenantId && event.entity === entity && event.entityId === entityId,
    );
  }

  async findByUser(userId: string, page: number, pageSize: number): Promise<{ data: AuditEvent[]; total: number; page: number; pageSize: number }> {
    const data = this.items.filter((event) => event.userId === userId);
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
    this.items.push(event);
    return event;
  }
}

describe('audit application use cases', () => {
  it('logs an audit event for a tenant action', async () => {
    const repo = new InMemoryAuditEventRepository();
    const useCase = new LogAuditEventUseCaseImpl(repo);

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      userId: 'user-7',
      action: 'update',
      entity: 'lesson',
      entityId: 'lesson-1',
      before: { status: 'draft' },
      after: { status: 'published' },
    });

    expect(result.entity).toBe('lesson');
    expect(result.action).toBe('update');
  });

  it('loads entity history by tenant and entity id', async () => {
    const repo = new InMemoryAuditEventRepository();
    await repo.create({
      tenantId: 'tenant-1',
      userId: 'user-7',
      action: 'create' as AuditAction,
      entity: 'lesson',
      entityId: 'lesson-1',
      before: {},
      after: { title: 'Biology' },
    });

    const useCase = new GetAuditEventsUseCaseImpl(repo);
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      entity: 'lesson',
      entityId: 'lesson-1',
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
    expect(result.data[0]?.entityId).toBe('lesson-1');
  });
});
