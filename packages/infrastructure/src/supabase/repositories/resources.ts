import type {
  IBuildingRepository,
  IPreferenceRepository,
  IRoomRepository,
  ITeacherRepository,
} from '@ordo/application';
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

export class SupabaseTeacherRepository implements ITeacherRepository {
  private readonly teachers = new Map<string, Teacher>();

  async findById(id: string): Promise<Teacher | null> {
    return this.teachers.get(id) ?? null;
  }

  async findByTenant(tenantId: string): Promise<Teacher[]> {
    return [...this.teachers.values()].filter((teacher) => teacher.tenantId === tenantId);
  }

  async findByUserId(userId: string): Promise<Teacher | null> {
    return [...this.teachers.values()].find((teacher) => teacher.userId === userId) ?? null;
  }

  async create(data: Omit<Teacher, 'id'>): Promise<Teacher> {
    const teacher: Teacher = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.teachers.set(teacher.id, teacher);
    return teacher;
  }

  async update(id: string, data: Partial<Teacher>): Promise<Teacher> {
    const current = this.teachers.get(id);
    if (!current) {
      throw new TeacherNotFoundError(id);
    }

    const next: Teacher = {
      ...current,
      ...data,
    };

    this.teachers.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.teachers.delete(id);
  }
}

export class SupabaseRoomRepository implements IRoomRepository {
  private readonly rooms = new Map<string, Room>();

  async findById(id: string): Promise<Room | null> {
    return this.rooms.get(id) ?? null;
  }

  async findByTenant(tenantId: string): Promise<Room[]> {
    return [...this.rooms.values()].filter((room) => room.tenantId === tenantId);
  }

  async findByBuilding(buildingId: string): Promise<Room[]> {
    return [...this.rooms.values()].filter((room) => room.buildingId === buildingId);
  }

  async findAvailable(tenantId: string, dayOfWeek: number, pairNumber: number, weekType: string): Promise<Room[]> {
    void dayOfWeek;
    void pairNumber;
    void weekType;

    return [...this.rooms.values()].filter((room) => room.tenantId === tenantId && room.capacity > 0);
  }

  async create(data: Omit<Room, 'id'>): Promise<Room> {
    if (data.capacity <= 0) {
      throw new InvalidRoomCapacityError(data.capacity);
    }

    const room: Room = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.rooms.set(room.id, room);
    return room;
  }

  async update(id: string, data: Partial<Room>): Promise<Room> {
    const current = this.rooms.get(id);
    if (!current) {
      throw new RoomNotAvailableError(id);
    }

    const next: Room = {
      ...current,
      ...data,
    };

    this.rooms.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.rooms.delete(id);
  }
}

export class SupabaseBuildingRepository implements IBuildingRepository {
  private readonly buildings = new Map<string, Building>();

  async findById(id: string): Promise<Building | null> {
    return this.buildings.get(id) ?? null;
  }

  async findByTenant(tenantId: string): Promise<Building[]> {
    return [...this.buildings.values()].filter((building) => building.tenantId === tenantId);
  }

  async create(data: Omit<Building, 'id'>): Promise<Building> {
    const building: Building = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.buildings.set(building.id, building);
    return building;
  }

  async update(id: string, data: Partial<Building>): Promise<Building> {
    const current = this.buildings.get(id);
    if (!current) {
      throw new Error(`Building not found: ${id}`);
    }

    const next: Building = {
      ...current,
      ...data,
    };

    this.buildings.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.buildings.delete(id);
  }
}

export class SupabasePreferenceRepository implements IPreferenceRepository {
  private readonly preferences = new Map<string, TeacherPreference>();
  private readonly teachers = new Map<string, Teacher>();

  async findByTeacher(teacherId: string): Promise<TeacherPreference[]> {
    return [...this.preferences.values()].filter((preference) => preference.teacherId === teacherId);
  }

  async findByTenant(tenantId: string): Promise<TeacherPreference[]> {
    const teacherIds = new Set(
      [...this.teachers.values()].filter((teacher) => teacher.tenantId === tenantId).map((teacher) => teacher.id),
    );

    return [...this.preferences.values()].filter((preference) => teacherIds.has(preference.teacherId));
  }

  async create(data: Omit<TeacherPreference, 'id'>): Promise<TeacherPreference> {
    const teacher = this.teachers.get(data.teacherId);
    if (!teacher) {
      throw new TeacherNotFoundError(data.teacherId);
    }

    const duplicate = [...this.preferences.values()].some(
      (preference) =>
        preference.teacherId === data.teacherId &&
        preference.type === data.type &&
        preference.dayOfWeek === data.dayOfWeek &&
        preference.pairNumber === data.pairNumber,
    );

    if (duplicate) {
      throw new DuplicatePreferenceError(data.teacherId, data.type, data.dayOfWeek, data.pairNumber);
    }

    const preference: TeacherPreference = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.preferences.set(preference.id, preference);
    return preference;
  }

  async update(id: string, data: Partial<TeacherPreference>): Promise<TeacherPreference> {
    const current = this.preferences.get(id);
    if (!current) {
      throw new Error(`Preference not found: ${id}`);
    }

    const next: TeacherPreference = {
      ...current,
      ...data,
    };

    this.preferences.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.preferences.delete(id);
  }
}
