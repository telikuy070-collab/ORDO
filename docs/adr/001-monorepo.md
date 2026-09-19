# ADR-001: Monorepo

## Статус
Принято

## Контекст
Ordo — мультитенантная платформа управления учебным расписанием для медицинских колледжей. Архитектура Clean Architecture требует строгого разделения ответственности между модулями. Использование monorepo позволяет делиться кодом между двумя PWA (workspace и student) при сохранении изолированности доменных модулей.

Основные требования:
- **pnpm** как пакетный менеджер (AGENTS.md, раздел 2)
- **Turborepo** для оркестрации сборки (AGENTS.md, раздел 41)
- Четкое разделение на `packages/domain`, `packages/application`, `packages/infrastructure`, `packages/ui`, `packages/types`, `packages/config`
- Два приложения: `apps/workspace` (PWA для staff) и `apps/student` (PWA для студентов)

## Решение
Использовать monorepo структуру с pnpm workspaces. Все пакеты находятся в корневой директории `ordo/`:

- `pnpm-workspace.yaml` — определение workspace
- `turbo.json` — конфигурация задач Turborepo
- `package.json` — корневые скрипты

Каждый пакет имеет свою ответственность:
- `packages/domain` — чистая логика, ноль зависимостей
- `packages/application` — use-cases, порты, DTO (только `domain`)
- `packages/infrastructure` — Supabase, Excel, storage
- `packages/ui` — дизайн-система
- `packages/types` — DTO, общие типы
- `packages/config` — eslint, tsconfig, prettier

Приложения:
- `apps/workspace` — PWA для staff (логин обязателен)
- `apps/student` — PWA для студентов (анонимно)

## Обоснование
Monorepo позволяет:
1. Делиться типовыми зависимостями между workspace и student PWA
2. Единообразно управлять версиями пакетов
3. Упрощать настройку линтинга и тестирования
4. Сохранять изолированность доменных модулей (Clean Architecture)
5. Использовать Turborepo для кэширования сборки и ускорения итераций

## Последствия
- Единый файл конфигурации (`package.json`, `pnpm-workspace.yaml`, `turbo.json`)
- Четкие границы между пакетами
- Возможность использования `pnpm --filter` для работы с отдельными пакетами
- Все команды разработки едины: `pnpm`, `pnpm run`, `pnpm build`, `pnpm test`

## Альтернативы
- **Polyrepo**: отдельные репозитории для workspace и student. Минусы: дублирование конфигурации, сложнее общая смена зависимостей, разные версии пакетов.
- **Monorepo без инструментов**: ручное управление зависимостями. Минусы: отсутствие кэширования, медленная сборка, ошибки версий.

**Выбранный вариант**: Monorepo с Turborepo и pnpm (рекомендовано AGENTS.md).

---
*Дата: 2026-09-19*