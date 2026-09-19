import { describe, expect, it } from 'vitest';

import { DuplicateMappingError, ExportJobNotFoundError, ImportJobNotFoundError } from './index';

describe('import-export domain', () => {
  it('throws a meaningful error for duplicate mapping', () => {
    expect(() => {
      throw new DuplicateMappingError('student_name', 'tenant-1');
    }).toThrow('Mapping for source field "student_name" already exists in tenant tenant-1');
  });

  it('throws a meaningful error when an import job is not found', () => {
    expect(() => {
      throw new ImportJobNotFoundError('job-42');
    }).toThrow('Import job not found: job-42');
  });

  it('throws a meaningful error when an export job is not found', () => {
    expect(() => {
      throw new ExportJobNotFoundError('job-99');
    }).toThrow('Export job not found: job-99');
  });

  it('names the error classes correctly', () => {
    expect(new ImportJobNotFoundError('x').name).toBe('ImportJobNotFoundError');
    expect(new ExportJobNotFoundError('y').name).toBe('ExportJobNotFoundError');
    expect(new DuplicateMappingError('a', 'b').name).toBe('DuplicateMappingError');
  });
});
