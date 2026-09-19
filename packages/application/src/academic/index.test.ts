import { describe, expect, it } from 'vitest';

import type { Curriculum, Group, Specialty } from '@ordo/domain/academic';

import {
  AssignCurriculumUseCaseImpl,
  CreateGroupUseCaseImpl,
  CreateSpecialtyUseCaseImpl,
  type ICurriculumRepository,
  type IGroupRepository,
  type ISpecialtyRepository,
  type AssignCurriculumDTO,
  type CreateGroupDTO,
  type CreateSpecialtyDTO,
} from './index';

class InMemorySpecialtyRepository implements ISpecialtyRepository {
  private readonly items = new Map<string, Specialty>();

  async findById(id: string): Promise<Specialty | null> {
    return this.items.get(id) ?? null;
  }

  async findByTenant(tenantId: string): Promise<Specialty[]> {
    return [...this.items.values()].filter((item) => item.tenantId === tenantId);
  }

  async create(data: Omit<Specialty, 'id'>): Promise<Specialty> {
    const specialty: Specialty = { ...data, id: crypto.randomUUID() };
    this.items.set(specialty.id, specialty);
    return specialty;
  }

  async update(id: string, data: Partial<Specialty>): Promise<Specialty> {
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`Specialty not found: ${id}`);
    }

    const next = { ...current, ...data };
    this.items.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

class InMemoryGroupRepository implements IGroupRepository {
  private readonly items = new Map<string, Group>();

  async findById(id: string): Promise<Group | null> {
    return this.items.get(id) ?? null;
  }

  async findByTenant(tenantId: string): Promise<Group[]> {
    return [...this.items.values()].filter((item) => item.tenantId === tenantId);
  }

  async findBySpecialty(specialtyId: string): Promise<Group[]> {
    return [...this.items.values()].filter((item) => item.specialtyId === specialtyId);
  }

  async create(data: Omit<Group, 'id'>): Promise<Group> {
    const group: Group = { ...data, id: crypto.randomUUID() };
    this.items.set(group.id, group);
    return group;
  }

  async update(id: string, data: Partial<Group>): Promise<Group> {
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`Group not found: ${id}`);
    }

    const next = { ...current, ...data };
    this.items.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

class InMemoryCurriculumRepository implements ICurriculumRepository {
  private readonly items = new Map<string, Curriculum>();

  async findByGroup(groupId: string): Promise<Curriculum[]> {
    return [...this.items.values()].filter((item) => item.groupId === groupId);
  }

  async findByGroupAndDiscipline(groupId: string, disciplineId: string): Promise<Curriculum | null> {
    return (
      [...this.items.values()].find(
        (item) => item.groupId === groupId && item.disciplineId === disciplineId,
      ) ?? null
    );
  }

  async assign(data: Omit<Curriculum, 'id'>): Promise<Curriculum> {
    const curriculum: Curriculum = { ...data, id: crypto.randomUUID() };
    this.items.set(curriculum.id, curriculum);
    return curriculum;
  }

  async update(id: string, data: Partial<Curriculum>): Promise<Curriculum> {
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`Curriculum not found: ${id}`);
    }

    const next = { ...current, ...data };
    this.items.set(id, next);
    return next;
  }

  async remove(groupId: string, disciplineId: string): Promise<void> {
    const current = [...this.items.values()].find(
      (item) => item.groupId === groupId && item.disciplineId === disciplineId,
    );

    if (current) {
      this.items.delete(current.id);
    }
  }
}

describe('academic application use cases', () => {
  it('creates a specialty for a tenant', async () => {
    const repo = new InMemorySpecialtyRepository();
    const useCase = new CreateSpecialtyUseCaseImpl(repo);

    const dto: CreateSpecialtyDTO = {
      tenantId: 'tenant-1',
      code: 'MED',
      name: 'Medicine',
    };

    const result = await useCase.execute(dto);

    expect(result.tenantId).toBe('tenant-1');
    expect(result.code).toBe('MED');
    expect(result.name).toBe('Medicine');
  });

  it('creates a group under a specialty', async () => {
    const specialtyRepo = new InMemorySpecialtyRepository();
    const groupRepo = new InMemoryGroupRepository();
    const specialty = await specialtyRepo.create({
      tenantId: 'tenant-1',
      code: 'MED',
      name: 'Medicine',
      isActive: true,
    });

    const useCase = new CreateGroupUseCaseImpl(groupRepo, specialtyRepo);
    const dto: CreateGroupDTO = {
      tenantId: 'tenant-1',
      specialtyId: specialty.id,
      code: '2024-A',
      course: 2,
      semesterNumber: 4,
    };

    const result = await useCase.execute(dto);

    expect(result.specialtyId).toBe(specialty.id);
    expect(result.code).toBe('2024-A');
    expect(result.isActive).toBe(true);
  });

  it('assigns curriculum and validates weekly load', async () => {
    const repo = new InMemoryCurriculumRepository();
    const useCase = new AssignCurriculumUseCaseImpl(repo);

    const dto: AssignCurriculumDTO = {
      groupId: 'group-1',
      disciplineId: 'discipline-1',
      credits: 6,
      lectureHours: 24,
      practiceHours: 16,
      totalHours: 40,
      controlType: 'exam',
      weeklyLoad: [2, 2, 2, 2, 2, 1],
    };

    const result = await useCase.execute(dto);

    expect(result.groupId).toBe('group-1');
    expect(result.disciplineId).toBe('discipline-1');
    expect(result.totalHours).toBe(40);
  });
});
