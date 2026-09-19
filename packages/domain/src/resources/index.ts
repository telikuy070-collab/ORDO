// Resources Domain Module

export interface Teacher {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  userId: string | null;
}

export type RoomType = 'lecture' | 'practice' | 'lab' | 'sport';

export interface Room {
  id: string;
  tenantId: string;
  buildingId: string;
  number: string;
  capacity: number;
  type: RoomType;
}

export interface Building {
  id: string;
  tenantId: string;
  name: string;
  address: string;
}

export type PreferenceType = 'cannot' | 'prefer' | 'max_per_day';

export type PreferenceStatus = 'pending' | 'accepted' | 'rejected';

export interface TeacherPreference {
  id: string;
  teacherId: string;
  type: PreferenceType;
  dayOfWeek: number;
  pairNumber: number;
  value: Record<string, unknown>;
  status: PreferenceStatus;
  comment: string;
}

export class ResourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceError';
  }
}

export class DuplicatePreferenceError extends ResourceError {
  constructor(teacherId: string, type: PreferenceType, dayOfWeek: number, pairNumber: number) {
    super(`Teacher ${teacherId} already has preference ${type} for day ${dayOfWeek} pair ${pairNumber}`);
    this.name = 'DuplicatePreferenceError';
  }
}

export class InvalidRoomCapacityError extends ResourceError {
  constructor(capacity: number) {
    super(`Room capacity must be > 0, got ${capacity}`);
    this.name = 'InvalidRoomCapacityError';
  }
}

export class TeacherNotFoundError extends ResourceError {
  constructor(teacherId: string) {
    super(`Teacher not found: ${teacherId}`);
    this.name = 'TeacherNotFoundError';
  }
}

export class RoomNotAvailableError extends ResourceError {
  constructor(roomId: string) {
    super(`Room not available: ${roomId}`);
    this.name = 'RoomNotAvailableError';
  }
}

export interface TeacherAddedEvent {
  type: 'TeacherAdded';
  payload: { teacherId: string; tenantId: string; fullName: string };
  timestamp: Date;
}

export interface PreferenceSubmittedEvent {
  type: 'PreferenceSubmitted';
  payload: { preferenceId: string; teacherId: string; type: PreferenceType };
  timestamp: Date;
}