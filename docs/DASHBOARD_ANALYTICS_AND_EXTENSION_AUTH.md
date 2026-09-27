# Lumen — Dashboard Analytics and Extension Authentication

## Scope

Phase 5.1 improves the meaning and layout of dashboard analytics and introduces a short-lived, installation-bound extension authorization flow. It does not change `rolling-weight-v1`, category weights, article analysis, or the database schema.

## Dashboard Layout

The dashboard uses a centered container capped at 1180px with 16px minimum side margins. Its wide layout uses a controlled profile column plus `minmax(0, 1fr)` content columns. At 1100px and below, cards use a single-column flow. Cards and charts can shrink without forcing horizontal overflow; vertical scrolling remains intentional.

## Main Evolution Chart

The primary chart remains the score evolution returned by `/history`. Each point is the canonical rolling score at the end of a UTC date that contains at least one valid observation. Missing dates are not interpolated or generated.

## Weekly Average

`calculateWeeklyAverages` groups the real daily score points into ISO weeks in UTC (Monday through Sunday). A weekly value is the rounded arithmetic mean of the observed daily points in that week. Up to the six most recent weeks with data are returned. Empty weeks are omitted; the current partial week may appear and exposes its observed-day count.

The older `weeklyAverage` response field remains temporarily for API compatibility. The dashboard uses `weeklyAverages`, not that legacy scalar, for the weekly chart and current weekly value.

## Trend Definition

Trend compares the latest available ISO week with the immediately preceding calendar week:

- positive delta: `up` / Subindo;
- negative delta: `down` / Descendo;
- zero delta: `flat` / Sem mudança;
- missing or non-adjacent comparison week: `insufficient`.

The delta is exact. There is no stability threshold.

## Missing Data Behavior

No bars, points, comparison values, or gap weeks are synthesized. With fewer than two adjacent observed weeks, the dashboard displays “Dados insuficientes para tendência.” With no observed weeks, the weekly chart displays the existing honest empty state.

## Extension Authentication Flow

1. The extension creates or reuses a random installation UUID in `chrome.storage.local`.
2. It creates a PKCE-style verifier/challenge and a request nonce. The verifier stays in `chrome.storage.session`.
3. It opens `/extension/connect` with only the request nonce, installation ID, and public challenge.
4. The user authenticates through the regular Lumen login when necessary and explicitly confirms the connection.
5. The dashboard obtains a two-minute, one-time authorization code from the backend.
6. The page passes that one-time code through the exact-origin, nonce-protected Phase 4 handshake.
7. The extension exchanges the code plus its private verifier for a dedicated extension session.

The dashboard JWT and password never cross `window.postMessage` and are never sent to the extension.

## Authorization Exchange

The backend stores only a SHA-256 digest of the pending authorization code in a bounded in-memory registry. The grant is bound to the authenticated user, request nonce, installation UUID, and PKCE challenge. It expires after two minutes and is deleted before validation so that every exchange attempt is single-use.

The resulting JWT is restricted to:

- issuer: the configured Lumen issuer;
- audience: `lumen-extension-session`;
- algorithm: HS256;
- subject: the user UUID;
- `tokenUse`: `extension`;
- installation UUID;
- lifetime: 24 hours.

An extension session may use authenticated product endpoints but cannot authorize another extension.

## Device Model

The installation UUID is random, is not fingerprint-derived, and is not a secret. Each browser installation performs its own exchange and receives a different session. Account history remains shared through the backend user subject; tokens are not synchronized between devices.

## Token Storage

The extension bearer token and safe account projection are stored only in `chrome.storage.local`. The short-lived PKCE verifier is stored in `chrome.storage.session`. No bearer token is stored in `chrome.storage.sync`, a query string, or a URL fragment. Expired local sessions are treated as disconnected and removed.

## Multi-device Behavior

Multiple installations can connect independently to the same account and access the same backend history. Compromise or logout of one local installation does not copy or delete another installation's token or account data.

## Logout

“Sair da conta” removes the extension token, account projection, legacy token key, and pending authorization from extension storage. It does not delete server history. Server-side per-device revocation is deferred because it requires persistent device-session records.

## Security Controls

- exact dashboard-origin and route validation (`/dashboard` for status/start and `/extension/connect` for authorization);
- page-source validation;
- challenge nonce and anti-replay registry;
- PKCE-style proof bound to installation and request;
- two-minute, one-time authorization codes;
- separate JWT audience and 24-hour expiration;
- safe user projection only;
- authorization endpoint rate limit: 10 requests per 5 minutes per user and IP;
- exchange endpoint rate limit: 20 requests per 5 minutes per IP;
- local-only bearer storage;
- no credential, web JWT, or bearer token in public messages or URLs.

The limits are per process and configurable with the new `RATE_LIMIT_EXTENSION_*` environment values.

## Tests

Automated coverage includes ISO-week boundaries, partial weeks, gaps, exact positive/negative/zero trend deltas, insufficient comparisons, and non-fabrication. Authorization tests cover authenticated and unauthenticated creation, valid exchange, expiration, replay, installation mismatch, web-session enforcement, independent device sessions, exact-origin handshake, logout, expired local state, and the prohibition on sync token storage.

## Known Limitations

- Pending authorization codes are in process memory. A multi-instance deployment requires a shared, expiring store and atomic consume operation.
- The extension session has no refresh flow; after 24 hours the user reconnects.
- The local development dashboard origin and API URL remain build-time extension constants.
- The broad content-script match and web-accessible image match remain necessary for the current on-page overlay.

## Deferred Database Work

A future non-destructive migration should add persistent device sessions with hashed token identifiers, last-used metadata, expiry, and revocation timestamps. That enables listing devices, revoking one installation server-side, refresh-token rotation, and an account-level “sign out all devices” control. No migration was introduced in this phase.
