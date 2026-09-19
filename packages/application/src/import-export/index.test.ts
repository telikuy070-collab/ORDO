import { describe, expect, it } from 'vitest';

import type { ImportJob, Mapping } from '@ordo/domain/import-export';

import {
  CreateMappingUseCaseImpl,
  StartImportUseCaseImpl,
  ListImportJobsUseCaseImpl,
  type IExcelParser,
  type IImportJobRepository,
  type IMappingRepository,
} from './index';

class InMemoryImportJobRepository implements IImportJobRepository {
  private readonly items = new Map<string, ImportJob>();

  async findById(id: string): Promise<ImportJob | null> {
    return this.items.get(id) ?? null;
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<{ data: ImportJob[]; total: number; page: number; pageSize: number }> {
    const data = [...this.items.values()].filter((item) => item.tenantId === tenantId);
    const start = (page - 1) * pageSize;
    return {
      data: data.slice(start, start + pageSize),
      total: data.length,
      page,
      pageSize,
    };
  }

  async create(data: Omit<ImportJob, 'id' | 'createdAt'>): Promise<ImportJob> {
    const job: ImportJob = { ...data, id: crypto.randomUUID(), createdAt: new Date() };
    this.items.set(job.id, job);
    return job;
  }

  async update(id: string, data: Partial<ImportJob>): Promise<ImportJob> {
    const current = this.items.get(id);
    if (!current) throw new Error(`Import job not found: ${id}`);
    const next = { ...current, ...data };
    this.items.set(id, next);
    return next;
  }
}

class InMemoryMappingRepository implements IMappingRepository {
  private readonly items = new Map<string, Mapping>();

  async findById(id: string): Promise<Mapping | null> {
    return this.items.get(id) ?? null;
  }

  async findByTenant(tenantId: string): Promise<Mapping[]> {
    return [...this.items.values()].filter((item) => item.tenantId === tenantId);
  }

  async findBySourceField(tenantId: string, sourceField: string): Promise<Mapping | null> {
    return [...this.items.values()].find((item) => item.tenantId === tenantId && item.sourceField === sourceField) ?? null;
  }

  async create(data: Omit<Mapping, 'id'>): Promise<Mapping> {
    const mapping: Mapping = { ...data, id: crypto.randomUUID() };
    this.items.set(mapping.id, mapping);
    return mapping;
  }

  async update(id: string, data: Partial<Mapping>): Promise<Mapping> {
    const current = this.items.get(id);
    if (!current) throw new Error(`Mapping not found: ${id}`);
    const next = { ...current, ...data };
    this.items.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

class StubExcelParser implements IExcelParser {
  async parse(_buffer: Buffer, _mapping: Mapping[]): Promise<Record<string, unknown>[]> {
    return [{ studentName: 'Alex' }, { studentName: 'Mia' }];
  }
}

describe('import-export application use cases', () => {
  it('creates a mapping for a tenant', async () => {
    const repo = new InMemoryMappingRepository();
    const useCase = new CreateMappingUseCaseImpl(repo);

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      sourceField: 'student_name',
      targetField: 'full_name',
    });

    expect(result.targetField).toBe('full_name');
  });

  it('starts an import and records imported records', async () => {
    const importRepo = new InMemoryImportJobRepository();
    const mappingRepo = new InMemoryMappingRepository();
    const parser = new StubExcelParser();
    const useCase = new StartImportUseCaseImpl(importRepo, parser, mappingRepo);

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      userId: 'user-5',
      fileName: 'students.csv',
      file: Buffer.from('student_name\nAlex\nMia'),
    });

    expect(result.status).toBe('done');
    expect(result.result).toEqual({ importedRecords: 2 });
  });

  it('lists import jobs for a tenant', async () => {
    const repo = new InMemoryImportJobRepository();
    await repo.create({
      tenantId: 'tenant-1',
      userId: 'user-5',
      fileName: 'students.csv',
      status: 'pending',
      result: { importedRecords: 0 },
    });

    const useCase = new ListImportJobsUseCaseImpl(repo);
    const result = await useCase.execute({ tenantId: 'tenant-1', page: 1, pageSize: 10 });

    expect(result.total).toBe(1);
  });
});
