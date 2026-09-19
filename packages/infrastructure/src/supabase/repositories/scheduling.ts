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
  ScheduleVersionNotFoundError,
  type Conflict,
  type Constraint,
  type Lesson,
  type Schedule,
  type ScheduleVersion,
} from '@ordo/domain/scheduling';

export class SupabaseScheduleRepository implements IScheduleRepository {
  private readonly schedules = new Map<string, Schedule>();

  async findById(id: string): Promise<Schedule | null> {
    return this.schedules.get(id) ?? null;
  }

  async findByTenantAndSemester(tenantId: string, semesterId: string): Promise<Schedule[]> {
    return [...this.schedules.values()].filter(
      (schedule) => schedule.tenantId === tenantId && schedule.semesterId === semesterId,
    );
  }

  async create(data: Omit<Schedule, 'id' | 'createdAt' | 'publishedAt'>): Promise<Schedule> {
    const schedule: Schedule = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      publishedAt: null,
    };

    this.schedules.set(schedule.id, schedule);
    return schedule;
  }

  async update(id: string, data: Partial<Schedule>): Promise<Schedule> {
    const current = this.schedules.get(id);
    if (!current) {
      throw new Error(`Schedule not found: ${id}`);
    }

    const next: Schedule = { ...current, ...data };
    this.schedules.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.schedules.delete(id);
  }
}

export class SupabaseScheduleVersionRepository implements IScheduleVersionRepository {
  private readonly versions = new Map<string, ScheduleVersion>();

  async findById(id: string): Promise<ScheduleVersion | null> {
    return this.versions.get(id) ?? null;
  }

  async findBySchedule(scheduleId: string): Promise<ScheduleVersion[]> {
    return [...this.versions.values()].filter((version) => version.scheduleId === scheduleId);
  }

  async create(data: Omit<ScheduleVersion, 'id' | 'createdAt'>): Promise<ScheduleVersion> {
    const version: ScheduleVersion = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.versions.set(version.id, version);
    return version;
  }

  async getLatest(scheduleId: string): Promise<ScheduleVersion | null> {
    const versions = await this.findBySchedule(scheduleId);
    return versions.reduce<ScheduleVersion | null>((latest, version) => {
      if (!latest || version.versionNumber > latest.versionNumber) {
        return version;
      }

      return latest;
    }, null);
  }
}

export class SupabaseLessonRepository implements ILessonRepository {
  private readonly lessons = new Map<string, Lesson>();

  async findByVersion(versionId: string): Promise<Lesson[]> {
    return [...this.lessons.values()].filter((lesson) => lesson.versionId === versionId);
  }

  async create(data: Omit<Lesson, 'id'>): Promise<Lesson> {
    if (data.timeStart >= data.timeEnd) {
      throw new InvalidLessonTimeError(data.timeStart, data.timeEnd);
    }

    const lesson: Lesson = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.lessons.set(lesson.id, lesson);
    return lesson;
  }

  async update(id: string, data: Partial<Lesson>): Promise<Lesson> {
    const current = this.lessons.get(id);
    if (!current) {
      throw new ScheduleVersionNotFoundError(id);
    }

    const next: Lesson = { ...current, ...data };
    this.lessons.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.lessons.delete(id);
  }

  async deleteByVersion(versionId: string): Promise<void> {
    for (const [id, lesson] of this.lessons.entries()) {
      if (lesson.versionId === versionId) {
        this.lessons.delete(id);
      }
    }
  }
}

export class SupabaseConflictDetector implements IConflictDetector {
  private readonly conflicts = new Map<string, Conflict[]>();

  async detect(versionId: string): Promise<Conflict[]> {
    return this.conflicts.get(versionId) ?? [];
  }

  checkLesson(lesson: Omit<Lesson, 'id'>, existingLessons: Lesson[]): Conflict[] {
    const teacherDoubleBooked = existingLessons.some(
      (current) =>
        current.teacherId === lesson.teacherId &&
        current.dayOfWeek === lesson.dayOfWeek &&
        current.pairNumber === lesson.pairNumber,
    );

    if (teacherDoubleBooked) {
      return [
        {
          id: `conflict-${crypto.randomUUID()}`,
          versionId: lesson.versionId,
          type: 'teacher_double_booked',
          severity: 'hard',
          lessonIds: [lesson.teacherId],
          description: `Teacher ${lesson.teacherId} is double booked`,
        },
      ];
    }

    return [];
  }
}

export class SupabaseConstraintEngine implements IConstraintEngine {
  private readonly constraints = new Map<string, Constraint[]>();

  async check(versionId: string): Promise<Conflict[]> {
    const constraints = this.constraints.get(versionId) ?? [];
    if (constraints.length === 0) {
      return [];
    }

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
    void versionId;

    if (lesson.timeStart >= lesson.timeEnd) {
      return [
        {
          id: `conflict-${crypto.randomUUID()}`,
          versionId,
          type: 'constraint_violated',
          severity: 'hard',
          lessonIds: [lesson.id],
          description: `Lesson ${lesson.id} has invalid time range`,
        },
      ];
    }

    return [];
  }
}

export class SupabasePublicationService implements IPublicationService {
  private readonly schedules = new Map<string, Schedule>();

  async publish(scheduleId: string, versionId: string, userId: string): Promise<void> {
    const current = this.schedules.get(scheduleId);
    if (!current) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    if (current.status === 'published') {
      throw new ScheduleAlreadyPublishedError(scheduleId);
    }

    this.schedules.set(scheduleId, {
      ...current,
      status: 'published',
      publishedAt: new Date(),
    });

    void versionId;
    void userId;
  }

  async unpublish(scheduleId: string): Promise<void> {
    const current = this.schedules.get(scheduleId);
    if (!current) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    this.schedules.set(scheduleId, {
      ...current,
      status: 'draft',
      publishedAt: null,
    });
  }
}
