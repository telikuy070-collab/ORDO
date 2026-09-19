// Scheduling Domain Module

export type ScheduleStatus = 'draft' | 'review' | 'published' | 'archived';

export interface Schedule {
  id: string;
  tenantId: string;
  semesterId: string;
  status: ScheduleStatus;
  createdAt: Date;
  publishedAt: Date | null;
}

export interface ScheduleVersion {
  id: string;
  scheduleId: string;
  versionNumber: number;
  authorId: string;
  createdAt: Date;
  comment: string;
}

export type WeekType = 'all' | 'odd' | 'even';

export type LessonType = 'lecture' | 'practice' | 'seminar' | 'lab';

export interface Lesson {
  id: string;
  versionId: string;
  groupId: string;
  subgroupIds: string[];
  teacherId: string;
  roomId: string;
  disciplineId: string;
  dayOfWeek: number;
  pairNumber: number;
  timeStart: string;
  timeEnd: string;
  weekType: WeekType;
  lessonType: LessonType;
}

export type ConflictType =
  | 'teacher_double_booked'
  | 'group_double_booked'
  | 'room_double_booked'
  | 'teacher_preference_violated'
  | 'constraint_violated';

export type Severity = 'hard' | 'soft';

export interface Conflict {
  id: string;
  versionId: string;
  type: ConflictType;
  severity: Severity;
  lessonIds: string[];
  description: string;
}

export interface Constraint {
  id: string;
  tenantId: string;
  type: string;
  severity: Severity;
  rule: Record<string, unknown>;
  isActive: boolean;
}

export class SchedulingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchedulingError';
  }
}

export class InvalidLessonTimeError extends SchedulingError {
  constructor(timeStart: string, timeEnd: string) {
    super(`Lesson time must be valid: ${timeStart} <= ${timeEnd}`);
    this.name = 'InvalidLessonTimeError';
  }
}

export class ScheduleAlreadyPublishedError extends SchedulingError {
  constructor(scheduleId: string) {
    super(`Schedule ${scheduleId} is already published`);
    this.name = 'ScheduleAlreadyPublishedError';
  }
}

export class LessonConflictError extends SchedulingError {
  constructor(lessonId: string, conflictType: ConflictType) {
    super(`Conflict detected for lesson ${lessonId}: ${conflictType}`);
    this.name = 'LessonConflictError';
  }
}

export class ScheduleVersionNotFoundError extends SchedulingError {
  constructor(versionId: string) {
    super(`Schedule version not found: ${versionId}`);
    this.name = 'ScheduleVersionNotFoundError';
  }
}

export class TeacherDoubleBookedError extends SchedulingError {
  constructor(teacherId: string, dayOfWeek: number, pairNumber: number) {
    super(`Teacher ${teacherId} is already booked on day ${dayOfWeek} pair ${pairNumber}`);
    this.name = 'TeacherDoubleBookedError';
  }
}

export class GroupDoubleBookedError extends SchedulingError {
  constructor(groupId: string, dayOfWeek: number, pairNumber: number) {
    super(`Group ${groupId} already has a lesson on day ${dayOfWeek} pair ${pairNumber}`);
    this.name = 'GroupDoubleBookedError';
  }
}

export class RoomDoubleBookedError extends SchedulingError {
  constructor(roomId: string, dayOfWeek: number, pairNumber: number) {
    super(`Room ${roomId} is already booked on day ${dayOfWeek} pair ${pairNumber}`);
    this.name = 'RoomDoubleBookedError';
  }
}

export class PublishedScheduleImmutableError extends SchedulingError {
  constructor() {
    super('Published schedule is read-only');
    this.name = 'PublishedScheduleImmutableError';
  }
}

export interface ScheduleCreatedEvent {
  type: 'ScheduleCreated';
  payload: { scheduleId: string; tenantId: string; semesterId: string };
  timestamp: Date;
}

export interface LessonAddedEvent {
  type: 'LessonAdded';
  payload: { lessonId: string; versionId: string; groupId: string; teacherId: string };
  timestamp: Date;
}

export interface ConflictDetectedEvent {
  type: 'ConflictDetected';
  payload: { conflictId: string; versionId: string; type: ConflictType; severity: Severity };
  timestamp: Date;
}

export interface SchedulePublishedByOwnerEvent {
  type: 'SchedulePublishedByOwner';
  payload: { scheduleId: string; versionId: string; publishedBy: string };
  timestamp: Date;
}