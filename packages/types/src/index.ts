// Shared DTO types for Ordo

export interface TenantDTO {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  createdAt: string;
}

export interface UserDTO {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export type Role =
  | 'owner'
  | 'tenant_admin'
  | 'schedule_owner'
  | 'department_head'
  | 'teacher'
  | 'anon';

export interface GroupDTO {
  id: string;
  tenantId: string;
  specialtyId: string;
  code: string;
  course: number;
  semesterNumber: number;
  isActive: boolean;
}

export interface TeacherDTO {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  userId: string | null;
}

export interface RoomDTO {
  id: string;
  tenantId: string;
  buildingId: string;
  number: string;
  capacity: number;
  type: 'lecture' | 'practice' | 'lab' | 'sport';
}

export interface ScheduleLessonDTO {
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
  weekType: 'all' | 'odd' | 'even';
  lessonType: 'lecture' | 'practice' | 'seminar' | 'lab';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}