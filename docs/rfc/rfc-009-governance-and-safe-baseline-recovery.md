# RFC-009: Governance and Safe Baseline Recovery

## Статус

**Принято по явному разрешению владельца от 2026-09-24.**

## Цель

Зафиксировать проверяемый контракт безопасного backup и redacted verification для текущего Ordo WIP, не изменяя продуктовый код, schema, runtime или staging/production.

Этот RFC не авторизует product implementation. Любая реализация feature или исправление WIP требует отдельного owner-approved scope.

## Границы

### Внутри

- read-only preflight baseline `HEAD` и worktree status;
- exact allowlist backup 17 modified tracked и 11 untracked source/SQL файлов;
- `git diff --binary HEAD -- <exact 17 pathspec>` относительно `HEAD`, где exact pathspec содержит только allowlisted modified tracked paths (17), перечисленные ниже; deleted docs представлены только status metadata, никогда не входят в content diff;
- external temp backup с manifest, checksums и status snapshots;
- partial-to-final atomic finalization;
- path traversal, absolute path и reparse-point protection;
- последовательные redacted `pnpm` gate commands;
- создание ровно трёх governance-файлов.

### Снаружи

- approved external temp storage используется только как offline recovery artifact;
- product, schema, database, runtime, staging и prod не изменяются;
- Git index, commits, branches, remotes и push не изменяются.

### Не входит

- исправление failed `pnpm` gate;
- product feature или bugfix;
- code, test, config, lockfile, migration, Supabase или RLS changes;
- восстановление удалённых документов;
- доступ к production;
- любые destructive Git operations.

## Cross-links

- ADR: `docs/adr/020-governance-and-safe-baseline-recovery.md`
- Task: `docs/tasks/task-002-governance-and-safe-baseline-recovery.md`

Первичное pre-governance evidence существует в run `20260924T190127853Z-748eab5d`: manifest `createdAtUtc` — `2026-09-24T19:02:24Z`, а его `status-before.txt` содержит 65 исходных status entries metadata без governance-файлов. Этот ранний run superseded и недействителен для content-diff acceptance из-за unscoped pre-governance diff; его diff запрещён к использованию. Authoritative sanitized backup — новый более поздний post-remediation artifact. Из раннего backup разрешено переиспользовать только safe metadata-only `status-before.txt`; old diff и denied content не копируются.

## Backup contract

### Вход

Вход backup состоит из:

1. exact allowlist 17 modified tracked paths;
2. exact allowlist 11 untracked source/SQL paths;
3. `git diff --binary HEAD -- <exact 17 pathspec>` относительно текущего `HEAD`; exact pathspec разрешает только 17 allowlisted modified tracked paths, перечисленных ниже. Deleted docs represented only by status metadata, not content, and are never read or copied;
4. pre-governance status-before, скопированный только из safe metadata раннего run и содержащий ровно 65 baseline entries без governance-файлов.

Exact path lists приведены в Task-002. Они являются allowlist, а не glob patterns.

### Allow paths: modified tracked WIP (17)

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

### Allow paths: untracked source/SQL WIP (11)

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

Следующие paths запрещены для чтения, копирования и изменения в этой задаче:

- `.env.local`
- `.env.example`
- `supabase/functions/resolve-tenant/env.json`
- `supabase/functions/resolve-tenant/deploy.json`
- `.kilo/**`
- generated, cache и dependency directories, включая build/cache outputs
- deleted tracked docs
- любой path вне двух allowlists и трёх governance target files

Дополнительные untracked `.kilo/kilo.jsonc` не входит в backup payload. Пути запрещённых файлов могут присутствовать в status evidence, но их содержимое не читается, не копируется и не логируется.

## Выход

Final backup directory содержит ровно следующий inventory из 34 regular files:

```text
manifest.json
gate-metadata.json
checksums.sha256
status-before.txt
status-after.txt
payload/git/working-tree-vs-head.diff
payload/tracked/<17 exact relative paths>
payload/untracked/<11 exact relative paths>
```

Inventory breakdown: 17 tracked raw copies + 11 untracked raw copies + 1 binary diff + 2 status snapshots + `gate-metadata.json` + `manifest.json` + `checksums.sha256` = 34 regular files. `checksums.sha256` содержит ровно 33 entries, покрывающих gate metadata, manifest, diff, оба status snapshot и все 28 raw copies; собственный checksum не включён. Exact final inventory:

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

Требования к output:

- raw copies сохраняют исходные bytes;
- `git diff --binary --output=<backup-relative-path> HEAD -- <exact 17 pathspec>` сохраняет tracked changes относительно `HEAD` только для exact allowlist 17 paths, включая binary diff fidelity; stored diff обязан быть byte-identical прямому Git-native output той же команды; deleted docs represented only by status metadata, not content;
- `status-before.txt` копируется только из safe metadata раннего pre-governance run, должен содержать ровно 65 исходных baseline entries и не должен содержать governance-файлы;
- `status-after.txt` фиксирует post-remediation status и может отличаться от before только exact тремя governance-файлами; после исключения этих трёх он должен совпасть с 65-entry baseline; равенство полного before/after не требуется;
- `manifest.json` описывает final scope и safety properties;
- `checksums.sha256` генерируется последним и покрывает `gate-metadata.json`, manifest, status snapshots, diff и все raw copies;
- checksum file не включает собственный checksum, чтобы избежать циклической фиксации;
- после checksums файлы backup не изменяются.

## Lifecycle и atomic finalization

1. Проверить external parent через `Test-Path` до создания directories.
2. Создать уникальный UTC run id для нового authoritative post-remediation backup.
3. Создать `<final>.partial`; final path не должен существовать.
4. Создавать и проверять payload только внутри partial.
5. Скопировать pre-governance `status-before.txt` только из safe metadata раннего run; подтвердить 65 entries и отсутствие governance-файлов. Старый unscoped diff не читать и не копировать.
6. Сверить source и copy SHA-256 для каждого raw copy.
7. Создать `status-after.txt`; подтвердить, что его delta от before равен exact трём governance-файлам, а status-after минус эти файлы совпадает с baseline.
8. Проверить manifest и сформировать `checksums.sha256` последней записью.
9. Проверить checksums в partial.
10. Атомарно переименовать partial в final на том же filesystem.
11. Повторно проверить checksums в final.

Partial никогда не считается валидым recovery point. При любой ошибке partial не удаляется автоматически; работа останавливается с явным сообщением. Автоматический cleanup запрещён.

## Path traversal и reparse protection

Перед созданием или копированием проверяются:

- path является exact allowlisted relative path;
- path не rooted и не содержит drive prefix;
- нет пустых, `.` или `..` segments;
- каждый существующий source parent/file не является symlink, junction или иным reparse point;
- external parent, backup directories и все backup artifacts не являются reparse points;
- внутри partial нет unexpected files или paths.

При обнаружении нарушения операция завершается ошибкой до atomic rename.

## Ограничения payload и manifest

- В payload и manifest не записываются абсолютные локальные пути.
- Manifest использует repository-relative и backup-relative descriptions.
- Если нужен operational reference на external root, он должен быть безопасным noncredential-like external path; предпочтителен относительный шаблон `<approved-external-temp>/ordo-governance-recovery/<UTC-run-id>`.
- Secret values, environment dumps и credential-like identifiers не записываются.

## Redacted gate evidence: plan и фактический execution

План gate sequence: команды должны выполняться строго последовательно и без параллельного запуска:

| Planned order | Command | Planned evidence |
|---:|---|---|
| 1 | `pnpm typecheck` | command, exit code, PASS/FAIL, duration |
| 2 | `pnpm lint` | command, exit code, PASS/FAIL, duration |
| 3 | `pnpm test` | command, exit code, PASS/FAIL, duration |

Фактически до stop была достигнута только первая команда. `gate-metadata.json` фиксирует prior recorded redacted evidence для `pnpm typecheck`: exit code 2, `FAIL`, duration 33561 ms; это evidence переносится из предыдущей записи, command не перезапускалась. `pnpm lint` и `pnpm test` — `NOT_RUN` после stop, поэтому их нельзя считать выполненными. Evidence не включает environment values, secrets, tokens, credentials или полные command environments.

## PM/SM conditions

- PASS означает только успешное завершение конкретной команды.
- FAIL означает **NO-GO/stop** после фиксации redacted evidence.
- На FAIL запрещено исправлять WIP в этой задаче.
- На FAIL нельзя расширять allowlist, менять scripts/package files или повторять gate после внесения скрытых fixes.
- Возобновление реализации допускается только отдельным owner-approved task с собственным scope и approval.

## Definition of Done

- [ ] Создан ровно один ADR-020, RFC-009 и Task-002.
- [ ] Первичное pre-governance evidence зафиксировано как run `20260924T190127853Z-748eab5d`, `createdAtUtc` `2026-09-24T19:02:24Z`; его safe status metadata переиспользована, unscoped diff помечен superseded/invalid и не используется.
- [ ] Authoritative sanitized backup является новым post-remediation artifact, а не ранним backup, созданным до документов.
- [ ] Backup прошёл partial-to-final atomic finalization.
- [ ] Checksums сформированы последними и повторно проверены.
- [ ] Path traversal, absolute path и reparse checks пройдены.
- [ ] Gate evidence redacted: typecheck prior recorded exit 2/FAIL/33561 ms; lint/test `NOT_RUN` после stop.
- [ ] Failed gate приводит к NO-GO/stop без fixes; acceptance не утверждает выполнение lint/test.
- [ ] Repo state отличается от baseline только тремя governance-файлами.
- [ ] `HEAD` неизменен, staged changes отсутствуют.
- [ ] Commit и push не выполнялись.
- [ ] Product implementation не выполнялась.
