# Ordo

> Интегрированная платформа управления образовательным учреждением

Ordo — коммерческая SaaS-платформа YSF для управления всеми аспектами деятельности образовательных учреждений (колледжи, вузы, школы, центры обучения). Единая система замкнутого цикла, объединяющая управление расписанием, ресурсами, человеческим капиталом, финансами, аналитикой и коммуникациями в одном месте.

[![Status](https://img.shields.io/badge/status-active%20development-1f9d8a)](https://github.com/telikuy070-collab/ORDO)
[![Stack](https://img.shields.io/badge/stack-React%2019%20%7C%20Vite%206%20%7C%20Supabase-5a67d8)](https://github.com/telikuy070-collab/ORDO)
[![Architecture](https://img.shields.io/badge/architecture-clean%20architecture-0ea5e9)](https://github.com/telikuy070-collab/ORDO)

## Проблема

Образовательные учреждения используют несколько несвязанных систем:

- расписание в Excel или старых десктопных программах;
- материальные ресурсы (аудитории, оборудование) разбросаны по таблицам;
- данные о преподавателях, студентах и нагрузке в разных сервисах;
- финансовые операции и бюджеты в отдельном софте;
- коммуникация через звонки, email, чаты;
- отчётность собирается вручную.

**Результат**: дублирование данных, ошибки, потери информации, огромные траты времени на администрирование.

## Решение: Ordo

Единая платформа управления, где:

- **всё в одном месте** — расписание, ресурсы, люди, финансы;
- **одна БД** — единый источник правды;
- **встроенная логика** — конфликты обнаруживаются автоматически;
- **мультитенантность** — управляйте несколькими учреждениями;
- **открытые API** — интеграция с внешними системами;
- **роль-based access** — контроль доступа на уровне данных;
- **аудит всего** — кто что и когда менял;
- **online + offline** — работает везде;
- **мобильные и web** — один фронтенд на всех.

## Функциональность

### Управление структурой
- Специальности, направления обучения, программы
- Группы, потоки, подгруппы
- Семестры, учебные годы, календари
- Дисциплины и курсы
- Организационная иерархия (факультеты, кафедры, отделения)

### Управление ресурсами
- Преподаватели и их дисциплины
- Аудитории, лаборатории, корпуса
- Оборудование и материалы
- Загрузка преподавателей (часы, ставки)
- Пожелания и ограничения

### Расписание
- Визуальный редактор с drag-and-drop
- Автоматическая проверка конфликтов
- Версионирование и откат
- Импорт/экспорт Excel
- Публикация и синхронизация

### Управление людьми
- Аутентификация и авторизация
- Роли и права доступа
- Профили студентов и преподавателей
- История и аудит действий
- Уведомления и коммуникация

### Аналитика
- Нагрузка преподавателей
- Использование ресурсов
- Расчёты и отчёты
- Метрики и KPI
- Прогнозирование

### Финансы (roadmap)
- Бюджеты
- Зарплаты и начисления
- Платежи студентов
- Отчётность

## Продуктовая архитектура

### Workspace
Рабочее пространство сотрудников (администраторы, руководители, преподаватели):

- **Администраторы** — полный контроль над учреждением;
- **Руководители** — управление своим подразделением;
- **Преподаватели** — свои классы, нагрузка, пожелания;
- **Другие роли** — на основе RBAC.

### Student / Public
Публичный доступ студентов:

- просмотр расписания;
- поиск по группе, преподавателю, аудитории;
- уведомления об изменениях;
- offline-first PWA;
- доступ без аутентификации.

### Partner Portal (roadmap)
Интеграции и открытый доступ для партнёров, вендоров, внешних систем.

## Технологический стек

### Frontend
- **React 19.3** — modern UI development
- **TypeScript** — type safety
- **Vite 6** — ultra-fast bundler
- **TanStack Router** — type-safe routing
- **TanStack Query** — server state management
- **Zustand** — client state
- **Tailwind CSS + Radix UI** — design system
- **PWA** — offline-first capability
- **React Hook Form + Zod** — form handling with validation

### Backend
- **Supabase** — PostgreSQL + Auth + Realtime + Edge Functions
- **PostgreSQL 16** — with Row Level Security
- **Deno** — serverless Edge Functions
- **Upstash** — rate limiting и caching

### Mono Repository
- **pnpm** — efficient package management
- **Turborepo** — build orchestration
- **Vitest** — unit testing
- **Playwright** — e2e testing

### Architecture
- **Clean Architecture** — strict separation of concerns
- **Domain-Driven Design** — explicit business logic
- **Muti-tenancy** — from day one
- **RLS** — row-level security for isolation

## Структура репозитория

```text
ordo/
├── AGENTS.md                    # Rules for AI agents
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
│
├── apps/
│   ├── workspace/               # Staff dashboard (React PWA)
│   └── student/                 # Student public app (React PWA)
│
├── packages/
│   ├── domain/                  # Pure business logic (no deps)
│   ├── application/             # Use cases & DTOs
│   ├── infrastructure/          # Supabase, Excel, integrations
│   ├── ui/                      # Design system & components
│   ├── types/                   # Shared TypeScript types
│   ├── i18n/                    # Internationalization
│   └── config/                  # ESLint, TypeScript, Prettier
│
├── supabase/
│   ├── migrations/              # SQL migrations
│   ├── functions/               # Edge Functions (Deno)
│   └── seed/                    # Test fixtures
│
└── docs/
    ├── 00-vision.md             # Product vision
    ├── 01-architecture.md       # System architecture
    ├── 02-domain-model.md       # Business entities
    ├── 03-rbac.md               # Role-based access control
    ├── 04-data-model.md         # Database schema
    ├── 05-tech-stack.md         # Technology choices
    ├── 06-scope-boundaries.md   # What's in/out
    ├── 07-runbook.md            # Deployment & operations
    ├── 08-git-workflow.md        # Git conventions
    ├── 09-supabase-workflow.md  # Database workflow
    ├── dod.md                    # Definition of Done
    └── adr/                      # Architecture Decision Records
```

## Быстрый старт

### Требования

- Node.js 20+
- pnpm 9+
- Supabase проект
- Upstash Redis (для rate limiting)

### Установка

```bash
git clone https://github.com/telikuy070-collab/ORDO.git
cd ORDO
cp .env.example .env
# Заполните .env переменными вашего Supabase и Upstash
pnpm install
```

### Запуск разработки

```bash
# Оба приложения
pnpm dev

# Или отдельно
pnpm --filter workspace dev    # http://localhost:5173
pnpm --filter student dev      # http://localhost:5174
```

### Сборка и проверка

```bash
pnpm build           # Build all packages
pnpm lint            # ESLint
pnpm typecheck       # TypeScript strict mode
pnpm test            # Unit tests
pnpm verify          # Full check: typecheck + lint + test + build
pnpm format          # Prettier
```

## Переменные окружения

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_REF=your_project_ref

# Upstash (Rate Limiting & Redis Cache)
UPSTASH_REDIS_REST_URL=https://your-project.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYH...

# Local Development
VITE_APP_URL=http://localhost:5173
VITE_STUDENT_APP_URL=http://localhost:5174
```

## Принципы разработки

### Clean Architecture
```
domain ← application ← infrastructure ← presentation
```

- **Domain** — ноль зависимостей, ��истая бизнес-логика
- **Application** — use cases, DTO, порты
- **Infrastructure** — реализация портов (Supabase, Excel)
- **Presentation** — UI, роутинг, состояние

**Правило**: если `domain` импортирует `infrastructure` — коммит отклоняется.

### Git Workflow
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`
- Один коммит = одна задача
- Push прямо в `main` (для MVP)
- No `git push --force` в `main`

### Код
- TypeScript strict mode
- Никаких `any` (без обоснованного комментария)
- Никаких `TODO` в коде (создавайте issue)
- Имена: `camelCase` для переменных, `PascalCase` для типов, `kebab-case` для файлов

### Тесты
- **Domain**: unit-тесты обязательны (≥80% coverage)
- **Application**: тесты use-cases обязательны
- **Infrastructure**: интеграционные тесты (RLS)
- **E2E**: критические сценарии

### База данных
- Только через миграции
- RLS обязателен для каждой таблицы
- `tenant_id` в каждой таблице (мультитенантность)
- Soft delete: `is_active` вместо `DELETE`
- Аудит: каждое изменение логируется

## Мультитенантность

Ordo — мультитенантная платформа с первого дня:

- **Изоляция данных** — через `tenant_id` и RLS
- **Синтетический изолятор** — один Supabase для всех
- **Онбординг** — новый тенант за 1 день
- **Фича-флаги** — включение/отключение функций per tenant
- **Масштабируемость** — горизонтальная через шардинг БД

## Дорожная карта (MVP)

### Спринт 0: Фундамент
- Монорепо, линтеры, тесты, CI/CD
- Supabase-проект, миграции, RLS
- Domain модель и каркас

### Спринт 1: Identity + Academic Structure
- Пользователи, роли, тенанты
- Специальности, группы, семестры
- Импорт структуры из Excel

### Спринт 2: Resources
- Преподаватели, аудитории, корпуса
- Пожелания и ограничения

### Спринт 3: Scheduling
- Рабочее место администратора
- Редактор расписания (drag-and-drop)
- Проверка конфликтов
- Версии, публикация, откат
- Экспорт в Excel

### Спринт 4: Publication
- Student PWA (офлайн)
- Личный кабинет преподавателя
- Уведомления

### Спринт 5: Analytics + Audit
- Нагрузка преподавателей
- Отчёты
- Журнал действий

### Спринты 6+: Scale & Extend
- Автогенерация расписания (Solver)
- Финансовый модуль
- Расширенные интеграции
- Partner Portal

**Итого MVP**: ~3 месяца

## Коммерческая модель

Ordo рассчитана на:

- **SaaS подписку** по учреждениям
- **Per-seat лицензирование** для расширенных функций
- **Кастомизация** для крупных заказчиков
- **API доступ** для интеграций
- **Профессиональные услуги** для имплементации и поддержки

## Документация

Полная документация находится в папке `docs/`:

- [Vision](docs/00-vision.md) — продуктовая концепция
- [Architecture](docs/01-architecture.md) — системная архитектура
- [Domain Model](docs/02-domain-model.md) — доменные сущности
- [RBAC](docs/03-rbac.md) — управление доступом
- [Data Model](docs/04-data-model.md) — схема БД
- [Tech Stack](docs/05-tech-stack.md) — технологии
- [Scope Boundaries](docs/06-scope-boundaries.md) — границы функционала
- [Runbook](docs/07-runbook.md) — деплой и операции
- [Git Workflow](docs/08-git-workflow.md) — git соглашения
- [Supabase Workflow](docs/09-supabase-workflow.md) — работа с БД

## Статус

✅ **Active Development**

Проект находится в активной разработке. Архитектура стабильна, документация актуальна, процесс разработки налажен.

## Лицензия

Proprietary — YSF

## Контакты

- Вопросы по продукту: [YSF team]
- Issues & Features: [GitHub Issues]
- Documentation: [docs/](docs/)

---

**Ordo** — Complete Campus Management Platform by YSF
