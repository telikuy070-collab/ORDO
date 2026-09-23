# ADR-017: Docs Consistency Policy

## CI-проверки

Для обеспечения актуальности и согласованности документации внедрены автоматические проверки в CI:

### 1. markdown-link-check
Проверка всех ссылок в markdown-файлах на работоспособность.

```bash
# Запуск локально
npx markdown-link-check "docs/**/*.md" "*.md" --production
```

### 2. Vale (prose lint)
Проверка стиля написания, орфографии и грамматики.

```bash
# Конфиг Vale
vale --version
vale docs/**/*.md --config ~/.vale.ini
```

### 3. check-agents-adr-consistency.ts
Специалический скрипт, проверяющий согласованность между `AGENTS.md`, `ADR` и реализацией.

```typescript
// Пример проверки
import { checkAgentsAdrConsistency } from './scripts/check-agents-adr-consistency';

const results = await checkAgentsAdrConsistency({
  agentsMdPath: './AGENTS.md',
  adrDir: './docs/adr',
  taskDir: './docs/tasks',
});

if (results.errors.length > 0) {
  console.error('ADR/AGENTS inconsistency:', results.errors);
  process.exit(1);
}
console.log('✅ All ADR/AGENTS consistent');
```

CI fails если есть inconsistencies.

---

## Правило: каждая новая таблица → RLS-тест

Согласно ADR-014, перед созданием новой таблицы в БД необходимо:
1. Написать pgTAP тест изоляции тенантов.
2. Написать pgTAP тест фича-зависимого RLS.
3. Убедиться, что тест проходит в Supabase test database.
4. Добавить тест в CI pipeline.

---

## Правило: каждая новая фича → ADR

Любая новая фича должна иметь:
1. **ADR** — документ о решении (`docs/adr/<N>-<name>.md`)
2. **RFC** — детализация (`docs/rfc/rfc-<N>-<name>.md`)
3. **Update AGENTS.md** — если меняются правила
4. **Тесты** — pgTAP для RLS, unit-тесты для use-cases

---

## Правило: ADR — источник истины, AGENTS.md ссылается

- **ADR** содержит детальное решение, контекст, обоснование, последствия.
- **AGENTS.md** ссылается на ADR: `см. ADR-011`, не дублирует контент.
- Если в `AGENTS.md` есть правило, противоречащее `ADR` — ступор решается через owner decision.

### Пример ссылки в AGENTS.md

```markdown
## Clean Architecture → см. ADR-015.
## Feature Flags → см. ADR-011.
## RLS Testing → см. ADR-014.
## Docs Consistency → см. ADR-017.
## Agent Pipeline → см. ADR-018.
```

---

## CI pipeline для проверки согласованности

```yaml
name: Docs Consistency

on:
  push:
    branches: [main]
  pull_request:

jobs:
  consistency:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install deps
        run: corepack enable && corepack prepare pnpm@latest install
      - name: Run markdown-link-check
        run: npx markdown-link-check "docs/**/*.md" "AGENTS.md" --production
      - name: Run Vale
        run: vale docs/**/*.md --config ~/.vale.ini
      - name: Run ADR consistency check
        run: pnpm check:adr-consistency
```

---
*Дата: 2026-09-19*