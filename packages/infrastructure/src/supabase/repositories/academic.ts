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

export class SupabaseAcademicRepository {
  private readonly specialties = new Map<string, Specialty>();
  private readonly groups = new Map<string, Group>();
  private readonly semesters = new Map<string, Semester>();
  private readonly disciplines = new Map<string, Discipline>();
  private readonly curricula = new Map<string, Curriculum>();

  async findById(id: string): Promise<Specialty | null> {
    return this.specialties.get(id) ?? null;
  }

  async findByTenant(tenantId: string): Promise<Specialty[]> {
    return [...this.specialties.values()].filter((specialty) => specialty.tenantId === tenantId);
  }

  async create(data: Omit<Specialty, 'id'>): Promise<Specialty> {
    const duplicate = [...this.specialties.values()].find(
      (specialty) =>
        specialty.tenantId === data.tenantId && specialty.code.toLowerCase() === data.code.toLowerCase(),
    );

    if (duplicate) {
      throw new GroupCodeAlreadyExistsError(data.code, data.tenantId);
    }

    const specialty: Specialty = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.specialties.set(specialty.id, specialty);
    return specialty;
  }

  async update(id: string, data: Partial<Specialty>): Promise<Specialty> {
    const current = this.specialties.get(id);
    if (!current) {
      throw new Error(`Specialty not found: ${id}`);
    }

    const next: Specialty = {
      ...current,
      ...data,
    };

    this.specialties.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    const specialty = this.specialties.get(id);
    if (!specialty) {
      return;
    }

    const hasActiveGroups = [...this.groups.values()].some(
      (group) => group.specialtyId === id && group.isActive,
    );

    if (hasActiveGroups) {
      throw new SpecialtyHasActiveGroupsError(id);
    }

    this.specialties.delete(id);
  }

  async findBySpecialty(specialtyId: string): Promise<Group[]> {
    return [...this.groups.values()].filter((group) => group.specialtyId === specialtyId);
  }

  async findByGroup(groupId: string): Promise<Curriculum[]> {
    return [...this.curricula.values()].filter((curriculum) => curriculum.groupId === groupId);
  }

  async assign(data: Omit<Curriculum, 'id'>): Promise<Curriculum> {
    const duplicates = [...this.curricula.values()].find(
      (curriculum) => curriculum.groupId === data.groupId && curriculum.disciplineId === data.disciplineId,
    );

    if (duplicates) {
      throw new Error(`Curriculum already assigned for group ${data.groupId} and discipline ${data.disciplineId}`);
    }

    const weeklyLoad = data.weeklyLoad ?? [];
    if (weeklyLoad.length !== 6) {
      throw new InvalidWeeklyLoadError(6, weeklyLoad.length);
    }

    const curriculum: Curriculum = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.curricula.set(curriculum.id, curriculum);
    return curriculum;
  }

  async remove(groupId: string, disciplineId: string): Promise<void> {
    const matching = [...this.curricula.values()].find(
      (curriculum) => curriculum.groupId === groupId && curriculum.disciplineId === disciplineId,
    );

    if (matching) {
      this.curricula.delete(matching.id);
    }
  }

  async getActive(tenantId: string): Promise<Semester | null> {
    const current = [...this.semesters.values()].find(
      (semester) => semester.tenantId === tenantId && semester.isActive,
    );

    return current ?? null;
  }

  async findByGroupId(groupId: string): Promise<Group | null> {
    return this.groups.get(groupId) ?? null;
  }

  async findByDiscipline(disciplineId: string): Promise<Discipline | null> {
    return this.disciplines.get(disciplineId) ?? null;
  }

  async findBySemester(semesterId: string): Promise<Semester | null> {
    return this.semesters.get(semesterId) ?? null;
  }

  async listDisciplines(tenantId: string): Promise<Discipline[]> {
    return [...this.disciplines.values()].filter((discipline) => discipline.tenantId === tenantId);
  }

  async updateCurriculum(id: string, data: Partial<Curriculum>): Promise<Curriculum> {
    const current = this.curricula.get(id);
    if (!current) {
      throw new Error(`Curriculum not found: ${id}`);
    }

    const next: Curriculum = {
      ...current,
      ...data,
    };

    this.curricula.set(id, next);
    return next;
  }

  async findByGroupAndDiscipline(groupId: string, disciplineId: string): Promise<Curriculum | null> {
    return [...this.curricula.values()].find(
      (curriculum) => curriculum.groupId === groupId && curriculum.disciplineId === disciplineId,
    ) ?? null;
  }

  async createGroup(data: Omit<Group, 'id'>): Promise<Group> {
    const duplicate = [...this.groups.values()].find(
      (group) => group.tenantId === data.tenantId && group.code.toLowerCase() === data.code.toLowerCase(),
    );

    if (duplicate) {
      throw new GroupCodeAlreadyExistsError(data.code, data.tenantId);
    }

    const group: Group = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.groups.set(group.id, group);
    return group;
  }

  async findGroupByTenant(tenantId: string): Promise<Group[]> {
    return [...this.groups.values()].filter((group) => group.tenantId === tenantId);
  }

  async createSemester(data: Omit<Semester, 'id'>): Promise<Semester> {
    if (data.endDate <= data.startDate) {
      throw new Error('Semester end date must be after start date');
    }

    const semester: Semester = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.semesters.set(semester.id, semester);
    return semester;
  }

  async updateSemester(id: string, data: Partial<Semester>): Promise<Semester> {
    const current = this.semesters.get(id);
    if (!current) {
      throw new Error(`Semester not found: ${id}`);
    }

    const next: Semester = {
      ...current,
      ...data,
    };

    this.semesters.set(id, next);
    return next;
  }

  async createDiscipline(data: Omit<Discipline, 'id'>): Promise<Discipline> {
    const discipline: Discipline = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.disciplines.set(discipline.id, discipline);
    return discipline;
  }

  async updateDiscipline(id: string, data: Partial<Discipline>): Promise<Discipline> {
    const current = this.disciplines.get(id);
    if (!current) {
      throw new Error(`Discipline not found: ${id}`);
    }

    const next: Discipline = {
      ...current,
      ...data,
    };

    this.disciplines.set(id, next);
    return next;
  }
}
