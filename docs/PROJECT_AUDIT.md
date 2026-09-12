# Lumen — Technical Audit

Audit date: 2026-09-12

Audited revision: 79f6b8f (origin/main)

Audit branch: audit/project-health

Scope: repository structure, application flows, source code, Git history, security, privacy, reliability score, sensationalism classification, performance, UX, accessibility, SEO, dependencies, tests, CI/CD, and documentation.

This is a diagnostic report. No product behavior, scoring methodology, dependency version, database content, or deployment configuration was changed during this audit.

## 1. Executive Summary

Lumen is currently a small, tightly coupled prototype with three separately operated parts:

1. A Chrome Manifest V3 extension observes the active tab URL, performs a local domain-list classification, renders an overlay, and optionally sends the URL to the API.
2. An Express/TypeScript API authenticates users, sends URL and domain strings to OpenRouter, calculates a rolling user score, and persists analyses in SQLite through Prisma.
3. A Next.js dashboard authenticates in the browser, reads history from the API, and displays a score, distributions, charts, mock data, and unfinished actions.

The current implementation does **not** fetch or analyze article text. “Sensationalism” and “reliability” are inferred from the domain and, remotely, from an AI model that receives only the URL and domain. The product therefore cannot substantiate article-level claims about truthfulness, factual reliability, or sensationalist language.

Overall health: **not production-ready**.

The most urgent risks are:

- **CRITICAL — exposed credentials:** credential-like values are committed in lumen-backend/.env and lumen-backend/src/env.example and remain in Git history. The exposed OpenRouter key and JWT secret must be considered compromised and rotated outside this PR.
- **CRITICAL — personal data in Git:** lumen-backend/prisma/dev.db is committed and contains 5 user records and 987 analysis records. Its schema includes email, password hash, full URL, domain, summary, and user relationship.
- **CRITICAL — misleading analytics:** the API generates seven-day “history” and “weekly average” series by subtracting fixed numbers from the current score, not from actual dated observations (lumen-backend/src/controllers/history.controller.ts:73-94).
- **CRITICAL — vulnerable web runtime:** npm audit reports a critical vulnerability range affecting Next.js 16.1.6, plus three high and one moderate production dependency alerts.
- **HIGH — non-reproducible backend:** the backend imports Express and uses TypeScript/ts-node-dev, but none is declared in its package manifest/lockfile. A clean npm ci succeeds, then npm run build fails because tsc is unavailable.
- **HIGH — inconsistent score definitions:** extension/API scoring maps A/B/C/D through weights 3/1/-2/-5 over 20 observations, while the history API independently maps categories to 100/70/30/10 over 50 observations. Users can receive different “current” scores for the same history.
- **HIGH — privacy mismatch:** authenticated browsing sends full URLs to the API and OpenRouter and stores them indefinitely, while the landing page gives only a broad privacy assurance and provides no functioning privacy policy.
- **HIGH — unlimited costly operations:** registration, login, and AI analysis have no rate limiting; cache and rate-limit modules are empty.

Recommended strategy: secure data and credentials first; make builds reproducible; define one canonical score contract; replace fabricated history with real aggregation; introduce explicit uncertainty/privacy language; then add tests and CI before broader refactoring.

### Validation snapshot

| Area | Command | Result |
|---|---|---|
| Frontend install | npm ci | PASS; 381 packages installed; 12 total audit alerts |
| Frontend lint | npm run lint | FAIL; 8 explicit-any errors and 10 warnings (9 raw-image warnings and 1 unused suppression) |
| Frontend typecheck | npx tsc --noEmit | PASS |
| Frontend tests | package script inspection | NOT AVAILABLE; no test script |
| Frontend build | npm run build | PASS; five static routes generated, including not-found |
| Backend install | npm ci | PASS; 105 packages installed; 5 high audit alerts |
| Backend lint | package script inspection | NOT AVAILABLE; no lint script/configuration |
| Backend typecheck | repository TypeScript 5.9.3, tsc --noEmit | PASS, but only because undeclared root node_modules are present |
| Backend tests | package script inspection | NOT AVAILABLE; no test script |
| Backend build | npm run build after clean npm ci | FAIL; tsc is not declared/installed |
| Prisma schema | npx prisma validate | PASS |
| Prisma migrations | npx prisma migrate status | FAIL with schema-engine error; committed DB has no _prisma_migrations table |
| Extension syntax | node --check for all JavaScript; JSON parse for manifest | PASS |

Clean installs and builds were run from temporary copies made from the audited revision, excluding committed node_modules and secrets. This prevents the checked-in dependency trees from masking manifest problems or contaminating the audit branch.

## 2. Current Architecture

### Stack

| Concern | Current implementation |
|---|---|
| Repository shape | Ad hoc monorepo without root package.json, workspace configuration, or shared scripts |
| Web | Next.js 16.1.6 App Router, React 19.2.3, TypeScript 5.9.3, CSS Modules/global CSS |
| UI/data visualization | lucide-react 0.575.0, Recharts 3.7.0 |
| API | Express source in TypeScript; Express is not declared in backend package.json |
| Authentication | Email/password, bcrypt hashes, seven-day JWT bearer tokens |
| Validation | Zod on register/login only |
| AI | OpenRouter chat completions using the changing openrouter/free router |
| Database | SQLite file through Prisma Client 6.19.2 and better-sqlite3 adapter 7.x |
| Browser extension | Chrome Manifest V3, vanilla JavaScript/HTML/CSS, service worker, content script on all URLs |
| Package manager | npm; lockfileVersion 3 in web and backend |
| Runtime contract | No engines field, .nvmrc, or .node-version. Audit machine: Node 24.13.1/npm 11.8.0 |
| State | React local state and browser localStorage; chrome.storage.local in extension; SQLite in API |
| Routing | Next App Router for /, /login, /cadastro, /dashboard; Express routers for /auth, /analyze, /history, /debug |
| CI/CD/deploy | None found; no GitHub Actions, hosting config, Dockerfile, or infrastructure definition |

### Directory map

- lumen-extension: packaged browser extension and duplicated image assets.
- lumen-backend/src/ai: OpenRouter integration.
- lumen-backend/src/controllers: authentication, analysis, and history orchestration.
- lumen-backend/src/service: only auth.service.ts is implemented; cache, IA, and scraping files are empty.
- lumen-backend/src/middleware: auth, validation, generic errors; rateLimit.middleware.ts is empty.
- lumen-backend/prisma: schema, migrations, and a committed data-bearing development database.
- lumen-web/src/app: App Router pages, a 600+ line dashboard component, CSS, API helpers, types, mock data, and unused alternative dashboard/chart implementations.

### Runtime topology

- Browser tab → extension local classifier → immediate overlay/local history.
- Browser tab → extension service worker → authenticated POST /analyze → OpenRouter → SQLite.
- Dashboard → GET /auth/me and GET /history → SQLite → charts/history UI.

There is no backend-for-frontend, shared domain package, queue, cache, observability service, or content extraction pipeline. This simplicity is appropriate for a prototype, but the business rules are duplicated and disagree across runtimes.

### External services and configuration

- OpenRouter is the only implemented external API.
- NEXT_PUBLIC_API_URL configures browser-to-API requests.
- DATABASE_URL, JWT_SECRET, OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_SITE_URL, and OPENROUTER_APP_NAME configure the backend.
- The extension hard-codes http://localhost:3000 and permits only that host, so the packaged extension is not production-configurable.
- CORS hard-codes http://localhost:3001.
- No cloud storage, object storage, OAuth implementation, telemetry, email provider, or news/reputation API is implemented.

## 3. Main Application Flows

### Registration and login

1. /cadastro validates password equality in the UI and posts name, email, password, and confirmation to /auth/register.
2. Zod enforces name length 3, valid email, password length 6, and matching confirmation.
3. auth.service checks email uniqueness, hashes the password with bcrypt cost 10, inserts the user, and signs a seven-day JWT.
4. /login performs the equivalent login call and bcrypt comparison.
5. The frontend stores the bearer token in localStorage. The extension stores a copied bearer token in chrome.storage.local.

Fragility: no rate limits, no email normalization, no account recovery/verification, long-lived bearer tokens, and no secure cookie boundary.

### URL analysis from the extension

1. The extension listens to tab activation and URL/load updates.
2. It skips non-http-looking strings and suppresses only the globally last-seen URL.
3. The local classifier extracts the hostname, removes www, and matches a small hard-coded list with substring includes.
4. It assigns A/B/C/D and a weight of 3/1/-2/-5, appends it to a rolling local history of 20, then maps the average linearly to 0–100.
5. The overlay and icon update immediately.
6. If a token exists, POST /analyze sends the complete URL to the API.
7. The API gives OpenRouter only the URL and normalized domain. It does not scrape or read the page.
8. On AI error, the API repeats the hard-coded local domain classification.
9. The API recalculates a rolling score from the user’s last 19 stored categories plus the current category and persists the full URL, domain, category, global score, and summary.
10. The extension overwrites the local result with the remote result; failures are reduced to a console warning and the local result remains.

Strong coupling/duplication:

- Domain lists, classification rules, weights, score transformation, thresholds, and labels are duplicated between extension and API.
- The extension and API maintain independent histories; offline use or repeated analysis makes them diverge.
- API orchestration, AI fallback, score logic, persistence, and HTTP error mapping all live in analyze.controller.ts.
- The API accepts arbitrary URL schemes and lengths; the extension performs only a startsWith("http") check.

### Dashboard/history

1. The dashboard always checks for a token and redirects to login, even though its initial demo-state logic suggests an unauthenticated demo.
2. In demo mode, hard-coded mock values are shown.
3. In live mode, GET /history loads at most 50 recent analyses.
4. The API normalizes legacy labels, computes category distribution, then calculates a second score formula.
5. It fabricates two seven-point upward series from the single current score.
6. The page manually maps the response to DashboardData and displays score, distribution, trend, “weekly average,” and five latest URLs.

The alternative buildDashboardFromHistory implementation is unused. Charts.tsx and analyze.ts are also unused. Chart components are duplicated inside dashboard/page.tsx.

### Text/news analysis

No user-facing or backend flow accepts article text. The scraping service is empty. Claims about content-level analysis therefore exceed the implemented capability.

## 4. Critical Issues

| ID | Finding | Evidence | Impact | Recommended disposition |
|---|---|---|---|---|
| C-01 | Secrets committed and present in history | lumen-backend/.env; lumen-backend/src/env.example; commits repeatedly removed/re-added .env | Credential abuse, API cost, forged JWTs, account impersonation | Immediately revoke/rotate OpenRouter and JWT secrets; remove tracked secret files; coordinate history sanitation separately because rotation is the actual containment |
| C-02 | Data-bearing SQLite database committed | dev.db has 5 User and 987 Analysis rows; schema contains email, password hash and full URL | Personal browsing data/password hashes distributed to every clone; compliance and incident-response risk | Treat as a data incident; restrict repository access, determine affected people, remove DB from tracking, rotate user credentials if exposure warrants, define retention |
| C-03 | Fabricated time-series presented as real history | history.controller.ts:73-94 subtracts fixed values from baseScore | Misleads users into believing measured improvement occurred; undermines product trust | Remove or label unavailable until real date aggregation is implemented and tested |
| C-04 | Critical Next.js advisory range | npm audit on next@16.1.6 reports one critical production alert | Potential production compromise/DoS depending on enabled paths and hosting | Upgrade Next.js and matching eslint-config-next to a patched 16.3.x version in an isolated, tested security PR |

## 5. High Priority Issues

| ID | Finding | Consequence |
|---|---|---|
| H-01 | Backend clean build cannot run; Express, TypeScript, ts-node-dev and @types/express are undeclared | A fresh clone is not reproducible; deployment depends on accidental parent node_modules |
| H-02 | Prisma adapter is major 7 while Prisma Client/CLI are major 6 | Unsupported/inconsistent dependency graph and likely runtime/migration incompatibility |
| H-03 | Three distinct score definitions/representations exist | Overlay, persisted analysis, and dashboard can disagree; users cannot interpret the number |
| H-04 | Domain matching uses substring includes | Domains such as bbc.com.attacker.example can inherit a trusted classification; entire publishers are overgeneralized |
| H-05 | The AI sees only URL/domain and a changing free model, yet labels include “disinformation” | High false-positive/false-negative risk; outputs are non-reproducible and overclaim evidence |
| H-06 | No rate limiting on register, login, or /analyze | Brute force, account abuse, API exhaustion, and uncontrolled AI usage/cost |
| H-07 | /debug/whoami returns the full Prisma user object, including password hash | Any authenticated session can retrieve its stored password hash; endpoint should not exist in production |
| H-08 | Full URLs are stored and sent to a third party without minimization | Query strings/fragments can include search terms, document IDs, tokens, or other sensitive context |
| H-09 | Token bridge trusts LUMEN_CONNECT messages on every matched page | Any site can overwrite the extension’s stored bearer token, causing session fixation/identity confusion/denial of service |
| H-10 | SQLite DB has no Prisma migration history and migrate status fails; the latest migration cannot safely replay over existing Analysis rows and drops User.name while the current schema requires it | Schema provenance, data safety, and repeatable deployment are not reliable |
| H-11 | No automated tests for business/security-critical behavior | Scoring, authentication, fallback, and privacy regressions are undetected |

## 6. Medium Priority Issues

- M-01 — dashboard/page.tsx is over 600 lines and mixes authentication, persistence, API mapping, chart components, tour state, demo behavior, and presentation.
- M-02 — error handling leaks raw internal/upstream messages; analysis errors can be persisted into user-facing summaries.
- M-03 — OpenRouter response validation is permissive JSON parsing with any casts, silent parse catches, defaults, and no schema validation.
- M-04 — no retry policy, bounded concurrency, cache, usage quota, or circuit breaker for OpenRouter; only a 20-second timeout exists.
- M-05 — JWT verification does not pin algorithms, issuer, or audience; the secret is shared symmetric state and there is no revocation.
- M-06 — auth tokens in localStorage raise the impact of any same-origin XSS; no Content Security Policy or security headers are configured.
- M-07 — unknown domains default to B and a homogeneous B history maps to 75/100, which the UI renders green/healthy.
- M-08 — repeated manual “reanalyze” calls count the same URL as a new behavioral observation.
- M-09 — lastUrl is global across tabs, so identical URLs in different tabs and races between tabs can suppress or misapply state.
- M-10 — no database index supports Analysis(userId, createdAt), the main history/score query pattern.
- M-11 — all API calls disable caching; analysis results are never reused by normalized URL/domain.
- M-12 — the root layout is a client component only to inspect pathname, unnecessarily increasing client hydration scope.
- M-13 — responsive styles exist, but dashboard controls and dense cards rely on a large monolithic layout and horizontal overflow in places.
- M-14 — forms lack explicit label/input associations; password visibility buttons lack accessible names and state.
- M-15 — tutorial modal lacks dialog semantics, focus trap, focus restoration, and Escape behavior.
- M-16 — multiple controls and links are nonfunctional but appear actionable (Google auth, account, source verification, achievements, settings, export, newsletter, terms/privacy/contact/social links).
- M-17 — SEO metadata beyond a favicon is absent: no title/description export, Open Graph, canonical, robots, sitemap, or web manifest.
- M-18 — backend and Next both default to port 3000 while backend CORS expects the web app on 3001; the extension hard-codes the backend on 3000. Default startup/documentation therefore conflict and no production topology is defined.

## 7. Low Priority Issues

- L-01 — inconsistent naming/language (IA vs AI, Portuguese labels, English types, misspelled historical commit messages) increases maintenance friction.
- L-02 — magic numbers and strings are widespread: score weights, thresholds 70/40, window sizes 19/20/50, history offsets, timeout, token duration, bcrypt cost, storage keys, and domain lists.
- L-03 — empty placeholder modules create a false impression of implemented layers.
- L-04 — unused files: web lib/analyze.ts, lib/dashboard.ts, lib/Charts.tsx; empty backend service/util/middleware files; prisma.config.ts.bak.
- L-05 — avoidable any casts exist in both API and web; frontend ESLint reports seven explicit-any errors.
- L-06 — silent catches in JSON parsing/message delivery obscure diagnostics.
- L-07 — raw img usage produces six Next.js performance warnings in current lint output.
- L-08 — CSS and charts are duplicated; login/cadastro share nearly identical structure/styles.
- L-09 — no formatter is configured and import/indentation style is inconsistent.
- L-10 — comments describe prototype intent and future behavior in production UI/source rather than durable contracts.

## 8. Security Review

### Secrets and repository exposure

Two tracked files match credential patterns. Git history shows the environment file was added, removed, reverted, and recommitted. Deleting it in a new commit would not invalidate exposed credentials or remove historical copies. Rotation must precede or accompany repository cleanup planning. No secret values are reproduced in this report.

### Personal data and privacy

The committed database contains actual-looking user and browsing records. The application stores complete URLs, not merely origins. URL query parameters and paths can reveal sensitive interests or tokens. There is no consent record, retention/deletion workflow, privacy-policy page, export implementation, or third-party AI disclosure. The extension automatically processes navigation after connection.

### Authentication

- Positive: passwords are bcrypt-hashed and login uses a generic credential error.
- Risks: minimum password length is only six; no login/register throttling; seven-day JWT in localStorage; no secure cookie; no token revocation; no algorithm/issuer/audience pinning; committed signing secret.
- Debug endpoint returns the complete User row rather than a safe projection.
- Generic error middleware converts every Error to HTTP 400 and returns its message; controllers also return raw messages/stacks to logs.

### Input validation, XSS, SSRF, redirects, CORS, headers

- Register/login bodies use Zod. /analyze only checks truthiness and URL parsing; it has no Zod schema, protocol allowlist, maximum length, credential/query stripping, or IP/host policy.
- **Current SSRF status:** no direct SSRF fetch was found because the server does not fetch the submitted URL; it sends the string to OpenRouter. Risk becomes critical the moment the empty scraping service is implemented. Before that work, require http/https, DNS resolution checks, private/link-local/loopback blocking before and after redirects, response size/type limits, redirect limits, timeouts, and egress controls.
- React escapes rendered values. The extension uses innerHTML but applies escapeHtml to domain/category/mode/summary; the numeric score is coerced. No direct exploitable XSS was proven there.
- No open redirect was found.
- CORS allows only one hard-coded local origin. This is not permissive, but it is not deployable/configurable.
- No Helmet/CSP/HSTS/referrer/permissions policy is configured at the API/app level.
- The extension runs a content script on all URLs and exposes its image assets to all URLs; permissions should be reduced to the minimum needed.

### Dependency vulnerabilities

- Web production tree: 5 alerts (1 critical, 3 high, 1 moderate).
- Web full tree: 12 alerts (1 critical, 8 high, 2 moderate, 1 low).
- Backend production tree as currently declared: 5 high alerts, partly because Prisma CLI is incorrectly a production dependency.

## 9. Reliability Score Review

### Where it is calculated

- Extension local/behavioral score: lumen-extension/background.js:3-29 and 60-86.
- API persisted behavioral score: lumen-backend/src/controllers/analyze.controller.ts:7-68 and 104-117.
- Dashboard aggregate score: lumen-backend/src/controllers/history.controller.ts:43-71.
- Frontend status and unused alternative aggregates: dashboard/page.tsx and lib/dashboard.ts.

### Current methodology

The extension and analysis endpoint use categories A/B/C/D with weights:

| Category | Meaning in code | Weight | Score if every observation has this category |
|---|---|---:|---:|
| A | trusted/reference source | 3 | 100 |
| B | neutral/institutional/unknown | 1 | 75 |
| C | sensationalist/low editorial quality | -2 | 38 after rounding |
| D | disinformation | -5 | 0 |

For up to 20 visits: score = round(((averageWeight + 5) / 8) × 100), clamped to 0–100.

The dashboard history endpoint ignores persisted scores and calculates: (A×100 + B×70 + C×30 + D×10) / number of the latest 50 analyses. This gives D a nonzero score, B a different score, a different window, and no time weighting.

### Assessment

- Deterministic only after categories are fixed. AI category selection is nondeterministic because temperature is 0.2 and openrouter/free can route to changing models.
- AI-provided numeric score is parsed and returned from the integration but ignored by the behavioral calculation.
- Scores change with a user’s browsing history, yet UI language can be interpreted as a property of the current source.
- Hard-coded weights, window lengths, thresholds, and label lists have no citation, calibration dataset, documented rationale, version, or confidence interval.
- Unknown sources default to B/75 and green at the 70 threshold, creating unjustified optimism.
- Domain substring matching can be spoofed and does not distinguish subdomains, public suffixes, sections, authors, or individual articles.
- There is no model/rule version persisted with an analysis, so historical results cannot be reproduced after rules/models change.
- A 0–100 integer suggests precision unsupported by the evidence. The product should present bands, confidence/coverage, reasons, provenance, and “automated estimate” language without changing the underlying methodology in this audit PR.

## 10. Sensationalism Analysis Review

No article-level sensationalism algorithm exists.

- Local mode labels three whole domains as sensationalist; there are no lexical rules, headline features, punctuation/capitalization heuristics, content extraction, source citations, or language handling.
- AI mode prompts a model to classify source reliability into A/B/C/D but supplies only URL and domain. It does not provide title, article text, author, publication date, or corroborating sources.
- The prompt combines source reputation, editorial quality, sensationalism, and disinformation into one mutually exclusive category. These are different constructs.
- The selected model is a changing free router; modelUsed is not stored in Analysis, and prompt/rule versions are not stored.
- Parsed responses are not validated by Zod/JSON Schema, do not include evidence/confidence, and map unknown legacy labels silently to B.

Likely false positives: reputable outlets using dramatic headlines, opinion/satire, regional sections, user-generated pages on otherwise trusted domains, and all articles on a domain placed on the C/D list.

Likely false negatives: unknown clickbait/disinformation domains defaulting to B, spoofed domains containing trusted substrings, misleading content hosted on trusted platforms, and non-Portuguese/context-dependent rhetoric.

The interface does not clearly say the result is automated, uncertain, based primarily on the source domain, and not a fact check. Labels such as “Desinformação,” “Confiável,” “saudável,” and “Verificar fonte” are too categorical for the implemented evidence.

## 11. Performance Review

- Every distinct navigation can produce an AI request; there is no normalized URL/domain cache, debounce, per-user quota, or request coalescing.
- The 20-second AI timeout is the only remote resilience mechanism; no retries/backoff/circuit breaker are defined.
- Extension local processing provides a useful fast fallback, but shared lastUrl state is global across tabs and can suppress valid work or race.
- Frontend apiJson explicitly forces no-store and no-cache for every endpoint, including stable identity/history reads.
- Root layout is entirely client-side, increasing hydration for public static pages.
- Dashboard bundles Recharts and a large monolithic client component; unused chart implementations remain in source.
- Six lint warnings identify raw img usage; dashboard-preview.png is about 0.81 MiB. Responsive source images/modern formats are not configured.
- Duplicate GIFs exist in web and extension (roughly 0.65 MiB per copy set), plus a 0.23 MiB extension ZIP. The ZIP was verified to match current extension source exactly, so it is not stale.
- SQLite lacks a composite index for the history query and will not scale well for concurrent multi-instance production writes.
- API returns up to 50 complete analysis rows, including fields not all views need; no pagination exists.

## 12. UX and Accessibility Review

### UX/product trust

- Strengths: clear visual hierarchy, immediate local feedback, empty-state copy, responsive breakpoints, authentication error text, and visible demo badge.
- The dashboard defaults to demo state but still redirects users without a token; the intended demo experience is internally contradictory.
- Fake trend/history data is materially misleading.
- The same score is described as source reliability, consumption health, XP, weekly average, and behavioral evolution without separating those concepts.
- Remote failure silently leaves a local result; users see a mode label but no clear explanation of reduced evidence quality.
- Raw upstream failures can appear inside summaries.
- Loading is absent on login/register submit buttons; double submission is possible.
- Many visible actions do nothing, creating broken expectations.
- Full URLs are shown without privacy controls or deletion.
- The product needs an explicit statement that it provides automated signals, not truth/falsity determinations, and must show why a result was produced.

### Accessibility

- Positive: main landing headings are ordered reasonably; most interactive elements use button elements; some icon buttons have aria-label; images generally have alt text.
- Form labels have no htmlFor and inputs have no id/name/autocomplete attributes.
- Password visibility buttons lack accessible names and aria-pressed/expanded state.
- Error/status messages lack role=alert or aria-live.
- Tutorial overlay lacks role=dialog, aria-modal, labelled-by/described-by, focus trapping, initial focus, focus return, and Escape closing.
- Overlay tooltip is hover-only and draggable only by mouse; injected image has no alt and is not keyboard operable.
- Charts have no text/table alternative or accessible description.
- Several buttons have no behavior; keyboard users receive no feedback.
- Focus styles are inconsistent, and some inputs remove outlines before supplying only a visual box-shadow.
- Color conveys score/category heavily; textual letters help, but contrast has not been measured and must be tested against WCAG 2.2 AA.

### SEO

The public landing page is statically generated and has semantic headings, but no metadata export is possible from the client root layout. Only favicon.ico was found. Missing: descriptive title, meta description, canonical URL, Open Graph/Twitter data, robots.txt, sitemap, web manifest, and structured data. Placeholder # links also degrade crawlability and trust.

## 13. Dependencies

### Current findings

Frontend direct versions include Next 16.1.6, React 19.2.3, Recharts 3.7.0, lucide-react 0.575.0, ESLint 9, and TypeScript 5.9.3. npm outdated reports a patched Next 16.3.5 and matching eslint-config-next 16.3.5; Recharts 3.10.1 is available. Major updates exist for ESLint, lucide-react, and TypeScript and should not be automatic.

Backend direct versions include Prisma Client/CLI 6.19.2, Prisma SQLite adapter 7.4.x, better-sqlite3 12.6.2, bcrypt 6, JWT 9, dotenv 17, and Zod 4. npm reports patch/minor updates and major updates for Prisma/better-sqlite3. The 6.19.x adapter exists, so all Prisma packages can first be aligned on one 6.19.x line without a major migration.

### Update classification

| Class | Candidates | Guidance |
|---|---|---|
| Urgent security, tested | Next + eslint-config-next to a patched aligned 16.3.x; transitive audit fixes | Dedicated PR; rerun lint/typecheck/build and smoke tests |
| Safe-looking patch/minor, still test | Prisma Client/CLI/adapter aligned to 6.19.3; dotenv 17.4.x; Zod 4.6.x; better-sqlite3 12.11.x; Recharts 3.10.x; type patches | Update in small grouped PRs after CI exists |
| Potentially breaking | Prisma 7/8, better-sqlite3 13, ESLint 10, lucide-react 1.x, TypeScript 7, React 19.3 | Defer; read migration guides and test separately |

Other dependency hygiene:

- Move prisma CLI to devDependencies.
- Add direct runtime/dev dependencies actually imported/used by backend.
- Remove committed node_modules after a verified clean build.
- Web npm ls reports one extraneous installed package in the current local tree; npm ci cleans it.
- prebuild-install emits a deprecation warning through a native backend dependency.

## 14. Testing

Current automated coverage: **none found**. There is no unit, integration, E2E, extension test harness, coverage configuration, or test script in either package.

Highest-value tests, in order:

1. Exact-host domain classification tests, including deceptive suffixes/subdomains, uppercase/punycode, invalid URLs, non-http schemes, localhost/private IPs, credentials, redirects, and oversized input.
2. Canonical score tests: empty history; all A/B/C/D; mixed history; rounding; clamping; 20-item window; duplicate/reanalysis policy; invariants/property tests.
3. History aggregation tests using real timestamps; assert no fabricated points and consistency with the canonical score contract.
4. AI response contract tests: malformed JSON, wrong category, missing fields, out-of-range/NaN score, long summary, timeout, 429, 5xx, network failure, and deterministic fallback.
5. Auth integration tests: validation, duplicate email, normalization, login failures, expired/forged JWT, authorization boundaries, rate limits, and safe user projection.
6. API tests for /analyze, /history, and error/fallback semantics with OpenRouter mocked.
7. Extension tests for tab races, offline mode, token handshake origin/nonce validation, storage migrations, overlay escaping, and permission scope.
8. Frontend component tests for loading/error/empty/demo/live states and accessibility.
9. E2E happy path: register → connect extension → navigate → analyze → persisted history → dashboard.
10. Privacy regression tests ensuring URLs are minimized/redacted before persistence and third-party transfer.

## 15. CI/CD

No pipeline exists. Add a minimal GitHub Actions PR workflow only after manifests are reproducible:

1. Checkout.
2. Set up the supported Node LTS version with npm cache.
3. Run npm ci separately for web and backend.
4. Run lint for both (add backend ESLint first).
5. Run explicit typecheck scripts for both.
6. Run unit/integration tests with coverage thresholds focused on domain logic.
7. Run builds for both.
8. Run prisma validate and a migration test against a fresh disposable SQLite database.
9. Run npm audit with an agreed production severity policy and a secret scan.
10. Validate/pack the extension and compare the downloadable ZIP to source.

Do not add automatic production deployment yet. Require protected main, passing checks, pull-request review, and manual deployment approval first.

## 16. Git Repository Health

- Default branch is main and origin/HEAD points to it.
- Before audit work, main matched origin/main and the working tree was clean.
- Audit work is isolated on audit/project-health.
- History contains 21 commits, largely direct on main, with no evidence of feature-branch/PR discipline in the local graph.
- Several commits are extremely large because dependencies/generated content were committed: examples include roughly 2.0 million inserted lines, 785 thousand deleted lines, and 624 thousand inserted lines.
- 11,416 node_modules files are currently tracked: 5,536 at repository root and 5,880 under lumen-backend.
- lumen-backend/.env, prisma/dev.db, prisma.config.ts.bak, and the generated extension ZIP are tracked. The ZIP is intentionally distributable and matches source; the other three should not remain tracked.
- No root .gitignore or backend .gitignore exists. The web .gitignore correctly excludes web dependencies/build/env files only.
- Both package lockfiles exist and use lockfileVersion 3.
- The repository pack is approximately 127 MiB, dominated by historical native engines/dependency artifacts.
- Do not rewrite or force-push main as routine cleanup. First rotate secrets and remove sensitive/generated files from the current tree. If historical purge is required for incident response, coordinate it as a separate operation with backups, collaborator notice, clone invalidation, and explicit approval.

Required future workflow: update main → create branch → implement → test → organized commits → push → PR → review → manual merge.

## 17. Documentation

There is no root README. lumen-web/README.md is the untouched create-next-app template and does not describe Lumen. Backend and extension have no README.

Missing documentation:

- product scope and explicit limitations;
- prerequisite/supported Node/npm/browser versions;
- reproducible install/start commands for all three parts;
- safe environment-variable names and setup with placeholder values;
- architecture and data-flow diagram;
- score/category methodology, versioning, confidence, and limitations;
- OpenRouter data transfer, failure modes, quotas, and cost ownership;
- database migration/reset/retention/deletion procedures;
- extension loading/packaging and permission rationale;
- tests/lint/typecheck/build commands;
- deployment topology and CORS/URL configuration;
- security reporting and secret-rotation procedure;
- privacy policy and user-data lifecycle;
- contribution, branching, PR, and release process.

## 18. Recommended Architecture Improvements

Keep the architecture simple: three applications plus one small shared contract/domain package.

1. **Canonical domain module:** move category enums, score inputs/outputs, normalization, exact-host rules, thresholds, and methodology version into a small shared TypeScript package consumed by API/web and built for extension, or generate a versioned JSON rule artifact for the vanilla extension.
2. **Thin controllers:** /analyze validates input, calls an AnalysisService, maps typed domain errors to HTTP, and returns a versioned response. The service coordinates classifier, score calculator, repository, and provider adapter.
3. **Provider boundary:** OpenRouter client owns timeout, typed schema validation, safe error mapping, usage metadata, and model configuration. Do not make domain logic depend on provider response shape.
4. **Repository boundary:** isolate Prisma queries and add a composite Analysis(userId, createdAt) index. Keep SQLite for local/prototype use; choose a managed relational DB only when deployment/concurrency requirements justify it.
5. **Real analytics:** derive daily points from createdAt and persisted versioned scores/categories; never synthesize missing observations. Return null/gaps when no data exists.
6. **Frontend feature boundaries:** split dashboard into auth guard, data hook, score card, distribution, history, actions, and accessible tour. Keep server components for public layout/pages where possible.
7. **Extension boundary:** centralize storage schema/config, validate a dashboard handshake with exact origin plus nonce, minimize permissions, and separate navigation detection from analysis/state rendering.
8. **Validation/privacy boundary:** normalize and minimize URLs before any storage/AI transfer. Decide whether origin/domain is sufficient; strip credentials, fragments, and sensitive query parameters by default.
9. **Version every result:** persist ruleVersion, promptVersion, provider/model, mode, timestamp, and evidence coverage so results are auditable.

Avoid microservices, event buses, global state frameworks, or a broad design-system rewrite until usage and team size justify them.

## 19. Recommended Roadmap

Effort scale: XS < 0.5 day, S 1–2 days, M 3–5 days, L 1–2 weeks. Estimates assume one engineer and exclude incident/legal coordination.

| Phase | Item | Priority | Impact | Effort | Delivery risk | Dependencies |
|---|---|---:|---|---:|---:|---|
| 0 — Critical fixes | Revoke OpenRouter key; rotate JWT secret; invalidate existing JWTs | Critical | Contains credential/account exposure | XS | Medium (sessions expire) | Secret owner and deployment access |
| 0 — Critical fixes | Treat committed DB as incident; restrict access, assess exposure, remove current tracked copy, define notification/reset needs | Critical | Protects personal data | M | High | Owner/privacy decision; backup policy |
| 0 — Critical fixes | Replace fabricated dashboard series with real points or explicit “insufficient data” | Critical | Restores product integrity | S | Medium | Agreed API response behavior |
| 0 — Critical fixes | Upgrade patched Next 16.3.x and aligned config | Critical | Removes known critical runtime exposure | S | Medium | Smoke tests/build |
| 0 — Critical fixes | Disable/remove debug route from production and return safe projections only | High | Prevents password-hash disclosure | XS | Low | None |
| 0 — Critical fixes | Add register/login/analyze rate limits and per-user AI quota | High | Reduces abuse/cost | M | Medium | Deployment/IP/proxy model |
| 1 — Foundation | Add root gitignore; untrack node_modules, .env, DB, backup/generated build artifacts | High | Shrinks repo and prevents repeat exposure | S | Medium | Phase 0 containment; no history rewrite |
| 1 — Foundation | Declare Express/TypeScript/ts-node-dev/types; align Prisma 6.19.x packages; move CLI to dev | High | Reproducible clean build | S | Medium | Supported Node version decision |
| 1 — Foundation | Add engines/.nvmrc, root workspace/scripts, safe env examples and startup docs | High | Consistent onboarding/CI | S | Low | Dependency alignment |
| 1 — Foundation | Add backend ESLint/formatter and explicit lint/typecheck/test scripts | Medium | Enforceable quality baseline | S | Low | Reproducible install |
| 1 — Foundation | Repair migration history and test clean migration path without production data loss | High | Deployable schema | M | High | Data backup/target DB decision |
| 2 — Core logic | Define one documented score contract and methodology version; preserve current method until product approval | High | Consistent, explainable results | M | Medium | Product/research decision |
| 2 — Core logic | Replace substring rules with normalized exact host/subdomain policy and test fixtures | High | Prevents spoofing/misclassification | S | Low | Canonical module |
| 2 — Core logic | Separate source reputation, sensationalism, and factuality; record evidence/confidence | High | Reduces conceptual overclaiming | L | High | Product/content methodology |
| 2 — Core logic | Validate AI responses; pin configured model; store model/prompt/rule versions; safe fallback errors | High | Auditability/resilience | M | Medium | Provider choice |
| 2 — Core logic | Decide whether to extract content; implement only with SSRF-safe fetch isolation and legal/privacy review | High | Enables article-level analysis | L | High | Security/privacy architecture |
| 3 — UX | Add automated-estimate disclaimer, methodology/evidence explanation, reduced-confidence fallback state | High | Improves trust and informed use | M | Low | Core terminology |
| 3 — UX | Resolve demo/live behavior and remove/disable unfinished actions | Medium | Clearer product flow | S | Low | Product decision |
| 3 — UX | Add form loading, error announcements, label associations, modal focus semantics, chart alternatives | High | Accessible critical flows | M | Low | Component split |
| 3 — UX | Add privacy controls, history deletion, retention disclosure, and real privacy/terms pages | High | User control/compliance | L | Medium | Data policy/backend APIs |
| 4 — Testing | Unit tests for URL/classification/score/history/AI schemas | High | Protects core rules | M | Low | Canonical module |
| 4 — Testing | API integration and extension tests | High | Protects auth/fallback/storage | L | Medium | Test DB/provider mocks |
| 4 — Testing | Frontend accessibility/component tests and one E2E critical path | High | Prevents user-flow regressions | L | Medium | Stable contracts |
| 5 — Performance | Cache/coalesce by normalized input and classifier version; add quotas/backoff | Medium | Reduces latency/cost | M | Medium | Privacy-safe cache key |
| 5 — Performance | Server-component public shell, image optimization, route-level loading | Medium | Faster web experience | M | Low | UX stabilization |
| 5 — Performance | Add DB index/pagination; assess SQLite concurrency based on measured load | Medium | Scalable history reads | S–M | Low | Migration repair |
| 6 — Production readiness | PR CI with install/lint/typecheck/test/build/schema/secret checks | High | Prevents recurrence | M | Low | Foundation/test scripts |
| 6 — Production readiness | Branch protection, required review/checks, CODEOWNERS, dependency updates | High | Safer delivery | S | Low | CI |
| 6 — Production readiness | Structured redacted logs, request IDs, error/latency/AI usage metrics and alerts | Medium | Operability/cost control | M | Medium | Hosting choice |
| 6 — Production readiness | Add SEO metadata, sitemap/robots/OG and release/deploy/runbook docs | Medium | Discoverability/operations | S | Low | Production URL/brand assets |
| 6 — Production readiness | Manual-approval deployment pipeline and rollback plan | High | Controlled releases | M | Medium | Hosting, secrets, migrations, CI |

## 20. Quick Wins

These should be separate, reviewable PRs after immediate credential/data containment:

1. Add direct backend dependencies and explicit typecheck/lint/test placeholders so clean-clone failures are visible.
2. Align Prisma Client, CLI, and adapter to one 6.19.x version; avoid a major upgrade initially.
3. Add root/backend gitignore and stop tracking node_modules, .env, dev.db, and backup files without rewriting main history.
4. Remove/guard /debug and return only safe user fields.
5. Add Zod URL validation with http/https, maximum length, and URL minimization; document future SSRF controls before scraping.
6. Move domain rules, weights, thresholds, and labels into one canonical tested module/artifact.
7. Replace fabricated chart points with empty/null states until real aggregation lands.
8. Change categorical copy to “automated estimate,” show analysis mode/source, and add a concise limitations explanation.
9. Add loading/disabled state to auth forms, associate labels/inputs, name password-toggle buttons, and make errors aria-live.
10. Pin exact allowed dashboard origin for the extension token handshake and use a nonce; do not listen for credentials on every site.
11. Upgrade Next.js to the patched compatible line and rerun clean install, lint, typecheck, build, and smoke tests.
12. Add the minimal PR CI pipeline and branch protection before larger refactors.

### Decision gates before implementation

- Confirm repository visibility/exposure and incident response for the committed database and credentials.
- Decide whether Lumen scores a **source**, an **article**, or a user’s **consumption pattern**; the current UI conflates all three.
- Define the acceptable evidence, uncertainty, retention, and third-party data-sharing policy.
- Select supported Node LTS and target deployment topology.
- Decide whether SQLite remains a local-only store or is part of production.
