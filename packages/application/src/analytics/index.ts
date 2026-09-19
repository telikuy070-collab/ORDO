// Analytics Application Module

import { type GroupLoad, type TeacherLoad, type WorkloadReport } from '@ordo/domain/analytics';
import type { PaginatedResponse } from '@ordo/types';

// Ports
export interface IWorkloadReportRepository {
  findById(id: string): Promise<WorkloadReport | null>;
  findByTeacher(teacherId: string, semesterId: string): Promise<WorkloadReport | null>;
  findByTenant(tenantId: string, semesterId: string): Promise<WorkloadReport[]>;
  create(data: Omit<WorkloadReport, 'id' | 'generatedAt'>): Promise<WorkloadReport>;
  update(id: string, data: Partial<WorkloadReport>): Promise<WorkloadReport>;
}

export interface ITeacherLoadRepository {
  findByTeacherAndSemester(teacherId: string, semesterId: string): Promise<TeacherLoad[]>;
  findByTenantAndSemester(tenantId: string, semesterId: string): Promise<TeacherLoad[]>;
  upsert(data: Omit<TeacherLoad, 'id'>): Promise<TeacherLoad>;
}

export interface IGroupLoadRepository {
  findByGroupAndSemester(groupId: string, semesterId: string): Promise<GroupLoad[]>;
  findByTenantAndSemester(tenantId: string, semesterId: string): Promise<GroupLoad[]>;
  upsert(data: Omit<GroupLoad, 'id'>): Promise<GroupLoad>;
}

export interface IReportGenerator {
  generateTeacherWorkload(teacherId: string, semesterId: string): Promise<WorkloadReport>;
  generateGroupWorkload(groupId: string, semesterId: string): Promise<WorkloadReport>;
  generateTenantSummary(tenantId: string, semesterId: string): Promise<{
    totalTeachers: number;
    totalHours: number;
    byDiscipline: Record<string, number>;
    byTeacher: Record<string, number>;
  }>;
}

// DTOs
export interface GenerateTeacherWorkloadDTO {
  teacherId: string;
  semesterId: string;
}

export interface GenerateGroupWorkloadDTO {
  groupId: string;
  semesterId: string;
}

export interface GenerateTenantSummaryDTO {
  tenantId: string;
  semesterId: string;
}

export interface GetReportsDTO {
  tenantId: string;
  semesterId: string;
  page: number;
  pageSize: number;
}

// Use-cases
export interface GenerateTeacherWorkloadUseCase {
  execute(dto: GenerateTeacherWorkloadDTO): Promise<WorkloadReport>;
}

export interface GenerateGroupWorkloadUseCase {
  execute(dto: GenerateGroupWorkloadDTO): Promise<WorkloadReport>;
}

export interface GenerateTenantSummaryUseCase {
  execute(dto: GenerateTenantSummaryDTO): Promise<{
    totalTeachers: number;
    totalHours: number;
    byDiscipline: Record<string, number>;
    byTeacher: Record<string, number>;
  }>;
}

export interface GetWorkloadReportsUseCase {
  execute(dto: GetReportsDTO): Promise<PaginatedResponse<WorkloadReport>>;
}

export interface GetTeacherLoadUseCase {
  execute(teacherId: string, semesterId: string): Promise<TeacherLoad[]>;
}

export interface GetGroupLoadUseCase {
  execute(groupId: string, semesterId: string): Promise<GroupLoad[]>;
}

export class GenerateTeacherWorkloadUseCaseImpl implements GenerateTeacherWorkloadUseCase {
  constructor(
    private readonly reportRepository: IWorkloadReportRepository,
    private readonly teacherLoadRepository: ITeacherLoadRepository,
  ) {}

  async execute(dto: GenerateTeacherWorkloadDTO): Promise<WorkloadReport> {
    const entries = await this.teacherLoadRepository.findByTeacherAndSemester(dto.teacherId, dto.semesterId);
    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const lectureHours = entries.filter((entry) => entry.disciplineId.startsWith('lecture')).reduce((sum, entry) => sum + entry.hours, 0);
    const practiceHours = totalHours - lectureHours;

    const report = await this.reportRepository.create({
      tenantId: 'tenant-default',
      teacherId: dto.teacherId,
      semesterId: dto.semesterId,
      totalHours,
      lectureHours,
      practiceHours,
    });

    return report;
  }
}

export class GenerateGroupWorkloadUseCaseImpl implements GenerateGroupWorkloadUseCase {
  constructor(
    private readonly reportRepository: IWorkloadReportRepository,
    private readonly groupLoadRepository: IGroupLoadRepository,
  ) {}

  async execute(dto: GenerateGroupWorkloadDTO): Promise<WorkloadReport> {
    const entries = await this.groupLoadRepository.findByGroupAndSemester(dto.groupId, dto.semesterId);
    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

    const report = await this.reportRepository.create({
      tenantId: 'tenant-default',
      teacherId: null,
      semesterId: dto.semesterId,
      totalHours,
      lectureHours: totalHours,
      practiceHours: 0,
    });

    return report;
  }
}

export class GenerateTenantSummaryUseCaseImpl implements GenerateTenantSummaryUseCase {
  constructor(private readonly reportRepository: IWorkloadReportRepository) {}

  async execute(dto: GenerateTenantSummaryDTO): Promise<{
    totalTeachers: number;
    totalHours: number;
    byDiscipline: Record<string, number>;
    byTeacher: Record<string, number>;
  }> {
    const reports = await this.reportRepository.findByTenant(dto.tenantId, dto.semesterId);
    const byTeacher = Object.fromEntries(
      reports
        .filter((report) => report.teacherId !== null)
        .map((report) => [report.teacherId as string, (report.totalHours ?? 0)]),
    );

    return {
      totalTeachers: new Set(reports.filter((report) => report.teacherId !== null).map((report) => report.teacherId)).size,
      totalHours: reports.reduce((sum, report) => sum + report.totalHours, 0),
      byDiscipline: {},
      byTeacher,
    };
  }
}

export class GetWorkloadReportsUseCaseImpl implements GetWorkloadReportsUseCase {
  constructor(private readonly reportRepository: IWorkloadReportRepository) {}

  async execute(dto: GetReportsDTO): Promise<PaginatedResponse<WorkloadReport>> {
    const data = await this.reportRepository.findByTenant(dto.tenantId, dto.semesterId);
    const start = (dto.page - 1) * dto.pageSize;

    return {
      data: data.slice(start, start + dto.pageSize),
      total: data.length,
      page: dto.page,
      pageSize: dto.pageSize,
    };
  }
}

export class GetTeacherLoadUseCaseImpl implements GetTeacherLoadUseCase {
  constructor(private readonly teacherLoadRepository: ITeacherLoadRepository) {}

  async execute(teacherId: string, semesterId: string): Promise<TeacherLoad[]> {
    return this.teacherLoadRepository.findByTeacherAndSemester(teacherId, semesterId);
  }
}

export class GetGroupLoadUseCaseImpl implements GetGroupLoadUseCase {
  constructor(private readonly groupLoadRepository: IGroupLoadRepository) {}

  async execute(groupId: string, semesterId: string): Promise<GroupLoad[]> {
    return this.groupLoadRepository.findByGroupAndSemester(groupId, semesterId);
  }
}