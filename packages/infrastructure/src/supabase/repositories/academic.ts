import type {
  ICurriculumRepository,
  IDisciplineRepository,
  IGroupRepository,
  ISemesterRepository,
  ISpecialtyRepository,
} from '@ordo/application';
import {
  GroupCodeAlreadyExistsError,
  InvalidSemesterRangeError,
  InvalidWeeklyLoadError,
  type Curriculum,
  type Discipline,
  type Group,
  type Semester,
  type Specialty,
} from '@ordo/domain/academic';
import { SupabaseBaseRepository, toCamelCase, toSnakeCase } from './base';

export class SupabaseSpecialtyRepository extends SupabaseBaseRepository implements ISpecialtyRepository {
  constructor() {
    super({ tableName: 'specialties', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<Specialty | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase<Specialty>(data) : null;
  }

  async findByTenant(tenantId: string): Promise<Specialty[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('code', { ascending: true });

    this.handleError(error, 'findByTenant');
    return (data ?? []).map(d => toCamelCase<Specialty>(d));
  }

  async create(data: Omit<Specialty, 'id'>): Promise<Specialty> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(toSnakeCase(data))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase<Specialty>(result);
  }

  async update(id: string, data: Partial<Specialty>): Promise<Specialty> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase<Specialty>(result);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    this.handleError(error, 'delete');
  }
}

export class SupabaseGroupRepository extends SupabaseBaseRepository implements IGroupRepository {
  constructor() {
    super({ tableName: 'groups', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<Group | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase<Group>(data) : null;
  }

  async findByTenant(tenantId: string): Promise<Group[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('code', { ascending: true });

    this.handleError(error, 'findByTenant');
    return (data ?? []).map(d => toCamelCase<Group>(d));
  }

  async findBySpecialty(specialtyId: string): Promise<Group[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('specialty_id', specialtyId)
      .order('code', { ascending: true });

    this.handleError(error, 'findBySpecialty');
    return (data ?? []).map(d => toCamelCase<Group>(d));
  }

  async create(data: Omit<Group, 'id'>): Promise<Group> {
    const { data: existing, error: checkError } = await this.client
      .from(this.tableName)
      .select('id')
      .eq('tenant_id', data.tenantId)
      .eq('code', data.code)
      .single();

    this.handleError(checkError, 'create - check duplicate');

    if (existing) {
      throw new GroupCodeAlreadyExistsError(data.code, data.tenantId);
    }

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(toSnakeCase(data))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase<Group>(result);
  }

  async update(id: string, data: Partial<Group>): Promise<Group> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase<Group>(result);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    this.handleError(error, 'delete');
  }
}

export class SupabaseSemesterRepository extends SupabaseBaseRepository implements ISemesterRepository {
  constructor() {
    super({ tableName: 'semesters', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<Semester | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase<Semester>(data) : null;
  }

  async findByTenant(tenantId: string): Promise<Semester[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('number', { ascending: true });

    this.handleError(error, 'findByTenant');
    return (data ?? []).map(d => toCamelCase<Semester>(d));
  }

  async findActive(tenantId: string): Promise<Semester | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    this.handleError(error, 'findActive');
    return data ? toCamelCase<Semester>(data) : null;
  }

  async create(data: Omit<Semester, 'id'>): Promise<Semester> {
    if (data.endDate <= data.startDate) {
      throw new InvalidSemesterRangeError(data.startDate, data.endDate);
    }

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(toSnakeCase(data))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase<Semester>(result);
  }

  async update(id: string, data: Partial<Semester>): Promise<Semester> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase<Semester>(result);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    this.handleError(error, 'delete');
  }
}

export class SupabaseDisciplineRepository extends SupabaseBaseRepository implements IDisciplineRepository {
  constructor() {
    super({ tableName: 'disciplines', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<Discipline | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase<Discipline>(data) : null;
  }

  async findByTenant(tenantId: string): Promise<Discipline[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    this.handleError(error, 'findByTenant');
    return (data ?? []).map(d => toCamelCase<Discipline>(d));
  }

  async create(data: Omit<Discipline, 'id'>): Promise<Discipline> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(toSnakeCase(data))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase<Discipline>(result);
  }

  async update(id: string, data: Partial<Discipline>): Promise<Discipline> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase<Discipline>(result);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    this.handleError(error, 'delete');
  }
}

export class SupabaseCurriculumRepository extends SupabaseBaseRepository implements ICurriculumRepository {
  constructor() {
    super({ tableName: 'curriculum', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<Curriculum | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase<Curriculum>(data) : null;
  }

  async findByGroup(groupId: string): Promise<Curriculum[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('group_id', groupId)
      .order('discipline_id', { ascending: true });

    this.handleError(error, 'findByGroup');
    return (data ?? []).map(d => toCamelCase<Curriculum>(d));
  }

  async findByGroupAndDiscipline(groupId: string, disciplineId: string): Promise<Curriculum | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('group_id', groupId)
      .eq('discipline_id', disciplineId)
      .single();

    this.handleError(error, 'findByGroupAndDiscipline');
    return data ? toCamelCase<Curriculum>(data) : null;
  }

  async assign(data: Omit<Curriculum, 'id'>): Promise<Curriculum> {
    const existing = await this.findByGroupAndDiscipline(data.groupId, data.disciplineId);
    if (existing) {
      throw new Error(`Curriculum already assigned for group ${data.groupId} and discipline ${data.disciplineId}`);
    }

    const weeklyLoad = data.weeklyLoad ?? [];
    if (weeklyLoad.length !== 6) {
      throw new InvalidWeeklyLoadError(6, weeklyLoad.length);
    }

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(toSnakeCase(data))
      .select()
      .single();

    this.handleError(error, 'assign');
    return toCamelCase<Curriculum>(result);
  }

  async remove(groupId: string, disciplineId: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('group_id', groupId)
      .eq('discipline_id', disciplineId);

    this.handleError(error, 'remove');
  }

  async update(id: string, data: Partial<Curriculum>): Promise<Curriculum> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase<Curriculum>(result);
  }
}