# ADR-016: Migration Plan

## Что мигрирует

### 1. Postgres schema и данные
- Все таблицы с `tenant_id`
- RLS политики (Row Level Security)
- Функции `has_role()`, `has_feature()`
- View (public_schedule, public_groups и т.д.)
- Партиции `audit_events`
- ENUM-типы, если есть

### 2. Edge Functions
- `create-tenant` — миграция настроек тенанта
- `get-public-features` — валидация и rate limiting
- `public-schedule` — публичное расписание
- Любые другие кастомные функции

### 3. Storage (Supabase Storage)
- Бакеты для загрузки файлов
- Политики доступа (RLS для Storage)

### 4. Realtime каналы
- Настройки публикаций (`ALTER PUBLICATION`)
- Триггеры на каналы

---

## Что НЕ мигрирует

### 1. Auth (остаётся Supabase)
- **Vendor lock-in**: Supabase Auth не легко выносится.
- **Mitigation**: płacim за Auth отдельно, изолируем бизнес-логику.
- **Strategy**: мигрировать только schema и RLS, Auth оставляем как есть.

### 2. Клиентский код (React components)
- Перемещаем логику в application/use-cases.
- UI меняется минимизировано при смене бэкенда.

### 3. Vercel конфигурация
- `vercel.json` — деплой настроек, не данных.

---

## Открытый риск — Supabase Auth vendor lock-in

### Проблема
Supabase Auth привязан к его экосистеме (边际 пользователи,.session management, матрицы RLS). Полный рефакторинг на внешний Auth требует:

1. Экспорт пользователей из Supabase
2. Настройка внешнего Auth (Auth0, Clerk, Supabase Auth external)
3. Миграция сессий
4. Обновление RLS политик

### Митигация
1. **Изоляция бизнес-логики**: все проверки через `has_role()` и `has_feature()`, а не через `auth.jwt()`.
2. **Абстракция**: создание порта `IAuthProvider` в приложении, который может быть заменен.
3. **Документация**: ADR-016 dokumentiruet risk и mitigation.
4. **Budget**: выделяем бюджет на potential смену Auth провайдера.

### План действий при смене Auth
1. Создать новый Supabase проект с внешним Auth.
2. Мигрировать `tenant_id`, `users`, `roles` в новый проект.
3. Обновить Edge Functions под новые токены.
4. Обновить `.env` переменные.
5. Протестировать RLS политики на новой конфигурации.

---

## Realtime — ElectricSQL (план исследования) / LISTEN-NOTIFY / polling

### Варианты

| Вариант | Описание | Плюсы | Минусы |
|---|---|---|---|
| **ElectricSQL** | Синхронизация Postgres с клиентским кэшем | RLS автоматически, offline-first | Новая зависимость, learning curve |
| **LISTEN/NOTIFY** | PostgreSQL notifications через WebSocket | Минимальная зависимость | Не работает для anon, ограниченность |
| **Polling** | Раз в 5 минут fetch стейта | Просто, работает всегда | Лишний трафик, latency 5 мин |

### Решение
1. **Short-term**: оставить polling (раз в 5 мин) для student PWA, Realtime только для workspace.
2. **Medium-term**: исследовать ElectricSQL — если докажет себя — мигрировать.
3. **Long-term**: отказ от Realtime в пользу polling + WebSocket для критических событий.

---
*Дата: 2026-09-19*