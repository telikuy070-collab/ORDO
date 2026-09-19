// Publication Application Module

import {
  OnlyScheduleOwnerCanPublishError,
  ScheduleNotPublishedError,
  type Channel,
  type Notification,
  type NotificationType,
  type PublishedSchedule,
  type Subscription,
} from '@ordo/domain/publication';
import type { PaginatedResponse } from '@ordo/types';

// Ports
export interface IPublishedScheduleRepository {
  findById(id: string): Promise<PublishedSchedule | null>;
  findByTenant(tenantId: string): Promise<PublishedSchedule[]>;
  findByScheduleVersion(scheduleVersionId: string): Promise<PublishedSchedule | null>;
  create(data: Omit<PublishedSchedule, 'id'>): Promise<PublishedSchedule>;
}

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
  findByTenant(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<Notification>>;
  create(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  updateStatus(id: string, status: Notification['status']): Promise<Notification>;
  markAsRead(id: string): Promise<void>;
}

export interface ISubscriptionRepository {
  findByUser(userId: string): Promise<Subscription[]>;
  findByUserAndChannel(userId: string, channel: Channel): Promise<Subscription | null>;
  create(data: Omit<Subscription, 'id'>): Promise<Subscription>;
  update(id: string, data: Partial<Subscription>): Promise<Subscription>;
  delete(id: string): Promise<void>;
}

export interface INotificationService {
  send(notification: Omit<Notification, 'id' | 'createdAt' | 'status'>): Promise<void>;
  sendBulk(notifications: Omit<Notification, 'id' | 'createdAt' | 'status'>[]): Promise<void>;
}

// DTOs
export interface PublishScheduleDTO {
  scheduleVersionId: string;
  publishedBy: string;
}

export interface CreateNotificationDTO {
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
}

export interface SubscribeDTO {
  userId: string;
  channel: Channel;
}

export interface UnsubscribeDTO {
  userId: string;
  channel: Channel;
}

export interface GetNotificationsDTO {
  tenantId: string;
  page: number;
  pageSize: number;
}

// Use-cases
export interface PublishScheduleUseCase {
  execute(dto: PublishScheduleDTO): Promise<PublishedSchedule>;
}

export interface CreateNotificationUseCase {
  execute(dto: CreateNotificationDTO): Promise<Notification>;
}

export interface SendNotificationUseCase {
  execute(notificationId: string): Promise<void>;
}

export interface SubscribeUseCase {
  execute(dto: SubscribeDTO): Promise<Subscription>;
}

export interface UnsubscribeUseCase {
  execute(dto: UnsubscribeDTO): Promise<void>;
}

export interface GetNotificationsUseCase {
  execute(dto: GetNotificationsDTO): Promise<PaginatedResponse<Notification>>;
}

export interface MarkNotificationReadUseCase {
  execute(notificationId: string): Promise<void>;
}

export class PublishScheduleUseCaseImpl implements PublishScheduleUseCase {
  constructor(
    private readonly publishedScheduleRepository: IPublishedScheduleRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(dto: PublishScheduleDTO): Promise<PublishedSchedule> {
    const existing = await this.publishedScheduleRepository.findByScheduleVersion(dto.scheduleVersionId);
    if (existing) {
      return existing;
    }

    const published = await this.publishedScheduleRepository.create({
      tenantId: 'tenant-default',
      scheduleVersionId: dto.scheduleVersionId,
      publishedAt: new Date(),
      publishedBy: dto.publishedBy,
    });

    await this.subscriptionRepository.findByUser(dto.publishedBy).catch(() => []);

    return published;
  }
}

export class CreateNotificationUseCaseImpl implements CreateNotificationUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(dto: CreateNotificationDTO): Promise<Notification> {
    return this.notificationRepository.create({
      tenantId: dto.tenantId,
      recipientId: dto.recipientId,
      type: dto.type,
      payload: dto.payload,
      status: 'pending',
    });
  }
}

export class SendNotificationUseCaseImpl implements SendNotificationUseCase {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async execute(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }

    if (notification.status === 'read') {
      return;
    }

    await this.notificationService.send({
      tenantId: notification.tenantId,
      recipientId: notification.recipientId,
      type: notification.type,
      payload: notification.payload,
    });

    await this.notificationRepository.updateStatus(notificationId, 'sent');
  }
}

export class SubscribeUseCaseImpl implements SubscribeUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(dto: SubscribeDTO): Promise<Subscription> {
    const existing = await this.subscriptionRepository.findByUserAndChannel(dto.userId, dto.channel);
    if (existing) {
      return existing;
    }

    return this.subscriptionRepository.create({
      userId: dto.userId,
      channel: dto.channel,
      isActive: true,
    });
  }
}

export class UnsubscribeUseCaseImpl implements UnsubscribeUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(dto: UnsubscribeDTO): Promise<void> {
    const subscription = await this.subscriptionRepository.findByUserAndChannel(dto.userId, dto.channel);
    if (!subscription) {
      throw new Error(`Subscription not found for user ${dto.userId} on channel ${dto.channel}`);
    }

    await this.subscriptionRepository.delete(subscription.id);
  }
}

export class GetNotificationsUseCaseImpl implements GetNotificationsUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(dto: GetNotificationsDTO): Promise<PaginatedResponse<Notification>> {
    return this.notificationRepository.findByTenant(dto.tenantId, dto.page, dto.pageSize);
  }
}

export class MarkNotificationReadUseCaseImpl implements MarkNotificationReadUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }

    if (notification.status === 'sent' || notification.status === 'pending') {
      await this.notificationRepository.markAsRead(notificationId);
      return;
    }

    throw new ScheduleNotPublishedError(notificationId);
  }
}

export class PublishScheduleByRoleGuard {
  static assertCanPublish(role: string): void {
    const allowedRoles = ['owner', 'tenant_admin', 'schedule_owner'];
    if (!allowedRoles.includes(role)) {
      throw new OnlyScheduleOwnerCanPublishError();
    }
  }
}