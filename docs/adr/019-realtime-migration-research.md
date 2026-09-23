# ADR-019: Realtime Migration Research

## Что проверяем — ElectricSQL (RLS, масштабирование, Postgres 16)

### Исследование ElectricSQL

ElectricSQL — это слой синхронизации между Postgres и клиентским кэшем. Ключевые вопросы:

| Аспект | Вопрос | Статус |
|---|---|---|
| **RLS** | Автоматически применяется к subscribed tables? | ❓ Нужно проверить |
| **Масштабирование** | Количество concurrent connections при 100+k students? | ❓ Нужно профилировать |
| **Postgres 16** | Совместимость с последними фичами (partitioning, logical replication)? | ❓ Тестируем |
| **Offline-first** | Кэш работает офлайн, автоматическое слияние при восстановлении? | ❓ Нужно протестировать |
| **Type safety** | Generated types соответствуют domain моделям? | ❓ Нужно проверить |
| **Migration safety** | Safe migration с ElectricSQL layers? | ❓ Нужен pilot project |

### План исследований (5 дней)

| День | Задача | Ожидаемый результат |
|---|---|---|
| **День 1** | Setup: `npx electric init` в staging проекте | Project инициализирован, схéma экспортирована |
| **День 2** | RLS test: подписка на таблицу с RLS политиками | Подтверждено/отклонено: RLS работает |
| **День 3** | Performance: 100 simulated students, latency измерение | Меторы отклика, bottleneck'ы |
| **День 4** | Offline-first: отключение сети, возобновление, merge | Data consistency гарантирована |
| **День 5** | Отчет: рекомендация — продолжать/отказ | Решение зафиксировано в ADR |

---

## Fallback — LISTEN/NOTIFY + WebSocket (2 недели) / polling (30 сек)

Если ElectricSQL не подходит, есть fallback варианты:

### 1. LISTEN/NOTIFY + WebSocket
- **Механизм**: PostgreSQL `LISTEN/NOTIFY` через WebSocket connection.
- **Anon**: отключен (как и сейчас).
- **Authenticated**: имеют доступ к каналам.
- **Срок**: 2 недели на реализацию.
- **Плюсы**: простота, минимальная зависимость, работает сегодня.
- **Минусы**: не масштабируется на тысячи连接, сложная ошибка handling, не подходит для offline-first.

### 2. Polling (30 сек — 5 мин)
- **Механизм**: student PWA опрашивает `public-schedule` endpoint раз в 30 секунд — 5 минут.
- **Anon**: работает без ограничений.
- **Authenticated**: работает как fallback при отключенном Realtime.
- **Срок**: 1 спринт на настройку.
- **Плюсы**: простота, надежность, работает везде.
- **Минусы**: лишний трафик, latency до 5 мин, не realtime.

---

## Решение — если ничего не подходит, отказ от Realtime

### Решение приоритетный порядок

1. **Оставить polling** (раз в 5 минут) для student PWA — это уже реализовано и работает.
2. **Realtime только для workspace** (зам, преподаватели) — критичные изменения приходят мгновенно.
3. **ElectricSQL** — исследовать в отдельном проекте (pilot), если есть бизнес-требование о offline-first для students.
4. **Отказ от Realtime** для анонимных студентов — принято, если:
   - Не كهربigkeit ElectricSQL под наши нужды.
   - Нет ресурса на поддержку LISTEN/NOTIFY.
   - Polling достаточен для UX (студенты и так обновляют страницу).

### Финальное решение (по состоянию на 2026-09-19)

> **Realtime отключен для anon. Student PWA использует polling раз в 5 минут. Realtime доступен только для authenticated users (workspace PWA).** 

Если в будущем возникнет требование offline-first для students — исследовать ElectricSQL как отдельный проект (Sprint Spike), не входящий в MVP scope.

---
*Дата: 2026-09-19*