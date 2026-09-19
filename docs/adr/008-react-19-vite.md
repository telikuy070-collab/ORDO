# ADR-008: React 19 + Vite 6

## Статус
Принято

## Контекст
Технологический стек Ordo на 2026 год (AGENTS.md, раздел 2):
- **React 19.3** + TypeScript — фронтенд
- **Vite 6** — сборка
- **TanStack Router** — роутинг
- **TanStack Query** — server state
- **Zustand** — client state
- **TailwindCSS** + **Radix UI** — UI
- **vite-plugin-pwa** — PWA
- **React Hook Form** + **Zod** — формы

Два приложения: workspace (с логином) и student (анонимно).

## Решение
Использовать **React 19.3** с **Vite 6** как базовые технологии:

1. **React 19.3** —latest версия на 2026 год
   - Новые фичи: React Server Components (экспериментально), Actions, improved SSR
   - Strict mode включен в tsconfig
   - Никакого `any` (AGENTS.md, раздел 5, пункт 127)
   - TypeScript strict mode

2. **Vite 6** — сборка и dev server
   - Экстремально быстрая горячая замена модулей (HMR)
   - Оптимизация для React 19
   - Встроенная поддержка `react-refresh` для быстрой итерации
   - Конфигурация в `turbo.json` для monorepo

3. **TanStack Router** — роутинг вместо React Router
   - Type-safe роуты
   - Data loading в роутах
   - Better совместимость с Vite 6

4. **TanStack Query** — server state management
   - Cache-first стратегия
   - Revalidation на фокусе окна
   - Интеграция с TanStack Router

5. **Zustand** — client state
   - Минималистичный стор
   - Нет провайдеров выше дерева (в отличие от Redux)
   - Используется для локального состояния: фильтры, открытые модалки, выбор группы

6. **TailwindCSS + Radix UI**
   - Tailwind 3.x (или 4.x на 2026) — utility-first CSS
   - Radix UI — accessible primitives, headless components
   - Design system выносится в `packages/ui`

7. **vite-plugin-pwa** — PWA поддержка
   - Для student PWA: offline-first кэширование
   - Для workspace PWA: манифест и service worker

8. **React Hook Form + Zod**
   - Формы с валидацией на лету
   - Zod схемы совпадают с domain DTO
   - Минимизация дублирования валидации

## Обоснование
Стек React 19 + Vite 6 позволяет:
1. **Современность**: последние фичи React на 2026 год
2. **Производительность**: Vite 6 — одна из fastest сборок
3. **Type safety**: TanStack Router + TypeScript + Zod = end-to-end типы
4. **AGENTS.md compliance**: "React 19.3 + TypeScript", "Vite 6" (AGENTS.md, раздел 2)
5. **Два PWA**: общая кодовая база, разная конфигурация плагинов
6. **Clean Architecture**: presentation layer (PWA) использует только application DTO, не зависит от infrastructure

## Последствия
- `package.json` содержит зависимости: `react@19.3`, `vite@6`, `@tanstack/react-query`, `@tanstack/router`, `zod`, `@radix-ui/react-*`
- `tsconfig.json` имеет `strict: true`, `noImplicitAny: true`
- Vite конфиг в `apps/workspace/vite.config.ts` и `apps/student/vite.config.ts`
- TanStack Router routes определены в `packages/application/*` или `apps/*/src/routes/`
- Все формы используют React Hook Form + Zod
- Никакого `any` в коде (кроме обоснованных случаев с комментарием, AGENTS.md стр. 127)

## Альтернативы
- **React 18 + Vite 5**: старее версия, не использует последние фичи React 19. Минусы: упущенные улучшения производительности и API.
- **React Router + Redux**: классический стек, но больше boilerplate, хуже интеграция с Vite 6 и TanStack инструментами. Минусы: лишняя сложность, хуже типобезопасность.

**Выбранный вариант**: React 19.3 + Vite 6 (рекомендовано AGENTS.md, 05-tech-stack.md).

---
*Дата: 2026-09-19*