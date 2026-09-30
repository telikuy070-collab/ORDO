import type {
  IGroupLoadRepository,
  ITeacherLoadRepository,
  IWorkloadReportRepository,
} from '@ordo/application';
import { type GroupLoad, type TeacherLoad, type WorkloadReport } from '@ordo/domain/analytics';
import { SupabaseBaseRepository, toCamelCase, toSnakeCase } from './base';

export class SupabaseWorkloadReportRepository extends SupabaseBaseRepository implements IWorkloadReportRepository {
  constructor() {
    super({ tableName: 'workload_reports', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<WorkloadReport | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase(data) as WorkloadReport : null;
  }

  async findByTeacher(teacherId: string, semesterId: string): Promise<WorkloadReport | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('semester_id', semesterId)
      .single();

    this.handleError(error, 'findByTeacher');
    return data ? toCamelCase(data) as WorkloadReport : null;
  }

  async findByTenant(tenantId: string, semesterId: string): Promise<WorkloadReport[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('semester_id', semesterId)
      .order('teacher_id', { ascending: true });

    this.handleError(error, 'findByTenant');
    return (data ?? []).map(toCamelCase) as WorkloadReport[];
  }

  async create(data: Omit<WorkloadReport, 'id' | 'generatedAt'>): Promise<WorkloadReport> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(await this.withTenantId(toSnakeCase(data)))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as WorkloadReport;
  }

  async update(id: string, data: Partial<WorkloadReport>): Promise<WorkloadReport> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase(result) as WorkloadReport;
  }
}

export class SupabaseTeacherLoadRepository extends SupabaseBaseRepository implements ITeacherLoadRepository {
  constructor() {
    super({ tableName: 'teacher_loads', tenantIdColumn: 'tenant_id' });
  }

  async findByTeacherAndSemester(teacherId: string, semesterId: string): Promise<TeacherLoad[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('semester_id', semesterId)
      .order('discipline_id', { ascending: true });

    this.handleError(error, 'findByTeacherAndSemester');
    return (data ?? []).map(toCamelCase) as TeacherLoad[];
  }

  async findByTenantAndSemester(tenantId: string, semesterId: string): Promise<TeacherLoad[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('semester_id', semesterId)
      .order('teacher_id', { ascending: true })
      .order('discipline_id', { ascending: true });

    this.handleError(error, 'findByTenantAndSemester');
    return (data ?? []).map(toCamelCase) as TeacherLoad[];
  }

  async upsert(data: Omit<TeacherLoad, 'id'>): Promise<TeacherLoad> {
    const { data: existing, error: findError } = await this.client
      .from(this.tableName)
      .select('id')
      .eq('teacher_id', data.teacherId)
      .eq('discipline_id', data.disciplineId)
      .single();

    this.handleError(findError, 'upsert - find');

    if (existing) {
      const { data: result, error } = await this.client
        .from(this.tableName)
        .update(toSnakeCase(data))
        .eq('id', existing.id)
        .select()
        .single();

      this.handleError(error, 'upsert - update');
      return toCamelCase(result) as TeacherLoad;
    }

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(await this.withTenantId(toSnakeCase(data)))
      .select()
      .single();

    this.handleError(error, 'upsert - insert');
    return toCamelCase(result) as TeacherLoad;
  }
}

export class SupabaseGroupLoadRepository extends SupabaseBaseRepository implements IGroupLoadRepository {
  constructor() {
    super({ tableName: 'group_loads', tenantIdColumn: 'tenant_id' });
  }

  async findByGroupAndSemester(groupId: string, semesterId: string): Promise<GroupLoad[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('group_id', groupId)
      .eq('semester_id', semesterId)
      .order('discipline_id', { ascending: true });

    this.handleError(error, 'findByGroupAndSemester');
    return (data ?? []).map(toCamelCase) as GroupLoad[];
  }

  async findByTenantAndSemester(tenantId: string, semesterId: string): Promise<GroupLoad[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('semester_id', semesterId)
      .order('group_id', { ascending: true })
      .order('discipline_id', { ascending: true });

    this.handleError(error, 'findByTenantAndSemester');
    return (data ?? []).map(toCamelCase) as GroupLoad[];
  }

  async upsert(data: Omit<GroupLoad, 'id'>): Promise<GroupLoad> {
    const { data: existing, error: findError } = await this.client
      .from(this.tableName)
      .select('id')
      .eq('group_id', data.groupId)
      .eq('discipline_id', data.disciplineId)
      .single();

    this.handleError(findError, 'upsert - find');

    if (existing) {
      const { data: result, error } = await this.client
        .from(this.tableName)
        .update(toSnakeCase(data))
        .eq('id', existing.id)
        .select()
        .single();

      this.handleError(error, 'upsert - update');
      return toCamelCase(result) as GroupLoad;
    }

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(await this.withTenantId(toSnakeCase(data)))
      .select()
      .single();

    this.handleError(error, 'upsert - insert');
    return toCamelCase(result) as GroupLoad;
  }
}