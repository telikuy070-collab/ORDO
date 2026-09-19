import { describe, expect, it } from 'vitest';

import { InvalidRoleError, TenantSlugAlreadyExistsError } from './index';

describe('identity domain', () => {
  it('throws a meaningful error for invalid roles', () => {
    expect(() => {
      throw new InvalidRoleError('ghost-role');
    }).toThrow('Invalid role: ghost-role');
  });

  it('throws a meaningful error for duplicate tenant slugs', () => {
    expect(() => {
      throw new TenantSlugAlreadyExistsError('medical');
    }).toThrow('Tenant with slug "medical" already exists');
  });
});
