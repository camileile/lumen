# Lumen — Product Integrity Status

## Scope

Phase 2 restores internal consistency and removes fabricated live analytics without introducing a new scoring methodology. It does not add article scraping, full-text analysis, a hybrid AI model, database migrations, authentication changes, or a visual redesign.

## Previous inconsistencies

The following inventory was recorded before implementation changes:

| Implementation | Formula or interpretation | Window | Weight A | Weight B | Weight C | Weight D | Thresholds/defaults |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Extension `background.js` | `round(((averageWeight + 5) / 8) * 100)`, clamped to 0–100 | Last 20 local observations | 3 | 1 | -2 | -5 | Green >=70; yellow >=40; red <40; unknown domain -> B |
| Backend `analyze.controller.ts` | Same linear transformation as the extension | Current category plus last 19 stored categories | 3 | 1 | -2 | -5 | Score clamped to 0–100; unknown/fallback domain -> B |
| Backend `history.controller.ts` | `round((A*100 + B*70 + C*30 + D*10) / total)`, clamped to 0–100 | Latest 50 rows | 100 | 70 | 30 | 10 | Status depended on distribution: A >=50%, otherwise D >=20%, otherwise C >=20% |
| Backend fabricated history | Seven points produced by subtracting fixed values 6..0 from the current history score | Synthetic seven-day series | N/A | N/A | N/A | N/A | Missing dates were presented as measured values |
| Backend fabricated “weekly average” | Seven values produced by subtracting fixed values 6..0 from the current history score | Synthetic Monday–Sunday series | N/A | N/A | N/A | N/A | Not an average and not tied to timestamps |
| Frontend live dashboard | Consumed the history endpoint score; displayed that same current score as “weekly average” | API-dependent | N/A | N/A | N/A | N/A | Mascot thresholds >=70 / >=40; API status mapped to healthy/attention/critical wording |
| Unused frontend `buildDashboardFromHistory` | Current score was the newest persisted score; daily points averaged persisted scores | All supplied rows; seven calendar slots for weekly chart | N/A | N/A | N/A | N/A | >=70 healthy; >=40 attention; >0 critical; missing days were `null` |
| OpenRouter adapter | Parsed and rounded an AI-provided 0–100 score, clamped it to 0–100, defaulted invalid/missing score to 50 | One provider response | Provider-defined | Provider-defined | Provider-defined | Provider-defined | Numeric value was returned by the adapter but ignored by persistence and API output |
| Extension content/popup | Interpreted a received score only | Current stored payload | N/A | N/A | N/A | N/A | >=70 / >=40; missing score defaulted to 50 and missing category to B |
| Demo dashboard | Static illustrative score, trends, distribution, and access history | Static fixture | N/A | N/A | N/A | N/A | Clearly marked demo, but some copy described invented improvement as if observed |

## Canonical score contract

The canonical contract is named `rolling-weight-v1`. It preserves the methodology already shared by the extension's local path and the backend's main analysis path. Observations are categories ordered oldest to newest. Invalid values are excluded, the latest 20 valid observations are selected, and an empty valid history produces `null` rather than a positive or zero default.

The backend owns the canonical TypeScript implementation. The vanilla extension uses a dependency-free equivalent contract with the same method version, constants, formula, window, and thresholds. Physical generation of the extension artifact from the backend contract remains deferred until an extension build system is justified.

## Score formula

For each valid observation, map its category to a weight. Let `averageWeight` be the arithmetic mean of the weights in the current window:

`score = round(((averageWeight + 5) / 8) * 100)`

The result is clamped to 0–100. The score is deterministic for a fixed ordered category history. It is an integer presentation of the existing heuristic, not a calibrated probability or confidence interval.

## Observation window

The current score always represents the latest 20 valid category observations for that user, or every valid observation when fewer than 20 exist. The analysis endpoint loads the previous 19 valid categories and appends the current category. The history endpoint recalculates from categories and does not trust legacy persisted score values.

The distribution shown beside the score uses the same latest-20 window. The latest-access list remains limited to 50 rows as a presentation concern and does not define the score window.

## Category weights

| Category | Weight | Existing intended meaning | Integrity note |
| --- | ---: | --- | --- |
| A | 3 | Reference-source signal | Does not prove an individual article is true |
| B | 1 | Neutral, institutional, or unknown | Must not be presented as proof of trustworthiness |
| C | -2 | Sensationalism/editorial-risk signal | Based primarily on source/domain, not article text |
| D | -5 | Higher-risk source signal | Must not be presented as a factual verdict on an article |

Thresholds remain unchanged: score >=70 is the high band, score >=40 is the intermediate band, and score <40 is the low band. User-facing labels now describe numerical bands rather than “healthy” or “critical” truth claims.

## History aggregation

History is rebuilt from existing `Analysis.category` and `Analysis.createdAt` fields without a schema change:

1. normalize canonical and recognized legacy categories;
2. exclude unrecognized categories and invalid timestamps;
3. order observations chronologically;
4. calculate the canonical rolling score after each observation;
5. retain the last real score for each UTC calendar date that contains at least one valid observation.

No missing date is filled, interpolated, or synthesized. The previous seven-point sequence derived by subtracting fixed numbers from the current score was removed. Persisted legacy `Analysis.score` values are returned only as part of existing item records and are not used for the new aggregate calculations.

## Weekly average definition

`weeklyAverage` is now a scalar `number | null`, not a fabricated Monday–Sunday series. It is the rounded arithmetic mean of real daily score points in the trailing seven-calendar-day interval ending on the latest observed date. Days without observations are absent and do not count as zero. When there are no valid daily points, the value is `null`.

## AI output usage

OpenRouter still returns `category`, numeric `score`, `summary`, and model metadata under the existing prompt. This phase does not change that prompt or create a hybrid model.

The provider's numeric score is parsed for compatibility but is intentionally not persisted, exposed as the Lumen score, or blended into the behavioral calculation. Only the normalized category enters `rolling-weight-v1`; the score returned to the extension and dashboard is calculated by Lumen from the user's category window. This behavior is now explicit in source comments and API methodology metadata.

## Unknown/default behavior

Unknown local domains continue to map to B, preserving the existing product decision. They now carry explicit “source not recognized / insufficient evidence” language rather than a trust claim. Recognized legacy value `desconhecido` also remains B.

Unrecognized stored category strings are no longer silently converted to B for aggregation; they are excluded as uninterpretable legacy data. Missing extension state is displayed as unavailable/insufficient rather than defaulting to score 50 and category B.

## User-facing language changes

- “Score Informacional” is presented as an automated estimate and as a numerical band, not as “healthy,” “critical,” trusted, true, or false.
- The dashboard explains that the estimate uses up to 20 source/domain categories and is not a fact check.
- Category B explicitly includes neutral, unknown, and insufficient-evidence cases.
- Category C/D labels were softened to “signals” rather than article-level verdicts.
- Empty live history and weekly average display “Not enough data yet”/unavailable states.
- The extension popup and overlay disclose that results are domain-based automated estimates and not fact checking.
- The landing page now says the product identifies URLs/domains, does not read complete article text, and may send URL/domain data to the API/provider when connected.
- Demo data remains available and visibly marked as demo; claims of measured improvement were replaced with explicit illustrative wording.

## Tests added

The backend uses Node's built-in test runner and the existing TypeScript compiler; no test framework dependency was added. Fourteen tests cover:

- empty score history;
- homogeneous A, B, C, and D histories;
- mixed categories;
- rounding and clamping;
- the maximum 20-observation window;
- legacy and invalid category normalization;
- the existing 70/40 thresholds;
- no observations;
- one observed day;
- multiple observed days and chronological ordering;
- date gaps without fabricated points;
- trailing-seven-day weekly averaging;
- invalid category/timestamp exclusion.

## Known limitations

- Lumen does not currently perform fact checking.
- Lumen does not currently fetch or analyze the full text of a news article.
- Results are automated signals based primarily on source/domain information and browsing observations.
- The score is not a mathematical probability that a source or article is true.
- Domain matching still uses substring rules and is not safe against lookalike/suffix domains; correcting the classifier is a separate methodology/security decision.
- Local extension history and authenticated backend history are separate observation stores, although they now implement the same score contract.
- OpenRouter category selection remains nondeterministic and based on a URL/domain-only prompt routed through a changing free model.
- Historical rows do not store a methodology version, provider version, or evidence coverage. Legacy categories can be normalized, but old results cannot be fully reproduced.
- Building the current window and historical daily points currently reads the user's category observations without pagination so recognized legacy values cannot create endpoint divergence. This favors correctness in this phase and should be revisited with measured data volume.

## Deferred methodology decisions

- Whether unknown domains should remain category B and weight 1.
- Any change to A/B/C/D meanings, weights, thresholds, or score presentation.
- Exact-host/subdomain-safe source classification and ownership of the domain lists.
- Whether provider numeric scores should be removed from the OpenRouter contract or used in a separately designed model.
- Model pinning, confidence/evidence fields, prompt versioning, and persisted methodology metadata.
- Article extraction, full-text analysis, factual verification, or source corroboration.

## Validation

Validation used the repository contract of Node.js 22.23.2 and npm 10.9.8, including clean installs in a temporary copy that did not have access to repository `node_modules` directories.

Frontend:

- `npm ci`: passed; npm reported no known vulnerabilities.
- `npm run lint`: passed with zero errors and 11 pre-existing warnings (nine image optimization warnings and two full-page navigation warnings).
- `npm run typecheck`: passed.
- `npm run build`: passed; `/`, `/login`, `/cadastro`, and `/dashboard` were generated successfully.
- Development smoke test: `/`, `/login`, `/cadastro`, and `/dashboard` returned HTTP 200 and rendered HTML.

Backend:

- `npm ci`: passed; npm continues to report the three known high-severity Prisma CLI/tooling advisories documented in `DEPENDENCY_SECURITY_STATUS.md`.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 14 of 14 tests.
- `npm run build`: passed.
- Runtime smoke test with a disposable SQLite fixture and placeholder-only credentials: `/health` responded successfully; authenticated `/history` returned three points matching the three real observation dates, a canonical current score of 58, and a real weekly average of 58. Deliberately inconsistent persisted score values were ignored. An unauthenticated `/analyze` request returned 401, and no OpenRouter request was made.

Extension:

- `manifest.json` parsed successfully.
- All JavaScript files passed `node --check`.
- Source and packaged ZIP contents matched after normalizing text line endings.
- Representative inputs produced identical scores in the backend and extension implementations.

The existing `prisma db push` command failed with a Prisma “Schema engine error” while attempting to initialize a disposable smoke-test database. This is consistent with the pre-existing migration/schema-engine limitation documented by earlier phases. No migration, schema, or user database was changed. The runtime smoke test instead used explicit disposable fixture tables matching the existing schema, created outside application code and removed after validation.
