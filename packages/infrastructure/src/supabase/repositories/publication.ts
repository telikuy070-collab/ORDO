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
import { SupabaseBaseRepository, toCamelCase, toSnakeCase } from './base';

export class SupabasePublishedScheduleRepository extends SupabaseBaseRepository implements IPublishedScheduleRepository {
  constructor() {
    super({ tableName: 'published_schedules', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<PublishedSchedule | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase(data) as PublishedSchedule : null;
  }

  async findByTenant(tenantId: string): Promise<PublishedSchedule[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('published_at', { ascending: false });

    this.handleError(error, 'findByTenant');
    return (data ?? []).map(toCamelCase) as PublishedSchedule[];
  }

  async findByScheduleVersion(scheduleVersionId: string): Promise<PublishedSchedule | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('schedule_version_id', scheduleVersionId)
      .single();

    this.handleError(error, 'findByScheduleVersion');
    return data ? toCamelCase(data) as PublishedSchedule : null;
  }

  async create(data: Omit<PublishedSchedule, 'id'>): Promise<PublishedSchedule> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(toSnakeCase(data))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as PublishedSchedule;
  }
}

export class SupabaseNotificationRepository extends SupabaseBaseRepository implements INotificationRepository {
  constructor() {
    super({ tableName: 'notifications', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<Notification | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase(data) as Notification : null;
  }

  async findByRecipient(recipientId: string): Promise<Notification[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false });

    this.handleError(error, 'findByRecipient');
    return (data ?? []).map(toCamelCase) as Notification[];
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<Notification>> {
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
      data: (data ?? []).map(toCamelCase) as Notification[],
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async create(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(toSnakeCase({
        ...data,
        status: data.status ?? 'pending',
      }))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as Notification;
  }

  async updateStatus(id: string, status: Notification['status']): Promise<Notification> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'updateStatus');
    return toCamelCase(result) as Notification;
  }

  async markAsRead(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('id', id);

    this.handleError(error, 'markAsRead');
  }
}

export class SupabaseSubscriptionRepository extends SupabaseBaseRepository implements ISubscriptionRepository {
  constructor() {
    super({ tableName: 'subscriptions', tenantIdColumn: 'user_id' });
  }

  async findByUser(userId: string): Promise<Subscription[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId);

    this.handleError(error, 'findByUser');
    return (data ?? []).map(toCamelCase) as Subscription[];
  }

  async findByUserAndChannel(userId: string, channel: Channel): Promise<Subscription | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('channel', channel)
      .single();

    this.handleError(error, 'findByUserAndChannel');
    return data ? toCamelCase(data) as Subscription : null;
  }

  async create(data: Omit<Subscription, 'id'>): Promise<Subscription> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(toSnakeCase({
        ...data,
        is_active: data.isActive ?? true,
      }))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as Subscription;
  }

  async update(id: string, data: Partial<Subscription>): Promise<Subscription> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase(result) as Subscription;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    this.handleError(error, 'delete');
  }
}

export class SupabaseNotificationService implements INotificationService {
  async send(notification: Omit<Notification, 'id' | 'createdAt' | 'status'>): Promise<void> {
    // TODO: Integrate with Supabase Realtime, Push service, Email, Telegram
    console.warn('[NotificationService] Sending:', notification.type, 'to', notification.recipientId);
  }

  async sendBulk(notifications: Omit<Notification, 'id' | 'createdAt' | 'status'>[]): Promise<void> {
    for (const notification of notifications) {
      await this.send(notification);
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