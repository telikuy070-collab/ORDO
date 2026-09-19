# Ordo — Data Model

> Схема БД, RLS, публичные view, фича-флаги, Edge Functions.
> Спецификация. Агент создаёт таблицы сам.

---

## 1. Принципы

- Мультитенантность: `tenant_id` в каждой таблице.
- RLS: обязателен для каждой таблицы.
- Soft delete: `is_active` вместо `DELETE`.
- Audit: каждое изменение логируется через `audit_events`.
- UUID: все ID — UUID v4.
- Timestamps: `created_at`, `updated_at` везде.
- Публичные view: только для `anon`.
- Функция доступа: `has_role()` и `has_feature()` вместо прямого доступа.

---

## 2. Сущности

### Identity
- `tenants`
- `user_roles` — множественные роли (`UNIQUE (user_id, tenant_id, role)`)

### Academic
- `specialties`, `groups`, `subgroups`, `semesters`, `disciplines`, `curriculum`

### Resources
- `teachers`, `buildings`, `rooms`, `teacher_preferences`

### Scheduling
- `schedules`, `schedule_versions`, `schedule_lessons`, `conflicts`, `constraints`

### Publication
- `notifications`, `subscriptions`

### ImportExport
- `import_jobs`, `export_jobs`, `mappings` — реализованы в `supabase/migrations/001_import_export.sql`.
- `tenants` — таблица-корень для `tenant_id` (FK ON DELETE CASCADE).
- RLS: `import_jobs_tenant_isolation`, `export_jobs_tenant_isolation`, `mappings_tenant_isolation`, `tenants_self_isolation`.
- Helper `current_tenant_id()` — stub, owner должен реализовать через JWT-claim.

### Analytics
- `workload_reports`, `teacher_loads`, `group_loads`

### Audit
- `audit_events` — партиционирована по `created_at` (месяц).
- `change_logs` — **удалено**, история в `audit_events`.

### Features
- `tenant_features` — без `min_app_version`.

---

## 3. Правила для таблиц

1. `id`: UUID, PRIMARY KEY, `gen_random_uuid()`.
2. `tenant_id`: UUID, NOT NULL, REFERENCES `tenants(id)` ON DELETE CASCADE.
3. `created_at`: TIMESTAMPTZ, DEFAULT `now()`.
4. `updated_at`: TIMESTAMPTZ, DEFAULT `now()`.
5. `is_active`: BOOLEAN, DEFAULT `true`.
6. Уникальность: `UNIQUE (tenant_id, code)` где применимо.
7. CHECK: для enum-полей.
8. Индексы: на `tenant_id`, foreign keys, частые поля.

---

## 4. REVOKE и GRANT

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

GRANT EXECUTE ON FUNCTION has_feature(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION has_role(uuid, uuid, text) TO anon;

GRANT SELECT ON public_groups TO anon;
GRANT SELECT ON public_teachers TO anon;
GRANT SELECT ON public_rooms TO anon;
GRANT SELECT ON public_schedule TO anon;
```

### Helper-функции

```sql
CREATE OR REPLACE FUNCTION has_role(
  user_uuid UUID, tenant_uuid UUID, role_name TEXT
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid
      AND tenant_id = tenant_uuid
      AND role = role_name
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION has_feature(
  tenant_uuid UUID, feature_key TEXT
) RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT enabled FROM tenant_features
     WHERE tenant_id = tenant_uuid AND feature_key = feature_key),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;
```

**Удалено:** `get_user_role` — заменено на `has_role()`.

---

## 5. RLS для authenticated

### Политика `authenticated_own_features`

```sql
CREATE POLICY "authenticated_own_features" ON tenant_features
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_features.tenant_id
      AND is_active = true
  )
);
```

### Политика `authenticated_read_published` для `schedule_lessons`

```sql
CREATE POLICY "authenticated_read_published" ON schedule_lessons
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM schedule_versions sv
    JOIN schedules s ON s.id = sv.schedule_id
    WHERE sv.id = schedule_lessons.version_id
      AND s.status = 'published'
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND tenant_id = s.tenant_id AND is_active = true
      )
  )
);
```

### Политика `schedule_owner_all` для `schedule_lessons`

```sql
CREATE POLICY "schedule_owner_all" ON schedule_lessons
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM schedule_versions sv
    JOIN schedules s ON s.id = sv.schedule_id
    WHERE sv.id = schedule_lessons.version_id
      AND has_role(auth.uid(), s.tenant_id, 'schedule_owner')
  )
);
```

### Политика `teacher_own` для `schedule_lessons`

```sql
CREATE POLICY "teacher_own" ON schedule_lessons
FOR SELECT TO authenticated
USING (
  teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
);
```

---

## 6. Публичные view

### View `public_groups`

```sql
CREATE VIEW public_groups WITH (security_invoker = true) AS
SELECT g.id, g.code, s.code AS specialty_code, s.name AS specialty_name,
       g.course, g.semester_number, g.tenant_id
FROM groups g JOIN specialties s ON s.id = g.specialty_id
WHERE g.is_active = true;
```

GRANT SELECT ON public_groups TO anon;

### View `public_schedule`

```sql
CREATE VIEW public_schedule WITH (security_invoker = true) AS
SELECT sl.id, sl.group_id, sl.teacher_id, sl.room_id,
       sl.day_of_week, sl.pair_number, sl.time_start, sl.time_end,
       sl.week_type, sl.lesson_type,
       d.name AS discipline_name, g.code AS group_code,
       t.full_name AS teacher_name, r.number AS room_number,
       s.tenant_id
FROM schedule_lessons sl
JOIN schedule_versions sv ON sv.id = sl.version_id
JOIN schedules s ON s.id = sv.schedule_id
JOIN disciplines d ON d.id = sl.discipline_id
JOIN groups g ON g.id = sl.group_id
LEFT JOIN teachers t ON t.id = sl.teacher_id
LEFT JOIN rooms r ON r.id = sl.room_id
WHERE s.status = 'published' AND s.published_at <= now();
```

GRANT SELECT ON public_schedule TO anon;

---

## 7. Edge Functions

### 7.1. create-tenant

- **SERVICE_ROLE_KEY** — только для `INSERT INTO tenants`.
- Всё остальное через `ANON_KEY + RLS`.
- Проверка `auth.uid()`.
- Проверка `has_role(user, 'owner')`.
- Валидация `name`, `slug`.
- `adminClient` — только для `INSERT INTO tenants`.
- Остальное — `userClient`.

### 7.2. get-public-features

- **Rate limiting**: 30 req/min (Upstash).
- **Валидация** `tenantSlug` (regex).
- **Проверка** `tenant.is_active`.
- **Rate limiting** применяется через Upstash Ratelimit.
- Возврат списка фич для тенанта.
- `Cache-Control: public, max-age=60` (Upstash Redis кэш, 1 минута).

### 7.3. public-schedule

- **Rate limiting**: 60 req/min (Upstash).
- **Кэш**: 5 минут (Upstash Redis).
- **Явная проверка** `status = 'published'`.
- Возврат расписания, доступного студентам.
- Student PWA использует **polling раз в 5 минут** для обновлений.

---

## 8. Audit партиционирование

Таблица `audit_events` партиционирована по `created_at` (месяц).

```sql
CREATE TABLE audit_events (
  id UUID DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  event_type TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
```

Cron через `pg_cron` для создания/удаления партиций:

```sql
SELECT cron.schedule('create-audit-partition', '0 0 1 * *',
  'SELECT create_audit_partition()');

SELECT cron.schedule('drop-old-audit', '0 0 1 * *',
  'SELECT drop_old_audit_partition()');
```

**Важно:** `ALTER PUBLICATION supabase_realtime DROP TABLE audit_events;` — реальtime для anon отключен.

---

## 9. Версионирование view

- `public_schedule_v1`, `public_schedule_v2` — клиент знает свою версию.
- Обновление view через миграции.
- Backward compatibility — старая версия работает 1 спринт.

---

## 10. Миграции

`supabase/migrations/` — см. структуру в конце файла.

### Реализованные миграции (фаза 5)

| Миграция | Содержимое |
|---|---|
| `001_import_export.sql` | `tenants`, `import_jobs`, `export_jobs`, `mappings`, индексы, триггер `set_updated_at`, RLS-политики, helper `current_tenant_id()` (stub) |
| `seed/001_import_export.sql` | Тестовые тенанты и jobs для локальной разработки |

### План (owner)
- Миграции для модулей identity, academic, resources, scheduling, publication, analytics, audit — по порядку.
- `has_role()` / `has_feature()` — в `002_identity.sql`.
- `public_groups` / `public_schedule` view — в соответствующих миграциях.
- `audit_events` партиционирование — в `009_audit.sql`.

---

## 11. Ссылки

Architecture, Domain Model, RBAC, ADR-003, ADR-004, ADR-011, ADR-012, ADR-013, ADR-014.