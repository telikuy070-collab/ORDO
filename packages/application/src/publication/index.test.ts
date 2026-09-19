import { describe, expect, it } from 'vitest';

import type { Notification, PublishedSchedule, Subscription } from '@ordo/domain/publication';

import {
  CreateNotificationUseCaseImpl,
  GetNotificationsUseCaseImpl,
  PublishScheduleUseCaseImpl,
  SendNotificationUseCaseImpl,
  SubscribeUseCaseImpl,
  UnsubscribeUseCaseImpl,
  type CreateNotificationDTO,
  type GetNotificationsDTO,
  type INotificationRepository,
  type INotificationService,
  type IPublishedScheduleRepository,
  type ISubscriptionRepository,
} from './index';

class InMemoryPublishedScheduleRepository implements IPublishedScheduleRepository {
  private readonly items = new Map<string, PublishedSchedule>();

  async findById(id: string): Promise<PublishedSchedule | null> {
    return this.items.get(id) ?? null;
  }

  async findByTenant(tenantId: string): Promise<PublishedSchedule[]> {
    return [...this.items.values()].filter((item) => item.tenantId === tenantId);
  }

  async findByScheduleVersion(scheduleVersionId: string): Promise<PublishedSchedule | null> {
    return [...this.items.values()].find((item) => item.scheduleVersionId === scheduleVersionId) ?? null;
  }

  async create(data: Omit<PublishedSchedule, 'id'>): Promise<PublishedSchedule> {
    const published: PublishedSchedule = { ...data, id: crypto.randomUUID() };
    this.items.set(published.id, published);
    return published;
  }
}

class InMemoryNotificationRepository implements INotificationRepository {
  private readonly items = new Map<string, Notification>();

  async findById(id: string): Promise<Notification | null> {
    return this.items.get(id) ?? null;
  }

  async findByRecipient(recipientId: string): Promise<Notification[]> {
    return [...this.items.values()].filter((item) => item.recipientId === recipientId);
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<{ data: Notification[]; total: number; page: number; pageSize: number }> {
    const data = [...this.items.values()].filter((item) => item.tenantId === tenantId);
    const start = (page - 1) * pageSize;
    return {
      data: data.slice(start, start + pageSize),
      total: data.length,
      page,
      pageSize,
    };
  }

  async create(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const notification: Notification = { ...data, id: crypto.randomUUID(), createdAt: new Date() };
    this.items.set(notification.id, notification);
    return notification;
  }

  async updateStatus(id: string, status: Notification['status']): Promise<Notification> {
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`Notification not found: ${id}`);
    }

    const next: Notification = { ...current, status };
    this.items.set(id, next);
    return next;
  }

  async markAsRead(id: string): Promise<void> {
    await this.updateStatus(id, 'read');
  }
}

class InMemorySubscriptionRepository implements ISubscriptionRepository {
  private readonly items = new Map<string, Subscription>();

  async findByUser(userId: string): Promise<Subscription[]> {
    return [...this.items.values()].filter((item) => item.userId === userId);
  }

  async findByUserAndChannel(userId: string, channel: Subscription['channel']): Promise<Subscription | null> {
    return [...this.items.values()].find((item) => item.userId === userId && item.channel === channel) ?? null;
  }

  async create(data: Omit<Subscription, 'id'>): Promise<Subscription> {
    const subscription: Subscription = { ...data, id: crypto.randomUUID() };
    this.items.set(subscription.id, subscription);
    return subscription;
  }

  async update(id: string, data: Partial<Subscription>): Promise<Subscription> {
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`Subscription not found: ${id}`);
    }

    const next: Subscription = { ...current, ...data };
    this.items.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

class StubNotificationService implements INotificationService {
  async send(_notification: Omit<Notification, 'id' | 'createdAt' | 'status'>): Promise<void> {
    return;
  }

  async sendBulk(_notifications: Omit<Notification, 'id' | 'createdAt' | 'status'>[]): Promise<void> {
    return;
  }
}

describe('publication application use cases', () => {
  it('publishes a schedule version once', async () => {
    const publishedRepo = new InMemoryPublishedScheduleRepository();
    const subscriptionRepo = new InMemorySubscriptionRepository();
    const useCase = new PublishScheduleUseCaseImpl(publishedRepo, subscriptionRepo);

    const result = await useCase.execute({
      scheduleVersionId: 'version-1',
      publishedBy: 'user-1',
    });

    expect(result.scheduleVersionId).toBe('version-1');
    expect(result.publishedBy).toBe('user-1');
  });

  it('creates a notification with pending status', async () => {
    const repo = new InMemoryNotificationRepository();
    const useCase = new CreateNotificationUseCaseImpl(repo);

    const dto: CreateNotificationDTO = {
      tenantId: 'tenant-1',
      recipientId: 'user-2',
      type: 'schedule_published',
      payload: { versionId: 'version-1' },
    };

    const result = await useCase.execute(dto);

    expect(result.recipientId).toBe('user-2');
    expect(result.status).toBe('pending');
  });

  it('sends a notification and marks it as sent', async () => {
    const notificationRepo = new InMemoryNotificationRepository();
    const notificationService = new StubNotificationService();
    const notification = await notificationRepo.create({
      tenantId: 'tenant-1',
      recipientId: 'user-2',
      type: 'schedule_changed',
      payload: { scheduleId: 'schedule-1' },
      status: 'pending',
    });

    const useCase = new SendNotificationUseCaseImpl(notificationRepo, notificationService);
    await expect(useCase.execute(notification.id)).resolves.toBeUndefined();

    const updated = await notificationRepo.findById(notification.id);
    expect(updated?.status).toBe('sent');
  });

  it('creates and removes subscriptions', async () => {
    const repo = new InMemorySubscriptionRepository();
    const subscribeUseCase = new SubscribeUseCaseImpl(repo);
    const unsubscribeUseCase = new UnsubscribeUseCaseImpl(repo);

    const subscription = await subscribeUseCase.execute({
      userId: 'user-7',
      channel: 'email',
    });

    await unsubscribeUseCase.execute({
      userId: 'user-7',
      channel: 'email',
    });

    expect(subscription.userId).toBe('user-7');
    expect(await repo.findByUserAndChannel('user-7', 'email')).toBeNull();
  });

  it('lists notifications by tenant', async () => {
    const repo = new InMemoryNotificationRepository();
    await repo.create({
      tenantId: 'tenant-1',
      recipientId: 'user-1',
      type: 'teacher_assigned',
      payload: { teacherId: 'teacher-1' },
      status: 'pending',
    });

    const useCase = new GetNotificationsUseCaseImpl(repo);
    const dto: GetNotificationsDTO = { tenantId: 'tenant-1', page: 1, pageSize: 10 };

    const result = await useCase.execute(dto);
    expect(result.total).toBe(1);
    expect(result.data[0]?.type).toBe('teacher_assigned');
  });
});
