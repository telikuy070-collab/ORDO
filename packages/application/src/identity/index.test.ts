import { describe, expect, it } from 'vitest';

import { UserRole, type Role, type Tenant, type User } from '@ordo/domain';

import {
  AssignRoleUseCaseImpl,
  CreateTenantUseCaseImpl,
  LoginUserUseCaseImpl,
  RegisterUserUseCaseImpl,
  type IAuthProvider,
  type IRoleRepository,
  type IUserRepository,
} from './index';

class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.tenantId === tenantId && user.email.toLowerCase() === email.toLowerCase()) {
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
    const current = this.users.get(id);
    if (!current) {
      throw new Error(`User not found: ${id}`);
    }

    const next = { ...current, ...data, updatedAt: new Date() };
    this.users.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }
}

class InMemoryRoleRepository implements IRoleRepository {
  private readonly assignments = new Map<string, Set<Role>>();

  async findByUserAndTenant(userId: string, tenantId: string): Promise<Role[]> {
    return [...(this.assignments.get(`${userId}:${tenantId}`) ?? new Set<Role>())];
  }

  async assign(userId: string, tenantId: string, role: Role): Promise<UserRole> {
    const key = `${userId}:${tenantId}`;
    const set = this.assignments.get(key) ?? new Set<Role>();
    set.add(role);
    this.assignments.set(key, set);
    return role;
  }

  async revoke(userId: string, tenantId: string, role: Role): Promise<void> {
    const key = `${userId}:${tenantId}`;
    const set = this.assignments.get(key);
    if (!set) {
      return;
    }

    set.delete(role);
  }

  async hasRole(userId: string, tenantId: string, role: Role): Promise<boolean> {
    return this.assignments.get(`${userId}:${tenantId}`)?.has(role) ?? false;
  }
}

class StubAuthProvider implements IAuthProvider {
  private readonly users = new Map<string, User>();

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const candidate = [...this.users.values()].find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );

    if (!candidate || password !== 'secret') {
      throw new Error('Invalid credentials');
    }

    return { user: candidate, token: `token-${candidate.id}` };
  }

  async register(data: { email: string; password: string; tenantId: string }): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      tenantId: data.tenantId,
      email: data.email.toLowerCase(),
      name: data.email.split('@')[0] ?? 'user',
      role: UserRole.Teacher,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    return user;
  }

  async logout(_token: string): Promise<void> {
    return;
  }

  async validateToken(_token: string): Promise<User | null> {
    return null;
  }
}

describe('identity application use cases', () => {
  it('creates a tenant when slug is unique', async () => {
    const tenantService = {
      create: async (name: string, slug: string): Promise<Tenant> => ({
        id: crypto.randomUUID(),
        name,
        slug,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findBySlug: async (_slug: string): Promise<Tenant | null> => null,
      updateSettings: async (
        tenantId: string,
        _settings: Record<string, unknown>,
      ): Promise<Tenant> => ({
        id: tenantId,
        name: 'Sample tenant',
        slug: 'sample',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const result = await new CreateTenantUseCaseImpl(tenantService).execute({
      name: 'Medical Academy',
      slug: 'medical-academy',
    });

    expect(result.slug).toBe('medical-academy');
    expect(result.name).toBe('Medical Academy');
  });

  it('registers a user and stores the resulting DTO', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new RegisterUserUseCaseImpl(repo, new StubAuthProvider());

    const result = await useCase.execute({
      email: 'alice@college.edu',
      password: 'secret',
      tenantId: 'tenant-1',
    });

    expect(result.email).toBe('alice@college.edu');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.role).toBe(UserRole.Teacher);
  });

  it('logs in and assigns a role to an existing user', async () => {
    const repo = new InMemoryUserRepository();
    const authProvider = new StubAuthProvider();
    const roleRepo = new InMemoryRoleRepository();

    const registered = await authProvider.register({
      email: 'bob@college.edu',
      password: 'secret',
      tenantId: 'tenant-2',
    });

    const savedUser = await repo.create({
      tenantId: registered.tenantId,
      email: registered.email,
      name: registered.name,
      role: registered.role,
      isActive: registered.isActive,
      updatedAt: registered.updatedAt,
    });

    const loginResult = await new LoginUserUseCaseImpl(authProvider).execute({
      email: 'bob@college.edu',
      password: 'secret',
    });

    expect(loginResult.user.email).toBe('bob@college.edu');

    await new AssignRoleUseCaseImpl(repo, roleRepo).execute({
      userId: savedUser.id,
      tenantId: 'tenant-2',
      role: UserRole.ScheduleOwner,
    });

    expect(await roleRepo.hasRole(savedUser.id, 'tenant-2', UserRole.ScheduleOwner)).toBe(true);
  });
});
