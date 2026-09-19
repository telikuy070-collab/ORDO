import { describe, expect, it } from 'vitest';

import { GroupCodeAlreadyExistsError, InvalidWeeklyLoadError } from './index';

describe('academic domain', () => {
  it('throws a meaningful error when a group code is duplicated', () => {
    expect(() => {
      throw new GroupCodeAlreadyExistsError('2024-b', 'tenant-1');
    }).toThrow('Group with code "2024-b" already exists in tenant tenant-1');
  });

  it('validates weekly load length', () => {
    expect(() => {
      throw new InvalidWeeklyLoadError(6, 5);
    }).toThrow('Weekly load must have 6 entries, got 5');
  });
});
