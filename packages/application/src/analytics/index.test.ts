import { describe, expect, it } from 'vitest';

import type { GroupLoad, TeacherLoad, WorkloadReport } from '@ordo/domain/analytics';

import {
  GenerateGroupWorkloadUseCaseImpl,
  GenerateTeacherWorkloadUseCaseImpl,
  GenerateTenantSummaryUseCaseImpl,
  type IGroupLoadRepository,
  type ITeacherLoadRepository,
  type IWorkloadReportRepository,
} from './index';

class InMemoryWorkloadReportRepository implements IWorkloadReportRepository {
  private readonly reports: WorkloadReport[];

  constructor(initial: WorkloadReport[] = []) {
    this.reports = initial;
  }

  async findById(id: string): Promise<WorkloadReport | null> {
    return this.reports.find((report) => report.id === id) ?? null;
  }

  async findByTeacher(teacherId: string, semesterId: string): Promise<WorkloadReport | null> {
    return this.reports.find((report) => report.teacherId === teacherId && report.semesterId === semesterId) ?? null;
  }

  async findByTenant(tenantId: string, semesterId: string): Promise<WorkloadReport[]> {
    return this.reports.filter((report) => report.tenantId === tenantId && report.semesterId === semesterId);
  }

  async create(data: Omit<WorkloadReport, 'id' | 'generatedAt'>): Promise<WorkloadReport> {
    const report: WorkloadReport = {
      ...data,
      id: crypto.randomUUID(),
      generatedAt: new Date(),
    };
    this.reports.push(report);
    return report;
  }

  async update(id: string, data: Partial<WorkloadReport>): Promise<WorkloadReport> {
    const index = this.reports.findIndex((report) => report.id === id);
    if (index === -1) throw new Error(`Report not found: ${id}`);
    const next = { ...this.reports[index], ...data } as WorkloadReport;
    this.reports[index] = next;
    return next;
  }
}

class InMemoryTeacherLoadRepository implements ITeacherLoadRepository {
  private readonly items: TeacherLoad[];

  constructor(initial: TeacherLoad[] = []) {
    this.items = initial;
  }

  async findByTeacherAndSemester(teacherId: string, semesterId: string): Promise<TeacherLoad[]> {
    void semesterId;
    return this.items.filter((item) => item.teacherId === teacherId);
  }

  async findByTenantAndSemester(_tenantId: string, _semesterId: string): Promise<TeacherLoad[]> {
    return this.items;
  }

  async upsert(data: Omit<TeacherLoad, 'id'>): Promise<TeacherLoad> {
    const existing = this.items.find(
      (item) => item.teacherId === data.teacherId && item.disciplineId === data.disciplineId,
    );
    if (existing) {
      Object.assign(existing, data);
      return existing;
    }

    const next: TeacherLoad = { ...data, id: crypto.randomUUID() };
    this.items.push(next);
    return next;
  }
}

class InMemoryGroupLoadRepository implements IGroupLoadRepository {
  private readonly items: GroupLoad[];

  constructor(initial: GroupLoad[] = []) {
    this.items = initial;
  }

  async findByGroupAndSemester(groupId: string, semesterId: string): Promise<GroupLoad[]> {
    void semesterId;
    return this.items.filter((item) => item.groupId === groupId);
  }

  async findByTenantAndSemester(_tenantId: string, _semesterId: string): Promise<GroupLoad[]> {
    return this.items;
  }

  async upsert(data: Omit<GroupLoad, 'id'>): Promise<GroupLoad> {
    const existing = this.items.find(
      (item) => item.groupId === data.groupId && item.disciplineId === data.disciplineId,
    );
    if (existing) {
      Object.assign(existing, data);
      return existing;
    }

    const next: GroupLoad = { ...data, id: crypto.randomUUID() };
    this.items.push(next);
    return next;
  }
}

describe('analytics application use cases', () => {
  it('generates a teacher workload report', async () => {
    const reportRepository = new InMemoryWorkloadReportRepository();
    const teacherLoadRepository = new InMemoryTeacherLoadRepository([
      {
        id: 'tl-1',
        teacherId: 'teacher-1',
        disciplineId: 'lecture-medicine',
        hours: 10,
        weekLoad: [1, 2, 3, 4, 5],
      },
      {
        id: 'tl-2',
        teacherId: 'teacher-1',
        disciplineId: 'practice-surgery',
        hours: 6,
        weekLoad: [1, 2, 3, 4],
      },
    ]);

    const useCase = new GenerateTeacherWorkloadUseCaseImpl(reportRepository, teacherLoadRepository);
    const result = await useCase.execute({ teacherId: 'teacher-1', semesterId: 'sem-1' });

    expect(result.totalHours).toBe(16);
    expect(result.lectureHours).toBe(10);
    expect(result.practiceHours).toBe(6);
  });

  it('generates a group report without a teacher mapping', async () => {
    const reportRepository = new InMemoryWorkloadReportRepository();
    const groupLoadRepository = new InMemoryGroupLoadRepository([
      {
        id: 'gl-1',
        groupId: 'group-1',
        disciplineId: 'anatomy',
        hours: 8,
        weekLoad: [1, 2, 3],
      },
    ]);

    const useCase = new GenerateGroupWorkloadUseCaseImpl(reportRepository, groupLoadRepository);
    const result = await useCase.execute({ groupId: 'group-1', semesterId: 'sem-1' });

    expect(result.teacherId).toBeNull();
    expect(result.totalHours).toBe(8);
  });

  it('summarizes tenant report totals by teacher', async () => {
    const reportRepository = new InMemoryWorkloadReportRepository([
      {
        id: 'r-1',
        tenantId: 'tenant-1',
        teacherId: 'teacher-1',
        semesterId: 'sem-1',
        totalHours: 12,
        lectureHours: 8,
        practiceHours: 4,
        generatedAt: new Date(),
      },
      {
        id: 'r-2',
        tenantId: 'tenant-1',
        teacherId: 'teacher-2',
        semesterId: 'sem-1',
        totalHours: 7,
        lectureHours: 4,
        practiceHours: 3,
        generatedAt: new Date(),
      },
      {
        id: 'r-3',
        tenantId: 'tenant-1',
        teacherId: null,
        semesterId: 'sem-1',
        totalHours: 5,
        lectureHours: 5,
        practiceHours: 0,
        generatedAt: new Date(),
      },
    ]);

    const useCase = new GenerateTenantSummaryUseCaseImpl(reportRepository);
    const result = await useCase.execute({ tenantId: 'tenant-1', semesterId: 'sem-1' });

    expect(result.totalTeachers).toBe(2);
    expect(result.totalHours).toBe(24);
    expect(result.byTeacher['teacher-1']).toBe(12);
    expect(result.byTeacher['teacher-2']).toBe(7);
  });
});
