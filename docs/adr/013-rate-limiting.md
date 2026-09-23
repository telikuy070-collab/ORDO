# ADR-013: Rate Limiting

## Upstash Ratelimit в Edge Function

Для защиты от abuse и Denial of Service все анонимные запросы к Supabase проходят через Edge Function с Rate Limiting от **Upstash Redis**.

### Настройка Ratelimit

Используется **sliding window** алгоритм:

```typescript
// get-public-features: 30 запросов за 1 минуту
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30req/min
});

// public-schedule: 60 запросов за 1 минуту
const scheduleRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60req/min
});
```

### Политики

| Эндпоинт | Лимит | Описание |
|---|---|---|
| `get-public-features` | 30 req/min | Поиск фич тенанта |
| `public-schedule` | 60 req/min | Поиск расписания |

### Кэш Upstash Redis

- **get-public-features**: кэш на **1 минуту** (`max-age=60` в Cache-Control).
- **public-schedule**: кэш на **5 минут** (`max-age=300` в Cache-Control).

Кэш используется для уменьшения нагрузки на Postgres и ускорения отклика при повторных запросах тех же данных.

### Почему не Cloudflare?

Cloudflare Workers Cache и Rate Limiting не покрывают **PostgREST** напрямую. Для применения ограничений потребовался бы сложный middleware на уровне edge, что увеличивает латенсию и снижает UX.

### Почему не капча?

Капча убивает UX для студентов, ищущих расписание. Rate limiting — более мягкий и прогрессивный подход: сначала ограничиваем частоту, затем возвращаем 429, но без дополнительных действий от пользователя.

---
*Дата: 2026-09-19*