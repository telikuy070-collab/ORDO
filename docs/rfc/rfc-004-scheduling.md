# RFC-004: Scheduling

## Цель
Определить модуль Scheduling: создание расписания, версии, конфликты и ограничения. Установить, как зам создает, проверяет и публикует расписание.

## Границы
- Внутри: сущности `Schedule`, `ScheduleVersion`, `Lesson`, `Conflict`, `Constraint`, инварианты: преподаватель не может вести 2 пары одновременно, группа не может слушать 2 пары одновременно, аудитория не может быть занята дважды
- Снаружи: workspace PWA (редактор расписания), student PWA (просмотр опубликованного расписания)
- Не входит: импорт структуры из Excel (ImportExport), аналитика нагрузки (Analytics)

## Контракты (порты)
- `IScheduleRepository` — CRUD расписаний и версий
- `IConflictDetector` — обнаружение конфликтов при добавлении пар
- `IConstraintEngine` — проверка бизнес-ограничений
- `IPublicationService` — публикация расписания для студентов

## Use-cases
- `CreateSchedule` — создание нового расписания для семестра
- `AddLesson` — добавление пары в расписание
- `DetectConflicts` — проверка конфликтов при изменении
- `PublishSchedule` — публикация расписания (смена статуса с draft на published)
- `RollbackVersion` — откат к предыдущей версии расписания

## События
- `ScheduleCreated` — расписание создано
- `LessonAdded` — пара добавлена в расписание
- `ConflictDetected` — обнаружен конфликт
- `SchedulePublished` — расписание опубликовано

## Зависимости
- Domain: Scheduling module (сущности, инварианты)
- Application: use-cases, порты
- Infrastructure: Supabase репозитории, Excel import/export

## Тесты
- Unit-тесты для use-cases Scheduling
- Интеграционные тесты обнаружения конфликтов
- Тесты инвариантов: правило "одна пара — один преподаватель/группа/аудитория"

## Definition of Done
- [ ] Domain Entity: Schedule, ScheduleVersion, Lesson, Conflict, Constraint определены с инвариантами
- [ ] Application: Use-cases реализованы для управления расписанием
- [ ] Infrastructure: Supabase репозитории, детектор конфликтов
- [ ] ADR-001: Monorepo принят
- [ ] RFC-004: Scheduling принят