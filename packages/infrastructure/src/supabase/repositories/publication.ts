import type {
  INotificationRepository,
  INotificationService,
  IPublishedScheduleRepository,
  ISubscriptionRepository,
} from '@ordo/application';
import {
  OnlyScheduleOwnerCanPublishError,
  ScheduleNotPublishedError,
  type Channel,
  type Notification,
  type PublishedSchedule,
  type Subscription,
} from '@ordo/domain/publication';
import type { PaginatedResponse } from '@ordo/types';

export class SupabasePublishedScheduleRepository implements IPublishedScheduleRepository {
  private readonly publishedSchedules = new Map<string, PublishedSchedule>();

  async findById(id: string): Promise<PublishedSchedule | null> {
    return this.publishedSchedules.get(id) ?? null;
  }

  async findByTenant(tenantId: string): Promise<PublishedSchedule[]> {
    return [...this.publishedSchedules.values()].filter((schedule) => schedule.tenantId === tenantId);
  }

  async findByScheduleVersion(scheduleVersionId: string): Promise<PublishedSchedule | null> {
    return (
      [...this.publishedSchedules.values()].find((schedule) => schedule.scheduleVersionId === scheduleVersionId) ?? null
    );
  }

  async create(data: Omit<PublishedSchedule, 'id'>): Promise<PublishedSchedule> {
    const published: PublishedSchedule = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.publishedSchedules.set(published.id, published);
    return published;
  }
}

export class SupabaseNotificationRepository implements INotificationRepository {
  private readonly notifications = new Map<string, Notification>();

  async findById(id: string): Promise<Notification | null> {
    return this.notifications.get(id) ?? null;
  }

  async findByRecipient(recipientId: string): Promise<Notification[]> {
    return [...this.notifications.values()].filter((notification) => notification.recipientId === recipientId);
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<Notification>> {
    const data = [...this.notifications.values()].filter((notification) => notification.tenantId === tenantId);
    const start = (page - 1) * pageSize;
    const paged = data.slice(start, start + pageSize);

    return {
      data: paged,
      total: data.length,
      page,
      pageSize,
    };
  }

  async create(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const notification: Notification = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.notifications.set(notification.id, notification);
    return notification;
  }

  async updateStatus(id: string, status: Notification['status']): Promise<Notification> {
    const current = this.notifications.get(id);
    if (!current) {
      throw new Error(`Notification not found: ${id}`);
    }

    const next: Notification = { ...current, status };
    this.notifications.set(id, next);
    return next;
  }

  async markAsRead(id: string): Promise<void> {
    await this.updateStatus(id, 'read');
  }
}

export class SupabaseSubscriptionRepository implements ISubscriptionRepository {
  private readonly subscriptions = new Map<string, Subscription>();

  async findByUser(userId: string): Promise<Subscription[]> {
    return [...this.subscriptions.values()].filter((subscription) => subscription.userId === userId);
  }

  async findByUserAndChannel(userId: string, channel: Channel): Promise<Subscription | null> {
    return (
      [...this.subscriptions.values()].find(
        (subscription) => subscription.userId === userId && subscription.channel === channel,
      ) ?? null
    );
  }

  async create(data: Omit<Subscription, 'id'>): Promise<Subscription> {
    const subscription: Subscription = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  async update(id: string, data: Partial<Subscription>): Promise<Subscription> {
    const current = this.subscriptions.get(id);
    if (!current) {
      throw new Error(`Subscription not found: ${id}`);
    }

    const next: Subscription = { ...current, ...data };
    this.subscriptions.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.subscriptions.delete(id);
  }
}

export class SupabaseNotificationService implements INotificationService {
  async send(notification: Omit<Notification, 'id' | 'createdAt' | 'status'>): Promise<void> {
    void notification;
  }

  async sendBulk(notifications: Omit<Notification, 'id' | 'createdAt' | 'status'>[]): Promise<void> {
    for (const notification of notifications) {
      void notification;
    }
  }
}

export class PublicationGuard {
  static assertCanPublish(role: string): void {
    if (!['owner', 'tenant_admin', 'schedule_owner'].includes(role)) {
      throw new OnlyScheduleOwnerCanPublishError();
    }
  }

  static assertPublished(schedule: { isPublished: boolean } | null | undefined, scheduleId: string): void {
    if (!schedule || !schedule.isPublished) {
      throw new ScheduleNotPublishedError(scheduleId);
    }
  }
}
