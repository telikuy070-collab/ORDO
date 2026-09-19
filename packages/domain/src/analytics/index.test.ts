import { describe, expect, it } from 'vitest';

import { ReportGenerationError } from './index';

describe('analytics domain', () => {
  it('throws a meaningful report generation error', () => {
    expect(() => {
      throw new ReportGenerationError('teacher workload is empty');
    }).toThrow('Report generation failed: teacher workload is empty');
  });
});
