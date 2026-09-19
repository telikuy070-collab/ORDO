# Ordo — Data Model

> Схема БД, RLS, публичные view, фича-флаги.
> **Это спецификация, а не готовая схема.** Агент создаёт таблицы сам.

---

## 1. Принципы

- **Мультитенантность**: `tenant_id` в каждой таблице.
- **RLS**: обязателен для каждой таблицы.
- **Soft delete**: `is_active` вместо `DELETE`.
- **Audit**: каждое изменение логируется.
- **UUID**: все ID — UUID v4.
- **Timestamps**: `created_at`, `updated_at` везде.
- **Публичные view**: только для `anon`.

---

## 2. Сущности (из domain model)

Агент создаёт таблицы **строго по сущностям** из `docs/02-domain-model.md`:

### Identity
- `tenants`
- `user_roles`

### Academic
- `specialties`
- `groups`
- `subgroups`
- `semesters`
- `disciplines`
- `curriculum`

### Resources
- `teachers`
- `buildings`
- `rooms`
- `teacher_preferences`

### Scheduling
- `schedules`
- `schedule_versions`
- `schedule_lessons`
- `conflicts`
- `constraints`

### Publication
- `notifications`
- `subscriptions`

### ImportExport
- `import_jobs`
- `export_jobs`
- `mappings`

### Analytics
- `workload_reports`
- `teacher_loads`
- `group_loads`

### Audit
- `audit_events`
- `change_logs`

### Features
- `tenant_features`

**Каждая таблица — строго по сущности.** Поля — из domain model.

---

## 3. Правила для таблиц

Агент следует этим правилам:

1. **`id`**: UUID, PRIMARY KEY, `gen_random_uuid()`.
2. **`tenant_id`**: UUID, NOT NULL, REFERENCES `tenants(id)` ON DELETE CASCADE.
3. **`created_at`**: TIMESTAMPTZ, DEFAULT `now()`.
4. **`updated_at`**: TIMESTAMPTZ, DEFAULT `now()`.
5. **`is_active`**: BOOLEAN, DEFAULT `true` (для soft delete).
6. **Уникальность**: `UNIQUE (tenant_id, code)` где применимо.
7. **CHECK**: для enum-полей.
8. **Индексы**: на `tenant_id`, foreign keys, часто используемые поля.

---

## 4. RLS-политики

Агент создаёт **для каждой таблицы**:

1. **`owner`**: полный доступ (ALL).
2. **`schedule_owner`**: полный доступ в тенанте.
3. **`tenant_admin`**: полный доступ в тенанте (кроме расписания).
4. **`department_head`**: своё отделение (READ + ограниченный WRITE).
5. **`teacher`**: свои данные (READ + ограниченный WRITE).
6. **`anon`**: только публичные view.

**Обязательно**:
- `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;`
- Помощник `get_user_role(user_uuid, tenant_uuid)`.
- `SECURITY DEFINER` для helper-функций.

---

## 5. Публичные view

Агент создаёт view для `anon`:

- `public_groups` — группы (код, специальность, курс).
- `public_teachers` — преподаватели (ФИО).
- `public_rooms` — аудитории (номер, корпус, вместимость).
- `public_schedule` — опубликованное расписание.

**Правила**:
- Только **публичные поля**.
- Только **опубликованное** (`status = 'published'`).
- `GRANT SELECT ON <view> TO anon;`
- **НЕ давать** `anon` доступ к таблицам напрямую.

---

## 6. Фича-флаги

Агент создаёт таблицу `tenant_features`:

| feature_key | default | описание |
|---|---|---|
| `student_auth` | false | Логин студентов |
| `parent_access` | false | Доступ родителей |
| `push_notifications` | false | Push-уведомления |
| `teacher_self_service` | true | Пожелания преподавателей |
| `auto_generation` | false | Автогенерация расписания |
| `multi_language` | true | Мультиязычность |
| `qr_attendance` | false | QR-посещаемость |

**Управление**: только `owner`.

---

## 7. Миграции

Агент создаёт миграции **в порядке**:
supabase/migrations/
├── 001_init.sql
├── 002_tenants.sql
├── 003_users_roles.sql
├── 004_academic_structure.sql
├── 005_resources.sql
├── 006_scheduling.sql
├── 007_publication.sql
├── 008_rls_policies.sql
├── 009_public_views.sql
└── 010_tenant_features.sql

text

**Команда**: `supabase migration new <name>`.

---

## 8. Индексы

Агент создаёт индексы:

- `tenant_id` — на каждой таблице.
- Foreign keys — на каждой.
- Часто используемые поля:
  - `schedule_lessons(day_of_week, pair_number)`
  - `audit_events(created_at DESC)`
  - `groups(specialty_id)`

---

## 9. Тесты

Агент пишет тесты:

- **RLS-тесты** (`pgTAP`):
  - `anon` не видит черновики.
  - `teacher` видит только свои пары.
  - `schedule_owner` видит всё в тенанте.
  - `owner` видит всё.
- **Constraint-тесты**:
  - `day_of_week` ∈ [1, 7].
  - `pair_number` ∈ [1, 8].
  - Уникальность кодов.

---

## 10. Ссылки

- [Architecture](01-architecture.md)
- [Domain Model](02-domain-model.md)
- [RBAC](03-rbac.md)
- [ADR-003: single-supabase](../adr/003-single-supabase.md)
- [ADR-004: anonymous-students](../adr/004-anonymous-students.md)
- [ADR-005: public-views](../adr/005-public-views.md)