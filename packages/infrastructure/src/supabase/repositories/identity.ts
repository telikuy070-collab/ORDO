import type {
  IAuthProvider,
  IRoleRepository,
  ITenantService,
  IUserRepository,
} from '@ordo/application';
import {
  InvalidCredentialsError,
  TenantNotFoundError,
  UserAlreadyExistsError,
  UserNotFoundError,
  UserRole,
  type Role,
  type Tenant,
  type User,
  type UserRole as UserRoleValue,
} from '@ordo/domain';

type StoredTenant = Tenant & {
  settings: Record<string, unknown>;
};

export class SupabaseIdentityRepository
  implements IUserRepository, IRoleRepository
{
  private readonly users = new Map<string, User>();
  private readonly roleAssignments = new Map<string, Set<Role>>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    for (const user of this.users.values()) {
      if (user.tenantId === tenantId && user.email.toLowerCase() === normalizedEmail) {
        return user;
      }
    }

    return null;
  }

  async findByTenant(tenantId: string): Promise<User[]> {
    return [...this.users.values()].filter((user) => user.tenantId === tenantId);
  }

  async create(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const nextUser: User = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(nextUser.id, nextUser);
    return nextUser;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const currentUser = this.users.get(id);
    if (!currentUser) {
      throw new UserNotFoundError(id);
    }

    const nextUser: User = {
      ...currentUser,
      ...data,
      updatedAt: new Date(),
    };

    this.users.set(id, nextUser);
    return nextUser;
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
    this.roleAssignments.forEach((value, key) => {
      if (key.startsWith(`${id}:`) || key.endsWith(`:${id}`)) {
        this.roleAssignments.delete(key);
      }
    });
  }

  async findByUserAndTenant(userId: string, tenantId: string): Promise<Role[]> {
    const key = `${userId}:${tenantId}`;
    return [...(this.roleAssignments.get(key) ?? new Set<Role>())];
  }

  async assign(userId: string, tenantId: string, role: Role): Promise<UserRoleValue> {
    const user = this.users.get(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (user.tenantId !== tenantId) {
      throw new TenantNotFoundError(tenantId);
    }

    const key = `${userId}:${tenantId}`;
    const existingRoles = this.roleAssignments.get(key) ?? new Set<Role>();
    existingRoles.add(role);
    this.roleAssignments.set(key, existingRoles);

    return role;
  }

  async revoke(userId: string, tenantId: string, role: Role): Promise<void> {
    const key = `${userId}:${tenantId}`;
    const currentRoles = this.roleAssignments.get(key);
    if (!currentRoles) {
      return;
    }

    currentRoles.delete(role);
    if (currentRoles.size === 0) {
      this.roleAssignments.delete(key);
    }
  }

  async hasRole(userId: string, tenantId: string, role: Role): Promise<boolean> {
    const key = `${userId}:${tenantId}`;
    return this.roleAssignments.get(key)?.has(role) ?? false;
  }
}

export class SupabaseTenantService implements ITenantService {
  private readonly tenants = new Map<string, StoredTenant>();

  async create(name: string, slug: string): Promise<Tenant> {
    const tenant: StoredTenant = {
      id: crypto.randomUUID(),
      name,
      slug,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {},
    };

    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const normalizedSlug = slug.trim().toLowerCase();

    for (const tenant of this.tenants.values()) {
      if (tenant.slug.toLowerCase() === normalizedSlug) {
        return tenant;
      }
    }

    return null;
  }

  async updateSettings(tenantId: string, settings: Record<string, unknown>): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new TenantNotFoundError(tenantId);
    }

    const nextTenant: StoredTenant = {
      ...tenant,
      settings: {
        ...tenant.settings,
        ...settings,
      },
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, nextTenant);
    return nextTenant;
  }
}

export class SupabaseAuthProvider implements IAuthProvider {
  private readonly users = new Map<string, User>();
  private readonly credentials = new Map<string, string>();
  private readonly tokens = new Map<string, string>();

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = [...this.users.values()].find(
      (candidate) => candidate.email.toLowerCase() === normalizedEmail,
    );

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const storedPassword = this.credentials.get(user.id);
    if (storedPassword !== password) {
      throw new InvalidCredentialsError();
    }

    const token = crypto.randomUUID();
    this.tokens.set(token, user.id);

    return { user, token };
  }

  async register(data: { email: string; password: string; tenantId: string }): Promise<User> {
    const existingUser = [...this.users.values()].find(
      (user) => user.tenantId === data.tenantId && user.email.toLowerCase() === data.email.toLowerCase(),
    );

    if (existingUser) {
      throw new UserAlreadyExistsError(data.email);
    }

    const user: User = {
      id: crypto.randomUUID(),
      tenantId: data.tenantId,
      email: data.email.trim().toLowerCase(),
      name: data.email.split('@')[0] ?? 'user',
      role: UserRole.Teacher,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    this.credentials.set(user.id, data.password);

    return user;
  }

  async logout(token: string): Promise<void> {
    this.tokens.delete(token);
  }

  async validateToken(token: string): Promise<User | null> {
    const userId = this.tokens.get(token);
    if (!userId) {
      return null;
    }

    return this.users.get(userId) ?? null;
  }
}
