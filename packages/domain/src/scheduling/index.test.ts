import { describe, expect, it } from 'vitest';

import {
  GroupDoubleBookedError,
  InvalidLessonTimeError,
  LessonConflictError,
  PublishedScheduleImmutableError,
  RoomDoubleBookedError,
  SchedulingError,
  ScheduleAlreadyPublishedError,
  ScheduleVersionNotFoundError,
  TeacherDoubleBookedError,
} from './index';

describe('scheduling domain', () => {
  it('throws a meaningful error when lesson time is invalid', () => {
    expect(() => {
      throw new InvalidLessonTimeError('09:30', '08:00');
    }).toThrow('Lesson time must be valid: 09:30 <= 08:00');
  });

  it('throws a meaningful error when schedule is already published', () => {
    expect(() => {
      throw new ScheduleAlreadyPublishedError('schedule-42');
    }).toThrow('Schedule schedule-42 is already published');
  });

  it('throws a meaningful error when a teacher is double booked', () => {
    expect(() => {
      throw new TeacherDoubleBookedError('teacher-1', 2, 3);
    }).toThrow('Teacher teacher-1 is already booked on day 2 pair 3');
  });

  it('throws a meaningful error when a group is double booked', () => {
    expect(() => {
      throw new GroupDoubleBookedError('group-1', 3, 2);
    }).toThrow('Group group-1 already has a lesson on day 3 pair 2');
  });

  it('throws a meaningful error when a room is double booked', () => {
    expect(() => {
      throw new RoomDoubleBookedError('room-5', 1, 4);
    }).toThrow('Room room-5 is already booked on day 1 pair 4');
  });

  it('throws a meaningful error when a schedule version is not found', () => {
    expect(() => {
      throw new ScheduleVersionNotFoundError('version-9');
    }).toThrow('Schedule version not found: version-9');
  });

  it('throws a meaningful error when a lesson has a conflict', () => {
    expect(() => {
      throw new LessonConflictError('lesson-7', 'teacher_double_booked');
    }).toThrow('Conflict detected for lesson lesson-7: teacher_double_booked');
  });

  it('throws a meaningful error when a published schedule is mutated', () => {
    expect(() => {
      throw new PublishedScheduleImmutableError();
    }).toThrow('Published schedule is read-only');
  });

  it('names all scheduling errors correctly', () => {
    expect(new SchedulingError('base').name).toBe('SchedulingError');
    expect(new InvalidLessonTimeError('a', 'b').name).toBe('InvalidLessonTimeError');
    expect(new ScheduleAlreadyPublishedError('s').name).toBe('ScheduleAlreadyPublishedError');
    expect(new TeacherDoubleBookedError('t', 1, 1).name).toBe('TeacherDoubleBookedError');
    expect(new GroupDoubleBookedError('g', 1, 1).name).toBe('GroupDoubleBookedError');
    expect(new RoomDoubleBookedError('r', 1, 1).name).toBe('RoomDoubleBookedError');
    expect(new ScheduleVersionNotFoundError('v').name).toBe('ScheduleVersionNotFoundError');
    expect(new LessonConflictError('l', 'room_double_booked').name).toBe('LessonConflictError');
    expect(new PublishedScheduleImmutableError().name).toBe('PublishedScheduleImmutableError');
  });

  it('all scheduling errors extend the base SchedulingError', () => {
    const errors = [
      new InvalidLessonTimeError('a', 'b'),
      new ScheduleAlreadyPublishedError('s'),
      new TeacherDoubleBookedError('t', 1, 1),
      new GroupDoubleBookedError('g', 1, 1),
      new RoomDoubleBookedError('r', 1, 1),
      new ScheduleVersionNotFoundError('v'),
      new LessonConflictError('l', 'teacher_double_booked'),
      new PublishedScheduleImmutableError(),
    ];

    expect(errors.every((error) => error instanceof SchedulingError)).toBe(true);
  });
});
