# ADR-007: Zone Separation — Разделение зон

## Статус
Принято

## Контекст
Ordo использует Clean Architecture с четким разделением на слои (AGENTS.md, раздел 4):
- **Domain** — ноль зависимостей, сущности, инварианты
- **Application** — только `domain`, use-cases, порты, DTO
- **Infrastructure** — `domain`, `application`, Supabase, Excel, storage
- **Presentation** (PWA) — `application` через DTO, UI, роутинг

Также есть два приложения: workspace (с логином) и student (анонимно).

## Решение
Четкое разделение "зон" доступа и ответственности:

1. **Domain zone** — изолированная логика, ноль внешних зависимостей
   - `packages/domain/*` — сущности, value objects, errors, events, инварианты
   - Запрет на импорт `infrastructure`, `react`, `fs`, `node:*`
   - Правило: если `domain` импортирует `infrastructure` — коммит отклоняется (AGENTS.md, стр. 111)

2. **Application zone** — мост между domain и infrastructure
   - `packages/application/*` — use-cases, порты (interfaces), DTO
   - Зависит только от `domain`
   - Реализует бизнес-логику использования случаев

3. **Infrastructure zone** — реализация портов
   - `packages/infrastructure/*` — репозитории, Excel парсер, Supabase интеграция
   - Зависит от `domain` и `application`
   - Конкретная реализация (Supabase queries, file I/O)

4. **Presentation zone** (два PWA)
   - `apps/workspace/src/` и `apps/student/src/`
   - Зависит от `application` (через DTO)
   - **НЕ импортирует infrastructure напрямую** (только через порты из application)
   - TanStack Router, Zustand, TanStack Query — только в presentation

5. **Zone boundaries** — чек-лист перед коммитом
   - `domain` → только `domain` (ничего больше)
   - `application` → `domain` + свои подмодули
   - `infrastructure` → `domain`, `application`
   - `presentation` → `application` (через DTO)

## Обоснование
Zone separation позволяет:
1. **Сохранить Clean Architecture**: строгие зависимости идут только вниз (Domain ← Application ← Infrastructure ← Presentation)
2. **Предотвратить "leaky abstraction"**: presentation не знает о Supabase, domain не знает о Excel
3. **Упростить тестирование**: domain можно тестировать без mock'ов infrastructure
4. **AGENTS.md compliance**: "Если `domain` импортирует `infrastructure` — коммит отклоняется" (AGENTS.md, стр. 111)
5. **RBAC & RLS**: application layer определяет, какие данные доступны какой роли, infrastructure реализует RLS

## Последствия
- Strict TypeScript проверки на каждом уровне
- Import assertions или настройки tsconfig для запрета неразрешенных импортов
- Code review всегда проверяет направление зависимостей
- Инструменты: `pnpm typecheck`, `pnpm lint` блокируют нарушения
- Новый модуль всегда создается по шаблону: domain → application → infrastructure → presentation

## Альтернативы
- **Свободные импорты**: разрешить импортировать что угодно из любого места. Минусы: ломкая архитектура, сложность тестирования, "spaghetti code", нарушение Clean Architecture.
- **Обратные зависимости**: позволить infrastructure вызывать domain. Минусы: ломание принципов Clean Architecture, circular dependencies.

**Выбранный вариант**: Zone separation с жесткими границами (рекомендовано AGENTS.md, 01-architecture.md, 02-domain-model.md).

---
*Дата: 2026-09-19*