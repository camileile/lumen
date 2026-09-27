# Lumen — Security Hardening Status

## Scope

Phase 4 narrows the current API and browser-extension attack surface without changing the reliability-score methodology, UI design, database schema, authentication transport, or AI provider. The current `/analyze` endpoint classifies a submitted URL and **does not fetch the submitted page or article content**.

## URL Validation

`/analyze` now uses one canonical parser. It accepts only HTTP(S), caps input at 2,048 characters, rejects embedded credentials and forbidden hosts, lowercases/normalizes the hostname, and removes fragments before persistence or provider use. Query parameters remain when they may identify an article, but common tracking keys and credential-like keys (tokens, sessions, signatures, passwords, API keys, OAuth codes) are removed. Remaining parameters are sorted to make duplicate detection deterministic.

## SSRF Preparation

A reusable, side-effect-free policy rejects localhost, loopback, private, carrier-grade NAT, link-local, benchmark, multicast, unspecified, IPv4-mapped IPv6, unique-local IPv6, and common metadata/internal hostnames. It also validates sets of resolved addresses.

No DNS lookup or external page fetch was added to `/analyze`. A future fetcher must resolve the hostname, reject the request if **any** answer is forbidden, pin/use the validated address safely, and repeat URL, DNS, and address validation after every redirect. This is required to address DNS rebinding and redirect-based SSRF.

## Rate Limiting

The API uses bounded, in-memory fixed-window limits and emits `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` when applicable:

| Route | Default | Key |
| --- | ---: | --- |
| `POST /auth/register` | 5 per 15 minutes | client IP |
| `POST /auth/login` | 10 per 15 minutes | client IP |
| `POST /analyze` | 20 per minute | authenticated user + client IP |

All maxima and windows are configurable through documented environment variables. Immediate duplicate analysis of the same sanitized URL by the same user is rejected for 30 seconds by default, before an external provider call. The provider has one 20-second timeout and no retries.

The limiter is intentionally small and appropriate for a single process. Horizontal or multi-instance deployment requires a shared, atomic store. Proxy trust is off by default and must be configured with an exact hop count; otherwise client-controlled forwarding headers cannot select the rate-limit key.

## Authentication Hardening

Access tokens are now signed and verified with an explicit contract: HS256 only, issuer `lumen-api`, audience `lumen-web-extension`, UUID user id in `sub`, and seven-day expiration. Verification rejects other algorithms, issuer/audience mismatches, missing/invalid subjects, expiration, and malformed tokens. JWT secrets shorter than 32 bytes fail closed as a configuration error.

Tokens issued before this contract may no longer validate and users may need to sign in again. Bearer storage remains unchanged and migration from browser storage to secure cookies is deferred.

Registration and login trim/lowercase email addresses, trim names, and cap name, email, password, and confirmation lengths. The existing six-character registration minimum was retained to avoid an unplanned compatibility/product-policy change.

## Error Handling

Expected failures use stable public codes and safe messages. Unknown errors return `500 / INTERNAL_ERROR`; JSON syntax and oversized-body errors have dedicated responses. Prisma, provider, stack, filesystem, and internal-path details are not returned.

Server error logs contain only request id, HTTP method, route path, and error class. They omit request bodies, authorization/cookie headers, tokens, credentials, full submitted URLs, query strings, provider payloads, and exception messages. Every response receives an `X-Request-ID`.

## Request Limits

JSON request bodies are limited to `16kb` by default through `REQUEST_BODY_LIMIT`. Oversized bodies return HTTP 413 before controller processing.

## Security Headers

The backend disables `X-Powered-By` and sets `nosniff`, `no-referrer`, `DENY` framing, a restrictive API CSP, and a minimal Permissions Policy. HSTS is emitted only in production. The frontend sets `nosniff`, strict-origin referrer policy, frame denial, permissions restrictions, and a non-disruptive baseline CSP for framing/base/form controls. A full script/style CSP requires a separate asset inventory and rollout.

## CORS

Origins are an exact, comma-separated allowlist. Wildcards, paths, queries, fragments, and non-HTTP(S) origins are rejected at configuration time. Browser requests from unlisted origins receive 403. Credentials are disabled; only GET, POST, OPTIONS, Content-Type, and Authorization are allowed. Requests without an Origin remain available to non-browser clients such as the extension service worker.

## Extension Handshake

The dashboard no longer broadcasts a token with `postMessage("*")`. Connection now requires:

1. the exact authorized dashboard origin;
2. a cryptographically random, short-lived challenge issued by the extension service worker;
3. a structurally valid JWT-shaped token payload;
4. one-time challenge consumption, preventing replay.

The service worker independently checks the content-script sender URL before storing a token. The bearer token appears only in the exact-origin, challenge-bound commit message; it is not echoed in challenge or result messages. This reduces cross-origin exposure but does not mitigate same-origin XSS, which already has access to the current browser-storage token. The production dashboard origin remains a packaging-time extension setting and must be changed deliberately for a production build.

## Extension Permissions

Unused `activeTab` and `scripting` permissions were removed. `tabs` remains necessary for navigation-triggered analysis, `storage` for state/token storage, and the localhost host permission for the development API. The content script and mascot GIF resources still require broad page matching for the existing overlay behavior. Icon PNGs are no longer web-accessible.

## Data Minimization

Only the sanitized URL is persisted and sent to OpenRouter. The extension applies the same privacy reduction before network use or writing its `lastUrl` state, while the backend remains the authoritative enforcement boundary. Fragments, embedded credentials, sensitive/tracking query keys, and token-shaped query values are removed. Analysis and history API projections no longer serialize `userId`, internal text fields, relations, passwords, hashes, or tokens. Existing historical rows are not rewritten or deleted.

## Log Redaction

Controller logging of raw exceptions was removed. Extension fallback logging no longer serializes exception contents. Startup logging contains only the local listening address; no secret-bearing environment values are logged.

## Provider Boundary

OpenRouter remains the provider. Calls retain a 20-second timeout and no retry loop. Responses are capped at 64 KiB, must be valid JSON with a valid/normalizable A–D category, a finite 0–100 score, and a non-empty summary. Provider summaries are trimmed and capped at 500 characters. HTTP/upstream details and malformed output trigger the existing deterministic local-domain fallback; the provider's numeric score still cannot replace `rolling-weight-v1`.

## Security Tests

Automated coverage now includes URL schemes, length, credentials, sensitive query removal, deceptive hosts, private/metadata addresses, DNS-answer policy, rate-limit thresholds/reset/headers, auth route limits, JWT algorithm/issuer/audience/subject/expiration, CORS allow/deny, body size, security headers, safe projections, database-error redaction, provider errors/malformed/oversized output, duplicate analyses, and trusted/untrusted/expired/replayed extension handshakes.

The repository now runs 94 automated cases: 71 backend, 16 extension, and the existing 7 frontend cases (68 total before this phase). Backend coverage is 95.60% lines, 86.63% branches, and 97.73% functions for the configured source set.

## Residual Risks

- Browser bearer tokens still use client-side storage; XSS remains higher impact until a separately planned cookie/session migration.
- In-memory rate limits and duplicate checks are not shared across instances and reset on process restart.
- The extension's authorized origin is static and must be packaged correctly per environment.
- The broad content-script match and `tabs` permission remain necessary for the current product behavior.
- The source classification and provider prompt are signals, not fact checking; this phase did not change methodology.
- The backend retains the documented Prisma CLI/tooling audit exception from Phase 3.
- Email normalization is enforced in application code and legacy mixed-case accounts remain accessible, but the SQLite unique index is still case-sensitive; a future non-destructive migration should enforce case-insensitive uniqueness atomically.

## Deferred Security Work

- No scraping, DNS resolution, redirects, browser automation, or external-page fetch was implemented.
- A future fetcher must implement DNS pinning/revalidation, redirect limits, response-size/type limits, egress controls, and timeouts before it may consume arbitrary URLs.
- Shared rate-limit storage, secure-cookie authentication, CSRF strategy, a full frontend CSP rollout, centralized observability/redaction, CAPTCHA, and production extension-origin packaging remain separate decisions.
- No database migration, historical data rewrite, provider replacement, deployment automation, or score change was performed.
