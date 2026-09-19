import { describe, expect, it } from 'vitest';

import type { Conflict, Lesson, Schedule, ScheduleVersion } from '@ordo/domain';

import {
  AddLessonUseCaseImpl,
  CreateScheduleUseCaseImpl,
  DetectConflictsUseCaseImpl,
  PublishScheduleByOwnerUseCaseImpl,
  type AddLessonDTO,
  type CreateScheduleDTO,
  type ILessonRepository,
  type IConflictDetector,
  type IPublicationService,
  type IScheduleRepository,
  type IScheduleVersionRepository,
} from './index';

class InMemoryScheduleRepository implements IScheduleRepository {
  private readonly items = new Map<string, Schedule>();

  async findById(id: string): Promise<Schedule | null> {
    return this.items.get(id) ?? null;
  }

  async findByTenantAndSemester(tenantId: string, semesterId: string): Promise<Schedule[]> {
    return [...this.items.values()].filter(
      (item) => item.tenantId === tenantId && item.semesterId === semesterId,
    );
  }

  async create(data: Omit<Schedule, 'id' | 'createdAt' | 'publishedAt'>): Promise<Schedule> {
    const schedule: Schedule = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      publishedAt: null,
    };

    this.items.set(schedule.id, schedule);
    return schedule;
  }

  async update(id: string, data: Partial<Schedule>): Promise<Schedule> {
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`Schedule not found: ${id}`);
    }

    const next: Schedule = { ...current, ...data };
    this.items.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

class InMemoryScheduleVersionRepository implements IScheduleVersionRepository {
  private readonly items = new Map<string, ScheduleVersion>();

  async findById(id: string): Promise<ScheduleVersion | null> {
    return this.items.get(id) ?? null;
  }

  async findBySchedule(scheduleId: string): Promise<ScheduleVersion[]> {
    return [...this.items.values()].filter((item) => item.scheduleId === scheduleId);
  }

  async create(data: Omit<ScheduleVersion, 'id' | 'createdAt'>): Promise<ScheduleVersion> {
    const version: ScheduleVersion = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.items.set(version.id, version);
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

class InMemoryLessonRepository implements ILessonRepository {
  private readonly items = new Map<string, Lesson>();

  async findByVersion(versionId: string): Promise<Lesson[]> {
    return [...this.items.values()].filter((item) => item.versionId === versionId);
  }

  async create(data: Omit<Lesson, 'id'>): Promise<Lesson> {
    const lesson: Lesson = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.items.set(lesson.id, lesson);
    return lesson;
  }

  async update(id: string, data: Partial<Lesson>): Promise<Lesson> {
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`Lesson not found: ${id}`);
    }

    const next: Lesson = { ...current, ...data };
    this.items.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async deleteByVersion(versionId: string): Promise<void> {
    for (const [id, lesson] of this.items.entries()) {
      if (lesson.versionId === versionId) {
        this.items.delete(id);
      }
    }
  }
}

class StubConflictDetector implements IConflictDetector {
  async detect(versionId: string): Promise<Conflict[]> {
    return [
      {
        id: `conflict-${versionId}`,
        versionId,
        type: 'teacher_double_booked',
        severity: 'hard',
        lessonIds: [versionId],
        description: 'Teacher conflict',
      },
    ];
  }

  checkLesson(_lesson: Omit<Lesson, 'id'>, _existingLessons: Lesson[]): Conflict[] {
    return [];
  }
}

class StubPublicationService implements IPublicationService {
  async publish(_scheduleId: string, _versionId: string, _userId: string): Promise<void> {
    return;
  }

  async unpublish(_scheduleId: string): Promise<void> {
    return;
  }
}

describe('scheduling application use cases', () => {
  it('creates a draft schedule for a tenant and semester', async () => {
    const repo = new InMemoryScheduleRepository();
    const useCase = new CreateScheduleUseCaseImpl(repo);

    const dto: CreateScheduleDTO = {
      tenantId: 'tenant-1',
      semesterId: 'semester-2',
    };

    const result = await useCase.execute(dto);

    expect(result.tenantId).toBe('tenant-1');
    expect(result.semesterId).toBe('semester-2');
    expect(result.status).toBe('draft');
  });

  it('adds a lesson and validates time ordering', async () => {
    const versionRepo = new InMemoryScheduleVersionRepository();
    const lessonRepo = new InMemoryLessonRepository();
    const useCase = new AddLessonUseCaseImpl(versionRepo, lessonRepo);

    const version = await versionRepo.create({
      scheduleId: 'schedule-1',
      versionNumber: 1,
      authorId: 'user-1',
      comment: 'initial',
    });

    const dto: AddLessonDTO = {
      versionId: version.id,
      groupId: 'group-1',
      subgroupIds: ['sub-1'],
      teacherId: 'teacher-1',
      roomId: 'room-1',
      disciplineId: 'discipline-1',
      dayOfWeek: 2,
      pairNumber: 3,
      timeStart: '09:30',
      timeEnd: '08:00',
      weekType: 'all',
      lessonType: 'lecture',
    };

    await expect(useCase.execute(dto)).rejects.toThrow('Lesson time must be valid');
  });

  it('detects conflicts for a version', async () => {
    const detector = new StubConflictDetector();
    const useCase = new DetectConflictsUseCaseImpl(detector);

    const result = await useCase.execute('version-42');

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe('teacher_double_booked');
  });

  it('publishes a draft schedule by owner', async () => {
    const scheduleRepo = new InMemoryScheduleRepository();
    const publicationService = new StubPublicationService();
    const schedule = await scheduleRepo.create({
      tenantId: 'tenant-1',
      semesterId: 'semester-2',
      status: 'draft',
    });

    const useCase = new PublishScheduleByOwnerUseCaseImpl(scheduleRepo, publicationService);

    await expect(
      useCase.execute({
        scheduleId: schedule.id,
        versionId: 'version-1',
        userId: 'owner-1',
      }),
    ).resolves.toBeUndefined();
  });
});
