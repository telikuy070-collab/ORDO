// Academic Application Module

import {
  GroupCodeAlreadyExistsError,
  InvalidWeeklyLoadError,
  SpecialtyHasActiveGroupsError,
  type Curriculum,
  type Discipline,
  type Group,
  type Semester,
  type Specialty,
} from '@ordo/domain/academic';

// Ports
export interface ISpecialtyRepository {
  findById(id: string): Promise<Specialty | null>;
  findByTenant(tenantId: string): Promise<Specialty[]>;
  create(data: Omit<Specialty, 'id'>): Promise<Specialty>;
  update(id: string, data: Partial<Specialty>): Promise<Specialty>;
  delete(id: string): Promise<void>;
}

export interface IGroupRepository {
  findById(id: string): Promise<Group | null>;
  findByTenant(tenantId: string): Promise<Group[]>;
  findBySpecialty(specialtyId: string): Promise<Group[]>;
  create(data: Omit<Group, 'id'>): Promise<Group>;
  update(id: string, data: Partial<Group>): Promise<Group>;
  delete(id: string): Promise<void>;
}

export interface ISemesterRepository {
  findActive(tenantId: string): Promise<Semester | null>;
  create(data: Omit<Semester, 'id'>): Promise<Semester>;
  update(id: string, data: Partial<Semester>): Promise<Semester>;
}

export interface IDisciplineRepository {
  findById(id: string): Promise<Discipline | null>;
  findByTenant(tenantId: string): Promise<Discipline[]>;
  create(data: Omit<Discipline, 'id'>): Promise<Discipline>;
  update(id: string, data: Partial<Discipline>): Promise<Discipline>;
}

export interface ICurriculumRepository {
  findByGroup(groupId: string): Promise<Curriculum[]>;
  findByGroupAndDiscipline(groupId: string, disciplineId: string): Promise<Curriculum | null>;
  assign(data: Omit<Curriculum, 'id'>): Promise<Curriculum>;
  update(id: string, data: Partial<Curriculum>): Promise<Curriculum>;
  remove(groupId: string, disciplineId: string): Promise<void>;
}

// DTOs
export interface CreateSpecialtyDTO {
  tenantId: string;
  code: string;
  name: string;
}

export interface CreateGroupDTO {
  tenantId: string;
  specialtyId: string;
  code: string;
  course: number;
  semesterNumber: number;
}

export interface CreateSemesterDTO {
  tenantId: string;
  number: number;
  startDate: Date;
  endDate: Date;
  weeksCount: number;
}

export interface AssignCurriculumDTO {
  groupId: string;
  disciplineId: string;
  credits: number;
  lectureHours: number;
  practiceHours: number;
  totalHours: number;
  controlType: string;
  weeklyLoad: number[];
}

// Use-cases
export interface CreateSpecialtyUseCase {
  execute(dto: CreateSpecialtyDTO): Promise<Specialty>;
}

export interface CreateGroupUseCase {
  execute(dto: CreateGroupDTO): Promise<Group>;
}

export interface CreateSemesterUseCase {
  execute(dto: CreateSemesterDTO): Promise<Semester>;
}

export interface AssignCurriculumUseCase {
  execute(dto: AssignCurriculumDTO): Promise<Curriculum>;
}

const validateWeeklyLoad = (weeklyLoad: number[], expected: number): void => {
  if (weeklyLoad.length !== expected) {
    throw new InvalidWeeklyLoadError(expected, weeklyLoad.length);
  }

  if (weeklyLoad.some((entry) => entry < 0)) {
    throw new InvalidWeeklyLoadError(expected, weeklyLoad.length);
  }
};

export class CreateSpecialtyUseCaseImpl implements CreateSpecialtyUseCase {
  constructor(private readonly specialtyRepository: ISpecialtyRepository) {}

  async execute(dto: CreateSpecialtyDTO): Promise<Specialty> {
    const existing = await this.specialtyRepository.findByTenant(dto.tenantId);
    const duplicate = existing.find((specialty) => specialty.code.toLowerCase() === dto.code.toLowerCase());

    if (duplicate) {
      throw new GroupCodeAlreadyExistsError(dto.code, dto.tenantId);
    }

    return this.specialtyRepository.create({
      tenantId: dto.tenantId,
      code: dto.code.trim(),
      name: dto.name.trim(),
      isActive: true,
    });
  }
}

export class CreateGroupUseCaseImpl implements CreateGroupUseCase {
  constructor(
    private readonly groupRepository: IGroupRepository,
    private readonly specialtyRepository: ISpecialtyRepository,
  ) {}

  async execute(dto: CreateGroupDTO): Promise<Group> {
    const specialty = await this.specialtyRepository.findById(dto.specialtyId);
    if (!specialty) {
      throw new SpecialtyHasActiveGroupsError(dto.specialtyId);
    }

    const groups = await this.groupRepository.findByTenant(dto.tenantId);
    const duplicate = groups.find((group) => group.code.toLowerCase() === dto.code.toLowerCase());
    if (duplicate) {
      throw new GroupCodeAlreadyExistsError(dto.code, dto.tenantId);
    }

    return this.groupRepository.create({
      tenantId: dto.tenantId,
      specialtyId: dto.specialtyId,
      code: dto.code.trim(),
      course: dto.course,
      semesterNumber: dto.semesterNumber,
      isActive: true,
    });
  }
}

export class CreateSemesterUseCaseImpl implements CreateSemesterUseCase {
  constructor(private readonly semesterRepository: ISemesterRepository) {}

  async execute(dto: CreateSemesterDTO): Promise<Semester> {
    if (dto.endDate <= dto.startDate) {
      throw new Error('Semester end date must be after start date');
    }

    return this.semesterRepository.create({
      tenantId: dto.tenantId,
      number: dto.number,
      startDate: dto.startDate,
      endDate: dto.endDate,
      weeksCount: dto.weeksCount,
      isActive: true,
    });
  }
}

export class AssignCurriculumUseCaseImpl implements AssignCurriculumUseCase {
  constructor(private readonly curriculumRepository: ICurriculumRepository) {}

  async execute(dto: AssignCurriculumDTO): Promise<Curriculum> {
    validateWeeklyLoad(dto.weeklyLoad, 6);

    const total = dto.lectureHours + dto.practiceHours;
    if (Math.abs(total - dto.totalHours) > 1) {
      throw new InvalidWeeklyLoadError(6, dto.weeklyLoad.length);
    }

    const existing = await this.curriculumRepository.findByGroupAndDiscipline(dto.groupId, dto.disciplineId);
    if (existing) {
      return this.curriculumRepository.update(existing.id, {
        credits: dto.credits,
        lectureHours: dto.lectureHours,
        practiceHours: dto.practiceHours,
        totalHours: dto.totalHours,
        controlType: dto.controlType,
        weeklyLoad: dto.weeklyLoad,
      });
    }

    return this.curriculumRepository.assign({
      groupId: dto.groupId,
      disciplineId: dto.disciplineId,
      credits: dto.credits,
      lectureHours: dto.lectureHours,
      practiceHours: dto.practiceHours,
      totalHours: dto.totalHours,
      controlType: dto.controlType,
      weeklyLoad: dto.weeklyLoad,
    });
  }
}