# Ordo — Tech Stack

> Стек, версии, обоснование. 2026, без конфликтов.

---

## 1. Frontend

| Слой | Выбор | Версия | Обоснование |
|---|---|---|---|
| Framework | **React** | 19.3 | Актуальный стандарт 2026 |
| Сборка | **Vite** | 6 | Enterprise-ready, monorepo-поддержка |
| Роутинг | **TanStack Router** | latest | TS-first, data loaders |
| Server state | **TanStack Query** | latest | Стандарт для server state |
| Client state | **Zustand** | latest | Минималистичный |
| UI | **TailwindCSS** | 4 | Гибкость |
| UI components | **Radix UI** | latest | Доступность |
| PWA | **vite-plugin-pwa** | latest | Офлайн, SW, manifest |
| Формы | **React Hook Form** | latest | Производительность |
| Валидация | **Zod** | latest | Типы + runtime |

---

## 2. Backend

| Слой | Выбор | Версия | Обоснование |
|---|---|---|---|
| BaaS | **Supabase** | latest | Postgres + RLS + Auth + Realtime + Edge |
| БД | **Postgres** | 16 | RLS, мультитенантность |
| Auth | **Supabase Auth** | latest | Только для staff |
| Realtime | **Supabase Realtime** | latest | Мгновенные обновления |
| Edge Functions | **Deno** | latest | Supabase Edge |

---

## 3. Монорепо

| Слой | Выбор | Обоснование |
|---|---|---|
| Пакетный менеджер | **pnpm** | Строгие зависимости, быстрый |
| Оркестрация | **Turborepo** | Инкрементальная сборка |
| Структура | `apps/*` + `packages/*` | Стандарт |

---

## 4. Тесты

| Тип | Инструмент | Что тестируем |
|---|---|---|
| Unit | **Vitest** | Domain, use-cases |
| Integration | **Vitest** + Supabase local | Репозитории, RLS |
| E2E | **Playwright** | Критические сценарии |
| RLS | **pgTAP** | Политики |

---

## 5. Excel

| Задача | Инструмент |
|---|---|
| Парсинг | **SheetJS** |
| Генерация | **SheetJS** |

---

## 6. Деплой

| Слой | Выбор | Обоснование |
|---|---|---|
| Хостинг | **Vercel** | Бесплатно, работает с GitHub |
| Preview | Vercel | На каждый push |
| Prod | Vercel | На main |
| CI | **Нет** | Vercel собирает сам |

---

## 7. Наблюдаемость

| Слой | Выбор | Обоснование |
|---|---|---|
| Ошибки | **Sentry** (позже) | Отслеживание |
| Аналитика | **PostHog** (позже) | Метрики |

---

## 8. Разработка

| Инструмент | Назначение |
|---|---|
| **ESLint** | Линт |
| **Prettier** | Форматирование |
| **TypeScript** | strict mode |
| **Husky** | ❌ Не используем |
| **lint-staged** | ❌ Не используем |

---

## 9. Почему не Next.js

- PWA не требует SSR.
- Vite быстрее.
- Меньше сложности.
- Меньше зависимостей.

---

## 10. Почему не SvelteKit

- React — больше экосистема.
- React — больше найм.
- React 19.3 — стабилен.

---

## 11. Почему Supabase

- Postgres + RLS из коробки.
- Auth для staff.
- Realtime для обновлений.
- Edge Functions для логики.
- Бесплатный tier.

---

## 12. Ссылки

- [Architecture](01-architecture.md)
- [ADR](../adr/)