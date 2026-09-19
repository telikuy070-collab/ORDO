// ImportExport Application Module

import {
  DuplicateMappingError,
  ExportJobNotFoundError,
  ImportJobNotFoundError,
  type ExportJob,
  type ExportFormat,
  type ImportJob,
  type Mapping,
} from '@ordo/domain/import-export';
import type { PaginatedResponse } from '@ordo/types';

// Ports
export interface IImportJobRepository {
  findById(id: string): Promise<ImportJob | null>;
  findByTenant(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<ImportJob>>;
  create(data: Omit<ImportJob, 'id' | 'createdAt'>): Promise<ImportJob>;
  update(id: string, data: Partial<ImportJob>): Promise<ImportJob>;
}

export interface IExportJobRepository {
  findById(id: string): Promise<ExportJob | null>;
  findByTenant(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<ExportJob>>;
  create(data: Omit<ExportJob, 'id' | 'createdAt'>): Promise<ExportJob>;
  update(id: string, data: Partial<ExportJob>): Promise<ExportJob>;
}

export interface IMappingRepository {
  findById(id: string): Promise<Mapping | null>;
  findByTenant(tenantId: string): Promise<Mapping[]>;
  findBySourceField(tenantId: string, sourceField: string): Promise<Mapping | null>;
  create(data: Omit<Mapping, 'id'>): Promise<Mapping>;
  update(id: string, data: Partial<Mapping>): Promise<Mapping>;
  delete(id: string): Promise<void>;
}

export interface IExcelParser {
  parse(buffer: Buffer, mapping: Mapping[]): Promise<Record<string, unknown>[]>;
}

export interface IExcelGenerator {
  generate(data: Record<string, unknown>[], format: ExportFormat): Promise<Buffer>;
}

// DTOs
export interface StartImportDTO {
  tenantId: string;
  userId: string;
  fileName: string;
  file: Buffer;
}

export interface StartExportDTO {
  tenantId: string;
  userId: string;
  format: ExportFormat;
  entityType: string;
  filters: Record<string, unknown>;
}

export interface CreateMappingDTO {
  tenantId: string;
  sourceField: string;
  targetField: string;
}

export interface UpdateMappingDTO {
  id: string;
  targetField: string;
}

export interface GetJobsDTO {
  tenantId: string;
  page: number;
  pageSize: number;
}

// Use-cases
export interface StartImportUseCase {
  execute(dto: StartImportDTO): Promise<ImportJob>;
}

export interface StartExportUseCase {
  execute(dto: StartExportDTO): Promise<ExportJob>;
}

export interface GetImportJobUseCase {
  execute(jobId: string): Promise<ImportJob>;
}

export interface GetExportJobUseCase {
  execute(jobId: string): Promise<ExportJob>;
}

export interface ListImportJobsUseCase {
  execute(dto: GetJobsDTO): Promise<PaginatedResponse<ImportJob>>;
}

export interface ListExportJobsUseCase {
  execute(dto: GetJobsDTO): Promise<PaginatedResponse<ExportJob>>;
}

export interface CreateMappingUseCase {
  execute(dto: CreateMappingDTO): Promise<Mapping>;
}

export interface UpdateMappingUseCase {
  execute(dto: UpdateMappingDTO): Promise<Mapping>;
}

export interface DeleteMappingUseCase {
  execute(mappingId: string): Promise<void>;
}

export interface ListMappingsUseCase {
  execute(tenantId: string): Promise<Mapping[]>;
}

export class StartImportUseCaseImpl implements StartImportUseCase {
  constructor(
    private readonly importJobRepository: IImportJobRepository,
    private readonly excelParser: IExcelParser,
    private readonly mappingRepository: IMappingRepository,
  ) {}

  async execute(dto: StartImportDTO): Promise<ImportJob> {
    const mappings = await this.mappingRepository.findByTenant(dto.tenantId);
    const records = await this.excelParser.parse(dto.file, mappings);

    const job = await this.importJobRepository.create({
      tenantId: dto.tenantId,
      userId: dto.userId,
      fileName: dto.fileName,
      status: 'processing',
      result: { importedRecords: records.length },
    });

    return {
      ...job,
      status: 'done',
      result: { importedRecords: records.length },
    };
  }
}

export class StartExportUseCaseImpl implements StartExportUseCase {
  constructor(
    private readonly exportJobRepository: IExportJobRepository,
    private readonly excelGenerator: IExcelGenerator,
  ) {}

  async execute(dto: StartExportDTO): Promise<ExportJob> {
    const payload = [{ tenantId: dto.tenantId, entityType: dto.entityType, filters: dto.filters }];
    const buffer = await this.excelGenerator.generate(payload, dto.format);

    return this.exportJobRepository.create({
      tenantId: dto.tenantId,
      userId: dto.userId,
      format: dto.format,
      status: 'processing',
      result: { bytes: buffer.length },
    });
  }
}

export class GetImportJobUseCaseImpl implements GetImportJobUseCase {
  constructor(private readonly importJobRepository: IImportJobRepository) {}

  async execute(jobId: string): Promise<ImportJob> {
    const job = await this.importJobRepository.findById(jobId);
    if (!job) {
      throw new ImportJobNotFoundError(jobId);
    }

    return job;
  }
}

export class GetExportJobUseCaseImpl implements GetExportJobUseCase {
  constructor(private readonly exportJobRepository: IExportJobRepository) {}

  async execute(jobId: string): Promise<ExportJob> {
    const job = await this.exportJobRepository.findById(jobId);
    if (!job) {
      throw new ExportJobNotFoundError(jobId);
    }

    return job;
  }
}

export class ListImportJobsUseCaseImpl implements ListImportJobsUseCase {
  constructor(private readonly importJobRepository: IImportJobRepository) {}

  async execute(dto: GetJobsDTO): Promise<PaginatedResponse<ImportJob>> {
    return this.importJobRepository.findByTenant(dto.tenantId, dto.page, dto.pageSize);
  }
}

export class ListExportJobsUseCaseImpl implements ListExportJobsUseCase {
  constructor(private readonly exportJobRepository: IExportJobRepository) {}

  async execute(dto: GetJobsDTO): Promise<PaginatedResponse<ExportJob>> {
    return this.exportJobRepository.findByTenant(dto.tenantId, dto.page, dto.pageSize);
  }
}

export class CreateMappingUseCaseImpl implements CreateMappingUseCase {
  constructor(private readonly mappingRepository: IMappingRepository) {}

  async execute(dto: CreateMappingDTO): Promise<Mapping> {
    const existing = await this.mappingRepository.findBySourceField(dto.tenantId, dto.sourceField);
    if (existing) {
      throw new DuplicateMappingError(dto.sourceField, dto.tenantId);
    }

    return this.mappingRepository.create({
      tenantId: dto.tenantId,
      sourceField: dto.sourceField,
      targetField: dto.targetField,
    });
  }
}

export class UpdateMappingUseCaseImpl implements UpdateMappingUseCase {
  constructor(private readonly mappingRepository: IMappingRepository) {}

  async execute(dto: UpdateMappingDTO): Promise<Mapping> {
    const mapping = await this.mappingRepository.findById(dto.id);
    if (!mapping) {
      throw new Error(`Mapping not found: ${dto.id}`);
    }

    return this.mappingRepository.update(dto.id, { targetField: dto.targetField });
  }
}

export class DeleteMappingUseCaseImpl implements DeleteMappingUseCase {
  constructor(private readonly mappingRepository: IMappingRepository) {}

  async execute(mappingId: string): Promise<void> {
    await this.mappingRepository.delete(mappingId);
  }
}

export class ListMappingsUseCaseImpl implements ListMappingsUseCase {
  constructor(private readonly mappingRepository: IMappingRepository) {}

  async execute(tenantId: string): Promise<Mapping[]> {
    return this.mappingRepository.findByTenant(tenantId);
  }
}