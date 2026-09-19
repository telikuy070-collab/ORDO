// Analytics Domain Module

export interface WorkloadReport {
  id: string;
  tenantId: string;
  teacherId: string | null;
  semesterId: string;
  totalHours: number;
  lectureHours: number;
  practiceHours: number;
  generatedAt: Date;
}

export interface TeacherLoad {
  id: string;
  teacherId: string;
  disciplineId: string;
  hours: number;
  weekLoad: number[];
}

export interface GroupLoad {
  id: string;
  groupId: string;
  disciplineId: string;
  hours: number;
  weekLoad: number[];
}

export class ReportGenerationError extends Error {
  constructor(message: string) {
    super(`Report generation failed: ${message}`);
    this.name = 'ReportGenerationError';
  }
}

export interface ReportGeneratedEvent {
  type: 'ReportGenerated';
  payload: { reportId: string; tenantId: string; teacherId: string | null; groupId: string | null };
  timestamp: Date;
}