# Lumen — Dependency Security Status

## Scope

This document records the Phase 1.5 dependency-security remediation performed on 2026-09-12. The scope was limited to deliberate, compatible dependency updates and lockfile changes. No product behavior, UI, authentication, database schema, reliability score, sensationalism logic, OpenRouter prompt, or extension code was changed.

All validation used Node.js 22.23.2 and npm 10.9.8, as established in Phase 1. No real OpenRouter request was made.

## Baseline

The baseline was collected from a clean `npm ci` on `main` before dependency changes.

| Application | Audit result | Direct/runtime exposure | Tooling exposure |
| --- | --- | --- | --- |
| Frontend | 12 vulnerable packages: 1 low, 2 moderate, 8 high, 1 critical | `next` was directly vulnerable; `nanoid`, `postcss`, `sharp`, and one `baseline-browser-mapping` path were reachable through Next.js | The remaining findings were in ESLint and related development dependencies |
| Backend | 3 high findings | No application import of the affected CLI/config packages was found | `prisma` CLI -> `@prisma/config` -> `deepmerge-ts` |

Frontend baseline findings:

| Package | Severity | Relationship | Advisory IDs |
| --- | --- | --- | --- |
| `next` 16.1.6 | Critical | Direct runtime dependency | 30 advisories aggregated by npm, including `GHSA-p293-qw3h-jr36` and `GHSA-2xp9-vwfh-vxw4` |
| `nanoid` 3.3.11 | High | Transitive runtime dependency through Next.js/PostCSS | `GHSA-28wg-ghj8-5hjv`, `GHSA-2v37-7h3g-55p8`, `GHSA-xwg4-73v4-xw9w` |
| `postcss` 8.4.31 | High | Transitive runtime dependency through Next.js | `GHSA-qx2v-qp2m-jg93`, `GHSA-6g55-p6wh-862q`, `GHSA-fxqj-rqcc-2cmp`, `GHSA-r28c-9q8g-f849` |
| `sharp` 0.34.5 | High | Transitive runtime dependency through Next.js | `GHSA-f88m-g3jw-g9cj`, `GHSA-rgj7-g3m4-5g8c` |
| `baseline-browser-mapping` 2.10.0 | Moderate | Transitive through Next.js and Browserslist | `GHSA-w5vr-8v7q-w6rv` |
| `@babel/core` 7.29.0 | Low | Transitive development dependency | `GHSA-4x5r-pxfx-6jf8` |
| `@humanfs/node` 0.16.7 | Moderate | Transitive development dependency | `GHSA-p498-v437-472g` |
| `brace-expansion` 1.1.12 and 5.0.3 | High | Transitive development dependency | `GHSA-f886-m6hf-6m8v`, `GHSA-jxxr-4gwj-5jf2`, `GHSA-3jxr-9vmj-r5cp`, `GHSA-mh99-v99m-4gvg`, `GHSA-rgw5-rvv9-x895` |
| `browserslist` 4.28.1 | High | Transitive development dependency | `GHSA-c83g-rgw3-j3cx`, `GHSA-73wf-gq98-2v4g` |
| `flatted` 3.3.3 | High | Transitive development dependency | `GHSA-25h7-pfq9-p65f`, `GHSA-rf6f-7fwh-wjgh` |
| `js-yaml` 4.1.1 | High | Transitive development dependency | `GHSA-h67p-54hq-rp68`, `GHSA-52cp-r559-cp3m`, `GHSA-5p4m-2wfm-xmqj`, `GHSA-2883-xcg3-v3hh` |
| `picomatch` 4.0.3 | High | Transitive development dependency | `GHSA-3v7f-55p6-f55p`, `GHSA-c2c7-rcm5-vvqj` |

## Changes Applied

Two direct packages were updated together:

- `next`: 16.1.6 -> 16.3.3;
- `eslint-config-next`: 16.1.6 -> 16.3.3.

React and React DOM remain at 19.2.3. No backend package or extension file changed.

The frontend lockfile was then updated only for the vulnerable transitive packages, within dependency ranges already accepted by their parents:

| Package | Before | After | Expected impact |
| --- | --- | --- | --- |
| `@babel/core` | 7.29.0 | 7.29.7 | Development/lint tooling only |
| `@humanfs/node` | 0.16.7 | 0.16.8 | Development/lint tooling only |
| `baseline-browser-mapping` | 2.10.0 | 2.11.23 | Browser data used by Next.js and lint tooling |
| `brace-expansion` | 1.1.12 / 5.0.3 | 1.1.18 / 5.0.9 | Development/lint tooling only |
| `browserslist` | 4.28.1 | 4.28.9 | Development/lint tooling only |
| `flatted` | 3.3.3 | 3.4.4 | Development/lint cache tooling only |
| `js-yaml` | 4.1.1 | 4.3.2 | Development/lint configuration parsing only |
| `picomatch` | 4.0.3 | 4.0.7 | Development/lint glob matching only |
| `nanoid` | 3.3.11 | 3.3.19 | Next.js/PostCSS transitive runtime dependency |
| `postcss` | 8.4.31 | 8.5.23 | Next.js transitive runtime dependency |
| `sharp` | 0.34.5 | 0.35.4 | Next.js image-processing runtime dependency |

## Next.js Remediation

The critical advisories [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) and [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) affect Next.js 16.0.0 through versions earlier than 16.3.3. They describe unauthenticated remote-code-execution conditions on Windows-hosted servers and in AVIF image optimization respectively.

Next.js 16.3.3 is the first version outside both affected 16.x ranges, so it was selected as the smallest compatible update. Its declared Node requirement (`>=20.9.0`) and React peer range include the versions already established by the project. `eslint-config-next` was aligned to the same version. After the update, npm reports no frontend vulnerabilities.

## Backend Dependency Review

The three backend findings are one dependency chain rather than three independent flaws:

`prisma` 6.19.3 (direct development dependency and optional peer of `@prisma/client`) -> `@prisma/config` 6.19.3 -> `deepmerge-ts` 7.1.5.

All three npm findings point to [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), a stack-exhaustion issue in `deepmerge-ts` before 8.0.0 when recursive object graphs are merged.

Prisma 6.19.3 is already the latest stable 6.x release and pins `deepmerge-ts` 7.1.5. There is therefore no compatible Prisma 6 patch/minor that removes the finding. An npm override to `deepmerge-ts` 8.x was not added because that would bypass Prisma's exact dependency contract and may introduce a breaking API change.

The affected packages are installed even with `npm ci --omit=dev` because `@prisma/client` declares the Prisma CLI as an optional peer. However, application-source inspection found imports only for `@prisma/client` and `@prisma/adapter-better-sqlite3`; it found no runtime import of `prisma`, `@prisma/config`, or `deepmerge-ts`. The finding is therefore classified as a tooling/configuration-chain risk that is present in the installed tree, not as a demonstrated application runtime call path.

## Audit Before

| Application | Low | Moderate | High | Critical | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Frontend | 1 | 2 | 8 | 1 | 12 |
| Backend | 0 | 0 | 3 | 0 | 3 |

## Audit After

| Application | Low | Moderate | High | Critical | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Frontend | 0 | 0 | 0 | 0 | 0 |
| Backend | 0 | 0 | 3 | 0 | 3 |

The frontend result does not imply that the application is generally "secure"; it only means npm currently reports no known advisories in that dependency tree. Security issues outside npm's advisory model remain possible.

## Remaining Advisories

| Package | Severity | Classification | Disposition |
| --- | --- | --- | --- |
| `prisma` 6.19.3 | High | Direct development CLI; also installed as an optional peer | Deferred: no fixed release exists in Prisma 6.x |
| `@prisma/config` 6.19.3 | High | Transitive tooling/configuration package | Deferred with the Prisma CLI chain |
| `deepmerge-ts` 7.1.5 | High | Transitive tooling dependency; no application import found | Deferred; fixed line is 8.x and Prisma pins 7.1.5 |

## Residual Risk

- The backend still reports three high findings for the Prisma tooling chain. Exploitation through current Lumen request handling was not demonstrated, but the packages remain installed and must not be described as harmless.
- Avoid passing untrusted, recursive object graphs into Prisma configuration tooling.
- Reassess the chain when Prisma publishes a compatible remediation or when a separately scoped Prisma major upgrade is planned and tested.
- Automated tests are still absent, so this update relies on type checks, builds, audits, and targeted smoke tests.
- Updated `eslint-config-next` exposes two additional navigation warnings. Together with the existing image warnings, frontend lint completes with 0 errors and 11 warnings; behavior-changing cleanup remains out of scope.

## Deferred Upgrades

- Prisma major migration and any associated client/configuration changes.
- Broad upgrades of React, TypeScript, ESLint, or unrelated dependencies.
- Authentication, database, CI, automated tests, application architecture, and product behavior changes.
- Existing frontend image and internal-navigation lint warnings.

## Validation

Validation used clean installs from the committed lockfiles.

Frontend:

- `npm ci`: pass;
- `npm run lint`: pass with 0 errors and 11 warnings (9 existing image warnings and 2 internal-navigation warnings surfaced by the updated rules);
- `npm run typecheck`: pass;
- `npm run build`: pass; all four application routes were statically generated;
- `npm audit`: pass with 0 vulnerabilities;
- development smoke test: `/`, `/login`, `/cadastro`, and `/dashboard` each returned HTTP 200 with HTML and loaded without a server runtime error.

Backend:

- `npm ci`: pass;
- `npm run lint`: pass;
- `npm run typecheck`: pass;
- `npm run build`: pass;
- `npm audit`: completed with the 3 documented high findings;
- server startup: pass;
- `GET /health`: HTTP 200;
- protected route registration: `GET /auth/me`, `GET /history`, and `POST /analyze` each returned HTTP 401 without a token, as expected;
- Prisma Client generation and initialization: pass; a read-only `SELECT 1` connectivity check completed;
- no real OpenRouter call was made.

The extension was not modified in this phase.
