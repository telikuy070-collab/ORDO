// Identity Errors
export class IdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdentityError';
  }
}

export class UserNotFoundError extends IdentityError {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
    this.name = 'UserNotFoundError';
  }
}

export class TenantNotFoundError extends IdentityError {
  constructor(tenantId: string) {
    super(`Tenant not found: ${tenantId}`);
    this.name = 'TenantNotFoundError';
  }
}

export class InvalidCredentialsError extends IdentityError {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

export class UserAlreadyExistsError extends IdentityError {
  constructor(email: string) {
    super(`User already exists: ${email}`);
    this.name = 'UserAlreadyExistsError';
  }
}

export class InsufficientPermissionsError extends IdentityError {
  constructor(required: string, actual: string) {
    super(`Insufficient permissions: required ${required}, got ${actual}`);
    this.name = 'InsufficientPermissionsError';
  }
}

export class InvalidRoleError extends IdentityError {
  constructor(role: string) {
    super(`Invalid role: ${role}`);
    this.name = 'InvalidRoleError';
  }
}

export class TenantSlugAlreadyExistsError extends IdentityError {
  constructor(slug: string) {
    super(`Tenant with slug "${slug}" already exists`);
    this.name = 'TenantSlugAlreadyExistsError';
  }
}