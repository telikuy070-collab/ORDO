# ADR-009: Turborepo

## Статус
Принято

## Контекст
Ordo использует **monorepo** структуру с pnpm (AGENTS.md, раздел 2 и 3). Monorepo содержит:
- Два приложения: `apps/workspace` и `apps/student`
- Шесть пакетов: `domain`, `application`, `infrastructure`, `ui`, `types`, `config`
- Корневые файлы: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`

Необходима оркестрация сборки, тестирования и других задач для множества пакетов.

## Решение
Использовать **Turborepo** как инструмент оркестрации monorepo:

1. **turbo.json** — корневая конфигурация задач
   - Определяет зависимости между пакетами
   - Кэширование результатов сборки
   - Параллельное выполнение задач

2. **Доступные скрипты** (в корне `package.json`):
   - `pnpm build` — сборка всех пакетов и приложений
   - `pnpm dev` — запуск dev-серверов для обоих PWA
   - `pnpm lint` — линтинг всего кода
   - `pnpm test` — запуск тестов (Vitest) для всех пакетов
   - `pnpm typecheck` — проверка TypeScript strict mode
   - `pnpm db:push` — применение миграций к Supabase
   - `pnpm db:generate` — генерация типов из БД

3. **Task pipeline** (из AGENTS.md, раздел 8):
   - Перед каждым коммитом запускаются: `pnpm typecheck`, `pnpm lint`, `pnpm test`
   - Turborepo ускоряет эти проверки за счет кэширования

4. **Monorepo structure**:
   - `pnpm-workspace.yaml` определяет workspace пакеты
   - `turbo.json` определяет зависимости и порядок выполнения
   - Каждый пакет имеет свои `package.json` со скриптами
   - Shared конфигурация: `packages/config` (eslint, tsconfig, prettier)

## Обоснование
Turborepo позволяет:
1. **Ускорение сборок**: кэширование означает, что повторные запуски задач происходят мгновенно
2. **Четкие зависимости**: turbo.json описывает, какие пакеты зависят от других
3. **Параллелизм**: задачи запускаются параллельно на разных ядрах
4. **Единый входной пункт**: все команды через `pnpm run` (или `pnpm` скрипты в package.json)
5. **AGENTS.md compliance**: "pnpm — пакетный менеджер", "Turborepo — оркестрация" (AGENTS.md, раздел 2, 41)
6. **Coverage ≥80% для domain**: легче запускать тесты только для Changed packages

## Последствия
- `turbo.json` должен поддерживаться актуальным при добавлении новых пакетов
- Скрипты в `package.json` делегируются turborepo
- `pnpm typecheck`, `pnpm lint`, `pnpm test` работают быстрее благодаря кэшированию
- Новые пакеты добавляются в `pnpm-workspace.yaml` и `turbo.json`
- Developer workflow: `pnpm run build` собирает всё, что изменилось с последнего коммита

## Альтернативы
- **Без оркестратора**: запускать `vite build`, `vitest run` вручную для каждого пакета. Минусы: медленно, легко забыть какой-то пакет, нет кэширования.
- **Nx или Lerna**: альтернативные инструменты monorepo. Минусы: лишняя сложность, уже есть Turborepo, который лучше подходит для этого проекта.

**Выбранный вариант**: Turborepo (рекомендовано AGENTS.md, 05-tech-stack.md, структура monorepo).

---
*Дата: 2026-09-19*