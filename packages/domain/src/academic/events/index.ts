// Academic Events
export interface DomainEvent {
  eventId: string;
  occurredAt: Date;
  aggregateId: string;
}

export interface SpecialtyCreatedEvent extends DomainEvent {
  type: 'SpecialtyCreated';
  payload: {
    specialtyId: string;
    tenantId: string;
    code: string;
    name: string;
  };
}

export interface SpecialtyUpdatedEvent extends DomainEvent {
  type: 'SpecialtyUpdated';
  payload: {
    specialtyId: string;
    changes: Record<string, unknown>;
  };
}

export interface GroupCreatedEvent extends DomainEvent {
  type: 'GroupCreated';
  payload: {
    groupId: string;
    tenantId: string;
    specialtyId: string;
    name: string;
    year: number;
  };
}

export interface GroupUpdatedEvent extends DomainEvent {
  type: 'GroupUpdated';
  payload: {
    groupId: string;
    changes: Record<string, unknown>;
  };
}

export interface SemesterCreatedEvent extends DomainEvent {
  type: 'SemesterCreated';
  payload: {
    semesterId: string;
    tenantId: string;
    academicYear: string;
    number: 1 | 2;
  };
}

export interface SubjectCreatedEvent extends DomainEvent {
  type: 'SubjectCreated';
  payload: {
    subjectId: string;
    tenantId: string;
    specialtyId: string;
    name: string;
    code: string;
  };
}

export type AcademicEvent =
  | SpecialtyCreatedEvent
  | SpecialtyUpdatedEvent
  | GroupCreatedEvent
  | GroupUpdatedEvent
  | SemesterCreatedEvent
  | SubjectCreatedEvent;