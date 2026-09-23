# ADR-015: Module Extension Policy

## Как добавить 9-й модуль

Процесс добавления нового bounded context в Clean Architecture Ordo.

### Шаги добавления модуля

1. **ADR** — документировать новый модуль в `docs/adr/<N>-<module>.md`
   - Статус: Принято
   - Контекст: зачем нужен модуль
   - Решение: структура модуля
   - Последствия: изменения в архитектуре

2. **RFC** — детализация в `docs/rfc/rfc-<N>-<module>.md`
   - Цель модуля
   - Границы (внутр/снаж/не входит)
   - Контракты (порты)
   - Use-cases
   - События
   - Зависимости
   - Тесты
   - Definition of Done

3. **Application ports** — создать интерфейсы в `packages/application/<module>/ports/`
   - Репозитории: `I<Module>Repository`
   - Use-case интерфейсы

4. **Domain entities** — создать сущности в `packages/domain/<module>/entities/`
   - Value objects
   - Инварианты
   - Без зависимостей от infrastructure

5. **Migration** — создать миграцию `supabase/migrations/NNN_<module>.sql`
   - Создание таблиц с `tenant_id`
   - RLS политики
   - View (если нужно)

6. **ESLint boundaries** — обновить конфиг `packages/config/eslint.config.js`
   - Добавить правило для нового модуля
   - Запрет на неявные imports

7. **Approve** — владелец 승인 новых ADR/RFC
   - Код-ревью
   - Архитектурный ревью
   - Завершение: все чекбоксы Done

---

## Общение через application-порты

### Запрет на прямые зависимости

- **Domain** → только `domain` (ничего больше)
- **Application** → `domain` + свои порты
- **Infrastructure** → `domain`, `application`
- **Presentation** → `application` (через DTO)

### Пример correct import

```typescript
// ❌ Wrong: domain импортирует infrastructure
import { supabase } from '@supabase/serverless';

// ✅ Correct: application использует порты
import { ITeacherRepository } from '@/application/teachers/ports';
```

---

## ESLint boundaries — конфиг

В `packages/config/eslint.config.json` добавлено правило `no-restricted-imports`:

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "imports": ["*"],
        "from": ["packages/domain"],
        "disallow": ["packages/infrastructure", "packages/ui"]
      },
      {
        "imports": ["*"],
        "from": ["packages/application"],
        "disallow": ["packages/infrastructure"]
      }
    ]
  }
}
```

---

## Изменение сущности — ADR + RFC + миграция + backward compatibility

### Пример: добавление поля вTeacher

1. **ADR** — решение о изменении сущности Teacher
2. **RFC** — детализация полей и контрактов
3. **Миграция** — добавление колонки в БД с `DEFAULT null`
4. **Backward compatibility**:
   - новая версия API поддерживает старое поле (null по умолчанию)
   - старый код продолжает работать без падения
   -Deprecation period — 1 спринт
5. **Update use-cases** — обновить application слой
6. **Update DTO** — обновить типы в presentation слове

---

## Approve — владелец

Все изменения модулей проходят утверждение **owner**:
- Ревью кода
- Проверка ADR/RFC
- Проверка тестов (≥80% coverage в domain)
- Принятие в main

---
*Дата: 2026-09-19*