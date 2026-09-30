# ADR-020: Governance and Safe Baseline Recovery

## Статус

**Принято**

Решение принято на основе явного разрешения владельца от 2026-09-24. Документ фиксирует только правила безопасного восстановления текущего WIP и не авторизует реализацию продуктовых функций.

## Контекст

Рабочее дерево содержит согласованный WIP, который нельзя потерять: 17 изменённых tracked-файлов и 11 новых source/SQL-файлов. Одновременно в рабочем дереве присутствуют удалённые документы и дополнительные untracked-файлы, не входящие в backup allowlist. В репозитории также находятся потенциально чувствительные runtime-файлы.

Хронология recovery двойственная и фиксируется явно. Первичное pre-governance evidence существует в run `20260924T190127853Z-748eab5d`: его manifest имеет `createdAtUtc` `2026-09-24T19:02:24Z`, а `status-before.txt` безопасно содержит только 65 исходных status entries metadata и не содержит governance-файлов. Этот ранний run superseded и недействителен для content-diff acceptance: его unscoped diff был создан до governance-файлов и запрещён к использованию; из него разрешено переиспользовать только safe metadata-only `status-before.txt`. Authoritative sanitized backup является отдельным, более поздним post-remediation artifact и создаётся заново; утверждать, что финальный backup сам был создан до governance-документов, нельзя.

Прямое восстановление через `reset`, `clean`, `checkout`, `restore`, `stash`, `rebase` или `merge` недопустимо: эти операции могут уничтожить несвязанный WIP или изменить его границы. Проверки `pnpm` также не должны превращаться в разрешение на исправление WIP в рамках governance-задачи.

## Решение

### 1. Governance-only scope

Разрешено создать внутри репозитория ровно три новых файла:

- `docs/adr/020-governance-and-safe-baseline-recovery.md`
- `docs/rfc/rfc-009-governance-and-safe-baseline-recovery.md`
- `docs/tasks/task-002-governance-and-safe-baseline-recovery.md`

Любая другая repository change запрещена. Решение не авторизует product implementation, изменение архитектуры, модели данных, runtime, инфраструктуры или продуктовой политики.

### 2. Безопасный backup WIP

До создания документов выполняется pre-governance preflight и сохраняется первичное evidence; затем создаются governance-документы; после этого формируется новый authoritative post-remediation sanitized backup во внешнем approved temp storage в структуре `<approved-external-temp>/ordo-governance-recovery/<UTC-run-id>/`. В manifest нового backup указывается chronology первичного run `20260924T190127853Z-748eab5d` и `createdAtUtc` `2026-09-24T19:02:24Z`; первичный run помечается superseded/invalid для unscoped diff, а его safe metadata-only `status-before.txt` копируется в новый backup. Старый diff и любое denied content не копируются и не используются.

Backup использует только следующие allowlists:

- 17 modified tracked source/config/SQL путей, зафиксированных в Task-002;
- 11 exact untracked source/SQL путей, зафиксированных в Task-002.

Backup обязан содержать ровно 34 regular files (33 файла, покрытых checksum manifest, плюс сам `checksums.sha256`):

- 17 raw byte-preserving копий modified tracked файлов;
- 11 raw byte-preserving копий exact untracked source/SQL файлов;
- `payload/git/working-tree-vs-head.diff`, созданный Git-native командой `git diff --binary --output=<path> HEAD -- <exact 17 pathspec>` и byte-identical прямому выводу той же команды; где exact pathspec состоит только из 17 allowlisted modified tracked paths:
  ```text
  packages/application/src/import-export/index.test.ts packages/application/src/import-export/index.ts packages/domain/src/import-export/index.ts packages/infrastructure/src/excel/index.test.ts packages/infrastructure/src/supabase/repositories/academic.ts packages/infrastructure/src/supabase/repositories/analytics.ts packages/infrastructure/src/supabase/repositories/audit.ts packages/infrastructure/src/supabase/repositories/identity.ts packages/infrastructure/src/supabase/repositories/import-export.ts packages/infrastructure/src/supabase/repositories/publication.ts packages/infrastructure/src/supabase/repositories/resources.ts packages/infrastructure/src/supabase/repositories/scheduling.ts packages/ui/package.json packages/ui/src/index.ts pnpm-lock.yaml supabase/config.toml supabase/migrations/001_import_export.sql
  ```
- `status-before.txt`;
- `status-after.txt`;
- `gate-metadata.json`;
- `manifest.json`;
- `checksums.sha256`.

Итого: 28 raw copies + 1 diff + 2 status snapshots + `gate-metadata.json` + `manifest.json` + `checksums.sha256` = 34 regular files; `checksums.sha256` содержит ровно 33 строки и не хеширует сам себя. Exact final inventory:

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

Generated/cache/dependency directories, secret files и runtime deployment files в backup не включаются. Deleted docs represented only by status metadata, not content; deleted tracked docs are never read, copied, or included in the diff.

### 3. Atomic finalization

Backup сначала создаётся только в `<final>.partial`. Partial не считается валидым backup. После проверки path safety, source/copy checksums, точного status baseline/delta и полноты артефактов backup атомарно переименовывается в final directory на том же volume. Pre-governance `status-before.txt` обязан содержать ровно 65 исходных baseline entries и не содержать governance-файлы. Post-remediation `status-after.txt` может отличаться только этими exact тремя governance-файлами; после их исключения он обязан совпасть с 65-entry baseline.

Если любая проверка не пройдена, partial не удаляется автоматически. Исполнитель останавливается и сообщает путь к сохранённому partial. Final directory считается валидным только после успешного atomic rename и повторной проверки checksums.

`manifest.json` и `checksums.sha256` описывают финальное состояние backup. `checksums.sha256` формируется последним и покрывает все остальные regular files, включая manifest. После генерации checksums содержимое backup не изменяется.

### 4. Path safety

Разрешены только relative paths. Запрещаются:

- absolute paths;
- drive-qualified paths;
- пустые path segments;
- `.` и `..` segments;
- path traversal;
- symlink, junction и иные reparse points в source или backup path chains;
- неожиданные файлы или директории внутри backup.

В `payload` и `manifest.json` не записываются абсолютные локальные пути. Backup root описывается относительной безопасной структурой либо отдельным неcredential-like external root, если это необходимо для эксплуатации.

### 5. Planned gate sequence и фактически достигнутый gate

Планировалась строгая последовательность:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`

Фактический execution record, достигнутый до stop, содержит только `pnpm typecheck`: prior recorded redacted evidence — exit code 2, `FAIL`, duration 33561 ms. Эта длительность переносится из предыдущего redacted evidence и не получена повторным запуском. `pnpm lint` и `pnpm test` имеют `NOT_RUN` после stop; утверждать, что они выполнялись, нельзя. Для каждой gate record хранится только redacted evidence: command, exit code, `PASS`/`FAIL`/`NOT_RUN`, duration при наличии и причина `NOT_RUN`. Environment values, секреты, credentials, tokens и полные environment dumps не записываются.

### 6. PM/SM stop condition

Red gate означает одновременно:

- evidence фиксируется в redacted виде;
- baseline получает статус **NO-GO**;
- работа останавливается после фиксации evidence.

Исполнитель не исправляет WIP, не меняет код, конфигурацию, зависимости, migrations или Supabase, чтобы добиться зелёного gate в этой задаче. Любая неуспешная команда требует отдельного owner-approved task.

## Allow/deny paths

### Allow

Repository changes разрешены только для трёх governance-файлов, перечисленных в Decision 1. Backup-копирование разрешено только для exact allowlists Task-002 во внешнем approved temp storage.

### Deny

Запрещено изменять или backup-ить:

- существующие deleted docs;
- любые tracked code, tests, configs, lockfiles или migrations;
- `.env.local`, `.env.example`;
- `supabase/functions/resolve-tenant/env.json`;
- `supabase/functions/resolve-tenant/deploy.json`;
- `.kilo/**`;
- generated, cache и dependency directories;
- любые paths вне трёх governance-файлов и точных backup allowlists.

## Запрещённые операции

В рамках решения запрещены:

- schema, migration, RLS или database changes;
- product, domain, application, infrastructure или UI changes;
- runtime configuration changes;
- staging или production access/changes;
- `git add`, `git commit`, `git push`, PR creation;
- destructive Git: `reset`, `clean`, `checkout`, `restore`, `stash`, `rebase`, `merge`;
- force push и любые операции, скрывающие либо расширяющие исходный WIP.

## Последствия

- Текущий WIP получает проверяемую внешнюю точку восстановления без использования destructive Git.
- Governance boundary становится проверяемой и не позволяет расширить задачу до product implementation.
- Failed gate остаётся однозначным NO-GO signal, а не поводом для скрытого исправления WIP.

## Альтернативы

- **Оставить WIP без backup:** отклонено из-за риска необратимой потери.
- **Использовать stash/reset/clean:** отклонено из-за возможного уничтожения несвязанных изменений.
- **Копировать весь worktree:** отклонено из-за риска включения secrets, runtime и generated files.
- **Исправлять gate failures в этой задаче:** отклонено из-за размывания scope и запрета несанкционированной product implementation.

## Связанные документы

- RFC: `docs/rfc/rfc-009-governance-and-safe-baseline-recovery.md`
- Task: `docs/tasks/task-002-governance-and-safe-baseline-recovery.md`
