# AGENTS.md — Ordo

> Правила для автономных агентов. Читается автоматически при старте задачи.

---

## 1. Кто мы

**Компания**: YSF  
**Продукт**: Ordo  
**Домен**: ordo.app

**Ordo** — мультитенантная платформа управления учебным расписанием для медицинских колледжей. Состоит из двух PWA:
- **workspace** — для зама, преподавателей, зав. отделениями (логин обязателен).
- **student** — для студентов (анонимно, без логина).

**Один Supabase** на оба приложения.

---

## 2. Стек (2026, без конфликтов)

### Frontend
- **React 19.3** + TypeScript
- **Vite 6** — сборка
- **TanStack Router** — роутинг
- **TanStack Query** — server state
- **Zustand** — client state
- **TailwindCSS** + **Radix UI** — UI
- **vite-plugin-pwa** — PWA
- **React Hook Form** + **Zod** — формы

### Backend
- **Supabase** — Postgres + RLS + Auth + Realtime + Edge Functions
- **Postgres 16** — БД
- **Deno** — Edge Functions

### Монорепо
- **pnpm** — пакетный менеджер
- **Turborepo** — оркестрация
- **Vitest** — unit-тесты
- **Playwright** — e2e

### Excel
- **SheetJS** — парсинг/генерация

---

## 3. Структура репозитория

ordo/
├── AGENTS.md
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
│
├── apps/
│ ├── workspace/ # PWA для staff (логин)
│ └── student/ # PWA для студентов (аноним)
│
├── packages/
│ ├── domain/ # чистая логика (ноль зависимостей)
│ ├── application/ # use-cases
│ ├── infrastructure/ # Supabase, Excel
│ ├── ui/ # дизайн-система
│ ├── types/ # DTO
│ └── config/ # eslint, tsconfig, prettier
│
├── supabase/
│ ├── migrations/ # SQL-миграции
│ ├── functions/ # Edge Functions
│ └── seed/ # тестовые данные
│
└── docs/
├── 00-vision.md
├── 01-architecture.md
├── 02-domain-model.md
├── 03-rbac.md
├── 04-data-model.md
├── 05-tech-stack.md
├── 06-scope-boundaries.md
├── 07-runbook.md
├── 08-git-workflow.md
├── 09-supabase-workflow.md
├── dod.md
├── adr/
├── rfc/
└── tasks/

text

---

## 4. Clean Architecture (жёстко)


- **Domain** — сущности, value objects, инварианты. **Ноль зависимостей.**  
  ❌ НЕ импортирует `@supabase/*`, `react`, `fs`, `node:*`.
- **Application** — use-cases, порты, DTO. **Зависит только от `domain`.**
  ❌ НЕ импортирует `infrastructure`, `presentation`.
- **Infrastructure** — Supabase, Excel, storage. **Реализует порты из `application`.**
  ✅ Может импортировать `domain`, `application`.
- **Presentation** — UI, роутинг, состояние. **Зависит от `application`** (через DTO).
  ❌ НЕ импортирует `infrastructure` напрямую (только через порты).

**Правило**: если `packages/domain` импортирует что-то из `packages/infrastructure` — **коммит отклоняется**.

---

## 5. Правила работы (жёстко)

### Git
- **Один коммит = одна задача.**
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- **Никаких pre-commit hooks.**
- **Никаких GitHub Actions (CI).**
- **Push напрямую в `main`** (для MVP).
- **Запрещено**: `git push --force` в `main`.

### Код
- **TypeScript strict mode.**
- **Никаких `any`** (кроме обоснованных случаев с комментарием).
- **Никаких `TODO`** в коде — если нужно, создай issue.
- **Никакого закомментированного кода.**
- **Имена**: `camelCase` для переменных, `PascalCase` для типов, `kebab-case` для файлов.

### Тесты
- **Domain**: unit-тесты обязательны.
- **Application**: тесты use-cases обязательны.
- **Infrastructure**: интеграционные тесты (RLS).
- **E2E**: критические сценарии.
- **Coverage**: ≥80% для `domain`.

### БД
- **Только через миграции.** Никогда не менять прод вручную.
- **RLS обязателен** для каждой таблицы.
- **`tenant_id`** в каждой таблице (мультитенантность).
- **Тесты RLS** через `pgTAP`.

### Секреты
- **НИКОГДА** не коммитить `.env`.
- **НИКОГДА** не логировать токены.
- Все секреты — через переменные окружения.
- **Service Role Key** — только для миграций.

---

## 6. Роли

| Роль | Логин | Права |
|---|---|---|
| `owner` (ты) | ✅ | Всё в платформе |
| `tenant_admin` | ✅ | Всё в тенанте |
| `schedule_owner` (зам) | ✅ | Всё в расписании |
| `department_head` | ✅ | Своё отделение |
| `teacher` | ✅ | Свои пары, нагрузка, пожелания |
| `anon` (студент) | ❌ | Публичное расписание |

**Детали**: `docs/03-rbac.md`.

---

## 7. Запреты (жёстко)

- ❌ Не создавать `.github/workflows/`.
- ❌ Не устанавливать Husky.
- ❌ Не настраивать lint-staged.
- ❌ Не добавлять pre-commit hooks.
- ❌ Не использовать feature-ветки (для MVP).
- ❌ Не создавать PR (для MVP).
- ❌ Не коммитить `.env`.
- ❌ Не пушить `--force` в `main`.
- ❌ Не менять прод-БД вручную.
- ❌ Не добавлять фичи вне скоупа.
- ❌ Не использовать `any`.
- ❌ Не оставлять `TODO`.
- ❌ Не импортировать infrastructure в domain.

---

## 8. Проверки перед коммитом (агент делает сам)

Перед **каждым** коммитом:
1. `pnpm typecheck` — обязательно.
2. `pnpm lint` — обязательно.
3. `pnpm test` — обязательно.
4. Если упало — **НЕ коммитить**, чинить.
5. Если зелёное — коммитить.

---

## 9. Деплой

- **Vercel** — для обоих PWA.
- **Vercel** подключается к репо → собирает сам.
- **CI не нужен** — Vercel заменяет.
- Preview-деплой на каждый push.
- Prod-деплой на `main`.

---

## 10. Ссылки на документацию

- [Vision](docs/00-vision.md)
- [Architecture](docs/01-architecture.md)
- [Domain Model](docs/02-domain-model.md)
- [RBAC](docs/03-rbac.md)
- [Data Model](docs/04-data-model.md)
- [Tech Stack](docs/05-tech-stack.md)
- [Scope Boundaries](docs/06-scope-boundaries.md)
- [Runbook](docs/07-runbook.md)
- [Git Workflow](docs/08-git-workflow.md)
- [Supabase Workflow](docs/09-supabase-workflow.md)
- [Definition of Done](docs/dod.md)
- [ADR](docs/adr/)
- [RFC](docs/rfc/)
- [Tasks](docs/tasks/)

---

## 11. Модули (bounded contexts)

| Модуль | Путь | Ответственность |
|---|---|---|
| Identity | `packages/domain/identity/` | Пользователи, роли, тенанты |
| Academic | `packages/domain/academic/` | Специальности, группы, семестры |
| Resources | `packages/domain/resources/` | Преподаватели, аудитории, корпуса |
| Scheduling | `packages/domain/scheduling/` | Расписание, версии, конфликты |
| Publication | `packages/domain/publication/` | Публикация, уведомления |
| ImportExport | `packages/domain/import-export/` | Excel, CSV |
| Analytics | `packages/domain/analytics/` | Нагрузка, отчёты |
| Audit | `packages/domain/audit/` | История, аудит |

**Каждый модуль изолирован.** Модули **не знают** друг о друге. Общение — через **application**.

---

## 12. Шаблон модуля

Каждый модуль **строго** по этому шаблону:
packages/domain/<module>/
├── entities/
├── value-objects/
├── errors/
├── events/
└── index.ts

packages/application/<module>/
├── use-cases/
├── ports/
├── dto/
└── index.ts

packages/infrastructure/<module>/
├── repositories/
└── index.ts

apps/workspace/src/features/<module>/
└── ...

apps/student/src/features/<module>/
└── ... (если нужно)

supabase/migrations/<next>_<module>.sql
docs/adr/<next>-<module>.md
docs/rfc/rfc-<next>-<module>.md
docs/tasks/task-<next>-<module>.md


---

## 13. Как добавить фичу (только владелец)

**Владелец (owner)** добавляет фичу так:

### Шаг 1: ADR
Создаёт `docs/adr/<next>-<module>.md`:
```markdown
# ADR-011: <Module>

## Статус
Принято

## Контекст
...

## Решение
...

## Обоснование
...

## Последствия
...

## Альтернативы
...

Шаг 2: RFC
Создаёт docs/rfc/rfc-<next>-<module>.md:

markdown
# RFC-009: <Module>

## Цель
...

## Границы
- Внутри: ...
- Снаружи: ...
- Не входит: ...

## Контракты
- IRepository
- IService

## Use-cases
- ...

## События
- ...

## Зависимости
- ...

## Тесты
- ...

## Definition of Done
- [ ] ...
Шаг 3: Task
Создаёт docs/tasks/task-<next>-<module>.md:

markdown
# Task-016: <Module>

depends_on: []
blocks: []
priority: 1

## Контекст
См. ADR-011, RFC-009.

## Цель
...

## Шаги
1. ...

## Критерии приёмки
- [ ] Domain не импортирует infrastructure.
- [ ] Тесты ≥80%.
- [ ] RLS настроен.
- [ ] ADR обновлён.
- [ ] RFC обновлён.

## Ссылки
- ADR-011
- RFC-009
Шаг 4: Один промпт агенту
text
Выполни task-016-<module>.md по пайплайну.
Следуй AGENTS.md строго.
Агент делает всё сам.

14. Только для владельца (owner)
Владелец может:

✅ Менять стек.

✅ Менять архитектуру.

✅ Менять правила.

✅ Добавлять модули.

✅ Менять структуру.

✅ Создавать ADR / RFC / Task.

✅ Отступать от defaults.

Агент НЕ может:

❌ Менять стек.

❌ Менять архитектуру.

❌ Менять правила.

❌ Добавлять модули без ADR.

❌ Менять структуру.

❌ Создавать ADR / RFC / Task без указания владельца.

❌ Отступать от defaults.

Если агент считает, что нужно отступить — он СПРАШИВАЕТ. Не делает.

15. Hard Rules (для агентов)
Не выдумывать. Если не знаешь — скажи «не знаю».

Не выходить за скоуп. Делать ровно то, что в задаче.

Не добавлять фичи без ADR.

Не менять архитектуру без ADR.

Не коммитить без зелёных проверок.

Не оставлять временные файлы.

Не логировать секреты.

Не использовать any.

Не игнорировать ошибки.

Не молчать о проблемах — сообщать.

Не менять AGENTS.md (только владелец).

Не менять docs/adr/, docs/rfc/, docs/tasks/ (только владелец).

Спрашивать, если сомневаешься.

Следовать шаблону модуля строго.

Уважать Clean Architecture.

text

---





---

## 17. Секреты

### Чтение
- Все секреты — в `.env.local`.
- Читать через `read .env.local`.
- **НЕ** выводить значения в чат.
- **НЕ** логировать значения.
- **НЕ** коммитить `.env.local`.

### Использование
- GitHub: `$env:GITHUB_TOKEN` в PowerShell, `$GITHUB_TOKEN` в bash.
- Supabase: `$env:SUPABASE_ACCESS_TOKEN`.
- **Всегда** проверяй, что токен **не попал** в вывод.

### Запреты
- ❌ Коммитить `.env.local`.
- ❌ Логировать токены.
- ❌ Выводить токены в чат.
- ❌ Использовать **prod** Supabase.
- ❌ Использовать **prod** GitHub (только staging-репо).

### Staging vs Production
- **Агент работает ТОЛЬКО со staging.**
- **Prod** — только владелец.
- **Миграции**: staging → проверка → prod (вручную).

### Rotation
- Токены **меняются каждые 90 дней**.
- **При компрометации** — сразу отозвать.
- **Fine-grained PAT** — только один репо.
- **Supabase token** — только staging проект.

### Если токен утёк
1. **Немедленно** отозвать.
2. Создать новый.
3. Обновить `.env.local`.
4. Проверить логи.



## 🎯 Что делать

1. Открой `AGENTS.md` в VS Code.
2. Найди **конец** раздела 13 (там, где оборвалось `## Альтернативы ...`).
3. **Добавь** текст выше **после**.
4. Сохрани (Ctrl+S).
5. Проверь:
   ```powershell
   Get-Content AGENTS.md -Encoding UTF8 | Select-Object -Last 40
