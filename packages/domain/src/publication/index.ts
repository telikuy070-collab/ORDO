// Publication Domain Module

export interface PublishedSchedule {
  id: string;
  tenantId: string;
  scheduleVersionId: string;
  publishedAt: Date;
  publishedBy: string;
}

export type NotificationType =
  | 'schedule_published'
  | 'schedule_changed'
  | 'lesson_cancelled'
  | 'lesson_moved'
  | 'teacher_assigned';

export type NotificationStatus = 'pending' | 'sent' | 'read';

export interface Notification {
  id: string;
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  createdAt: Date;
}

export type Channel = 'push' | 'email' | 'telegram';

export interface Subscription {
  id: string;
  userId: string;
  channel: Channel;
  isActive: boolean;
}

export class ScheduleNotPublishedError extends Error {
  constructor(scheduleId: string) {
    super(`Schedule ${scheduleId} is not published`);
    this.name = 'ScheduleNotPublishedError';
  }
}

export class OnlyScheduleOwnerCanPublishError extends Error {
  constructor() {
    super('Only schedule_owner or higher can publish schedule');
    this.name = 'OnlyScheduleOwnerCanPublishError';
  }
}

export interface SchedulePublishedEvent {
  type: 'SchedulePublished';
  payload: { publishedScheduleId: string; tenantId: string; versionId: string };
  timestamp: Date;
}

export interface NotificationSentEvent {
  type: 'NotificationSent';
  payload: { notificationId: string; recipientId: string; type: NotificationType };
  timestamp: Date;
}