import { describe, expect, it } from 'vitest';

import { AuditEventImmutableError } from './index';

describe('audit domain', () => {
  it('throws a meaningful error when audit event is immutable', () => {
    expect(() => {
      throw new AuditEventImmutableError();
    }).toThrow('Audit events are immutable and cannot be modified');
  });
});
