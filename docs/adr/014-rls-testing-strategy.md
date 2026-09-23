# ADR-014: RLS Testing Strategy

## pgTAP шаблон теста

Для тестирования RLS политий используется **pgTAP** в сочетании с Supabase test database.

### Базовый шаблон теста

```sql
-- Подключение к test database
-- \c supabase_realtime_test

CREATE TEST test_rls_isolation_basic() USING pgTAP;

-- Создание двух тенантов
SELECT * FROM create_tenant('College A') AS t1;
SELECT * FROM create_tenant('College B') AS t2;

-- Создание преподавателя в College A
SELECT * FROM create_teacher('Ivan Ivanov', 'ivan@college-a.ru', 'teacher') 
  INTO teacher_a 
  TENANT_ID := t1.id;

-- Настройка RLS: College A может видеть только свои данные
-- (политики уже созданы через миграции)

-- Действие: teacher A запрашивает свои пары
SELECT * FROM schedule_lessons WHERE teacher_id = teacher_a.id;

-- Ожидание: только пары College A
-- Нарушение: если teacher видит пары College B — тест падает

-- Очистка
SELECT * FROM drop_tenant(t1.id);
SELECT * FROM drop_tenant(t2.id);

END TEST;
```

---

## Изоляция тенантов

### Тест: teacher A не видит tenant B

```sql
CREATE TEST test_teacher_isolation() USING pgTAP;

-- Setup: два тенанта
SELECT * FROM create_tenant('College A') AS t_a;
SELECT * FROM create_tenant('College B') AS t_b;

-- Создаем преподавателя только в College A
SELECT * FROM create_teacher('Ivan', 'ivan@a.ru', 'teacher') 
  INTO teacher_a TENANT_ID := t_a.id;

-- College B имеет своего преподавателя
SELECT * FROM create_teacher('Petr', 'petr@b.ru', 'teacher') 
  INTO teacher_b TENANT_ID := t_b.id;

-- Проверка: teacher A не видит College B
SELECT has_role(auth.uid(), t_b.id, 'teacher') AS teacher_can_see_b;
-- Ожидание: false

-- Проверка: teacher A видит College A
SELECT has_role(auth.uid(), t_a.id, 'teacher') AS teacher_can_see_a;
-- Ожидание: true

-- Cleanup
SELECT * FROM drop_tenant(t_a.id);
SELECT * FROM drop_tenant(t_b.id);

END TEST;
```

---

## Фича-зависимый RLS

### Тест: parent_access выключен → parent не видит

```sql
CREATE TEST test_feature_dependent_rls() USING pgTAP;

-- Setup
SELECT * FROM create_tenant('College A') AS t;
SELECT * FROM create_parent('Parent', 'parent@a.ru', 'department_head') 
  INTO parent_a TENANT_ID := t.id;

-- Включаем фичу parent_access для College A
UPDATE tenant_features 
SET enabled = true, feature_key = 'parent_access' 
WHERE tenant_id = t.id;

-- Teacher父母 видит свои данные
SELECT has_role(auth.uid(), t.id, 'department_head') AS can_see;
-- Ожидание: true (фича включена)

-- Выключаем фичу
UPDATE tenant_features 
SET enabled = false, updated_at = now() 
WHERE tenant_id = t.id AND feature_key = 'parent_access';

-- После выключения parent не видит
SELECT has_role(auth.uid(), t.id, 'department_head') AS can_see_after_disable;
-- Ожидание: false (RLS блокирует)

-- Cleanup
SELECT * FROM drop_tenant(t.id);

END TEST;
```

---

## CI — supabase test db в GitHub Actions

```yaml
# .github/workflows/rls-tests.yml
name: RLS Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      supabase:
        image: supabase/postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports: ["5432:5432"]
        options: >-
          --name supabase-test
          --health-cmd "pg_isready -U postgres"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - name: Install pnpm
        run: corepack enable && corepack prepare pnpm@latest install
      - name: Run RLS tests
        run: |
          pnpm exec supabase db test --db-url $SUPABASE_TEST_DB_URL \
            --include-tegration --filter "test_rls"
```

---

## Правило: каждая новая таблица = RLS-тест

Перед принятием новой таблицы в прод:
1. Написать pgTAP тест изоляции тенантов.
2. Написать pgTAP тест фича-зависимого RLS.
3. Убедиться, что тест проходит в Supabase test database.
4. Добавить тест в CI pipeline.

Если тест не написать — таблица неMerge в main.