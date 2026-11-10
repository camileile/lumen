# Lumen — Data Foundation Status

## Scope

Phase 7 repairs the executable Prisma migration chain, adds the indexes required by the current query patterns, bounds history reads, enforces case-insensitive email uniqueness at the database boundary, and makes integration tests use real migrations. It does not migrate the production database engine, change the data model, alter authentication behavior, or modify `rolling-weight-v1`.

## Previous State

The previous migration directory did not represent the current schema. Replaying it attempted to add required `Analysis` columns without values and removed `User.name`, even though the current Prisma schema requires that field. Existing development databases also had no `_prisma_migrations` table, so Prisma could not establish provenance safely.

The API additionally loaded every analysis for score/history calculations, and email uniqueness was case-sensitive in SQLite even though application login treated email case-insensitively.

## Migration Baseline

The active chain now begins with `20261110170000_baseline_current_schema`, an exact baseline of the current `User` and `Analysis` tables. A second migration, `20261110171000_data_foundation_indexes`, adds data-foundation indexes without rebuilding either table.

The unsafe historical migration files were removed from the active chain. They remain recoverable from Git history and must not be replayed.

### New or empty database

Set `DATABASE_URL` to the intended empty SQLite database and run:

```bash
npm run prisma:migrate:deploy
```

### Existing current-schema database

Do not run the baseline directly against an existing database. The operator must:

1. stop all writers and make a restorable copy of the SQLite database, including any `-wal` and `-shm` files when present;
2. point `DATABASE_URL` at the copy first and run `npm run db:preflight`;
3. resolve every reported case-insensitive email collision deliberately before continuing;
4. verify that the existing columns and constraints match `prisma/schema.prisma`;
5. mark only the baseline as already applied:

   ```bash
   npx prisma migrate resolve --applied 20261110170000_baseline_current_schema --schema prisma/schema.prisma
   ```

6. run `npm run prisma:migrate:deploy` to apply the index migration;
7. run `npm run prisma:migrate:status` and application smoke tests;
8. repeat the reviewed procedure on the real database only after the copy succeeds.

`db:preflight` is read-only and reports only schema/migration presence and the number of case-insensitive collision groups. It does not print emails, hashes, URLs, or other user data.

No existing Lumen database was modified automatically in this phase.

## Indexes

- `User_email_nocase_key` enforces unique email values with SQLite `NOCASE` semantics.
- `Analysis_userId_createdAt_idx` supports recent per-user history and score reads.
- `Analysis_userId_url_createdAt_idx` supports the same-user duplicate-analysis lookup.

The original `User_email_key` remains because Prisma's `@unique` contract still generates it. Removing it would require a separate schema decision and provides little value at the current scale.

## Query Bounds

Canonical score calculation now asks the database for only the latest 19 valid prior categories before including the current observation. Invalid legacy categories are filtered in SQL, so they do not consume the 20-observation score window.

Dashboard history metrics use the latest valid observations with a configurable cap:

- default: 1000 observations;
- minimum accepted configuration: 20;
- hard maximum: 5000.

The `/history` response includes `historyWindow.maxObservations`, `returnedObservations`, and `truncated`. Recent item display remains limited to 50 rows. Truncation never fabricates dates or scores; it makes the retained window explicit.

## Email Integrity

Registration continues to normalize new emails to lowercase. Login uses the `NOCASE` index-compatible comparison instead of applying `lower()` to every stored value. The unique index closes the race between application-level duplicate checking and insertion; Prisma `P2002` is mapped to the existing safe `EMAIL_ALREADY_REGISTERED` response.

Existing databases with `User@example.invalid` and `user@example.invalid` cannot apply the index migration until an operator resolves that ambiguity. The migration fails closed and does not delete either account.

## Test Database Strategy

All backend API integration suites now create an isolated temporary SQLite file and run the committed migration chain before loading Prisma Client. They never use or reset `prisma/dev.db`.

Migration tests cover:

- complete deployment on an empty database;
- baseline adoption of an existing current-schema database while preserving fixture rows;
- enforcement of the new indexes and case-insensitive email uniqueness;
- safe failure when legacy case-variant accounts collide;
- indexed query plans with 2000 temporary observations for the history and duplicate-URL access patterns.

CI also deploys the migrations to its clean disposable SQLite database before lint, typecheck, tests, and build.

## Validation

The intended validation contract is:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run audit:ci
```

Frontend and extension validation remain unchanged because this phase changes only backend data infrastructure and documentation.

Final local results on Node.js 22.23.2/npm 10.9.8: backend clean install, Prisma generation, lint, typecheck, 95 tests, build, audit policy, and coverage all passed. Coverage was 95.94% lines, 87.25% branches, and 98.32% functions. Frontend clean install, lint, typecheck, 24 tests, build, and high-severity audit passed. Extension manifest parsing, JavaScript syntax, and 21 tests passed.

## Rollback and Recovery

SQLite/Prisma migrations are forward-only in this repository. Rollback means stopping writers, restoring the verified pre-migration database copy, and restoring the matching application version. Operators must not edit `_prisma_migrations`, drop indexes, or recreate tables manually in a live database.

## Residual Risks

- SQLite allows one writer at a time and is not yet approved for multi-instance production deployment.
- Existing databases require an operator-reviewed baseline; schema shape alone cannot prove historical provenance.
- History metrics deliberately cap observations, so very old observations fall outside the response when the cap is reached.
- `NOCASE` provides ASCII-oriented email comparison. Full internationalized-email policy remains undefined.
- Historical rows still do not record methodology/provider versions or evidence provenance.

## Deferred Data Work

- Decide whether SQLite remains local/prototype storage or is replaced by a managed relational database for production.
- Add cursor pagination if the product needs complete historical browsing rather than the current recent-items response.
- Design persistent per-device extension sessions and revocation only with a reviewed schema migration.
- Define retention, export, deletion, backup, restore, and disaster-recovery policies.
- Consider versioned analysis provenance fields in a separate product/data-model decision.
