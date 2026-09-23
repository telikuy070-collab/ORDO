# ADR-011: Feature Flags Lifecycle

## Статус
Принято

## Контекст
Ordo — мультитенантная платформа управления расписанием. Необходимость в фича-флагах arose из требований онбординга нового колледжа, A/B тестирования и постепенного запуска функций. Philosophy Ordo ("с первого дня") требует, чтобы фичи были на уровне тенанта, а не глобально.

Фича-флаги используются для:
- Управления доступом к функциям per tenants
- A/B тестирования новых возможностей
- Постепенного запуска (canary releases)
- Быстрого отключения проблемных фич

## Где проверяется флаг — application

Фича-флаги проверяются на уровне **application layer** через функции `has_feature(tenant_id, 'feature_key')`. Domain layer ничего не знает о фича-флагах — это чистая бизнес-логика application.

Пример использования в use-case:
```typescript
if (await hasFeature(tenantId, 'enable_scheduling')) {
  // показать редактор расписания
}
```

## Как добавить новую фичу

Пошаговый процесс:

1. **ADR** — документировать решение в `docs/adr/<N>-feature-<name>.md`
2. **RFC** — детализация в `docs/rfc/rfc-<N>-<name>.md`
3. **Миграция** — добавление колонки/таблицы в БД (или обновление `tenant_features`)
4. **RLS** — создание политики `has_feature()` для новых фич
5. **pgTAP-тест** — тест изоляции фичи
6. **Флаг** — включение по умолчанию (обычно `true` для новых тенантов)

## Данные при выключении

При отключении фичи (`UPDATE tenant_features SET enabled = false`):
- **Данные остаются** в таблицах (уроки, предпочтения, нагрузка)
- **RLS скрывает** данные — query через `has_feature()` вернёт `false`
- **Аудит** все изменения записаны в `audit_events`
- **Восстановление** — включение флага (`UPDATE ... SET enabled = true`) возвращает доступ

## RLS-политика

```sql
-- Политика для проверки фичи
CREATE POLICY "tenant_feature_check" ON tenant_features
FOR SELECT TO authenticated
USING (
  has_feature(tenant_id, 'feature_key')
);
```

Для anon доступны только public view, фичи проверяются через application layer.

## View — JOIN вместо has_feature()

Где возможно, используются **JOIN** с таблицей `tenant_features` вместо вызова функции `has_feature()` в каждом query:

```sql
-- ПREFERRED: JOIN
SELECT sl.*
FROM schedule_lessons sl
JOIN schedule_versions sv ON sv.id = sl.version_id
JOIN schedules s ON s.id = sv.schedule_id
JOIN tenant_features tf ON tf.tenant_id = s.tenant_id
WHERE s.status = 'published'
  AND tf.enabled = true  -- фильтр на уровне view
```

Однако, для простых проверок используются функции `has_feature()` и `has_role()`.

## Realtime — отказ для anon, polling раз в 5 минут + visibilitychange

- **anon** — не имеет доступа к Realtime каналам. Использует polling раз в 5 минут.
- **authenticated** — имеют Realtime доступ, но с фильтрацией по `has_feature()`.
- **visibilitychange** — при переключении вкладки student PWA инициирует опрашивание fresh data.

## Как тестировать — pgTAP-тест

```sql
-- Тест: teacher A не видит данные tenant B при выключенной фиче
CREATE TEST test_teacher_cannot_see_other_tenant_features() USING pgTAP;

-- Настройка: создаем двух тенантов
SELECT create_tenant('College A');
SELECT create_tenant('College B');

-- Включаем фичу для A, выключаем для B
UPDATE tenant_features SET enabled = true WHERE tenant_id = '...College A...' AND feature_key = 'enable_scheduling';
UPDATE tenant_features SET enabled = false WHERE tenant_id = '...College B...' AND feature_key = 'enable_scheduling';

-- Действие: teacher из College A ищет расписание
-- Ожидание: только College A, College B — пусто (RLS блокирует)

-- Нарушение: teacher из College A видит College B — тест падает
SELECT has_feature('...College B...', 'enable_scheduling'); -- должно быть false

-- Очистка
SELECT drop_tenant('...College B...');
END TEST;
```

## Как откатить — UPDATE tenant_features SET enabled = false

```sql
-- Отключение фичи для всего тенанта
UPDATE tenant_features 
SET enabled = false, updated_at = now() 
WHERE tenant_id = 'tenant-uuid' AND feature_key = 'feature_key';

-- Валидация отката
SELECT has_feature('tenant-uuid', 'feature_key'); -- должно вернуть false
```

## Версионирование — через URL view

Публичные view имеют версионирование через URL:

- `student.ordo.app/v1/schedule` — версия 1
- `student.ordo.app/v2/schedule` — версия 2 (после обновления)

Клиент указывает версию при инициализации. Старая версия поддерживается 1 спринт после деплоя новой.

---
*Дата: 2026-09-19*