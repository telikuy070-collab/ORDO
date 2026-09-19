# Ordo — ADR (Architecture Decision Records)

> Журнал архитектурных решений. Каждый ADR — отдельный файл.
> Агент создаёт ADR по шаблону. Владелец решает, что записывать.

---

## Зачем ADR
- Память проекта: почему принято решение.
- Контекст для агентов: почему нельзя иначе.
- История изменений: что и когда.

## Когда создавать ADR
- Новый модуль.
- Изменение архитектуры.
- Изменение стека.
- Новое внешнее решение (БД, хостинг, библиотека).
- Отступление от default.
- Изменение правил.

## Шаблон ADR

```markdown
# ADR-<NNN>: <Название>

## Статус
Принято / Предложено / Отклонено / Заменено

## Дата
YYYY-MM-DD

## Контекст
Почему возник вопрос. Какая проблема.

## Решение
Что решили сделать.

## Обоснование
Почему именно так. Какие плюсы.

## Последствия
Что меняется. Какие минусы. Что нужно сделать.

## Альтернативы
Что ещё рассматривали. Почему отказались.
```

## Текущий статус реализации

На данный момент монорепозиторий закрывает все базовые bounded contexts в соответствии с архитектурой Clean Architecture:

- Identity ✅
- Academic ✅
- Resources ✅
- Scheduling ✅
- Publication ✅
- ImportExport ✅ (coverage 100%, SheetJS, фаза 3)
- Analytics ✅
- Audit ✅

### Фазы реализации (на 2026-09-19)

| Фаза | Статус | Что |
|---|---|---|
| 1. Основы | ✅ | Структура, Clean Architecture, конфиги, пайплайн |
| 2. Domain + Application + Infrastructure | ✅ | 8 модулей, coverage ≥80% (итого 85.71%) |
| 3. Дизайн-система | ✅ | `packages/ui` — 16 компонент + Tailwind theme |
| 4. PWA приложения | ✅ | `apps/workspace` (staff), `apps/student` (anon), оба собираются + PWA |
| 5. Supabase | ✅ | `supabase/migrations/001_import_export.sql`, `seed/`, `functions/resolve-tenant/`, `config.toml` |
| 6. Деплой | ⬜ | Vercel для обоих PWA |
| 7. Тесты RLS | ⬜ | pgTAP по миграциям |

### Пайплайн (зелёный)

```
pnpm typecheck  → 8/8
pnpm lint       → 8/8
pnpm test       → 37/37, domain coverage 85.71%
vite build      → apps/workspace + apps/student (PWA сгенерирован)
```

### Dev-серверы

- workspace: `http://localhost:5173`
- student: `http://localhost:5174`

Дальнейшая работа идёт по расширению и стабилизации продуктовой обвязки вокруг уже закрытых модулей: UI, интеграция с Supabase, приложение workspace/student и тонкая настройка сценариев публикации/аудита.

В каждом модуле сохраняется схема:
- domain: сущности, value objects, ошибки, события;
- application: use-cases, порты, DTO;
- infrastructure: реализации репозиториев и интеграция с Supabase;
- тесты: unit- и use-case проверки.

---