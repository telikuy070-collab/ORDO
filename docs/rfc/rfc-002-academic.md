# RFC-002: Academic

## Цель
Определить границы модуля Academic: специальности, группы, семестры, дисциплины и учебные планы. Установить контракты между доменными сущностями и application use-cases.

## Границы
- Внутри: сущности `Specialty`, `Group`, `Subgroup`, `Semester`, `Discipline`, `Curriculum`, инварианты кода группы и семестров
- Снаружи: workspace PWA (менеджер структуры), student PWA (просмотр групп и расписания)
- Не входит: оценки студентов, посещаемость, экзамены (кроме типа контроля в Curriculum)

## Контракты (порты)
- `IGroupRepository` — CRUD групп и подгрупп
- `ISpecialtyRepository` — управление специальностями
- `ISemesterRepository` — семестры и их даты
- `IDisciplineRepository` — дисциплины и типы занятий
- `ICurriculumRepository` — привязка дисциплин к группам

## Use-cases
- `CreateSpecialty` — создание специальности
- `CreateGroup` — создание группы с кодом
- `AssignCurriculum` — привязка дисциплин к группе
- `ImportStructure` — импорт структуры из Excel
- `GetGroupsBySpecialty` — получение групп по специальности

## События
- `SpecialtyCreated` — специальность создана
- `GroupCreated` — группа создана
- `CurriculumAssigned` — учебный план привязан

## Зависимости
- Domain: Academic module (сущности, инварианты)
- Application: use-cases, порты
- Infrastructure: Excel parser для импорта структуры

## Тесты
- Unit-тесты для use-cases Academic
- Интеграционные тесты импорта из Excel
- Тесты инвариантов: уникальность кода группы

## Definition of Done
- [ ] Domain Entity: Specialty, Group, Discipline, Semester определены
- [ ] Application: Use-cases созданы для управления структурой
- [ ] Infrastructure: Excel parser для импорта структуры
- [ ] ADR-001: Monorepo принят
- [ ] RFC-002: Academic принят