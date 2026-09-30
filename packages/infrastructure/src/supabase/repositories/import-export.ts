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
import { SupabaseBaseRepository, toCamelCase, toSnakeCase } from './base';

export class SupabaseImportJobRepository extends SupabaseBaseRepository implements IImportJobRepository {
  constructor() {
    super({ tableName: 'import_jobs', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<ImportJob | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase(data) as ImportJob : null;
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<ImportJob>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(from, to);

    this.handleError(error, 'findByTenant');
    return {
      data: (data ?? []).map(toCamelCase) as ImportJob[],
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async create(data: Omit<ImportJob, 'id' | 'createdAt'>): Promise<ImportJob> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(await this.withTenantId(toSnakeCase({
        ...data,
        status: data.status ?? 'pending',
        processed_rows: data.processedRows ?? 0,
      })))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as ImportJob;
  }

  async update(id: string, data: Partial<ImportJob>): Promise<ImportJob> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase(result) as ImportJob;
  }
}

export class SupabaseExportJobRepository extends SupabaseBaseRepository implements IExportJobRepository {
  constructor() {
    super({ tableName: 'export_jobs', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<ExportJob | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase(data) as ExportJob : null;
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<ExportJob>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(from, to);

    this.handleError(error, 'findByTenant');
    return {
      data: (data ?? []).map(toCamelCase) as ExportJob[],
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async create(data: Omit<ExportJob, 'id' | 'createdAt'>): Promise<ExportJob> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(await this.withTenantId(toSnakeCase({
        ...data,
        status: data.status ?? 'pending',
        filter: data.filter ?? {},
      })))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as ExportJob;
  }

  async update(id: string, data: Partial<ExportJob>): Promise<ExportJob> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase(result) as ExportJob;
  }
}

export class SupabaseMappingRepository extends SupabaseBaseRepository implements IMappingRepository {
  constructor() {
    super({ tableName: 'mappings', tenantIdColumn: 'tenant_id' });
  }

  async findById(id: string): Promise<Mapping | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    this.handleError(error, 'findById');
    return data ? toCamelCase(data) as Mapping : null;
  }

  async findByTenant(tenantId: string): Promise<Mapping[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    this.handleError(error, 'findByTenant');
    return (data ?? []).map(toCamelCase) as Mapping[];
  }

  async findBySourceField(tenantId: string, sourceField: string): Promise<Mapping | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('source_field', sourceField)
      .single();

    this.handleError(error, 'findBySourceField');
    return data ? toCamelCase(data) as Mapping : null;
  }

  async create(data: Omit<Mapping, 'id'>): Promise<Mapping> {
    const existing = await this.findBySourceField(data.tenantId, data.sourceField);
    if (existing) {
      throw new DuplicateMappingError(data.sourceField, data.tenantId);
    }

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(await this.withTenantId(toSnakeCase(data)))
      .select()
      .single();

    this.handleError(error, 'create');
    return toCamelCase(result) as Mapping;
  }

  async update(id: string, data: Partial<Mapping>): Promise<Mapping> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(toSnakeCase(data))
      .eq('id', id)
      .select()
      .single();

    this.handleError(error, 'update');
    return toCamelCase(result) as Mapping;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    this.handleError(error, 'delete');
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