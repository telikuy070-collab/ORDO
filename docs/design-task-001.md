# Design Document: Task-001 Monorepo Setup

## 1. File-by-file Scope

### Root Configuration Files
| File | Purpose | Source |
|------|---------|--------|
| `pnpm-workspace.yaml` | Workspace definition | ADR-001 |
| `package.json` | Root scripts, dependencies | ADR-001, ADR-009 |
| `turbo.json` | Turborepo pipeline config | ADR-009 |
| `tsconfig.json` | Base TypeScript config | AGENTS.md §5 |
| `.gitignore` | Git ignore rules | AGENTS.md §7 |
| `.env.example` | Environment variables template | AGENTS.md §5 |

### Package: `packages/config` (Shared Tooling)
| File | Purpose |
|------|---------|
| `package.json` | Config package metadata |
| `eslint.config.js` | Shared ESLint config (flat config) |
| `prettier.config.js` | Shared Prettier config |
| `tsconfig.base.json` | Base TSConfig for all packages |
| `tsconfig.node.json` | TSConfig for Node/Config files |
| `tsconfig.react.json` | TSConfig for React apps |

### Package: `packages/types` (Shared DTOs)
| File | Purpose |
|------|---------|
| `package.json` | Types package metadata |
| `src/index.ts` | Barrel export |
| `src/dto/` | Shared DTO types |

### Package: `packages/domain` (Pure Domain Logic)
| File | Purpose |
|------|---------|
| `package.json` | Domain package metadata |
| `src/index.ts` | Barrel export |
| `src/identity/` | Identity module (entities, value-objects, errors, events) |
| `src/academic/` | Academic module |
| `src/resources/` | Resources module |
| `src/scheduling/` | Scheduling module |
| `src/publication/` | Publication module |
| `src/import-export/` | ImportExport module |
| `src/analytics/` | Analytics module |
| `src/audit/` | Audit module |

### Package: `packages/application` (Use-cases & Ports)
| File | Purpose |
|------|---------|
| `package.json` | Application package metadata |
| `src/index.ts` | Barrel export |
| `src/identity/` | Identity use-cases, ports, DTO |
| `src/academic/` | Academic use-cases, ports, DTO |
| `src/resources/` | Resources use-cases, ports, DTO |
| `src/scheduling/` | Scheduling use-cases, ports, DTO |
| `src/publication/` | Publication use-cases, ports, DTO |
| `src/import-export/` | ImportExport use-cases, ports, DTO |
| `src/analytics/` | Analytics use-cases, ports, DTO |
| `src/audit/` | Audit use-cases, ports, DTO |

### Package: `packages/infrastructure` (Supabase, Excel)
| File | Purpose |
|------|---------|
| `package.json` | Infrastructure package metadata |
| `src/index.ts` | Barrel export |
| `src/supabase/` | Supabase client, repositories |
| `src/excel/` | SheetJS parser/generator |

### Package: `packages/ui` (Design System)
| File | Purpose |
|------|---------|
| `package.json` | UI package metadata |
| `src/index.ts` | Barrel export |
| `src/components/` | Radix-based components |
| `src/theme/` | Tailwind theme config |

### App: `apps/workspace` (Staff PWA)
| File | Purpose |
|------|---------|
| `package.json` | Workspace app metadata |
| `vite.config.ts` | Vite config with PWA plugin |
| `tsconfig.json` | Extends `packages/config/tsconfig.react.json` |
| `index.html` | Entry HTML |
| `src/main.tsx` | App entry point |
| `src/App.tsx` | Root component |
| `src/routes/` | TanStack Router routes |
| `src/providers/` | Query, Auth providers |

### App: `apps/student` (Student PWA)
| File | Purpose |
|------|---------|
| `package.json` | Student app metadata |
| `vite.config.ts` | Vite config with PWA plugin |
| `tsconfig.json` | Extends `packages/config/tsconfig.react.json` |
| `index.html` | Entry HTML |
| `src/main.tsx` | App entry point |
| `src/App.tsx` | Root component |
| `src/routes/` | TanStack Router routes |

### Supabase Structure
| Directory | Purpose |
|-----------|---------|
| `supabase/migrations/` | SQL migrations |
| `supabase/functions/` | Edge Functions (Deno) |
| `supabase/seed/` | Test data |

---

## 2. Interfaces

### Root `package.json` Scripts
```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "db:push": "turbo run db:push",
    "db:generate": "turbo run db:generate",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\""
  }
}
```

### `turbo.json` Pipeline
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"]
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": [],
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "db:push": {
      "dependsOn": []
    },
    "db:generate": {
      "dependsOn": []
    }
  },
  "globalDependencies": [".env*"]
}
```

### `tsconfig.json` (Root)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@ordo/domain": ["packages/domain/src"],
      "@ordo/application": ["packages/application/src"],
      "@ordo/infrastructure": ["packages/infrastructure/src"],
      "@ordo/ui": ["packages/ui/src"],
      "@ordo/types": ["packages/types/src"],
      "@ordo/config": ["packages/config"]
    }
  },
  "exclude": ["node_modules", "dist", "build"]
}
```

### Package `tsconfig.json` Pattern
```json
{
  "extends": "@ordo/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 3. Invariants

### Clean Architecture (MUST ENFORCE)
1. **Domain** → Zero external dependencies
   - ❌ No `@supabase/*`, `react`, `fs`, `node:*`
   - ❌ No `infrastructure`, `application`, `presentation` imports
2. **Application** → Only `domain`
   - ❌ No `infrastructure`, `presentation` imports
3. **Infrastructure** → `domain`, `application`
   - ❌ No `presentation` imports
4. **Presentation** (apps) → `application` via DTO only
   - ❌ No direct `infrastructure` imports

### Module Isolation
- Modules don't know about each other
- Communication only through `application` ports

### Code Quality
- TypeScript strict mode everywhere
- No `any` (except justified with comment)
- No `TODO` in code
- No commented code
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

### Git Rules
- One commit = one task
- Push directly to `main` (MVP)
- No `git push --force` to `main`
- No `.github/workflows/`
- No Husky, lint-staged, pre-commit hooks

---

## 4. Failure Modes

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Circular dependency | `pnpm typecheck` fails, Turbo cache miss | Fix import direction, enforce via ESLint |
| Domain imports infrastructure | ESLint rule `no-restricted-imports` | Move code to application layer |
| Build fails | `pnpm build` non-zero exit | Fix TypeScript errors, check exports |
| Lint fails | `pnpm lint` non-zero exit | Fix ESLint errors, run `pnpm format` |
| Test fails | `pnpm test` non-zero exit | Fix failing tests, ensure ≥80% domain coverage |
| Typecheck fails | `pnpm typecheck` non-zero exit | Fix TypeScript errors, check strict mode |
| Turbo cache corruption | Inconsistent builds | `turbo clean` and rebuild |
| pnpm install fails | Lockfile mismatch | `pnpm install --frozen-lockfile` |

---

## 5. Implementation Order

### Phase 1: Root Configuration (Foundation)
1. `pnpm-workspace.yaml`
2. `package.json` (root)
3. `turbo.json`
4. `tsconfig.json` (root)
5. `.gitignore`
6. `.env.example`

### Phase 2: Shared Config Package
7. `packages/config/package.json`
8. `packages/config/eslint.config.js`
9. `packages/config/prettier.config.js`
10. `packages/config/tsconfig.base.json`
11. `packages/config/tsconfig.node.json`
12. `packages/config/tsconfig.react.json`

### Phase 3: Core Packages (Dependency Order)
13. `packages/types/package.json` + `src/index.ts`
14. `packages/domain/package.json` + module structure
15. `packages/application/package.json` + module structure
16. `packages/infrastructure/package.json` + structure
17. `packages/ui/package.json` + structure

### Phase 4: Apps
18. `apps/workspace/package.json` + Vite + React + PWA
19. `apps/student/package.json` + Vite + React + PWA

### Phase 5: Supabase Structure
20. `supabase/migrations/` (empty, .gitkeep)
21. `supabase/functions/` (empty, .gitkeep)
22. `supabase/seed/` (empty, .gitkeep)

### Phase 6: Verification
23. `pnpm install`
24. `pnpm build`
25. `pnpm lint`
26. `pnpm typecheck`
27. `pnpm test`

---

## 6. Verification Steps

### After Each Phase
```bash
# Phase 1-2: Config packages
pnpm --filter @ordo/config build
pnpm --filter @ordo/config lint
pnpm --filter @ordo/config typecheck

# Phase 3: Core packages
pnpm --filter @ordo/types build
pnpm --filter @ordo/domain build
pnpm --filter @ordo/application build
pnpm --filter @ordo/infrastructure build
pnpm --filter @ordo/ui build

# Phase 4: Apps
pnpm --filter workspace build
pnpm --filter student build

# Phase 6: Full verification
pnpm install
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

### Success Criteria
- All commands exit with code 0
- No TypeScript errors
- No ESLint errors
- All tests pass
- Domain coverage ≥80%
- `pnpm dev` starts both apps without errors

---

## 7. Scope Boundary

**IN SCOPE**: Monorepo scaffolding, tooling, package structure, build pipeline
**OUT OF SCOPE**: Domain logic, Supabase setup, PWA features, Auth, UI components, Edge Functions, Deployment