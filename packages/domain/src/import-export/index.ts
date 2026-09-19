// ImportExport Domain Module

export type JobStatus = 'pending' | 'processing' | 'done' | 'failed';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

export interface ImportJob {
  id: string;
  tenantId: string;
  userId: string;
  fileName: string;
  status: JobStatus;
  result: Record<string, unknown>;
  createdAt: Date;
}

export interface ExportJob {
  id: string;
  tenantId: string;
  userId: string;
  format: ExportFormat;
  status: JobStatus;
  result: Record<string, unknown>;
  createdAt: Date;
}

export interface Mapping {
  id: string;
  tenantId: string;
  sourceField: string;
  targetField: string;
}

export class ImportJobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Import job not found: ${jobId}`);
    this.name = 'ImportJobNotFoundError';
  }
}

export class ExportJobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Export job not found: ${jobId}`);
    this.name = 'ExportJobNotFoundError';
  }
}

export class DuplicateMappingError extends Error {
  constructor(sourceField: string, tenantId: string) {
    super(`Mapping for source field "${sourceField}" already exists in tenant ${tenantId}`);
    this.name = 'DuplicateMappingError';
  }
}

export interface ImportStartedEvent {
  type: 'ImportStarted';
  payload: { jobId: string; tenantId: string; fileName: string };
  timestamp: Date;
}

export interface ImportCompletedEvent {
  type: 'ImportCompleted';
  payload: { jobId: string; tenantId: string; recordsImported: number };
  timestamp: Date;
}

export interface ExportStartedEvent {
  type: 'ExportStarted';
  payload: { jobId: string; tenantId: string; format: ExportFormat };
  timestamp: Date;
}