// Academic Entities
export interface Specialty {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  durationYears: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  tenantId: string;
  specialtyId: string;
  name: string;
  year: number;
  semester: number;
  studentCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Semester {
  id: string;
  tenantId: string;
  academicYear: string;
  number: 1 | 2;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subject {
  id: string;
  tenantId: string;
  specialtyId: string;
  name: string;
  code: string;
  hoursPerWeek: number;
  type: SubjectType;
  semester: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubjectType {
  Lecture = 'lecture',
  Practice = 'practice',
  Lab = 'lab',
  Seminar = 'seminar',
}