// Excel/CSV parsing and generation via SheetJS (xlsx).

import * as XLSX from 'xlsx';

import type { IExcelGenerator, IExcelParser } from '@ordo/application';
import type { ExportFormat, Mapping } from '@ordo/domain/import-export';

export type ExcelCellValue = string | number | boolean | null;

export type ExcelRow = Record<string, ExcelCellValue>;

export interface ExcelImportOptions {
  sheetName?: string;
  skipEmptyRows?: boolean;
}

export interface ExcelWorkbookSummary {
  rowCount: number;
  sheetCount: number;
  sheets: string[];
}

const EMPTY_ROWS: string[][] = [];

function parseXlsx(buffer: Buffer): string[][] {
  const workbook = XLSX.read(buffer, { type: 'buffer' }) as XLSX.WorkBook;
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return EMPTY_ROWS;
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return EMPTY_ROWS;
  }

  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
  });
}

function parseCsv(buffer: Buffer): string[][] {
  const text = buffer.toString('utf-8');
  if (!text.trim()) {
    return EMPTY_ROWS;
  }

  return text
    .split(/\r?\n/)
    .filter((row) => row.trim().length > 0)
    .map((row) => row.split(','));
}

function detectFormat(buffer: Buffer): 'xlsx' | 'csv' {
  return buffer.slice(0, 2).toString('utf-8') === 'PK' ? 'xlsx' : 'csv';
}

function applyMapping(header: string[], rows: string[][], mapping: Mapping[]): Record<string, unknown>[] {
  if (rows.length === 0) {
    return [];
  }

  const mappingMap = new Map(mapping.map((entry) => [entry.sourceField, entry.targetField]));

  return rows.map((row) => {
    const record: Record<string, unknown> = {};
    header.forEach((sourceField, index) => {
      const targetField = mappingMap.get(sourceField) ?? sourceField;
      record[targetField] = row[index] ?? '';
    });
    return record;
  });
}

export class ExcelParser implements IExcelParser {
  async parse(buffer: Buffer, mapping: Mapping[]): Promise<Record<string, unknown>[]> {
    const rows = detectFormat(buffer) === 'xlsx' ? parseXlsx(buffer) : parseCsv(buffer);
    if (rows.length < 2) {
      return [];
    }

    const header = rows[0];
    if (!header) {
      return [];
    }

    return applyMapping(header, rows.slice(1), mapping);
  }

  summarize(buffer: Buffer): ExcelWorkbookSummary {
    const rows = detectFormat(buffer) === 'xlsx' ? parseXlsx(buffer) : parseCsv(buffer);

    return {
      rowCount: Math.max(rows.length - 1, 0),
      sheetCount: 1,
      sheets: ['Sheet1'],
    };
  }
}

export class ExcelGenerator implements IExcelGenerator {
  async generate(data: Record<string, unknown>[], format: ExportFormat): Promise<Buffer> {
    if (data.length === 0) {
      return Buffer.from('');
    }

    const sheet = XLSX.utils.json_to_sheet(data);

    if (format === 'csv') {
      return Buffer.from(XLSX.utils.sheet_to_csv(sheet), 'utf-8');
    }

    if (format === 'xlsx') {
      const workbook: XLSX.WorkBook = { Sheets: { Sheet1: sheet }, SheetNames: ['Sheet1'] };
      return Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }));
    }

    throw new Error(`Unsupported export format: ${format}`);
  }
}