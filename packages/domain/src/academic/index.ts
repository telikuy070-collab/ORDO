// Academic Domain Module

export interface Specialty {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface Group {
  id: string;
  tenantId: string;
  specialtyId: string;
  code: string;
  course: number;
  semesterNumber: number;
  isActive: boolean;
}

export interface Subgroup {
  id: string;
  groupId: string;
  number: number;
  name: string;
}

export interface Semester {
  id: string;
  tenantId: string;
  number: number;
  startDate: Date;
  endDate: Date;
  weeksCount: number;
  isActive: boolean;
}

export type DisciplineType = 'lecture' | 'practice' | 'seminar' | 'lab';

export interface Discipline {
  id: string;
  tenantId: string;
  name: string;
  type: DisciplineType;
}

export interface Curriculum {
  id: string;
  groupId: string;
  disciplineId: string;
  credits: number;
  lectureHours: number;
  practiceHours: number;
  totalHours: number;
  controlType: string;
  weeklyLoad: number[];
}

export class AcademicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AcademicError';
  }
}

export class GroupCodeAlreadyExistsError extends AcademicError {
  constructor(code: string, tenantId: string) {
    super(`Group with code "${code}" already exists in tenant ${tenantId}`);
    this.name = 'GroupCodeAlreadyExistsError';
  }
}

export class SpecialtyHasActiveGroupsError extends AcademicError {
  constructor(specialtyId: string) {
    super(`Cannot delete specialty ${specialtyId}: has active groups`);
    this.name = 'SpecialtyHasActiveGroupsError';
  }
}

export class InvalidWeeklyLoadError extends AcademicError {
  constructor(expected: number, actual: number) {
    super(`Weekly load must have ${expected} entries, got ${actual}`);
    this.name = 'InvalidWeeklyLoadError';
  }
}

export class InvalidSemesterRangeError extends AcademicError {
  constructor(startDate: Date, endDate: Date) {
    super(`Semester end date must be after start date: ${startDate.toISOString()} >= ${endDate.toISOString()}`);
    this.name = 'InvalidSemesterRangeError';
  }
}

export interface SpecialtyCreatedEvent {
  type: 'SpecialtyCreated';
  payload: { specialtyId: string; tenantId: string; code: string };
  timestamp: Date;
}

export interface GroupCreatedEvent {
  type: 'GroupCreated';
  payload: { groupId: string; tenantId: string; code: string };
  timestamp: Date;
}

export interface CurriculumAssignedEvent {
  type: 'CurriculumAssigned';
  payload: { groupId: string; disciplineId: string; totalHours: number };
  timestamp: Date;
}