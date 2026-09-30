# Task-002: Governance and Safe Baseline Recovery

depends_on: []
blocks: []
priority: 1

## Статус

**Выполняется как bounded governance task по явному разрешению владельца от 2026-09-24.**

Task не авторизует product implementation, schema changes, runtime changes или исправление failed WIP gates.

## Контекст

См.:

- ADR: `docs/adr/020-governance-and-safe-baseline-recovery.md`
- RFC: `docs/rfc/rfc-009-governance-and-safe-baseline-recovery.md`

Текущий WIP включает 17 modified tracked paths и 11 exact untracked source/SQL paths. В рабочем дереве также присутствуют deleted docs, дополнительные untracked paths и потенциально чувствительные файлы. Recovery должна сохранить только согласованный WIP и доказать неизменность остального repository state.

Хронология: первичное pre-governance evidence существует в run `20260924T190127853Z-748eab5d`; manifest `createdAtUtc` — `2026-09-24T19:02:24Z`. Его safe `status-before.txt` фиксирует 65 исходных status entries metadata без governance-файлов. Ранний run superseded и недействителен для content-diff acceptance: его pre-governance unscoped diff нельзя читать или использовать. Authoritative sanitized backup должен быть новым post-remediation artifact; из старого backup копируется только safe metadata-only status-before, без diff и denied content.

## Цель

Выполнить recovery в truthful chronology, не меняя product/runtime/schema и не создавая backup до governance-документов:

1. Выполнить read-only preflight и зафиксировать early safe status metadata evidence; старый unscoped diff не использовать.
2. Создать ровно три governance-документа.
3. После этого создать later authoritative sanitized backup из unchanged exact 17 + 11 WIP allowlists.
4. Проверить final status delta: 65-entry baseline плюс ровно три governance-файла, checksums, exact diff и path safety.
5. Не перезапускать `pnpm`, не исправлять product WIP, не выполнять commit или push.

## Разрешённые repository changes

Разрешено создать только:

1. `docs/adr/020-governance-and-safe-baseline-recovery.md`
2. `docs/rfc/rfc-009-governance-and-safe-baseline-recovery.md`
3. `docs/tasks/task-002-governance-and-safe-baseline-recovery.md`

Существующие deleted docs, modified tracked files и untracked files не изменяются этой задачей.

## Exact backup allowlists

### Modified tracked WIP (17)

1. `packages/application/src/import-export/index.test.ts`
2. `packages/application/src/import-export/index.ts`
3. `packages/domain/src/import-export/index.ts`
4. `packages/infrastructure/src/excel/index.test.ts`
5. `packages/infrastructure/src/supabase/repositories/academic.ts`
6. `packages/infrastructure/src/supabase/repositories/analytics.ts`
7. `packages/infrastructure/src/supabase/repositories/audit.ts`
8. `packages/infrastructure/src/supabase/repositories/identity.ts`
9. `packages/infrastructure/src/supabase/repositories/import-export.ts`
10. `packages/infrastructure/src/supabase/repositories/publication.ts`
11. `packages/infrastructure/src/supabase/repositories/resources.ts`
12. `packages/infrastructure/src/supabase/repositories/scheduling.ts`
13. `packages/ui/package.json`
14. `packages/ui/src/index.ts`
15. `pnpm-lock.yaml`
16. `supabase/config.toml`
17. `supabase/migrations/001_import_export.sql`

### Untracked source/SQL WIP (11)

1. `packages/infrastructure/src/supabase/repositories/base.ts`
2. `packages/ui/src/components/ScheduleGrid.tsx`
3. `supabase/check_policies.sql`
4. `supabase/check_tables.sql`
5. `supabase/migrations/002_identity.sql`
6. `supabase/migrations/003_academic.sql`
7. `supabase/migrations/004_resources.sql`
8. `supabase/migrations/005_scheduling.sql`
9. `supabase/migrations/006_publication.sql`
10. `supabase/migrations/007_analytics.sql`
11. `supabase/migrations/008_audit.sql`

### Deny paths

Запрещены чтение содержимого, backup и изменения:

- `.env.local`
- `.env.example`
- `supabase/functions/resolve-tenant/env.json`
- `supabase/functions/resolve-tenant/deploy.json`
- `.kilo/**`
- generated, cache и dependency directories
- deleted tracked docs
- любые paths вне allowlists и трёх target files

Дополнительный untracked `.kilo/kilo.jsonc` не входит в raw-copy payload.

### Exact final backup inventory (34 regular files)

```text
checksums.sha256
gate-metadata.json
manifest.json
status-after.txt
status-before.txt
payload/git/working-tree-vs-head.diff
payload/tracked/packages/application/src/import-export/index.test.ts
payload/tracked/packages/application/src/import-export/index.ts
payload/tracked/packages/domain/src/import-export/index.ts
payload/tracked/packages/infrastructure/src/excel/index.test.ts
payload/tracked/packages/infrastructure/src/supabase/repositories/academic.ts
payload/tracked/packages/infrastructure/src/supabase/repositories/analytics.ts
payload/tracked/packages/infrastructure/src/supabase/repositories/audit.ts
payload/tracked/packages/infrastructure/src/supabase/repositories/identity.ts
payload/tracked/packages/infrastructure/src/supabase/repositories/import-export.ts
payload/tracked/packages/infrastructure/src/supabase/repositories/publication.ts
payload/tracked/packages/infrastructure/src/supabase/repositories/resources.ts
payload/tracked/packages/infrastructure/src/supabase/repositories/scheduling.ts
payload/tracked/packages/ui/package.json
payload/tracked/packages/ui/src/index.ts
payload/tracked/pnpm-lock.yaml
payload/tracked/supabase/config.toml
payload/tracked/supabase/migrations/001_import_export.sql
payload/untracked/packages/infrastructure/src/supabase/repositories/base.ts
payload/untracked/packages/ui/src/components/ScheduleGrid.tsx
payload/untracked/supabase/check_policies.sql
payload/untracked/supabase/check_tables.sql
payload/untracked/supabase/migrations/002_identity.sql
payload/untracked/supabase/migrations/003_academic.sql
payload/untracked/supabase/migrations/004_resources.sql
payload/untracked/supabase/migrations/005_scheduling.sql
payload/untracked/supabase/migrations/006_publication.sql
payload/untracked/supabase/migrations/007_analytics.sql
payload/untracked/supabase/migrations/008_audit.sql
```

`gate-metadata.json` входит в exact inventory и учитывается в checksums; `checksums.sha256` содержит 33 entries и не хеширует сам себя.

## Шаги

### 1. Read-only preflight и early safe evidence

- Выполнить read-only проверку `HEAD` и complete worktree status; ничего не изменять.
- Сверить exact 17 modified tracked paths и exact 11 untracked source/SQL paths с неизменёнными WIP allowlists.
- Зафиксировать early safe status metadata evidence из pre-governance run `20260924T190127853Z-748eab5d`: использовать только `status-before.txt` с ровно 65 baseline entries metadata без governance-файлов.
- Старый pre-governance unscoped diff пометить superseded/invalid, не читать, не копировать и не использовать для acceptance; denied content и deleted-doc content не читать.
- Проверить отсутствие staged changes и governance target files в baseline; при mismatch остановиться до записи governance-документов и backup.

### 2. Создать governance-документы

- Только после preflight и фиксации early evidence создать ровно три файла: ADR-020, RFC-009 и Task-002.
- ADR-020 должен иметь статус «Принято» на основе явного owner approval; RFC-009 и Task-002 должны ссылаться друг на друга и содержать exact scope.
- Зафиксировать exact allow/deny paths, запрет чтения denied content и запрет восстановления deleted tracked docs.
- Явно запретить schema/product/runtime/staging/prod changes, product implementation, fixes failed WIP, commit, push и destructive Git.
- До завершения этого шага authoritative sanitized backup не создаётся; финальный backup не считается существующим до governance-документов.

### 3. Создать later authoritative sanitized backup

- После создания трёх governance-документов создать новый later authoritative post-remediation sanitized backup во внешнем approved temp storage в `<approved-external-temp>/ordo-governance-recovery/<UTC-run-id>/`; это отдельный artifact, а не early pre-governance backup.
- Проверить approved external parent через `Test-Path`, затем создать `<final>.partial`; final path не должен существовать.
- Скопировать `status-before.txt` только из safe metadata раннего pre-governance run; old unscoped diff и denied content не копировать.
- Скопировать raw bytes только exact 17 modified tracked и 11 exact untracked source/SQL allowlists без расширения списка; deleted tracked docs represented only by status metadata, not content.
- Создать `payload/git/working-tree-vs-head.diff` Git-native командой `git diff --binary --output=<backup-relative-path> HEAD -- <exact 17 pathspec>`; exact pathspec содержит только 17 allowlisted modified tracked paths, stored diff byte-identical прямому output той же команды.
- Создать redacted `gate-metadata.json` только из prior recorded redacted evidence и `manifest.json` без абсолютных локальных путей.
- Сформировать `checksums.sha256` последней записью, проверить partial, atomic rename в final и повторно проверить checksums.
- При failure сохранить partial и остановиться; partial автоматически не удалять.

### 4. Проверить final status, exact diff и path safety

- Снять post-remediation `status-after.txt` и подтвердить final status delta: исходные 65 baseline entries плюс ровно три governance-файла; после исключения этих трёх файлов status-after должен совпасть с baseline.
- Подтвердить exact final inventory из 34 regular files, `checksums.sha256` ровно из 33 entries и отсутствие checksum для самого checksum-файла.
- Проверить source/copy SHA-256, exact 17-path diff, отсутствие deleted-doc content и запрет любых denied paths.
- Проверить path safety: только relative paths, без absolute/drive-qualified paths, traversal, symlink/junction/reparse points и unexpected backup files.
- Проверить неизменность `HEAD` и отсутствие staged changes; partial отсутствует только после успешного atomic rename, failure partial сохраняется.

### 5. Остановиться без исправлений и внешних изменений

- `pnpm` не перезапускать: сохранить только prior recorded `pnpm typecheck` exit code 2/`FAIL`/duration 33561 ms; `pnpm lint` и `pnpm test` остаются `NOT_RUN` после stop.
- Не исправлять product, domain, application, infrastructure, UI, scripts, dependencies, configs, migrations, schema, runtime или RLS.
- Не выполнять commit или push; не обращаться к staging или production.
- Передать только redacted evidence, exact path-safety/checksum/diff results и NO-GO/stop status.

## Failure and stop policy

- Baseline mismatch: stop before writing.
- Existing target file: stop before writing.
- Backup validation failure: retain partial, stop, report path.
- `pnpm typecheck` FAIL: record redacted evidence, mark NO-GO, stop.
- `pnpm lint` FAIL: record redacted evidence, mark NO-GO, stop.
- `pnpm test` FAIL: record redacted evidence, mark NO-GO, stop.
- Любой FAIL не разрешает изменять WIP, scripts, dependencies или code в этой задаче.

## Критерии приёмки

- [ ] Read-only preflight выполнен первым; early safe status metadata evidence зафиксирована из run `20260924T190127853Z-748eab5d` с `createdAtUtc` `2026-09-24T19:02:24Z`.
- [ ] `status-before.txt` содержит ровно 65 baseline entries metadata и не содержит governance-файлов; old pre-governance unscoped diff не используется для acceptance.
- [ ] После early evidence создано ровно 3 governance-файла: ADR-020, RFC-009 и Task-002; cross-links и exact scope присутствуют.
- [ ] Authoritative sanitized backup указан как later post-remediation artifact, созданный только после governance-документов; не утверждается, что финальный backup существовал до docs.
- [ ] Backup source ограничен unchanged exact allowlist из 17 modified tracked и 11 exact untracked source/SQL paths; raw payload не расширен.
- [ ] Exact diff использует только 17 allowlisted modified tracked paths и не включает deleted-doc content; deleted tracked docs представлены только status metadata.
- [ ] Final status delta равен 65 исходным baseline entries плюс exact три governance-файла; после исключения governance-файлов status-after совпадает с baseline.
- [ ] Final backup содержит ровно 34 regular files, а `checksums.sha256` содержит ровно 33 entries, создан последним и проверен до и после atomic rename.
- [ ] Source/copy SHA-256, exact diff и path safety проверены: нет absolute/drive-qualified paths, traversal, symlink/junction/reparse points или unexpected files.
- [ ] `gate-metadata.json` redacted; typecheck имеет prior recorded exit 2/`FAIL`/duration 33561 ms, lint/test имеют `NOT_RUN` после stop.
- [ ] `pnpm` не перезапускается в этой recovery task; никакие failed gates не исправляются.
- [ ] ADR/RFC/Task запрещают schema, product, runtime, staging/prod changes, product implementation, fixes failed WIP, commit, push и destructive Git.
- [ ] Документы не авторизуют product implementation или расширение backup allowlist.
- [ ] Failed gate трактуется как redacted evidence + NO-GO/stop без product fixes; acceptance не утверждает выполнение `pnpm lint` или `pnpm test`.
- [ ] `HEAD` неизменен и staged changes отсутствуют.
- [ ] Failed partial не удаляется автоматически; partial отсутствует только после успешного atomic rename.
- [ ] Commit и push не выполнялись; staging и production не затрагивались.

## Связанные документы

- ADR-020: `docs/adr/020-governance-and-safe-baseline-recovery.md`
- RFC-009: `docs/rfc/rfc-009-governance-and-safe-baseline-recovery.md`
