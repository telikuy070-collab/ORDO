# ADR-012: Audit Strategy

## Статус
Принято

## Объединенная таблица audit_events и change_logs

Для экономии ресурсов и упрощения архитектуры **`change_logs`** объединен в **`audit_events`**. Все изменения истории now живут в одной таблице.

### Структура audit_events (после слияния)

```sql
CREATE TABLE audit_events (
  id UUID DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,                      -- может быть NULL для anon-операций
  event_type TEXT NOT NULL,          -- CREATE | UPDATE | DELETE | PUBLISH
  entity TEXT NOT NULL,              -- Lesson, Group, Teacher, Schedule, ...
  entity_id UUID NOT NULL,
  before JSONB,                      -- состояние ДО (JSON, может быть пустым)
  after JSONB,                       -- состояние ПОСЛЕ (JSON, может быть пустым)
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
) PARTITION BY RANGE (created_at);
```

### Преимущества слияния

1. **Одна таблита** — нет необходимости поддерживать две схемы.
2. **Единый источник истины** — вся история в `audit_events`.
3. **Проще RLS** — политики применяются к одной таблице.
4. **Меньше redundancy** — дублирование `change_logs` убрано.

### Миграция

Старые записи `change_logs` переносятся в `audit_events` one-time миграцией:

```sql
INSERT INTO audit_events (id, tenant_id, user_id, event_type, entity, entity_id, before, after, created_at)
SELECT id, tenant_id, user_id, event_type, entity, entity_id, before, after, created_at
FROM change_logs;
```

После миграции `change_logs` **удаляется** (Drop).

---

## Партиционирование по created_at (месяц)

Таблица `audit_events` партиционирована по `created_at` с partitions по месяцам.

```sql
-- Создание партиции текущего месяца
CREATE TABLE audit_events_2026_09 PARTITION OF audit_events
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- Создание партиции прошлого месяца
CREATE TABLE audit_events_2026_08 PARTITION OF audit_events
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

### Cron pg_cron для создания/удаления партиций

```sql
-- Создание новой партиции 1-го числа месяца
SELECT cron.schedule('create-audit-partition', '0 0 1 * *',
  'SELECT create_audit_partition()');

-- Удаление старых партиций (старше 24 месяцев)
SELECT cron.schedule('drop-old-audit-partitions', '0 0 1 * * 0',
  'SELECT drop_old_audit_partitions()');
```

Функция `create_audit_partition()` автоматически создает partition для текущего месяца.

---

## Триггеры в БД, не клиент

Все аудит-записи генерируются **триггерами в PostgreSQL**, а не клиентским кодом. Это гарантирует, что **любое изменение** данных будет зафиксировано, даже если кто-то обращается к БД напрямую (через Supabase SQL API или Edge Functions).

### Пример триггера

```sql
CREATE OR REPLACE FUNCTION trigger_audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_events (tenant_id, user_id, event_type, entity, entity_id, before, after)
  VALUES (
    NEW.tenant_id,
    COALESCE(current_setting('app.current_user_id')::UUID, NULL),
    CASE WHEN TG_OP = 'DELETE' THEN 'DELETE'
         WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
         ELSE 'CREATE' END,
    TG_TABLE_NAME,
    NEW.id,
    COALESCE(ROW_TO_JSON(OLD), '{}'::JSONB),
    COALESCE(ROW_TO_JSON(NEW), '{}'::JSONB)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON schedule_lessons
FOR EACH ROW EXECUTE FUNCTION trigger_audit_changes();
```

---

## Realtime запрещён через ALTER PUBLICATION

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE audit_events;
```

- **anon** — не подписывается на `audit_events` через Realtime.
- **authenticated** — имеют доступ, но с RLS политиками.
- Для realtime-обновлений используются **LISTEN/NOTIFY** на конкретных событиях, или polling.

---

## Индексы на каждой партиции

Каждая партиция `audit_events_YYYY_MM` имеет свои индексы для быстрого поиска:

```sql
CREATE INDEX idx_audit_events_2026_09_entity
  ON audit_events_2026_09 (entity, entity_id, created_at DESC);

CREATE INDEX idx_audit_events_2026_09_tenant
  ON audit_events_2026_09 (tenant_id, created_at DESC);
```

Функция创建 partition автоматически применяет индексы к новой партиции.

---
*Дата: 2026-09-19*