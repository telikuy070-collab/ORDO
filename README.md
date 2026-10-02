# Ordo

> Платформа управления расписанием для медицинских колледжей

Ordo — коммерческий продукт YSF, разработанный для автоматизации планирования учебного процесса в медицинских колледжах. Система объединяет административную рабочую область для замдиректора/заведующих, личные кабинеты преподавателей и публичную PWA для студентов, обеспечивая единый источник правды для расписания, нагрузки, публикаций и аудита.

[![Status](https://img.shields.io/badge/status-active%20development-1f9d8a)](https://github.com/telikuy070-collab/ORDO)
[![Stack](https://img.shields.io/badge/stack-React%2019%20%7C%20Vite%206%20%7C%20Supabase-5a67d8)](https://github.com/telikuy070-collab/ORDO)
[![Architecture](https://img.shields.io/badge/architecture-clean%20architecture-0ea5e9)](https://github.com/telikuy070-collab/ORDO)

## Что это

Ordo решает типовую проблему медицинских колледжей: расписание по-прежнему собирается в Excel, вручную, с огромной зависимостью от одного человека. Продукт помогает:

- строить расписание в одном месте;
- автоматически находить конфликты;
- учитывать нагрузку преподавателей;
- публиковать расписание для студентов;
- экспортировать и импортировать данные в Excel;
- поддерживать мультитенантность для нескольких колледжей;
- вести аудит изменений и историю действий.

## Продуктовые модули

### Workspace
Публичная рабочая область для сотрудников колледжа:

- замдиректора / ответственного за расписание;
- заведующих отделениями;
- преподавателей;
- директоров/администраторов.

Функции:

- управление специальностями, группами и дисциплинами;
- составление расписания;
- проверка конфликтов;
- публикация расписания;
- импорт/экспорт Excel;
- просмотр нагрузки и аналитики;
- контроль прав доступа.

### Student
Анонимная PWA для студентов:

- быстрый доступ без логина;
- просмотр расписания офлайн;
- поиск по группе, преподавателю, аудитории;
- публичный доступ к опубликованному расписанию;
- обновления по мере публикации.

## Архитектура

Проект построен по принципам Clean Architecture и монорепозитория:

- `apps/workspace` — админская PWA для сотрудников;
- `apps/student` — публичная PWA для студентов;
- `packages/domain` — доменные сущности, бизнес-логика и ограничения;
- `packages/application` — use cases и сценарии применения;
- `packages/infrastructure` — интеграции с Supabase, Excel и внешними сервисами;
- `packages/ui` — дизайн-система и переиспользуемые компоненты;
- `packages/types` — DTO и типы;
- `packages/config` — настройки окружения и инструменты сборки.

### Технологический стек

Frontend:

- React 19.3
- TypeScript
- Vite 6
- TanStack Router
- TanStack Query
- Zustand
- Tailwind CSS
- Radix UI
- PWA

Backend:

- Supabase
- PostgreSQL 16
- Row Level Security
- Realtime
- Edge Functions
- Deno

Инструменты:

- pnpm
- Turborepo
- Vitest
- Playwright
- SheetJS

## Репозиторий и структура

```text
ordo/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── apps/
│   ├── workspace/
│   └── student/
├── packages/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   ├── ui/
│   ├── types/
│   └── config/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed/
├── docs/
│   ├── 00-vision.md
│   ├── 01-architecture.md
│   ├── 02-domain-model.md
│   ├── 03-rbac.md
│   ├── 04-data-model.md
│   ├── 05-tech-stack.md
│   ├── 06-scope-boundaries.md
│   ├── 07-runbook.md
│   ├── 08-git-workflow.md
│   ├── 09-supabase-workflow.md
│   ├── dod.md
│   └── adr/
└── docs/rfc/
```

## Быстрый старт

### Требования

- Node.js 20+
- pnpm 9+
- Supabase проект
- доступ к Redis/Upstash для rate limiting и кэша

### Установка

```bash
git clone https://github.com/telikuy070-collab/ORDO.git
cd ORDO
cp .env.example .env
pnpm install
```

### Запуск приложений

```bash
pnpm dev
```

Или отдельно:

```bash
pnpm --filter workspace dev
pnpm --filter student dev
```

### Сборка и проверка

```bash
pnpm build
pnpm lint
pnpm test
pnpm typecheck
pnpm verify
```

## Переменные окружения

Скопируйте файл `.env.example` в `.env` и заполните значения:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
SUPABASE_PROJECT_REF=your_supabase_project_ref

# Upstash (Rate Limiting & Cache)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# App
VITE_APP_URL=http://localhost:5173
VITE_STUDENT_APP_URL=http://localhost:5174
```

## Принципы разработки

- Clean Architecture без деградации слоёв;
- доменная логика не должна зависеть от UI или инфраструктуры;
- мультитенантность с первого дня;
- RLS для каждой таблицы и строгий контроль доступа;
- аудит изменений и прозрачная история действий;
- офлайн-first подход для студенческого опыта;
- unit-, integration- и e2e-тесты по ключевым сценариям.

## Дорожная карта

### MVP

- фундамент монорепозитория и инфраструктуры;
- identity и структура академических данных;
- преподаватели, аудитории, пожелания;
- составление расписания и конфликтов;
- публикация расписания;
- студентский PWA;
- аналитика и аудит.

## Документация

Набор проектной и архитектурной документации находится в папке `docs/`:

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

## Коммерческая ценность

Ordo создаётся для решения реальной отраслевой проблемы: автоматизации расписания в медицинском колледже. Продукт снижает нагрузку на администратора, ускоряет публикацию данных для студентов, снижает количество ошибок и даёт основу для масштабирования на несколько школ и колледжей в одном многопользовательском окружении.

## Статус

Проект находится в активной разработке. Основная архитектура и процесс разработки зафиксированы в репозитории и документации, а дальнейшая реализация идёт по спринтам.

## Контакты

Для вопросов по продукту, архитектуре и внедрению обращайтесь к владельцу проекта YSF.

---

Ordo. Порядок в расписании.
