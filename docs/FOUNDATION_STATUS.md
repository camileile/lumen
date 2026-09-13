# Lumen — Foundation Status

Date: 2026-09-12
Scope: Phase 1 — Foundation / Reproducible Development Environment

## Runtime contract

- Node.js: 22.23.2 LTS, pinned in `.nvmrc`
- npm: 10.9.8, declared in each Node application's `packageManager`
- Enforced major versions: Node 22 and npm 10 through `engines` and each application's `.npmrc`

Node 22 was selected because all current applications support it and the Prisma 6.19 SQLite adapter's native dependency installs from a prebuilt binary on the validated Windows environment. Node 24 would require a local C++ build toolchain for that dependency.

## Dependency corrections

The backend now declares every package required by its source and scripts:

- Runtime: `express`
- Development: `typescript`, `ts-node-dev`, `@types/express`, compatible `@types/node`, ESLint, and TypeScript ESLint support

Prisma packages were aligned without a major upgrade:

| Package | Before | After |
| --- | --- | --- |
| `prisma` | `^6.19.2` in `dependencies` | `6.19.3` in `devDependencies` |
| `@prisma/client` | `^6.19.2` | `6.19.3` |
| `@prisma/adapter-better-sqlite3` | `^7.4.1` | `6.19.3` |
| `better-sqlite3` | `^12.6.2` | `^11.10.0`, compatible with the Prisma 6 adapter |

No schema migration, database reset, or migration-history rewrite was performed.

## Available scripts

Frontend and backend both provide:

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

The backend also provides `npm run prisma:generate`; generation runs automatically before typecheck and build. No placeholder `test` script was added because the repository still has no automated tests.

## Environment and local ports

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`
- Extension backend target: `http://localhost:3000`

The backend CORS origin is configurable through `CORS_ORIGIN`, with the frontend's local origin as its default. Canonical placeholder-only examples now live at:

- `lumen-backend/.env.example`
- `lumen-web/.env.example`

## Clean validation

Validation was run using Node 22.23.2/npm 10.9.8 in an isolated copy containing only tracked and intentionally untracked project files. Ignored local state—including `.env`, `.env.local`, SQLite databases, build outputs, and every `node_modules` directory—was excluded.

| Application | Command | Result |
| --- | --- | --- |
| Frontend | `npm ci` | PASS |
| Frontend | `npm run lint` | PASS with 9 existing `<img>` optimization warnings |
| Frontend | `npm run typecheck` | PASS |
| Frontend | `npm run build` | PASS |
| Backend | `npm ci` | PASS with deprecated transitive-package warnings |
| Backend | `npm run lint` | PASS |
| Backend | `npm run typecheck` | PASS |
| Backend | `npm run build` | PASS |
| Extension | Parse `manifest.json` | PASS |
| Extension | `node --check` for all JavaScript files | PASS |

## Remaining work outside this phase

- No unit, integration, or end-to-end tests exist; test coverage remains a later phase.
- The frontend still reports nine `@next/next/no-img-element` warnings. Resolving them can affect image delivery and was intentionally deferred from this non-visual PR.
- `npm audit` reports 12 frontend findings (including a direct critical advisory for the pinned Next.js version) and 3 high backend findings in the Prisma CLI chain. Dependency remediation needs a focused PR with regression testing; no forced or broad upgrade was applied here.
- `ts-node-dev` is the existing development runner and brings deprecated transitive packages. Replacing the runner was not required for reproducible builds and remains separate work.
- Prisma migration history remains incomplete. This phase did not create, delete, or reconcile migrations or user databases.
- There are still no CI checks; a minimal pull-request pipeline remains part of the later production-readiness work.
