# Lumen — Privacy and Observation Scope

## Scope

Phase 8 reduces collection at the extension, API, provider, storage, and account boundaries without changing `rolling-weight-v1`, category weights, authentication, or the database schema.

## Observation Policy

Automatic observation is now explicit opt-in and starts disabled. When enabled, it runs only for domains already recognized by the local A/B/C/D source lists. Unknown sites, search pages, webmail, documents, and other browsing do not become observations automatically.

The popup retains an explicit **Analyze this page** action. This manual action can analyze an otherwise unknown public HTTP(S) domain because it represents a direct user request.

This policy avoids treating ordinary browsing as an implicit signal and prevents unknown sites from silently accumulating category B observations.

## Duplicate and Tab Handling

The extension tracks the last processed URL per tab in service-worker memory. It records the URL before asynchronous work begins, so the `url` and `complete` events for one navigation and repeated manual clicks cannot create duplicate observations. A generation value prevents an older provider response from overwriting a newer navigation result.

Closing a tab clears its in-memory state. Service-worker restart can clear this deduplication state; the backend's short duplicate window remains a secondary cost control.

## Data Minimization

The full sanitized page URL is used only transiently in extension memory to identify a navigation and classify its hostname. It is not written to extension storage or sent over the network.

The extension sends only the page origin. The API independently minimizes the request again and persists a normalized source origin such as `https://example.com/`. Paths, query strings, and fragments are not persisted. OpenRouter receives only `{ "domain": "example.com" }` and never receives the article path or query.

Historical rows are not rewritten automatically. They may still contain older sanitized paths until the account owner explicitly deletes the history or an approved migration/retention operation is performed.

## User Control

The extension popup exposes the automatic-observation state and lets the user enable or disable it. The overlay remains a separate preference.

The popup also exposes **Clear local data**. It removes the extension's local score history and last-result fields without deleting the account session, installation ID, automatic-observation choice, or overlay preference.

On service-worker startup, a legacy local `lastUrl` value is reduced to its source origin (or removed when invalid). This cleanup does not create an observation.

The authenticated dashboard exposes **Delete history** only when observations exist. It requires browser confirmation, calls `DELETE /history`, deletes only `Analysis` rows owned by that authenticated user, and leaves the account and extension session intact.

Deletion is permanent at the application database level. Backup retention remains an operational policy question.

## Provider Boundary

OpenRouter remains optional and keeps the existing timeout, size limits, schema validation, fallback, and rate limiting. Phase 8 changes only its input: the provider receives a normalized domain, not a URL.

The provider/model governance decisions remain deferred: fixed model selection, retention guarantees, prompt versioning, quotas, and persisted provenance.

## Tests

Coverage added in this phase verifies:

- automatic observation is disabled by default;
- automatic observation accepts recognized sources only;
- one tab update produces one candidate URL;
- repeated processing of the same tab and URL cannot create another observation in the same service-worker session;
- stale asynchronous responses cannot replace the current navigation result;
- extension network/storage minimization removes path, query, and fragment;
- backend persistence stores only source origin;
- provider request bodies exclude page path/query data;
- history deletion requires authentication and cannot delete another user's rows;
- the dashboard deletion control is a real disabled-capable button.

All fixtures use fictitious `.invalid` identities and example domains.

The Phase 8 validation completed with 97 backend, 25 frontend, and 26 extension cases (148 total). Backend configured coverage is 95.86% lines, 86.56% branches, and 98.35% functions. Frontend configured coverage is 93.87% lines, 86.15% branches, and 83.33% functions.

Clean-copy validation passed backend Prisma generation, clean migration deployment, lint, typecheck, tests, build, and the advisory-specific audit policy. Frontend clean install, lint, typecheck, tests, build, and `npm audit --audit-level=high` passed; only the documented moderate development lint chain remains. Extension manifest parsing, JavaScript syntax, logic tests, and source-to-ZIP file hashes passed.

## Retention Decision

No automatic retention period was introduced because silently deleting existing data is a destructive product decision. Until a policy is approved, data remains until the account owner uses **Delete history**.

Before real-user production, the owner must define:

- retention duration;
- whether deletion must cover backups and within what period;
- account deletion and export behavior;
- legal/privacy wording for the chosen jurisdictions;
- whether aggregate/anonymized data is retained.

## Known Limitations

- The editorial source list remains small and duplicated between backend and extension.
- Manual analysis of an unknown domain still produces category B when the provider is unavailable; the existing UI must continue describing B as neutral/unknown, not trusted.
- Existing historical rows are not automatically minimized.
- Extension configuration is still development-only (`localhost`).
- The backend does not yet provide data export or account deletion.
- The service worker keeps deduplication state in memory rather than persistent storage.

## Deferred Work

- Retention enforcement after an explicit product/legal decision.
- Export and account deletion endpoints.
- Persistent server-side device sessions and revocation.
- Central generation of the shared source list and privacy contract.
- Production extension packaging/configuration and Web Store review.
- Provider/model governance and analysis provenance fields.
