# Ordo — Architecture

> C4-модель, границы модулей, потоки данных.

---

## 1. Контекст (C4 Level 1)

### Акторы
- **Зам** (`schedule_owner`) — источник истины.
- **Преподаватель** (`teacher`) — свои пары, нагрузка, пожелания.
- **Студент** (`anon`) — смотрит расписание.
- **Зав. отделением** (`department_head`) — своё отделение.
- **Директор** (`tenant_admin`) — управляет колледжем.
- **Основатель** (`owner`) — платформа, код, фичи.

### Внешние системы
- **Supabase** — Postgres + RLS + Auth + Realtime + Edge Functions.
- **Vercel** — деплой.
- **GitHub** — хранение кода.

---

## 2. Контейнеры (C4 Level 2)
┌─────────────────────────────────────────────────────────────┐
│ ПОЛЬЗОВАТЕЛИ │
│ Зам, Преподаватель, Студент, Зав. отделением, Директор │
└──────────┬──────────────────────────────────┬───────────────┘
│ │
▼ ▼
┌──────────────────────┐ ┌──────────────────────┐
│ apps/workspace │ │ apps/student │
│ (PWA для staff) │ │ (PWA для студентов) │
│ │ │ │
│ — React 19.3 │ │ — React 19.3 │
│ — Vite 6 │ │ — Vite 6 │
│ — Логин (Supabase) │ │ — Без логина │
│ — Realtime │ │ — Офлайн-first │
└──────────┬───────────┘ └──────────┬───────────┘
│ │
│ packages/* (общие) │
│ ┌────────────────────┐ │
└──────┤ domain │──────┘
│ application │
│ infrastructure │
│ ui, types, config │
└─────────┬──────────┘
│
▼
┌────────────────────────────────┐
│ SUPABASE │
│ ┌──────────────────────────┐ │
│ │ Postgres 16 + RLS │ │
│ ├──────────────────────────┤ │
│ │ Auth (staff only) │ │
│ ├──────────────────────────┤ │
│ │ Realtime │ │
│ ├──────────────────────────┤ │
│ │ Edge Functions (Deno) │ │
│ ├──────────────────────────┤ │
│ │ Storage │ │
│ └──────────────────────────┘ │
└────────────────────────────────┘

text

### apps/workspace
- **Для кого**: зам, преподаватели, зав. отделениями.
- **Логин**: обязателен (Supabase Auth).
- **Роли**: `schedule_owner`, `teacher`, `department_head`, `tenant_admin`.
- **Функции**: дашборд, редактор расписания, аналитика, экспорт.

### apps/student
- **Для кого**: студенты, гости.
- **Логин**: не нужен (аноним).
- **Роли**: `anon`.
- **Функции**: просмотр расписания, поиск, QR, офлайн.

### packages/*
- **domain** — сущности, value objects, инварианты. Ноль зависимостей.
- **application** — use-cases, порты, DTO.
- **infrastructure** — Supabase, Excel, storage.
- **ui** — дизайн-система.
- **types** — DTO, общие типы.
- **config** — eslint, tsconfig, prettier.

---

## 3. Компоненты (C4 Level 3)

### 3.1. Identity
- **Ответственность**: пользователи, роли, тенанты, аутентификация.
- **Сущности**: `Tenant`, `User`, `Role`, `Session`.
- **Порты**: `IUserRepository`, `IRoleRepository`, `IAuthProvider`.
- **Use-cases**: `RegisterUser`, `LoginUser`, `AssignRole`.

### 3.2. Academic
- **Ответственность**: специальности, группы, подгруппы, семестры, дисциплины.
- **Сущности**: `Specialty`, `Group`, `Subgroup`, `Semester`, `Curriculum`, `Discipline`.
- **Порты**: `IGroupRepository`, `ISemesterRepository`, `ICurriculumRepository`.
- **Use-cases**: `CreateGroup`, `AssignCurriculum`, `ImportStructure`.

### 3.3. Resources
- **Ответственность**: преподаватели, аудитории, корпуса, пожелания.
- **Сущности**: `Teacher`, `Room`, `Building`, `TeacherPreference`.
- **Порты**: `ITeacherRepository`, `IRoomRepository`, `IPreferenceRepository`.
- **Use-cases**: `CreateTeacher`, `SubmitPreference`, `AssignRoom`.

### 3.4. Scheduling
- **Ответственность**: расписание, версии, конфликты, ограничения.
- **Сущности**: `Schedule`, `ScheduleVersion`, `Lesson`, `Conflict`, `Constraint`.
- **Порты**: `IScheduleRepository`, `IConflictDetector`, `IConstraintEngine`.
- **Use-cases**: `CreateSchedule`, `AddLesson`, `DetectConflicts`, `PublishSchedule`, `RollbackVersion`.

### 3.5. Publication
- **Ответственность**: публикация для студентов, уведомления.
- **Сущности**: `PublishedSchedule`, `Notification`, `Subscription`.
- **Порты**: `IPublicationRepository`, `INotificationService`.
- **Use-cases**: `Publish`, `NotifyTeachers`, `NotifyStudents`.

### 3.6. ImportExport
- **Ответственность**: Excel, CSV, внешние форматы.
- **Сущности**: `ImportJob`, `ExportJob`, `Mapping`.
- **Порты**: `IExcelParser`, `IExcelGenerator`.
- **Use-cases**: `ImportFromExcel`, `ExportToExcel`.

### 3.7. Analytics
- **Ответственность**: нагрузка, отчёты, метрики.
- **Сущности**: `WorkloadReport`, `TeacherLoad`, `GroupLoad`.
- **Порты**: `IAnalyticsRepository`.
- **Use-cases**: `GetTeacherLoad`, `GetGroupLoad`, `GenerateReport`.

### 3.8. Audit
- **Ответственность**: история, аудит.
- **Сущности**: `AuditEvent`, `ChangeLog`.
- **Порты**: `IAuditRepository`.
- **Use-cases**: `LogEvent`, `GetHistory`.

---

## 4. Правила зависимостей
Domain ← Application ← Infrastructure ← Presentation

text

- **Domain** — ноль зависимостей.
- **Application** — только `domain`.
- **Infrastructure** — `domain`, `application`.
- **Presentation** — `application` (через DTO).

**Модули не знают друг о друге.** Общение — через `application`.

**Если `domain` импортирует `infrastructure` — коммит отклоняется.**

---

## 5. Потоки данных

### 5.1. Публикация расписания
Зам → workspace → application.PublishSchedule
→ domain.Schedule.publish()
→ infrastructure.SupabaseRepository.save()
→ Supabase (Postgres + Realtime)
→ student PWA (Realtime → обновление)

text

### 5.2. Просмотр расписания студентом
Студент → student PWA → application.GetPublicSchedule
→ infrastructure.PublicRepository.fetch()
→ Supabase (public_schedule view)
→ отображение

text

### 5.3. Импорт Excel
Зам → workspace → application.ImportFromExcel
→ infrastructure.ExcelParser.parse()
→ domain.Curriculum.create()
→ infrastructure.SupabaseRepository.save()

text

---

## 6. Деплой
GitHub (main) → Vercel
├── workspace.ordo.app
└── student.ordo.app
↓
Supabase
├── Postgres
├── Auth
├── Realtime
└── Edge Functions

text

---

## 7. Что НЕ входит (Architecture Boundaries)

- ❌ Микросервисы (пока).
- ❌ Отдельный backend (кроме Supabase).
- ❌ Мобильные приложения.
- ❌ SSR (только SPA/PWA).
- ❌ Собственная БД (только Supabase).

---

## 8. Ссылки

- [Vision](00-vision.md)
- [Domain Model](02-domain-model.md)
- [RBAC](03-rbac.md)
- [Data Model](04-data-model.md)
- [Tech Stack](05-tech-stack.md)
- [ADR](../adr/)
- [RFC](../rfc/)