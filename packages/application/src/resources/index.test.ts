import { describe, expect, it } from 'vitest';

import type { Room, Teacher, TeacherPreference } from '@ordo/domain';

import {
  CreateTeacherUseCaseImpl,
  GetAvailableRoomsUseCaseImpl,
  SubmitPreferenceUseCaseImpl,
  type IPreferenceRepository,
  type IRoomRepository,
  type ITeacherRepository,
  type CreateTeacherDTO,
  type SubmitPreferenceDTO,
} from './index';

class InMemoryTeacherRepository implements ITeacherRepository {
  private readonly items = new Map<string, Teacher>();

  async findById(id: string): Promise<Teacher | null> {
    return this.items.get(id) ?? null;
  }

  async findByTenant(tenantId: string): Promise<Teacher[]> {
    return [...this.items.values()].filter((item) => item.tenantId === tenantId);
  }

  async findByUserId(userId: string): Promise<Teacher | null> {
    return [...this.items.values()].find((item) => item.userId === userId) ?? null;
  }

  async create(data: Omit<Teacher, 'id'>): Promise<Teacher> {
    const teacher: Teacher = { ...data, id: crypto.randomUUID() };
    this.items.set(teacher.id, teacher);
    return teacher;
  }

  async update(id: string, data: Partial<Teacher>): Promise<Teacher> {
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`Teacher not found: ${id}`);
    }

    const next = { ...current, ...data };
    this.items.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

class InMemoryRoomRepository implements IRoomRepository {
  private readonly items = new Map<string, Room>();

  async findById(id: string): Promise<Room | null> {
    return this.items.get(id) ?? null;
  }

  async findByTenant(tenantId: string): Promise<Room[]> {
    return [...this.items.values()].filter((item) => item.tenantId === tenantId);
  }

  async findByBuilding(buildingId: string): Promise<Room[]> {
    return [...this.items.values()].filter((item) => item.buildingId === buildingId);
  }

  async findAvailable(tenantId: string, dayOfWeek: number, pairNumber: number, weekType: string): Promise<Room[]> {
    void dayOfWeek;
    void pairNumber;
    void weekType;

    return [...this.items.values()].filter((item) => item.tenantId === tenantId && item.capacity > 0);
  }

  async create(data: Omit<Room, 'id'>): Promise<Room> {
    const room: Room = { ...data, id: crypto.randomUUID() };
    this.items.set(room.id, room);
    return room;
  }

  async update(id: string, data: Partial<Room>): Promise<Room> {
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`Room not found: ${id}`);
    }

    const next = { ...current, ...data };
    this.items.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

class InMemoryPreferenceRepository implements IPreferenceRepository {
  private readonly items = new Map<string, TeacherPreference>();

  async findByTeacher(teacherId: string): Promise<TeacherPreference[]> {
    return [...this.items.values()].filter((item) => item.teacherId === teacherId);
  }

  async findByTenant(tenantId: string): Promise<TeacherPreference[]> {
    return [...this.items.values()].filter((item) => {
      return item.teacherId.startsWith(tenantId) || tenantId.length === 0;
    });
  }

  async create(data: Omit<TeacherPreference, 'id'>): Promise<TeacherPreference> {
    const preference: TeacherPreference = { ...data, id: crypto.randomUUID() };
    this.items.set(preference.id, preference);
    return preference;
  }

  async update(id: string, data: Partial<TeacherPreference>): Promise<TeacherPreference> {
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`Preference not found: ${id}`);
    }

    const next = { ...current, ...data };
    this.items.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

describe('resources application use cases', () => {
  it('creates a teacher', async () => {
    const repo = new InMemoryTeacherRepository();
    const useCase = new CreateTeacherUseCaseImpl(repo);

    const dto: CreateTeacherDTO = {
      tenantId: 'tenant-1',
      fullName: 'Anna Petrova',
      email: 'anna@college.edu',
      phone: '+7 900 123 45 67',
      userId: 'user-42',
    };

    const result = await useCase.execute(dto);

    expect(result.tenantId).toBe('tenant-1');
    expect(result.email).toBe('anna@college.edu');
    expect(result.userId).toBe('user-42');
  });

  it('submits a preference for a teacher', async () => {
    const teacherRepo = new InMemoryTeacherRepository();
    const preferenceRepo = new InMemoryPreferenceRepository();
    const teacher = await teacherRepo.create({
      tenantId: 'tenant-1',
      fullName: 'Anna Petrova',
      email: 'anna@college.edu',
      phone: '+7 900 123 45 67',
      isActive: true,
      userId: 'user-42',
    });

    const useCase = new SubmitPreferenceUseCaseImpl(teacherRepo, preferenceRepo);
    const dto: SubmitPreferenceDTO = {
      teacherId: teacher.id,
      type: 'prefer',
      dayOfWeek: 2,
      pairNumber: 3,
      value: { note: 'prefer morning' },
      comment: 'Morning is best',
    };

    const result = await useCase.execute(dto);

    expect(result.teacherId).toBe(teacher.id);
    expect(result.type).toBe('prefer');
    expect(result.status).toBe('pending');
  });

  it('lists available rooms for a tenant', async () => {
    const repo = new InMemoryRoomRepository();
    await repo.create({
      tenantId: 'tenant-1',
      buildingId: 'building-1',
      number: 'A-101',
      capacity: 60,
      type: 'lecture',
    });

    const useCase = new GetAvailableRoomsUseCaseImpl(repo);
    const rooms = await useCase.execute('tenant-1', 1, 2, 'all');

    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.number).toBe('A-101');
  });
});
