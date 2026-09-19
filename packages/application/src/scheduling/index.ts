// Scheduling Application Module

import {
  InvalidLessonTimeError,
  ScheduleAlreadyPublishedError,
  ScheduleVersionNotFoundError,
  type Conflict,
  type Lesson,
  type Schedule,
  type ScheduleVersion,
} from '@ordo/domain/scheduling';

// Ports
export interface IScheduleRepository {
  findById(id: string): Promise<Schedule | null>;
  findByTenantAndSemester(tenantId: string, semesterId: string): Promise<Schedule[]>;
  create(data: Omit<Schedule, 'id' | 'createdAt' | 'publishedAt'>): Promise<Schedule>;
  update(id: string, data: Partial<Schedule>): Promise<Schedule>;
  delete(id: string): Promise<void>;
}

export interface IScheduleVersionRepository {
  findById(id: string): Promise<ScheduleVersion | null>;
  findBySchedule(scheduleId: string): Promise<ScheduleVersion[]>;
  create(data: Omit<ScheduleVersion, 'id' | 'createdAt'>): Promise<ScheduleVersion>;
  getLatest(scheduleId: string): Promise<ScheduleVersion | null>;
}

export interface ILessonRepository {
  findByVersion(versionId: string): Promise<Lesson[]>;
  create(data: Omit<Lesson, 'id'>): Promise<Lesson>;
  update(id: string, data: Partial<Lesson>): Promise<Lesson>;
  delete(id: string): Promise<void>;
  deleteByVersion(versionId: string): Promise<void>;
}

export interface IConflictDetector {
  detect(versionId: string): Promise<Conflict[]>;
  checkLesson(lesson: Omit<Lesson, 'id'>, existingLessons: Lesson[]): Conflict[];
}

export interface IConstraintEngine {
  check(versionId: string): Promise<Conflict[]>;
  validateLesson(lesson: Lesson, versionId: string): Conflict[];
}

export interface IPublicationService {
  publish(scheduleId: string, versionId: string, userId: string): Promise<void>;
  unpublish(scheduleId: string): Promise<void>;
}

// DTOs
export interface CreateScheduleDTO {
  tenantId: string;
  semesterId: string;
}

export interface AddLessonDTO {
  versionId: string;
  groupId: string;
  subgroupIds: string[];
  teacherId: string;
  roomId: string;
  disciplineId: string;
  dayOfWeek: number;
  pairNumber: number;
  timeStart: string;
  timeEnd: string;
  weekType: 'all' | 'odd' | 'even';
  lessonType: 'lecture' | 'practice' | 'seminar' | 'lab';
}

export interface PublishScheduleByOwnerDTO {
  scheduleId: string;
  versionId: string;
  userId: string;
}

export interface RollbackVersionDTO {
  scheduleId: string;
  targetVersionNumber: number;
}

// Use-cases
export interface CreateScheduleUseCase {
  execute(dto: CreateScheduleDTO): Promise<Schedule>;
}

export interface AddLessonUseCase {
  execute(dto: AddLessonDTO): Promise<Lesson>;
}

export interface DetectConflictsUseCase {
  execute(versionId: string): Promise<Conflict[]>;
}

export interface PublishScheduleByOwnerUseCase {
  execute(dto: PublishScheduleByOwnerDTO): Promise<void>;
}

export interface RollbackVersionUseCase {
  execute(dto: RollbackVersionDTO): Promise<ScheduleVersion>;
}

export interface ExportScheduleUseCase {
  execute(scheduleId: string, format: 'xlsx' | 'csv'): Promise<Buffer>;
}

export class CreateScheduleUseCaseImpl implements CreateScheduleUseCase {
  constructor(private readonly scheduleRepository: IScheduleRepository) {}

  async execute(dto: CreateScheduleDTO): Promise<Schedule> {
    return this.scheduleRepository.create({
      tenantId: dto.tenantId,
      semesterId: dto.semesterId,
      status: 'draft',
    });
  }
}

export class AddLessonUseCaseImpl implements AddLessonUseCase {
  constructor(
    private readonly scheduleVersionRepository: IScheduleVersionRepository,
    private readonly lessonRepository: ILessonRepository,
  ) {}

  async execute(dto: AddLessonDTO): Promise<Lesson> {
    const version = await this.scheduleVersionRepository.findById(dto.versionId);
    if (!version) {
      throw new ScheduleVersionNotFoundError(dto.versionId);
    }

    if (dto.timeStart >= dto.timeEnd) {
      throw new InvalidLessonTimeError(dto.timeStart, dto.timeEnd);
    }

    return this.lessonRepository.create({
      versionId: dto.versionId,
      groupId: dto.groupId,
      subgroupIds: dto.subgroupIds,
      teacherId: dto.teacherId,
      roomId: dto.roomId,
      disciplineId: dto.disciplineId,
      dayOfWeek: dto.dayOfWeek,
      pairNumber: dto.pairNumber,
      timeStart: dto.timeStart,
      timeEnd: dto.timeEnd,
      weekType: dto.weekType,
      lessonType: dto.lessonType,
    });
  }
}

export class DetectConflictsUseCaseImpl implements DetectConflictsUseCase {
  constructor(private readonly conflictDetector: IConflictDetector) {}

  async execute(versionId: string): Promise<Conflict[]> {
    return this.conflictDetector.detect(versionId);
  }
}

export class PublishScheduleByOwnerUseCaseImpl implements PublishScheduleByOwnerUseCase {
  constructor(
    private readonly scheduleRepository: IScheduleRepository,
    private readonly publicationService: IPublicationService,
  ) {}

  async execute(dto: PublishScheduleByOwnerDTO): Promise<void> {
    const schedule = await this.scheduleRepository.findById(dto.scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${dto.scheduleId}`);
    }

    if (schedule.status === 'published') {
      throw new ScheduleAlreadyPublishedError(dto.scheduleId);
    }

    await this.publicationService.publish(dto.scheduleId, dto.versionId, dto.userId);
  }
}

export class RollbackVersionUseCaseImpl implements RollbackVersionUseCase {
  constructor(
    private readonly scheduleRepository: IScheduleRepository,
    private readonly versionRepository: IScheduleVersionRepository,
  ) {}

  async execute(dto: RollbackVersionDTO): Promise<ScheduleVersion> {
    const schedule = await this.scheduleRepository.findById(dto.scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${dto.scheduleId}`);
    }

    const versions = await this.versionRepository.findBySchedule(dto.scheduleId);
    const target = versions.find((version) => version.versionNumber === dto.targetVersionNumber);

    if (!target) {
      throw new ScheduleVersionNotFoundError(`version-${dto.targetVersionNumber}`);
    }

    return target;
  }
}

export class ExportScheduleUseCaseImpl implements ExportScheduleUseCase {
  constructor(
    private readonly scheduleRepository: IScheduleRepository,
    private readonly versionRepository: IScheduleVersionRepository,
  ) {}

  async execute(scheduleId: string, format: 'xlsx' | 'csv'): Promise<Buffer> {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    const versions = await this.versionRepository.findBySchedule(scheduleId);
    const payload = {
      schedule,
      versions,
      format,
      exportedAt: new Date().toISOString(),
    };

    return Buffer.from(JSON.stringify(payload, null, 2));
  }
}