import { createRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  SupabasePublicScheduleRepository,
  type PublicLesson,
  type PublicSchedule,
} from '@ordo/infrastructure';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  PageHeader,
  ScheduleGrid,
  Select,
  Spinner,
  type Lesson,
  type TimeSlot,
} from '@ordo/ui';

import { RootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/schedule',
  component: SchedulePage,
});

const DEFAULT_TENANT_CODE = 'demo-kolledzh';

const LESSON_TYPE_LABELS: Record<string, string> = {
  lecture: 'Лекция',
  practice: 'Практика',
  seminar: 'Семинар',
  lab: 'Лабораторная',
};

const LESSON_COLORS: Record<string, string> = {
  lecture: 'bg-blue-100 text-blue-800 border-blue-200',
  practice: 'bg-green-100 text-green-800 border-green-200',
  seminar: 'bg-purple-100 text-purple-800 border-purple-200',
  lab: 'bg-orange-100 text-orange-800 border-orange-200',
};

/** Maps a public lesson onto the shared grid model. */
function toGridLesson(lesson: PublicLesson, index: number): Lesson {
  return {
    id: `${lesson.dayOfWeek}-${lesson.pairNumber}-${lesson.groupCode}-${index}`,
    dayOfWeek: lesson.dayOfWeek,
    pairNumber: lesson.pairNumber,
    timeStart: lesson.timeStart,
    timeEnd: lesson.timeEnd,
    weekType: lesson.weekType,
    lessonType: lesson.lessonType,
    subject: lesson.discipline,
    teacher: lesson.teacherName,
    room: `${lesson.buildingName}, ${lesson.roomNumber}`,
    group: lesson.groupCode,
    color: LESSON_COLORS[lesson.lessonType] ?? LESSON_COLORS['lecture'] ?? '',
  };
}

/** Builds one slot per occupied cell so the grid keeps its day alignment. */
function toTimeSlots(lessons: Lesson[]): TimeSlot[] {
  const seen = new Set<string>();
  const slots: TimeSlot[] = [];

  for (const lesson of lessons) {
    const key = `${lesson.dayOfWeek}-${lesson.pairNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);
    slots.push({
      id: key,
      dayOfWeek: lesson.dayOfWeek,
      pairNumber: lesson.pairNumber,
      weekType: lesson.weekType,
    });
  }

  return slots;
}

function SchedulePage() {
  const [tenantCode, setTenantCode] = useState(DEFAULT_TENANT_CODE);
  const [appliedCode, setAppliedCode] = useState(DEFAULT_TENANT_CODE);
  const [schedule, setSchedule] = useState<PublicSchedule | null>(null);
  const [groupCode, setGroupCode] = useState('all');
  const [week, setWeek] = useState<'all' | 'odd' | 'even'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const repository = new SupabasePublicScheduleRepository();
      setSchedule(await repository.getByTenantCode(code));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Не удалось загрузить расписание',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(appliedCode);
  }, [load, appliedCode]);

  const groupCodes = useMemo(
    () => [...new Set((schedule?.lessons ?? []).map((l) => l.groupCode))].sort(),
    [schedule],
  );

  const visibleLessons = useMemo(() => {
    const lessons = (schedule?.lessons ?? []).filter(
      (lesson) => groupCode === 'all' || lesson.groupCode === groupCode,
    );
    return lessons.map(toGridLesson);
  }, [schedule, groupCode]);

  const slots = useMemo(() => toTimeSlots(visibleLessons), [visibleLessons]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setGroupCode('all');
    setAppliedCode(tenantCode.trim());
  };

  return (
    <div>
      <PageHeader
        title="Расписание"
        description={
          schedule
            ? `${schedule.tenant.name} · ${LESSON_TYPE_LABELS['lecture'] ? `семестр ${schedule.semester?.number ?? '—'}` : ''}`
            : 'Публичное учебное расписание'
        }
      />

      <Card className="mb-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:flex-row md:items-end">
          <FormField label="Код колледжа" className="md:w-64">
            <Input
              value={tenantCode}
              onChange={(e) => setTenantCode(e.target.value)}
              placeholder={DEFAULT_TENANT_CODE}
            />
          </FormField>

          <FormField label="Группа" className="md:w-48">
            <Select
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value)}
              options={[
                { value: 'all', label: 'Все группы' },
                ...groupCodes.map((code) => ({ value: code, label: code })),
              ]}
            />
          </FormField>

          <FormField label="Неделя" className="md:w-40">
            <Select
              value={week}
              onChange={(e) => setWeek(e.target.value as 'all' | 'odd' | 'even')}
              options={[
                { value: 'all', label: 'Вся' },
                { value: 'odd', label: 'Нечётная' },
                { value: 'even', label: 'Чётная' },
              ]}
            />
          </FormField>

          <Button type="submit">Показать</Button>
        </form>
      </Card>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      {!loading && !error && !schedule && (
        <EmptyState
          title="Расписание не найдено"
          description="Колледж с таким кодом не найден или расписание ещё не опубликовано."
        />
      )}

      {!loading && !error && schedule && visibleLessons.length === 0 && (
        <EmptyState
          title="Нет занятий"
          description="Для выбранной группы и недели занятий не найдено."
        />
      )}

      {!loading && !error && schedule && visibleLessons.length > 0 && (
        <ScheduleGrid
          lessons={visibleLessons}
          timeSlots={slots}
          selectedWeekType={week}
          readOnly
        />
      )}
    </div>
  );
}
