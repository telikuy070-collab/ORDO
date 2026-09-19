import { describe, expect, it } from 'vitest';

import { DuplicatePreferenceError, InvalidRoomCapacityError } from './index';

describe('resources domain', () => {
  it('throws a meaningful error for duplicate preferences', () => {
    expect(() => {
      throw new DuplicatePreferenceError('teacher-1', 'prefer', 2, 3);
    }).toThrow('Teacher teacher-1 already has preference prefer for day 2 pair 3');
  });

  it('validates room capacity', () => {
    expect(() => {
      throw new InvalidRoomCapacityError(0);
    }).toThrow('Room capacity must be > 0, got 0');
  });
});
