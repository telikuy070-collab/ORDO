// Identity Entities
export enum UserRole {
  Owner = 'owner',
  TenantAdmin = 'tenant_admin',
  ScheduleOwner = 'schedule_owner',
  DepartmentHead = 'department_head',
  Teacher = 'teacher',
  Anonymous = 'anon',
}

export type Role = UserRole;

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface UserRoleAssignment {
  userId: string;
  tenantId: string;
  role: UserRole;
  isActive: boolean;
}

export class UserEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.tenantId = user.tenantId;
    this.email = user.email;
    this.name = user.name;
    this.role = user.role;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }

  static create(data: Omit<User, 'createdAt' | 'updatedAt'>): UserEntity {
    if (!data.name.trim()) {
      throw new Error('User name is required');
    }

    return new UserEntity({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: data.isActive ?? true,
    });
  }

  activate(): UserEntity {
    return new UserEntity({
      ...this.toObject(),
      isActive: true,
      updatedAt: new Date(),
    });
  }

  deactivate(): UserEntity {
    return new UserEntity({
      ...this.toObject(),
      isActive: false,
      updatedAt: new Date(),
    });
  }

  changeRole(role: UserRole): UserEntity {
    return new UserEntity({
      ...this.toObject(),
      role,
      updatedAt: new Date(),
    });
  }

  toObject(): User {
    return {
      id: this.id,
      tenantId: this.tenantId,
      email: this.email,
      name: this.name,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export class TenantEntity {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(tenant: Tenant) {
    this.id = tenant.id;
    this.name = tenant.name;
    this.slug = tenant.slug;
    this.isActive = tenant.isActive;
    this.createdAt = tenant.createdAt;
    this.updatedAt = tenant.updatedAt;
  }

  static create(data: Omit<Tenant, 'createdAt' | 'updatedAt'>): TenantEntity {
    if (!data.name.trim()) {
      throw new Error('Tenant name is required');
    }

    if (data.slug.length < 3) {
      throw new Error('Tenant slug must contain at least 3 characters');
    }

    return new TenantEntity({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: data.isActive ?? true,
    });
  }

  rename(name: string): TenantEntity {
    return new TenantEntity({
      ...this.toObject(),
      name,
      updatedAt: new Date(),
    });
  }

  toObject(): Tenant {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}