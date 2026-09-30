import { createRoute, useParams } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import type { Lesson as DomainLesson, LessonType, WeekType } from '@ordo/domain';
import {
  SupabaseLessonRepository,
  SupabaseScheduleVersionRepository,
  getSupabaseClient,
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
  useToast,
  type TimeSlot,
} from '@ordo/ui';

import { useSession } from '../auth/session';
import { RootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/schedule/$scheduleId',
  component: ScheduleEditorPage,
});

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const PAIRS = [1, 2, 3, 4, 5, 6];

const WEEK_TYPES: Array<{ value: WeekType; label: string }> = [
  { value: 'all', label: 'Каждую неделю' },
  { value: 'odd', label: 'Нечётная' },
  { value: 'even', label: 'Чётная' },
];

const LESSON_TYPES: Array<{ value: LessonType; label: string }> = [
  { value: 'lecture', label: 'Лекция' },
  { value: 'practice', label: 'Практика' },
  { value: 'seminar', label: 'Семинар' },
  { value: 'lab', label: 'Лабораторная' },
];

const EMPTY = {
  dayOfWeek: 0,
  pairNumber: 1,
  timeStart: '09:00',
  timeEnd: '10:30',
  groupId: '',
  teacherId: '',
  roomId: '',
  disciplineId: '',
  weekType: 'all' as WeekType,
  lessonType: 'lecture' as LessonType,
};

interface Option {
  value: string;
  label: string;
}

function ScheduleEditorPage() {
  const { scheduleId } = useParams({ from: '/schedule/$scheduleId' });
  const { user } = useSession();
  const { toast } = useToast();

  const [versions, setVersions] = useState<Array<{ id: string; versionNumber: number }>>([]);
  const [versionId, setVersionId] = useState<string>('');
  const [lessons, setLessons] = useState<DomainLesson[]>([]);
  const [options, setOptions] = useState<{
    groups: Option[];
    teachers: Option[];
    rooms: Option[];
    disciplines: Option[];
  }>({ groups: [], teachers: [], rooms: [], disciplines: [] });
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    const repository = new SupabaseScheduleVersionRepository();
    const list = await repository.findBySchedule(scheduleId);
    const mapped = list
      .map((v) => ({ id: v.id, versionNumber: v.versionNumber }))
      .sort((a, b) => b.versionNumber - a.versionNumber);
    setVersions(mapped);
    setVersionId((current) => current || (mapped[0]?.id ?? ''));
  }, [scheduleId]);

  const loadLessons = useCallback(async (id: string) => {
    if (!id) {
      setLessons([]);
      return;
    }
    const repository = new SupabaseLessonRepository();
    setLessons(await repository.findByVersion(id));
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const client = getSupabaseClient();
        // Buildings are read separately and joined in memory: rooms has both a
        // plain and a composite foreign key to buildings, so PostgREST cannot
        // resolve an embedded relation for it.
        const [groups, teachers, rooms, buildings, disciplines] = await Promise.all([
          client.from('groups').select('id, code'),
          client.from('teachers').select('id, full_name'),
          client.from('rooms').select('id, number, building_id'),
          client.from('buildings').select('id, name'),
          client.from('disciplines').select('id, name'),
        ]);
        if (!active) return;

        const toOption = (id: unknown, label: unknown): Option => ({
          value: String(id),
          label: String(label),
        });

        const buildingName = new Map(
          ((buildings.data ?? []) as Array<{ id: string; name: string }>).map((b) => [
            b.id,
            b.name,
          ]),
        );

        setOptions({
          groups: ((groups.data ?? []) as Array<{ id: string; code: string }>).map((g) =>
            toOption(g.id, g.code),
          ),
          teachers: ((teachers.data ?? []) as Array<{ id: string; full_name: string }>).map(
            (t) => toOption(t.id, t.full_name),
          ),
          rooms: ((rooms.data ?? []) as Array<{
            id: string;
            number: string;
            building_id: string;
          }>).map((r) =>
            toOption(r.id, `${buildingName.get(r.building_id) ?? ''} ${r.number}`.trim()),
          ),
          disciplines: (
            (disciplines.data ?? []) as Array<{ id: string; name: string }>
          ).map((d) => toOption(d.id, d.name)),
        });

        for (const result of [groups, teachers, rooms, buildings, disciplines]) {
          if (result.error) throw new Error(result.error.message);
        }

        // The selects start empty but render the first option, which leaves the
        // state out of sync with what the user sees and would submit "" for a
        // uuid column. Seed the state from the loaded options.
        setForm((current) => ({
          ...current,
          groupId: current.groupId || ((groups.data?.[0] as { id?: string })?.id ?? ''),
          teacherId: current.teacherId || ((teachers.data?.[0] as { id?: string })?.id ?? ''),
          roomId: current.roomId || ((rooms.data?.[0] as { id?: string })?.id ?? ''),
          disciplineId:
            current.disciplineId || ((disciplines.data?.[0] as { id?: string })?.id ?? ''),
        }));

        await loadVersions();
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Не удалось загрузить данные');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void init();
    return () => {
      active = false;
    };
  }, [loadVersions]);

  useEffect(() => {
    void loadLessons(versionId);
  }, [loadLessons, versionId]);

  const createVersion = async () => {
    try {
      const repository = new SupabaseScheduleVersionRepository();
      const next = (versions[0]?.versionNumber ?? 0) + 1;
      const created = await repository.create({
        scheduleId,
        versionNumber: next,
        authorId: user?.id ?? '',
        comment: '',
      });
      await loadVersions();
      setVersionId(created.id);
      toast({ title: `Создана версия ${next}`, variant: 'success' });
    } catch (cause) {
      toast({
        title: cause instanceof Error ? cause.message : 'Не удалось создать версию',
        variant: 'error',
      });
    }
  };

  const addLesson = async (event: FormEvent) => {
    event.preventDefault();
    if (!versionId) return;

    const missing = (
      [
        ['группа', form.groupId],
        ['преподаватель', form.teacherId],
        ['аудитория', form.roomId],
        ['дисциплина', form.disciplineId],
      ] as Array<[string, string]>
    )
      .filter(([, value]) => !value)
      .map(([label]) => label);

    if (missing.length > 0) {
      toast({
        title: `Не выбрано: ${missing.join(', ')}`,
        variant: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const repository = new SupabaseLessonRepository();
      await repository.create({
        versionId,
        groupId: form.groupId,
        subgroupIds: [],
        teacherId: form.teacherId,
        roomId: form.roomId,
        disciplineId: form.disciplineId,
        dayOfWeek: form.dayOfWeek,
        pairNumber: form.pairNumber,
        timeStart: form.timeStart,
        timeEnd: form.timeEnd,
        weekType: form.weekType,
        lessonType: form.lessonType,
      });
      setForm({ ...EMPTY, groupId: form.groupId, teacherId: form.teacherId, roomId: form.roomId, disciplineId: form.disciplineId });
      await loadLessons(versionId);
      toast({ title: 'Занятие добавлено', variant: 'success' });
    } catch (cause) {
      toast({
        title: cause instanceof Error ? cause.message : 'Не удалось добавить занятие',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const removeLesson = async (lessonId: string) => {
    try {
      await new SupabaseLessonRepository().delete(lessonId);
      await loadLessons(versionId);
    } catch (cause) {
      toast({
        title: cause instanceof Error ? cause.message : 'Не удалось удалить занятие',
        variant: 'error',
      });
    }
  };

  const label = (list: Option[], id: string) => list.find((o) => o.value === id)?.label ?? id;

  const gridLessons = useMemo(
    () =>
      lessons.map((lesson) => ({
        id: lesson.id,
        dayOfWeek: lesson.dayOfWeek,
        pairNumber: lesson.pairNumber,
        timeStart: lesson.timeStart,
        timeEnd: lesson.timeEnd,
        weekType: lesson.weekType,
        lessonType: lesson.lessonType,
        subject: label(options.disciplines, lesson.disciplineId),
        teacher: label(options.teachers, lesson.teacherId),
        room: label(options.rooms, lesson.roomId),
        group: label(options.groups, lesson.groupId),
        color: '',
      })),
    [lessons, options],
  );

  const slots = useMemo(() => {
    const seen = new Set<string>();
    const result: TimeSlot[] = [];
    for (const lesson of lessons) {
      const key = `${lesson.dayOfWeek}-${lesson.pairNumber}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        id: key,
        dayOfWeek: lesson.dayOfWeek,
        pairNumber: lesson.pairNumber,
        weekType: 'all',
      });
    }
    return result;
  }, [lessons]);

  return (
    <div>
      <PageHeader
        title="Редактор расписания"
        description={`Версии и занятия расписания ${scheduleId.slice(0, 8)}`}
      />

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

      {!loading && !error && (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-wrap items-end gap-4">
              <FormField label="Версия" className="w-56">
                <Select
                  value={versionId}
                  onChange={(e) => setVersionId(e.target.value)}
                  options={versions.map((v) => ({
                    value: v.id,
                    label: `Версия ${v.versionNumber}`,
                  }))}
                />
              </FormField>
              <Button type="button" variant="secondary" onClick={createVersion}>
                Новая версия
              </Button>
            </div>
          </Card>

          <Card>
            <form onSubmit={addLesson} className="grid gap-4 md:grid-cols-4">
              <FormField label="День" required>
                <Select
                  value={String(form.dayOfWeek)}
                  onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                  options={DAYS.map((d, i) => ({ value: String(i), label: d }))}
                />
              </FormField>

              <FormField label="Пара" required>
                <Select
                  value={String(form.pairNumber)}
                  onChange={(e) => setForm({ ...form, pairNumber: Number(e.target.value) })}
                  options={PAIRS.map((p) => ({ value: String(p), label: `Пара ${p}` }))}
                />
              </FormField>

              <FormField label="Начало" required>
                <Input
                  type="time"
                  value={form.timeStart}
                  onChange={(e) => setForm({ ...form, timeStart: e.target.value })}
                />
              </FormField>

              <FormField label="Окончание" required>
                <Input
                  type="time"
                  value={form.timeEnd}
                  onChange={(e) => setForm({ ...form, timeEnd: e.target.value })}
                />
              </FormField>

              <FormField label="Группа" required>
                <Select
                  value={form.groupId}
                  onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                  options={options.groups}
                />
              </FormField>

              <FormField label="Преподаватель" required>
                <Select
                  value={form.teacherId}
                  onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                  options={options.teachers}
                />
              </FormField>

              <FormField label="Аудитория" required>
                <Select
                  value={form.roomId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  options={options.rooms}
                />
              </FormField>

              <FormField label="Дисциплина" required>
                <Select
                  value={form.disciplineId}
                  onChange={(e) => setForm({ ...form, disciplineId: e.target.value })}
                  options={options.disciplines}
                />
              </FormField>

              <FormField label="Неделя" required>
                <Select
                  value={form.weekType}
                  onChange={(e) => setForm({ ...form, weekType: e.target.value as WeekType })}
                  options={WEEK_TYPES}
                />
              </FormField>

              <FormField label="Тип" required>
                <Select
                  value={form.lessonType}
                  onChange={(e) => setForm({ ...form, lessonType: e.target.value as LessonType })}
                  options={LESSON_TYPES}
                />
              </FormField>

              <div className="flex items-end md:col-span-4">
                <Button type="submit" loading={saving} disabled={!versionId}>
                  Добавить занятие
                </Button>
              </div>
            </form>
          </Card>

          {lessons.length === 0 ? (
            <EmptyState
              title="Занятий пока нет"
              description="Добавьте первое занятие через форму выше."
            />
          ) : (
            <>
              <ScheduleGrid
                lessons={gridLessons}
                timeSlots={slots}
                onLessonRemove={(timeSlotId) => {
                  const target = lessons.find(
                    (l) => `${l.dayOfWeek}-${l.pairNumber}` === timeSlotId,
                  );
                  if (target) void removeLesson(target.id);
                }}
              />
              <p className="text-xs text-text-muted">
                Удаление в сетке снимает первое занятие выбранной ячейки.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
