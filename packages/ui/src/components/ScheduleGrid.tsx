import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useCallback, useMemo } from 'react';

import { Card } from './Card';

export interface TimeSlot {
  id: string;
  dayOfWeek: number; // 0-6 (Mon-Sun)
  pairNumber: number; // 1-8
  weekType: 'all' | 'odd' | 'even';
  lesson?: Lesson;
}

export interface Lesson {
  id: string;
  dayOfWeek: number;
  pairNumber: number;
  timeStart: string;
  timeEnd: string;
  weekType: 'all' | 'odd' | 'even';
  lessonType: 'lecture' | 'practice' | 'seminar' | 'lab';
  subject: string;
  teacher: string;
  room: string;
  group: string;
  color: string;
}

export interface ScheduleGridProps {
  timeSlots: TimeSlot[];
  lessons: Lesson[];
  onLessonDrop?: (lessonId: string, timeSlotId: string) => void;
  onLessonRemove?: (timeSlotId: string) => void;
  selectedWeekType?: 'all' | 'odd' | 'even';
  onWeekTypeChange?: (type: 'all' | 'odd' | 'even') => void;
  readOnly?: boolean;
}

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const PAIRS = [
  { number: 1, time: '08:30–10:00' },
  { number: 2, time: '10:10–11:40' },
  { number: 3, time: '12:10–13:40' },
  { number: 4, time: '13:50–15:20' },
  { number: 5, time: '15:30–17:00' },
  { number: 6, time: '17:10–18:40' },
  { number: 7, time: '18:50–20:20' },
];

const TYPE_COLORS = {
  lecture: 'bg-blue-100 text-blue-800 border-blue-200',
  practice: 'bg-green-100 text-green-800 border-green-200',
  seminar: 'bg-purple-100 text-purple-800 border-purple-200',
  lab: 'bg-orange-100 text-orange-800 border-orange-200',
};

type WeekType = 'all' | 'odd' | 'even';

function isVisibleForWeek(weekType: WeekType, selectedWeekType: WeekType): boolean {
  return selectedWeekType === 'all' || weekType === 'all' || weekType === selectedWeekType;
}

function SortableLesson({ lesson, onRemove, disabled }: { lesson: Lesson; onRemove?: () => void; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${TYPE_COLORS[lesson.lessonType]} border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{lesson.subject}</p>
          <p className="text-xs text-text-secondary truncate">{lesson.teacher}</p>
          <p className="text-xs text-text-secondary truncate">{lesson.room} · {lesson.group}</p>
        </div>
        {onRemove && !disabled && (
          <button
            onClick={onRemove}
            className="text-text-muted hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
            aria-label="Удалить занятие"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function TimeSlotCell({ timeSlot, lessons, onLessonRemove, readOnly, selectedWeekType }: {
  timeSlot: TimeSlot;
  lessons: Lesson[];
  onLessonRemove?: (timeSlotId: string) => void;
  readOnly?: boolean;
  selectedWeekType: 'all' | 'odd' | 'even';
}) {
  const { setNodeRef, isOver } = useDroppable({ id: timeSlot.id });
  const slotLessons = lessons.filter(lesson =>
    lesson.dayOfWeek === timeSlot.dayOfWeek
    && lesson.pairNumber === timeSlot.pairNumber
    && isVisibleForWeek(lesson.weekType, selectedWeekType)
  );

  return (
    <div
      ref={setNodeRef}
      className={`border border-surface-border rounded-lg min-h-[80px] p-2 bg-surface-card transition-colors ${isOver ? 'ring-2 ring-brand-500' : ''}`}
      data-time-slot-id={timeSlot.id}
    >
      {slotLessons.map(lesson => (
        <SortableLesson
          key={lesson.id}
          lesson={lesson}
          onRemove={() => onLessonRemove?.(timeSlot.id)}
          disabled={readOnly}
        />
      ))}
      {!slotLessons.length && !readOnly && (
        <div
          className="h-full border-2 border-dashed border-surface-border rounded-lg flex items-center justify-center text-text-muted text-xs"
        >
          Перетащите занятие сюда
        </div>
      )}
    </div>
  );
}

export function ScheduleGrid({
  timeSlots,
  lessons,
  onLessonDrop,
  onLessonRemove,
  selectedWeekType = 'all',
  onWeekTypeChange,
  readOnly = false,
}: ScheduleGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredSlots = useMemo(() => {
    return timeSlots.filter(slot => isVisibleForWeek(slot.weekType, selectedWeekType));
  }, [timeSlots, selectedWeekType]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const targetSlotId = filteredSlots.some(slot => slot.id === overId)
      ? overId
      : lessons.find(lesson => lesson.id === overId)
        ? filteredSlots.find(slot =>
            lessons.some(lesson =>
              lesson.id === overId
              && lesson.dayOfWeek === slot.dayOfWeek
              && lesson.pairNumber === slot.pairNumber
              && isVisibleForWeek(lesson.weekType, selectedWeekType)
            )
          )?.id
        : undefined;

    if (targetSlotId) {
      onLessonDrop?.(activeId, targetSlotId);
    }
  }, [filteredSlots, lessons, onLessonDrop, selectedWeekType]);

  const gridData = useMemo(() => {
    const data: Record<number, Array<TimeSlot | undefined>> = {};
    PAIRS.forEach(pair => {
      data[pair.number] = DAYS.map((_, dayIndex) => {
        const matchingSlots = filteredSlots.filter(slot =>
          slot.dayOfWeek === dayIndex
          && slot.pairNumber === pair.number
          && isVisibleForWeek(slot.weekType, selectedWeekType)
        );

        return matchingSlots.find(slot => slot.weekType === 'all') ?? matchingSlots[0];
      });
    });
    return data;
  }, [filteredSlots, selectedWeekType]);

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-surface-border flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-text-primary">Недельное расписание</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Неделя:</label>
          <select
            value={selectedWeekType}
            onChange={e => onWeekTypeChange?.(e.target.value as 'all' | 'odd' | 'even')}
            className="px-3 py-1.5 text-sm border border-surface-border rounded-lg bg-surface-card text-text-primary focus:ring-2 focus:ring-brand-500"
            disabled={readOnly}
          >
            <option value="all">Все недели</option>
            <option value="odd">Нечётные</option>
            <option value="even">Чётные</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={[...lessons.map(lesson => lesson.id), ...timeSlots.map(slot => slot.id)]}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-[80px_repeat(6,1fr)]">
              {/* Time column header */}
              <div className="col-span-1 p-2 text-center text-xs font-medium text-text-secondary bg-surface-muted border-b border-surface-border border-r border-surface-border">
                Пара / Время
              </div>
              {/* Day headers */}
              {DAYS.map((day, index) => (
                <div key={index} className="p-2 text-center text-xs font-medium text-text-primary bg-surface-card border-b border-surface-border border-r border-surface-border">
                  {day}
                </div>
              ))}

              {/* Grid rows */}
              {PAIRS.map(pair => {
                // Prefer the times carried by the lessons themselves: the
                // hardcoded defaults are only a fallback for empty pairs, and
                // showing them unconditionally can contradict the timetable.
                const times = new Set(
                  lessons
                    .filter(lesson => lesson.pairNumber === pair.number)
                    .map(lesson => `${lesson.timeStart.slice(0, 5)}–${lesson.timeEnd.slice(0, 5)}`),
                );
                const label =
                  times.size === 1
                    ? [...times][0]
                    : pair.time;

                return (
                <React.Fragment key={pair.number}>
                  {/* Time label */}
                  <div className="p-2 text-center text-xs text-text-secondary bg-surface-muted border-r border-surface-border border-b border-surface-border flex items-center justify-center">
                    <span className="font-mono">{label}</span>
                  </div>
                  {/* Time slots for each day */}
                  {DAYS.map((_, dayIndex) => {
                    const timeSlot = gridData[pair.number]?.[dayIndex];

                    return timeSlot ? (
                      <TimeSlotCell
                        key={`${pair.number}-${dayIndex}`}
                        timeSlot={timeSlot}
                        lessons={lessons}
                        onLessonRemove={onLessonRemove}
                        readOnly={readOnly}
                        selectedWeekType={selectedWeekType}
                      />
                    ) : (
                      <div
                        key={`${pair.number}-${dayIndex}`}
                        className="border border-surface-border rounded-lg min-h-[80px] bg-surface-muted/50"
                        aria-label="Время не выбрано"
                      />
                    );
                  })}
                </React.Fragment>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-surface-border flex flex-wrap items-center gap-4 text-sm">
        <span className="font-medium text-text-secondary">Типы занятий:</span>
        <div className="flex items-center gap-4">
          {Object.entries(TYPE_COLORS).map(([type, classes]) => (
            <div key={type} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded ${classes.replace('bg-', 'bg-').replace('text-', '').replace('border-', 'border-')}`}></span>
              <span className="text-text-secondary capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}