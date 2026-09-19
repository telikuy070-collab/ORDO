import { describe, expect, it } from 'vitest';

import { ExcelGenerator, ExcelParser } from './index';

describe('ExcelParser', () => {
  it('parses a CSV buffer into mapped records', async () => {
    const parser = new ExcelParser();
    const buffer = Buffer.from('student_name,group\nAlice,101\nBob,102', 'utf-8');

    const records = await parser.parse(buffer, [{ id: 'm1', tenantId: 't1', sourceField: 'student_name', targetField: 'fullName' }]);

    expect(records).toEqual([
      { fullName: 'Alice', group: '101' },
      { fullName: 'Bob', group: '102' },
    ]);
  });

  it('falls back to the source field when no mapping exists', async () => {
    const parser = new ExcelParser();
    const buffer = Buffer.from('a,b\n1,2', 'utf-8');

    const records = await parser.parse(buffer, []);

    expect(records).toEqual([{ a: '1', b: '2' }]);
  });

  it('returns an empty array for an empty buffer', async () => {
    const parser = new ExcelParser();

    const records = await parser.parse(Buffer.from(''), []);

    expect(records).toEqual([]);
  });

  it('summarizes a CSV workbook', () => {
    const parser = new ExcelParser();
    const buffer = Buffer.from('a\n1\n2\n3', 'utf-8');

    const summary = parser.summarize(buffer);

    expect(summary).toEqual({ rowCount: 3, sheetCount: 1, sheets: ['Sheet1'] });
  });
});

describe('ExcelGenerator', () => {
  it('generates a CSV buffer from records', async () => {
    const generator = new ExcelGenerator();
    const data = [{ fullName: 'Alice' }, { fullName: 'Bob' }];

    const buffer = await generator.generate(data, 'csv');

    expect(buffer.toString('utf-8')).toBe('fullName\nAlice\nBob');
  });

  it('generates an XLSX buffer from records', async () => {
    const generator = new ExcelGenerator();
    const data = [{ fullName: 'Alice' }];

    const buffer = await generator.generate(data, 'xlsx');

    expect(buffer.slice(0, 2).toString('utf-8')).toBe('PK');
  });

  it('throws for an unsupported export format', async () => {
    const generator = new ExcelGenerator();

    await expect(generator.generate([{ a: 1 }], 'pdf' as never)).rejects.toThrow('Unsupported export format: pdf');
  });
});