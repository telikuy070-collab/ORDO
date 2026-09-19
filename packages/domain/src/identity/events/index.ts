// Identity Events
export interface DomainEvent {
  eventId: string;
  occurredAt: Date;
  aggregateId: string;
}

export interface UserCreatedEvent extends DomainEvent {
  type: 'UserCreated';
  payload: {
    userId: string;
    tenantId: string;
    email: string;
    role: string;
  };
}

export interface UserUpdatedEvent extends DomainEvent {
  type: 'UserUpdated';
  payload: {
    userId: string;
    changes: Record<string, unknown>;
  };
}

export interface UserDeactivatedEvent extends DomainEvent {
  type: 'UserDeactivated';
  payload: {
    userId: string;
  };
}

export interface TenantCreatedEvent extends DomainEvent {
  type: 'TenantCreated';
  payload: {
    tenantId: string;
    name: string;
    slug: string;
  };
}

export type IdentityEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeactivatedEvent
  | TenantCreatedEvent;