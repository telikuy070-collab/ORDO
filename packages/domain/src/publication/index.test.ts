import { describe, expect, it } from 'vitest';

import { OnlyScheduleOwnerCanPublishError, ScheduleNotPublishedError } from './index';

describe('publication domain', () => {
  it('throws a meaningful error when schedule is not published', () => {
    expect(() => {
      throw new ScheduleNotPublishedError('schedule-1');
    }).toThrow('Schedule schedule-1 is not published');
  });

  it('throws a meaningful error when a user lacks publish permission', () => {
    expect(() => {
      throw new OnlyScheduleOwnerCanPublishError();
    }).toThrow('Only schedule_owner or higher can publish schedule');
  });
});
