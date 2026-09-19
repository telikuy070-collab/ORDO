// Resources Application Module

import {
  DuplicatePreferenceError,
  InvalidRoomCapacityError,
  RoomNotAvailableError,
  TeacherNotFoundError,
  type Building,
  type Room,
  type Teacher,
  type TeacherPreference,
} from '@ordo/domain';

// Ports
export interface ITeacherRepository {
  findById(id: string): Promise<Teacher | null>;
  findByTenant(tenantId: string): Promise<Teacher[]>;
  findByUserId(userId: string): Promise<Teacher | null>;
  create(data: Omit<Teacher, 'id'>): Promise<Teacher>;
  update(id: string, data: Partial<Teacher>): Promise<Teacher>;
  delete(id: string): Promise<void>;
}

export interface IRoomRepository {
  findById(id: string): Promise<Room | null>;
  findByTenant(tenantId: string): Promise<Room[]>;
  findByBuilding(buildingId: string): Promise<Room[]>;
  findAvailable(tenantId: string, dayOfWeek: number, pairNumber: number, weekType: string): Promise<Room[]>;
  create(data: Omit<Room, 'id'>): Promise<Room>;
  update(id: string, data: Partial<Room>): Promise<Room>;
  delete(id: string): Promise<void>;
}

export interface IBuildingRepository {
  findById(id: string): Promise<Building | null>;
  findByTenant(tenantId: string): Promise<Building[]>;
  create(data: Omit<Building, 'id'>): Promise<Building>;
  update(id: string, data: Partial<Building>): Promise<Building>;
  delete(id: string): Promise<void>;
}

export interface IPreferenceRepository {
  findByTeacher(teacherId: string): Promise<TeacherPreference[]>;
  findByTenant(tenantId: string): Promise<TeacherPreference[]>;
  create(data: Omit<TeacherPreference, 'id'>): Promise<TeacherPreference>;
  update(id: string, data: Partial<TeacherPreference>): Promise<TeacherPreference>;
  delete(id: string): Promise<void>;
}

// DTOs
export interface CreateTeacherDTO {
  tenantId: string;
  fullName: string;
  email: string;
  phone: string;
  userId?: string;
}

export interface SubmitPreferenceDTO {
  teacherId: string;
  type: 'cannot' | 'prefer' | 'max_per_day';
  dayOfWeek: number;
  pairNumber: number;
  value: Record<string, unknown>;
  comment?: string;
}

export interface AssignRoomDTO {
  lessonId: string;
  roomId: string;
}

export interface GetTeacherLoadDTO {
  teacherId: string;
  semesterId: string;
}

// Use-cases
export interface CreateTeacherUseCase {
  execute(dto: CreateTeacherDTO): Promise<Teacher>;
}

export interface SubmitPreferenceUseCase {
  execute(dto: SubmitPreferenceDTO): Promise<TeacherPreference>;
}

export interface GetTeacherWorkloadUseCase {
  execute(dto: GetTeacherLoadDTO): Promise<{ totalHours: number; byDiscipline: Record<string, number> }>;
}

export interface AssignRoomUseCase {
  execute(dto: AssignRoomDTO): Promise<void>;
}

export interface GetAvailableRoomsUseCase {
  execute(tenantId: string, dayOfWeek: number, pairNumber: number, weekType: string): Promise<Room[]>;
}

export class CreateTeacherUseCaseImpl implements CreateTeacherUseCase {
  constructor(private readonly teacherRepository: ITeacherRepository) {}

  async execute(dto: CreateTeacherDTO): Promise<Teacher> {
    const teacher = await this.teacherRepository.create({
      tenantId: dto.tenantId,
      fullName: dto.fullName.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone.trim(),
      isActive: true,
      userId: dto.userId ?? null,
    });

    return teacher;
  }
}

export class SubmitPreferenceUseCaseImpl implements SubmitPreferenceUseCase {
  constructor(
    private readonly teacherRepository: ITeacherRepository,
    private readonly preferenceRepository: IPreferenceRepository,
  ) {}

  async execute(dto: SubmitPreferenceDTO): Promise<TeacherPreference> {
    const teacher = await this.teacherRepository.findById(dto.teacherId);
    if (!teacher) {
      throw new TeacherNotFoundError(dto.teacherId);
    }

    const existing = await this.preferenceRepository.findByTeacher(dto.teacherId);
    const duplicate = existing.some(
      (preference) =>
        preference.type === dto.type &&
        preference.dayOfWeek === dto.dayOfWeek &&
        preference.pairNumber === dto.pairNumber,
    );

    if (duplicate) {
      throw new DuplicatePreferenceError(dto.teacherId, dto.type, dto.dayOfWeek, dto.pairNumber);
    }

    return this.preferenceRepository.create({
      teacherId: dto.teacherId,
      type: dto.type,
      dayOfWeek: dto.dayOfWeek,
      pairNumber: dto.pairNumber,
      value: dto.value,
      status: 'pending',
      comment: dto.comment ?? '',
    });
  }
}

export class GetTeacherWorkloadUseCaseImpl implements GetTeacherWorkloadUseCase {
  constructor(private readonly preferenceRepository: IPreferenceRepository) {}

  async execute(dto: GetTeacherLoadDTO): Promise<{ totalHours: number; byDiscipline: Record<string, number> }> {
    const preferences = await this.preferenceRepository.findByTeacher(dto.teacherId);

    const totalHours = preferences.reduce((sum, entry) => sum + (entry.pairNumber > 0 ? 2 : 0), 0);
    const byDiscipline: Record<string, number> = {};

    for (const preference of preferences) {
      const label = `${preference.type}-${preference.dayOfWeek}-${preference.pairNumber}`;
      byDiscipline[label] = (byDiscipline[label] ?? 0) + 2;
    }

    return {
      totalHours,
      byDiscipline,
    };
  }
}

export class AssignRoomUseCaseImpl implements AssignRoomUseCase {
  constructor(private readonly roomRepository: IRoomRepository) {}

  async execute(dto: AssignRoomDTO): Promise<void> {
    const room = await this.roomRepository.findById(dto.roomId);
    if (!room) {
      throw new RoomNotAvailableError(dto.roomId);
    }

    if (room.capacity <= 0) {
      throw new InvalidRoomCapacityError(room.capacity);
    }

    void dto.lessonId;
  }
}

export class GetAvailableRoomsUseCaseImpl implements GetAvailableRoomsUseCase {
  constructor(private readonly roomRepository: IRoomRepository) {}

  async execute(
    tenantId: string,
    dayOfWeek: number,
    pairNumber: number,
    weekType: string,
  ): Promise<Room[]> {
    return this.roomRepository.findAvailable(tenantId, dayOfWeek, pairNumber, weekType);
  }
}