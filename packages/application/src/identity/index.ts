// Identity Application Module

import {
  InvalidRoleError,
  TenantNotFoundError,
  TenantSlugAlreadyExistsError,
  UserAlreadyExistsError,
  UserNotFoundError,
  UserRole,
  type Role,
  type Tenant,
  type User,
} from '@ordo/domain';
import type { TenantDTO, UserDTO } from '@ordo/types';

// Ports
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(tenantId: string, email: string): Promise<User | null>;
  findByTenant(tenantId: string): Promise<User[]>;
  create(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

export interface IRoleRepository {
  findByUserAndTenant(userId: string, tenantId: string): Promise<Role[]>;
  assign(userId: string, tenantId: string, role: Role): Promise<UserRole>;
  revoke(userId: string, tenantId: string, role: Role): Promise<void>;
  hasRole(userId: string, tenantId: string, role: Role): Promise<boolean>;
}

export interface IAuthProvider {
  login(email: string, password: string): Promise<{ user: User; token: string }>;
  register(data: { email: string; password: string; tenantId: string }): Promise<User>;
  logout(token: string): Promise<void>;
  validateToken(token: string): Promise<User | null>;
}

export interface ITenantService {
  create(name: string, slug: string): Promise<Tenant>;
  findBySlug(slug: string): Promise<Tenant | null>;
  updateSettings(tenantId: string, settings: Record<string, unknown>): Promise<Tenant>;
}

// DTOs
export interface RegisterUserDTO {
  email: string;
  password: string;
  tenantId: string;
}

export interface LoginUserDTO {
  email: string;
  password: string;
}

export interface AssignRoleDTO {
  userId: string;
  tenantId: string;
  role: Role;
}

export interface CreateTenantDTO {
  name: string;
  slug: string;
}

// Use-cases
export interface RegisterUserUseCase {
  execute(dto: RegisterUserDTO): Promise<UserDTO>;
}

export interface LoginUserUseCase {
  execute(dto: LoginUserDTO): Promise<{ user: UserDTO; token: string }>;
}

export interface AssignRoleUseCase {
  execute(dto: AssignRoleDTO): Promise<void>;
}

export interface CreateTenantUseCase {
  execute(dto: CreateTenantDTO): Promise<TenantDTO>;
}

export interface GetCurrentUserUseCase {
  execute(userId: string): Promise<UserDTO | null>;
}

const isValidRole = (role: string): role is Role =>
  Object.values(UserRole).includes(role as UserRole);

const toUserDTO = (user: User): UserDTO => ({
  id: user.id,
  tenantId: user.tenantId,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt.toISOString(),
});

const toTenantDTO = (tenant: Tenant): TenantDTO => ({
  id: tenant.id,
  name: tenant.name,
  slug: tenant.slug,
  settings: {},
  createdAt: tenant.createdAt.toISOString(),
});

export class RegisterUserUseCaseImpl implements RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authProvider: IAuthProvider,
  ) {}

  async execute(dto: RegisterUserDTO): Promise<UserDTO> {
    const existingUser = await this.userRepository.findByEmail(dto.tenantId, dto.email);
    if (existingUser) {
      throw new UserAlreadyExistsError(dto.email);
    }

    const registeredUser = await this.authProvider.register(dto);
    const persistedUser = await this.userRepository.create({
      tenantId: registeredUser.tenantId,
      email: registeredUser.email,
      name: registeredUser.name,
      role: registeredUser.role,
      isActive: registeredUser.isActive,
      updatedAt: registeredUser.updatedAt,
    });

    return toUserDTO(persistedUser);
  }
}

export class LoginUserUseCaseImpl implements LoginUserUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  async execute(dto: LoginUserDTO): Promise<{ user: UserDTO; token: string }> {
    const session = await this.authProvider.login(dto.email, dto.password);

    return {
      user: toUserDTO(session.user),
      token: session.token,
    };
  }
}

export class AssignRoleUseCaseImpl implements AssignRoleUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(dto: AssignRoleDTO): Promise<void> {
    if (!isValidRole(dto.role)) {
      throw new InvalidRoleError(dto.role);
    }

    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new UserNotFoundError(dto.userId);
    }

    if (user.tenantId !== dto.tenantId) {
      throw new TenantNotFoundError(dto.tenantId);
    }

    await this.roleRepository.assign(dto.userId, dto.tenantId, dto.role);
  }
}

export class CreateTenantUseCaseImpl implements CreateTenantUseCase {
  constructor(private readonly tenantService: ITenantService) {}

  async execute(dto: CreateTenantDTO): Promise<TenantDTO> {
    const existingTenant = await this.tenantService.findBySlug(dto.slug);
    if (existingTenant) {
      throw new TenantSlugAlreadyExistsError(dto.slug);
    }

    const tenant = await this.tenantService.create(dto.name, dto.slug);
    return toTenantDTO(tenant);
  }
}

export class GetCurrentUserUseCaseImpl implements GetCurrentUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<UserDTO | null> {
    const user = await this.userRepository.findById(userId);
    return user ? toUserDTO(user) : null;
  }
}