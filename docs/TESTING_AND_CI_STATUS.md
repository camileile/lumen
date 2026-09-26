# Lumen — Testing and CI Status

## Scope

Phase 3 establishes automated regression coverage and Pull Request validation without changing the reliability-score methodology, authentication architecture, database schema, product layout, OpenRouter provider, or deployment process.

The suite grew from 14 backend domain tests to 68 automated test cases across the backend, frontend, and extension. All fixtures use fictitious `.invalid` identities and example URLs.

## Testing Strategy

The repository continues to use the Node.js built-in test runner. TypeScript tests are compiled with dedicated `tsconfig.test.json` files before execution. No Jest, Vitest, Supertest, Playwright, Cypress, browser DOM emulator, or redundant test framework was added.

- Domain behavior is tested as pure functions.
- API behavior is tested against a real Express server on an ephemeral loopback port.
- API persistence uses a disposable SQLite database per integration-test file.
- OpenRouter is intercepted at the `fetch` boundary and is never contacted.
- Extension scripts are loaded in an isolated Node `vm` context without Chrome APIs.
- Frontend tests target pure response mapping and the API helper rather than large component snapshots.

## Unit Tests

Backend unit coverage contains 22 cases:

- the existing score cases for empty, A/B/C/D, mixed values, rounding, clamping, normalization, latest-20 behavior, and thresholds;
- an explicit `rolling-weight-v1` method-version regression;
- deterministic history cases for no observations, one day, multiple observations on one day, multiple days, UTC midnight, gaps, exact seven-day boundaries, weekly average, invalid data, and the latest-20 window;
- source classification for exact hosts, `www`, uppercase, trailing dots, real subdomains, deceptive suffixes, and invalid/non-HTTP URLs.

These tests prevent restoration of the old A=100/B=70/C=30/D=10 history formula indirectly by asserting the canonical scores at domain and endpoint boundaries. They also assert that only real timestamp dates become history points.

## Integration Tests

The backend contains 28 API integration cases and 50 backend cases in total.

Authentication coverage:

- valid registration;
- invalid email;
- short password;
- mismatched confirmation;
- duplicate email;
- valid login;
- incorrect password;
- unknown user;
- missing, invalid, expired, and valid bearer tokens;
- safe `/auth/me` projection without password/hash/token fields.

`POST /analyze` coverage:

- missing authentication;
- missing, malformed, and unsupported URLs;
- successful provider classification and persistence;
- canonical score and `rolling-weight-v1` metadata;
- provider numeric score cannot replace the canonical score;
- network failure, HTTP failure, timeout-like abort, and malformed provider payload;
- exact-host local fallback and deceptive-domain regression.

`GET /history` coverage:

- missing authentication;
- empty, single, and multiple analyses;
- UTC dates, gaps, distribution, current score, weekly average, and latest-20 window;
- invalid categories are excluded;
- persisted inconsistent score values do not replace category-derived aggregates;
- no fabricated dates or sensitive authentication/user fields.

## Extension Tests

Eleven dependency-free JavaScript tests cover:

- score method version, weights, empty/homogeneous/mixed histories, rounding, finite values, latest-20 behavior, and thresholds;
- `bbc.com`, `www.bbc.com`, `news.bbc.com`, uppercase/trailing-dot input, invalid URLs, and unsupported protocols;
- `bbc.com.attacker.example` and `attacker-bbc.com` remain unknown rather than inheriting category A.

The substring-matching bug was fixed with exact-host-or-subdomain matching. Source lists were not changed. `domain-classifier.js` remains a dependency-free mirror of the backend classifier because the extension still has no build system.

## Frontend Tests

Seven tests cover the pure dashboard data boundary and API helper:

- empty history and “Not enough data yet”;
- `weeklyAverage: null`;
- valid score mapping;
- the API score is consumed directly instead of recalculated;
- distribution values are preserved;
- the “Automated estimate”/“Not a fact check” limitation copy;
- successful API JSON, API errors, and missing API configuration.

Large DOM snapshots and component-library dependencies were intentionally avoided. The existing loading state remains protected by lint, typecheck, and build but does not yet have a browser-level interaction test.

## Test Database Strategy

Each backend integration-test file creates a unique directory with `mkdtemp` under the operating system's temporary directory and uses a dedicated `test.db`. The current Prisma Client executes explicit `CREATE TABLE` statements matching the existing schema, because the repository's incomplete migration history cannot safely initialize a fresh database.

The test harness never references `prisma/dev.db`, never resets a developer database, and removes the temporary database and directory after the suite. This is test infrastructure only; it does not change the Prisma schema or create migration files.

## Provider Mocking

Integration tests configure a clearly fictitious OpenRouter base URL and API key. The harness intercepts `fetch` only for that test hostname while preserving native loopback HTTP requests to Express. Controlled responses cover success, malformed content, HTTP errors, network failures, and abort-style timeouts. No real OpenRouter request or credential is used.

## Coverage

Coverage uses Node.js built-in experimental test coverage and has no additional dependency or arbitrary global threshold.

| Scope | Lines | Branches | Functions |
| --- | ---: | ---: | ---: |
| Backend tested application modules | 96.59% | 81.73% | 91.67% |
| Frontend `api` and `dashboardData` modules | 100.00% | 80.65% | 83.33% |

The extension suite currently reports pass/fail without a committed coverage threshold. Coverage is used as evidence for critical modules, not as a target for inflating test counts.

## GitHub Actions

`.github/workflows/ci.yml` runs on Pull Requests targeting `main` with cancellation of superseded runs.

- **Frontend:** Node setup/cache, clean install, lint, typecheck, tests, build, and npm audit.
- **Backend:** Node setup/cache, clean install, Prisma Client generation, lint, typecheck, tests, build, and the explicit audit policy.
- **Extension:** manifest parse, syntax validation for every JavaScript file, logic tests, and verification that the downloadable ZIP matches all runtime source files.
- **Secret scan:** full PR history checkout and Gitleaks scan of the Pull Request commits.

The workflow performs no deployment, merge, migration, or write to a production service.

## Security Checks

- Frontend runs `npm audit --audit-level=high`; its validated tree reports zero known vulnerabilities.
- Backend runs `npm run audit:ci`. The script parses `npm audit --json`, allows only `prisma`, `@prisma/config`, and `deepmerge-ts` when they resolve exclusively to `GHSA-ggr8-5vv4-36mx`, and fails for any other vulnerable package or advisory.
- Gitleaks v3 is pinned to a specific action commit and uses only the GitHub-provided token. No external scanning token or paid service is required for this personal repository.
- There is no `|| true` or equivalent suppression in a security check.

## CI Environment

- Node.js: 22.23.2
- npm: 10.9.8 from the pinned Node distribution
- Runner: GitHub-hosted Ubuntu
- Database: temporary SQLite per integration-test file
- JWT: `test-only-secret-do-not-use-in-production`
- OpenRouter: fully mocked test hostname and placeholder key

CI does not depend on real repository or deployment secrets.

## Known Exceptions

The backend currently reports exactly three high-severity vulnerable packages in one Prisma tooling/configuration chain:

`prisma -> @prisma/config -> deepmerge-ts -> GHSA-ggr8-5vv4-36mx`

Prisma 6.19.3 has no compatible fixed 6.x release, and a major upgrade remains out of scope. The policy is deliberately advisory-specific rather than a blanket package or severity suppression. A newly reported package or a different advisory fails the job.

The local workspace had active development servers holding Prisma's Windows DLL open, so direct `npm ci` could not replace the working `node_modules`. Final clean validation was therefore performed from a temporary copy that excluded all existing dependency directories. The running user processes were not interrupted.

## Branch Protection Recommendations

See `docs/CI_AND_BRANCH_PROTECTION.md`. No repository setting was modified automatically.

## Deferred E2E Work

A browser E2E stack was not added. Playwright or Cypress would add browser downloads, process orchestration, and a second style of test infrastructure for one flow while the database migration history is still incomplete.

The proposed later E2E path is: register with a disposable account -> establish session -> open dashboard -> confirm the empty-history state -> analyze through a fully stubbed provider -> confirm persisted history. It should be introduced after the clean database initialization path is repaired.
