import type {
  IExcelGenerator,
  IExcelParser,
  IExportJobRepository,
  IImportJobRepository,
  IMappingRepository,
} from '@ordo/application';
import {
  DuplicateMappingError,
  type ExportFormat,
  type ExportJob,
  type ImportJob,
  type Mapping,
} from '@ordo/domain/import-export';
import { ExcelGenerator, ExcelParser } from '@ordo/infrastructure';
import type { PaginatedResponse } from '@ordo/types';

export class SupabaseImportJobRepository implements IImportJobRepository {
  private readonly jobs = new Map<string, ImportJob>();

  async findById(id: string): Promise<ImportJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<ImportJob>> {
    const data = [...this.jobs.values()].filter((job) => job.tenantId === tenantId);
    const start = (page - 1) * pageSize;

    return {
      data: data.slice(start, start + pageSize),
      total: data.length,
      page,
      pageSize,
    };
  }

  async create(data: Omit<ImportJob, 'id' | 'createdAt'>): Promise<ImportJob> {
    const job: ImportJob = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    return job;
  }

  async update(id: string, data: Partial<ImportJob>): Promise<ImportJob> {
    const current = this.jobs.get(id);
    if (!current) {
      throw new Error(`Import job not found: ${id}`);
    }

    const next: ImportJob = { ...current, ...data };
    this.jobs.set(id, next);
    return next;
  }
}

export class SupabaseExportJobRepository implements IExportJobRepository {
  private readonly jobs = new Map<string, ExportJob>();

  async findById(id: string): Promise<ExportJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<ExportJob>> {
    const data = [...this.jobs.values()].filter((job) => job.tenantId === tenantId);
    const start = (page - 1) * pageSize;

    return {
      data: data.slice(start, start + pageSize),
      total: data.length,
      page,
      pageSize,
    };
  }

  async create(data: Omit<ExportJob, 'id' | 'createdAt'>): Promise<ExportJob> {
    const job: ExportJob = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    return job;
  }

  async update(id: string, data: Partial<ExportJob>): Promise<ExportJob> {
    const current = this.jobs.get(id);
    if (!current) {
      throw new Error(`Export job not found: ${id}`);
    }

    const next: ExportJob = { ...current, ...data };
    this.jobs.set(id, next);
    return next;
  }
}

export class SupabaseMappingRepository implements IMappingRepository {
  private readonly mappings = new Map<string, Mapping>();

  async findById(id: string): Promise<Mapping | null> {
    return this.mappings.get(id) ?? null;
  }

  async findByTenant(tenantId: string): Promise<Mapping[]> {
    return [...this.mappings.values()].filter((mapping) => mapping.tenantId === tenantId);
  }

  async findBySourceField(tenantId: string, sourceField: string): Promise<Mapping | null> {
    return (
      [...this.mappings.values()].find(
        (mapping) => mapping.tenantId === tenantId && mapping.sourceField === sourceField,
      ) ?? null
    );
  }

  async create(data: Omit<Mapping, 'id'>): Promise<Mapping> {
    const existing = await this.findBySourceField(data.tenantId, data.sourceField);
    if (existing) {
      throw new DuplicateMappingError(data.sourceField, data.tenantId);
    }

    const mapping: Mapping = {
      ...data,
      id: crypto.randomUUID(),
    };

    this.mappings.set(mapping.id, mapping);
    return mapping;
  }

  async update(id: string, data: Partial<Mapping>): Promise<Mapping> {
    const current = this.mappings.get(id);
    if (!current) {
      throw new Error(`Mapping not found: ${id}`);
    }

    const next: Mapping = { ...current, ...data };
    this.mappings.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.mappings.delete(id);
  }
}

export class SupabaseExcelParser implements IExcelParser {
  constructor(private readonly parser = new ExcelParser()) {}

  async parse(buffer: Buffer, mapping: Mapping[]): Promise<Record<string, unknown>[]> {
    return this.parser.parse(buffer, mapping);
  }
}

export class SupabaseExcelGenerator implements IExcelGenerator {
  constructor(private readonly generator = new ExcelGenerator()) {}

  async generate(data: Record<string, unknown>[], format: ExportFormat): Promise<Buffer> {
    return this.generator.generate(data, format);
  }
}
