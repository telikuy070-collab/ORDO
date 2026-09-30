import type {
  IConflictDetector,
  IConstraintEngine,
  ILessonRepository,
  IPublicationService,
  IScheduleRepository,
  IScheduleVersionRepository,
} from '@ordo/application';
import {
  InvalidLessonTimeError,
  ScheduleAlreadyPublishedError,
  type Conflict,
  type Lesson,
  type Schedule,
  type ScheduleVersion,
} from '@ordo/domain/scheduling';
import { SupabaseBaseRepository, toCamelCase, toSnakeCase } from './base';

export class SupabaseScheduleRepository extends SupabaseBaseRepository implements IScheduleRepository {
  constructor() {
    super({ tableName: 'schedules', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<Schedule | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase(data) as Schedule : null;
  }

  async findByTenantAndSemester(tenantId: string, semesterId: string): Promise<Schedule[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('semester_id', semesterId)
      .order('created_at', { ascending: false });

    this.handleError(error, 'findByTenantAndSemester');
    return (data ?? []).map(toCamelCase) as Schedule[];
  }

  async create(data: Omit<Schedule, 'id' | 'createdAt' | 'publishedAt'>): Promise<Schedule> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(
        await this.withTenantId(
          toSnakeCase({
            ...data,
            status: data.status ?? 'draft',
            publishedAt: null,
          }),
        ),
      )
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as Schedule;
  }

  async update(id: string, data: Partial<Schedule>): Promise<Schedule> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase(result) as Schedule;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    this.handleError(error, 'delete');
  }
}

export class SupabaseScheduleVersionRepository extends SupabaseBaseRepository implements IScheduleVersionRepository {
  constructor() {
    super({ tableName: 'schedule_versions', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<ScheduleVersion | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase(data) as ScheduleVersion : null;
  }

  async findBySchedule(scheduleId: string): Promise<ScheduleVersion[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('version_number', { ascending: true });

    this.handleError(error, 'findBySchedule');
    return (data ?? []).map(toCamelCase) as ScheduleVersion[];
  }

  async create(data: Omit<ScheduleVersion, 'id' | 'createdAt'>): Promise<ScheduleVersion> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(await this.withTenantId(toSnakeCase(data)))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as ScheduleVersion;
  }

  async getLatest(scheduleId: string): Promise<ScheduleVersion | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    this.handleError(error, 'getLatest');
    return data ? toCamelCase(data) as ScheduleVersion : null;
  }
}

export class SupabaseLessonRepository extends SupabaseBaseRepository implements ILessonRepository {
  constructor() {
    super({ tableName: 'lessons', tenantIdColumn: 'tenant_id' });
  }

  async findByVersion(versionId: string): Promise<Lesson[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('version_id', versionId)
      .order('day_of_week', { ascending: true })
      .order('pair_number', { ascending: true });

    this.handleError(error, 'findByVersion');
    return (data ?? []).map(toCamelCase) as Lesson[];
  }

  async create(data: Omit<Lesson, 'id'>): Promise<Lesson> {
    if (data.timeStart >= data.timeEnd) {
      throw new InvalidLessonTimeError(data.timeStart, data.timeEnd);
    }

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(await this.withTenantId(toSnakeCase(data)))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as Lesson;
  }

  async update(id: string, data: Partial<Lesson>): Promise<Lesson> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase(result) as Lesson;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    this.handleError(error, 'delete');
  }

  async deleteByVersion(versionId: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('version_id', versionId);

    this.handleError(error, 'deleteByVersion');
  }
}

export class SupabaseConflictDetector extends SupabaseBaseRepository implements IConflictDetector {
  constructor() {
    super({ tableName: 'conflicts', tenantIdColumn: 'tenant_id' });
  }

  async detect(versionId: string): Promise<Conflict[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('version_id', versionId)
      .order('created_at', { ascending: true });

    this.handleError(error, 'detect');
    return (data ?? []).map(toCamelCase) as Conflict[];
  }

  checkLesson(lesson: Omit<Lesson, 'id'>, existingLessons: Lesson[]): Conflict[] {
    const conflicts: Conflict[] = [];

    // Teacher double booked
    const teacherConflict = existingLessons.find(
      (current) =>
        current.teacherId === lesson.teacherId &&
        current.dayOfWeek === lesson.dayOfWeek &&
        current.pairNumber === lesson.pairNumber &&
        (current.weekType === lesson.weekType || current.weekType === 'all' || lesson.weekType === 'all')
    );

    if (teacherConflict) {
      conflicts.push({
        id: `conflict-${crypto.randomUUID()}`,
        versionId: lesson.versionId,
        type: 'teacher_double_booked',
        severity: 'hard',
        lessonIds: [teacherConflict.id],
        description: `Teacher ${lesson.teacherId} is double booked on day ${lesson.dayOfWeek} pair ${lesson.pairNumber}`,
      });
    }

    // Group double booked
    const groupConflict = existingLessons.find(
      (current) =>
        current.groupId === lesson.groupId &&
        current.dayOfWeek === lesson.dayOfWeek &&
        current.pairNumber === lesson.pairNumber &&
        (current.weekType === lesson.weekType || current.weekType === 'all' || lesson.weekType === 'all')
    );

    if (groupConflict) {
      conflicts.push({
        id: `conflict-${crypto.randomUUID()}`,
        versionId: lesson.versionId,
        type: 'group_double_booked',
        severity: 'hard',
        lessonIds: [groupConflict.id],
        description: `Group ${lesson.groupId} already has a lesson on day ${lesson.dayOfWeek} pair ${lesson.pairNumber}`,
      });
    }

    // Room double booked
    const roomConflict = existingLessons.find(
      (current) =>
        current.roomId === lesson.roomId &&
        current.dayOfWeek === lesson.dayOfWeek &&
        current.pairNumber === lesson.pairNumber &&
        (current.weekType === lesson.weekType || current.weekType === 'all' || lesson.weekType === 'all')
    );

    if (roomConflict) {
      conflicts.push({
        id: `conflict-${crypto.randomUUID()}`,
        versionId: lesson.versionId,
        type: 'room_double_booked',
        severity: 'hard',
        lessonIds: [roomConflict.id],
        description: `Room ${lesson.roomId} is double booked on day ${lesson.dayOfWeek} pair ${lesson.pairNumber}`,
      });
    }

    return conflicts;
  }
}

export class SupabaseConstraintEngine extends SupabaseBaseRepository implements IConstraintEngine {
  constructor() {
    super({ tableName: 'constraints', tenantIdColumn: 'tenant_id' });
  }

  async check(versionId: string): Promise<Conflict[]> {
    // Get version to find tenant
    const { data: version, error: versionError } = await this.client
      .from('schedule_versions')
      .select('schedule_id')
      .eq('id', versionId)
      .single();

    this.handleError(versionError, 'check - get version');

    if (!version) return [];

    const { data: schedule, error: scheduleError } = await this.client
      .from('schedules')
      .select('tenant_id')
      .eq('id', version.schedule_id)
      .single();

    this.handleError(scheduleError, 'check - get schedule');

    if (!schedule) return [];

    const { data: constraints, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', schedule.tenant_id)
      .eq('is_active', true);

    this.handleError(error, 'check - get constraints');

    if (!constraints || constraints.length === 0) return [];

    return constraints.map((constraint) => ({
      id: `constraint-${crypto.randomUUID()}`,
      versionId,
      type: constraint.type as Conflict['type'],
      severity: constraint.severity,
      lessonIds: [],
      description: `Constraint violation: ${constraint.type}`,
    }));
  }

  validateLesson(lesson: Lesson, versionId: string): Conflict[] {
    if (lesson.timeStart >= lesson.timeEnd) {
      return [{
        id: `conflict-${crypto.randomUUID()}`,
        versionId,
        type: 'constraint_violated',
        severity: 'hard',
        lessonIds: [lesson.id],
        description: `Lesson ${lesson.id} has invalid time range`,
      }];
    }
    return [];
  }
}

export class SupabasePublicationService extends SupabaseBaseRepository implements IPublicationService {
  constructor() {
    super({ tableName: 'schedules', tenantIdColumn: 'tenant_id' });
  }

  async publish(scheduleId: string, versionId: string, userId: string): Promise<void> {
    const { data: schedule, error: findError } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', scheduleId)
      .single();

    this.handleError(findError, 'publish - find');

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    if (schedule.status === 'published') {
      throw new ScheduleAlreadyPublishedError(scheduleId);
    }

    // Create published_schedules entry
    const { error: pubError } = await this.client
      .from('published_schedules')
      .insert({
        tenant_id: schedule.tenant_id,
        schedule_version_id: versionId,
        published_by: userId,
      });

    this.handleError(pubError, 'publish - create published_schedules');

    // Update schedule status
    const { error: updateError } = await this.client
      .from(this.tableName)
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', scheduleId);

    this.handleError(updateError, 'publish - update schedule');
  }

  async unpublish(scheduleId: string): Promise<void> {
    const { data: schedule, error: findError } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', scheduleId)
      .single();

    this.handleError(findError, 'unpublish - find');

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // Delete published_schedules entry
    const { error: delError } = await this.client
      .from('published_schedules')
      .delete()
      .eq('schedule_version_id', scheduleId);

    this.handleError(delError, 'unpublish - delete published_schedules');

    // Update schedule status
    const { error: updateError } = await this.client
      .from(this.tableName)
      .update({
        status: 'draft',
        published_at: null,
      })
      .eq('id', scheduleId);

    this.handleError(updateError, 'unpublish - update schedule');
  }
}