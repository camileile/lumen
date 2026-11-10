# Lumen — Production Extension and Device Sessions

## Scope

Phase 9 makes extension configuration reproducible per environment and replaces the non-revocable 24-hour extension bearer with persistent, per-installation device sessions. It does not publish the extension, choose production domains, change `rolling-weight-v1`, collect article content, or migrate away from SQLite.

## Production Configuration

Development source remains configured for `http://localhost:3000` and `http://localhost:3001`. A production ZIP is generated only when an operator supplies an exact HTTPS API origin and dashboard origin. Neither origin is guessed from repository state.

`config.js` is generated inside the ZIP and is loaded by both the service worker and dashboard content script. The packaged manifest restricts backend access to the supplied API origin. The dashboard handshake continues to require the exact supplied dashboard origin and approved route.

## Deterministic Packaging

`lumen-extension/runtime-files.json` is the allowlist of shipped files. `scripts/package-extension.mjs` creates a byte-for-byte deterministic ZIP without installing another packaging dependency. It fixes entry order and timestamps, places `manifest.json` at the ZIP root for Chrome Web Store compatibility, generates environment-specific configuration, and rewrites `host_permissions` for that environment.

CI rebuilds the development ZIP, compares it byte-for-byte with `lumen-web/public/lumen-extension.zip`, validates the production HTTPS contract with non-routable `.invalid` examples, and uploads the development ZIP as a review artifact. CI does not deploy or publish it.

## Session Lifecycle

The existing two-minute, one-time, PKCE-like account authorization remains the session entry point. A successful exchange creates one server record for the account and installation and returns:

- a 15-minute HS256 access token bound to user, installation, and session UUID;
- a random 256-bit refresh token with a 30-day absolute expiry;
- the existing safe user projection.

The backend stores only a SHA-256 digest of the refresh token. Refresh rotates the token atomically; replay of the previous value fails. Reconnecting the same installation invalidates its prior session. Access-token verification also checks the database record, so logout or dashboard revocation takes effect immediately rather than waiting for JWT expiry.

The 30-day lifetime is absolute in this phase: refresh updates `lastUsedAt` but does not silently extend `expiresAt`. The extension retries an authenticated request once after a 401 by refreshing; it does not retry provider work aggressively.

## Browser Storage

- The access token and its expiry are stored in `chrome.storage.session`.
- The rotating refresh token, safe account projection, and refresh expiry are stored in `chrome.storage.local`.
- Both storage areas are restricted to trusted extension contexts with `setAccessLevel("TRUSTED_CONTEXTS")` where supported by the declared Chrome minimum.
- No credential is written to `chrome.storage.sync`, a URL, a public page message, or extension UI.
- The installation UUID remains a non-secret random identifier in local storage and is never derived through fingerprinting.

## Multi-device and Revocation

Each browser installation has an independent server session and independent credentials while sharing account history through the same user account. The dashboard lists only safe metadata: session UUID, shortened installation UUID, creation, last use, expiry, revocation time, and derived status. It never returns refresh-token hashes.

The extension logout endpoint revokes only the authenticated device and then clears local/session storage. Dashboard revocation is owner-scoped and immediately invalidates the selected device. It does not delete account history or revoke other installations.

## API Contract

- `POST /extension/authorize`: creates the existing short-lived one-time authorization for a signed-in web user.
- `POST /extension/exchange`: consumes it and creates the persistent installation session.
- `POST /extension/session/refresh`: rotates a valid installation refresh token.
- `POST /extension/session/logout`: revokes the current authenticated extension session.
- `GET /extension/sessions`: lists safe session metadata for the authenticated web user.
- `POST /extension/sessions/revoke`: revokes one session owned by the authenticated web user.

The existing extension authorization/exchange limiter also protects refresh. Normal API authentication and analyze cost controls remain unchanged.

## Database Migration

Migration `20261110190000_extension_device_sessions` adds `ExtensionSession` and its foreign key/indexes. It is additive and does not rewrite `User` or `Analysis` rows. Tests deploy the complete migration chain on new temporary databases and verify baseline adoption of existing current-schema data.

For an existing installation:

1. stop writers and make a restorable copy of the SQLite database, including WAL/SHM files when present;
2. run `npm run db:preflight` and `npm run prisma:migrate:status` against the copy;
3. run `npm run prisma:migrate:deploy` against the copy;
4. run API smoke tests and verify migration status;
5. repeat against the real database only after the reviewed copy succeeds.

No local or deployed user database was migrated automatically by this phase.

## Chrome Web Store Readiness

The package is structurally ready for manual review, but submission is not automatic. Before publication, the owner must provide final production origins, privacy/terms URLs, store listing assets and copy, support contact, and an accurate single-purpose/permission disclosure. The broad `<all_urls>` content script and web-accessible overlay images remain necessary for the current page overlay and must be disclosed and justified during review.

## Tests and Validation

Automated coverage includes authorization exchange, hashed-at-rest refresh credentials, rotation/replay rejection, absolute expiry, logout, same-installation reconnect invalidation, independent devices, owner-only list/revoke, database-backed access-token revocation, protected browser storage, expired-access refreshability, exact packaged origin, deterministic ZIP output, and production HTTPS enforcement.

CI continues to validate frontend/backend lint, typecheck, tests, builds and audit policies; extension manifest, syntax and logic; deterministic package consistency; and secret scanning.

Final local validation on Node.js 22.23.2/npm 10.9.8 passed with 101 backend, 28 frontend, and 30 extension cases (159 total). Backend configured coverage is 95.95% lines, 86.17% branches, and 98.55% functions. Frontend configured library coverage is 94.35% lines, 88.06% branches, and 92.86% functions. Backend validation ran from a clean temporary copy with a new temporary SQLite database; the developer database was not migrated or reset.

## Residual Risks

- SQLite still limits deployment topology and concurrent writers.
- Refresh tokens are bearer credentials in local extension storage; restricting them to trusted extension contexts reduces page/content-script exposure but does not protect a compromised extension or browser profile.
- Session checks add one database read per extension-authenticated request; a production database/cache strategy should be measured before horizontal scaling.
- Pending one-time authorizations and rate-limit stores remain process-local, so multi-instance deployment requires a shared atomic store.
- The dashboard web session still uses the existing local-storage authentication architecture.
- There is no account-wide “revoke all devices” action yet.

## Deferred Work

- Approve real production API/dashboard origins and deployment topology.
- Perform the reviewed database migration in each environment.
- Complete Chrome Web Store privacy, permission, listing, signing, and publication steps manually.
- Add shared authorization/rate-limit state for multi-instance deployment.
- Add account-wide revocation, session naming, and optional device-expiry controls if product demand justifies them.
