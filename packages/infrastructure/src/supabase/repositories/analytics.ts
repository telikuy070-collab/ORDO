import type {
  IGroupLoadRepository,
  ITeacherLoadRepository,
  IWorkloadReportRepository,
} from '@ordo/application';
import { type GroupLoad, type TeacherLoad, type WorkloadReport } from '@ordo/domain/analytics';

export class SupabaseWorkloadReportRepository implements IWorkloadReportRepository {
  private readonly reports = new Map<string, WorkloadReport>();

  async findById(id: string): Promise<WorkloadReport | null> {
    return this.reports.get(id) ?? null;
  }

  async findByTeacher(teacherId: string, semesterId: string): Promise<WorkloadReport | null> {
    return (
      [...this.reports.values()].find(
        (report) => report.teacherId === teacherId && report.semesterId === semesterId,
      ) ?? null
    );
  }

  async findByTenant(tenantId: string, semesterId: string): Promise<WorkloadReport[]> {
    return [...this.reports.values()].filter(
      (report) => report.tenantId === tenantId && report.semesterId === semesterId,
    );
  }

  async create(data: Omit<WorkloadReport, 'id' | 'generatedAt'>): Promise<WorkloadReport> {
    const report: WorkloadReport = {
      ...data,
      id: crypto.randomUUID(),
      generatedAt: new Date(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  async update(id: string, data: Partial<WorkloadReport>): Promise<WorkloadReport> {
    const current = this.reports.get(id);
    if (!current) {
      throw new Error(`Report not found: ${id}`);
    }

    const next: WorkloadReport = { ...current, ...data };
    this.reports.set(id, next);
    return next;
  }
}

export class SupabaseTeacherLoadRepository implements ITeacherLoadRepository {
  private readonly loads = new Map<string, TeacherLoad>();

  async findByTeacherAndSemester(teacherId: string, semesterId: string): Promise<TeacherLoad[]> {
    return [...this.loads.values()].filter(
      (load) => load.teacherId === teacherId && load.weekLoad.length > 0 && semesterId.length > 0,
    );
  }

  async findByTenantAndSemester(tenantId: string, semesterId: string): Promise<TeacherLoad[]> {
    void tenantId;
    void semesterId;
    return [...this.loads.values()];
  }

  async upsert(data: Omit<TeacherLoad, 'id'>): Promise<TeacherLoad> {
    const key = `${data.teacherId}:${data.disciplineId}`;
    const current = this.loads.get(key);
    const next: TeacherLoad = {
      ...current,
      ...data,
      id: current?.id ?? crypto.randomUUID(),
    };

    this.loads.set(key, next);
    return next;
  }
}

export class SupabaseGroupLoadRepository implements IGroupLoadRepository {
  private readonly loads = new Map<string, GroupLoad>();

  async findByGroupAndSemester(groupId: string, semesterId: string): Promise<GroupLoad[]> {
    return [...this.loads.values()].filter(
      (load) => load.groupId === groupId && load.weekLoad.length > 0 && semesterId.length > 0,
    );
  }

  async findByTenantAndSemester(tenantId: string, semesterId: string): Promise<GroupLoad[]> {
    void tenantId;
    void semesterId;
    return [...this.loads.values()];
  }

  async upsert(data: Omit<GroupLoad, 'id'>): Promise<GroupLoad> {
    const key = `${data.groupId}:${data.disciplineId}`;
    const current = this.loads.get(key);
    const next: GroupLoad = {
      ...current,
      ...data,
      id: current?.id ?? crypto.randomUUID(),
    };

    this.loads.set(key, next);
    return next;
  }
}
