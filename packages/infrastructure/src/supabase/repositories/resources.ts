import type {
  IBuildingRepository,
  IPreferenceRepository,
  IRoomRepository,
  ITeacherRepository,
} from '@ordo/application';
import {
  DuplicatePreferenceError,
  InvalidRoomCapacityError,
  type Building,
  type Room,
  type Teacher,
  type TeacherPreference,
} from '@ordo/domain';
import { SupabaseBaseRepository, toCamelCase, toSnakeCase } from './base';

export class SupabaseTeacherRepository extends SupabaseBaseRepository implements ITeacherRepository {
  constructor() {
    super({ tableName: 'teachers', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<Teacher | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase(data) as Teacher : null;
  }

  async findByTenant(tenantId: string): Promise<Teacher[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('full_name', { ascending: true });

    this.handleError(error, 'findByTenant');
    return (data ?? []).map(toCamelCase) as Teacher[];
  }

  async findByUserId(userId: string): Promise<Teacher | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .single();

    this.handleError(error, 'findByUserId');
    return data ? toCamelCase(data) as Teacher : null;
  }

  async create(data: Omit<Teacher, 'id'>): Promise<Teacher> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(toSnakeCase({
        ...data,
        isActive: data.isActive ?? true,
      }))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as Teacher;
  }

  async update(id: string, data: Partial<Teacher>): Promise<Teacher> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase(result) as Teacher;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    this.handleError(error, 'delete');
  }
}

export class SupabaseRoomRepository extends SupabaseBaseRepository implements IRoomRepository {
  constructor() {
    super({ tableName: 'rooms', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<Room | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase(data) as Room : null;
  }

  async findByTenant(tenantId: string): Promise<Room[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('number', { ascending: true });

    this.handleError(error, 'findByTenant');
    return (data ?? []).map(toCamelCase) as Room[];
  }

  async findByBuilding(buildingId: string): Promise<Room[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('building_id', buildingId)
      .order('number', { ascending: true });

    this.handleError(error, 'findByBuilding');
    return (data ?? []).map(toCamelCase) as Room[];
  }

  async findAvailable(tenantId: string, dayOfWeek: number, pairNumber: number, weekType: string): Promise<Room[]> {
    // Get all rooms for tenant
    const { data: rooms, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .gt('capacity', 0)
      .order('capacity', { ascending: true });

    this.handleError(error, 'findAvailable');

    if (!rooms || rooms.length === 0) return [];

    // Get draft schedule IDs for this tenant
    const { data: draftSchedules, error: scheduleError } = await this.client
      .from('schedules')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'draft');

    this.handleError(scheduleError, 'findAvailable - draft schedules');

    if (!draftSchedules || draftSchedules.length === 0) {
      return rooms.map(toCamelCase) as Room[];
    }

    const scheduleIds = draftSchedules.map(s => s.id);

    // Get version IDs for these schedules
    const { data: versions, error: versionError } = await this.client
      .from('schedule_versions')
      .select('id')
      .in('schedule_id', scheduleIds);

    this.handleError(versionError, 'findAvailable - versions');

    if (!versions || versions.length === 0) {
      return rooms.map(toCamelCase) as Room[];
    }

    const versionIds = versions.map(v => v.id);

    // Get lessons that conflict with the time slot
    const { data: conflictingLessons, error: lessonError } = await this.client
      .from('lessons')
      .select('room_id')
      .eq('day_of_week', dayOfWeek)
      .eq('pair_number', pairNumber)
      .in('week_type', [weekType, 'all'])
      .in('version_id', versionIds);

    this.handleError(lessonError, 'findAvailable - conflicting lessons');

    const bookedRoomIds = new Set((conflictingLessons ?? []).map(l => l.room_id));

    return rooms
      .filter(room => !bookedRoomIds.has(room.id))
      .map(toCamelCase) as Room[];
  }

  async create(data: Omit<Room, 'id'>): Promise<Room> {
    if (data.capacity <= 0) {
      throw new InvalidRoomCapacityError(data.capacity);
    }

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(toSnakeCase(data))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as Room;
  }

  async update(id: string, data: Partial<Room>): Promise<Room> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase(result) as Room;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    this.handleError(error, 'delete');
  }
}

export class SupabaseBuildingRepository extends SupabaseBaseRepository implements IBuildingRepository {
  constructor() {
    super({ tableName: 'buildings', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<Building | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase(data) as Building : null;
  }

  async findByTenant(tenantId: string): Promise<Building[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    this.handleError(error, 'findByTenant');
    return (data ?? []).map(toCamelCase) as Building[];
  }

  async create(data: Omit<Building, 'id'>): Promise<Building> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(toSnakeCase(data))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as Building;
  }

  async update(id: string, data: Partial<Building>): Promise<Building> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase(result) as Building;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    this.handleError(error, 'delete');
  }
}

export class SupabasePreferenceRepository extends SupabaseBaseRepository implements IPreferenceRepository {
  constructor() {
    super({ tableName: 'teacher_preferences', tenantIdColumn: 'tenant_id' });
  }

  async findByTeacher(teacherId: string): Promise<TeacherPreference[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('teacher_id', teacherId)
      .order('day_of_week', { ascending: true })
      .order('pair_number', { ascending: true });

    this.handleError(error, 'findByTeacher');
    return (data ?? []).map(toCamelCase) as TeacherPreference[];
  }

  async findByTenant(tenantId: string): Promise<TeacherPreference[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('teacher_id', { ascending: true })
      .order('day_of_week', { ascending: true })
      .order('pair_number', { ascending: true });

    this.handleError(error, 'findByTenant');
    return (data ?? []).map(toCamelCase) as TeacherPreference[];
  }

  async create(data: Omit<TeacherPreference, 'id'>): Promise<TeacherPreference> {
    // Check for duplicate
    const { data: existing, error: checkError } = await this.client
      .from(this.tableName)
      .select('id')
      .eq('teacher_id', data.teacherId)
      .eq('type', data.type)
      .eq('day_of_week', data.dayOfWeek)
      .eq('pair_number', data.pairNumber)
      .single();

    this.handleError(checkError, 'create - check duplicate');

    if (existing) {
      throw new DuplicatePreferenceError(data.teacherId, data.type, data.dayOfWeek, data.pairNumber);
    }

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(toSnakeCase({
        ...data,
        status: data.status ?? 'pending',
        comment: data.comment ?? '',
      }))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as TeacherPreference;
  }

  async update(id: string, data: Partial<TeacherPreference>): Promise<TeacherPreference> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase(result) as TeacherPreference;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    this.handleError(error, 'delete');
  }
}