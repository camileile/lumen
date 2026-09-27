# Lumen — UX and Accessibility Status

## Scope

Phase 5 improves clarity, accessibility, responsiveness, and maintainability without changing authentication architecture, persisted data, the A/B/C/D weights, score thresholds, or the `rolling-weight-v1` methodology. The product still does not fetch or analyze full article content and does not perform fact checking.

The pre-change UI audit found a 647-line dashboard page, mixed fetching/rendering responsibilities, missing form associations and submit feedback, an inaccessible tutorial dialog, color-led category communication, raw images/internal anchors that triggered lint warnings, and multiple controls that looked functional but had no supported behavior.

## Dashboard Refactor

The dashboard page was reduced from 647 lines to a small orchestration component. Data loading now lives in `useDashboardData`, while the header, mascot, score, distribution, history, recent sources, charts, empty/error states, and tutorial are focused components. API mapping remains in the existing data layer; rendering components do not recalculate the reliability score.

## Loading States

Login and registration prevent duplicate submissions, disable their inputs and submit buttons while pending, and expose busy state to assistive technology. The dashboard distinguishes initial loading from refresh and disables refresh while a request is active.

## Error States

Authentication and dashboard errors use safe, actionable messages without exposing upstream details. Visible errors use `role="alert"`; non-error connection feedback uses a polite live region. Network errors are distinct from honest empty-data states.

## Empty States

No-analysis, no-history, unavailable score, unavailable distribution, and unavailable weekly-average states are explicit. They use “Not enough data yet” or an equivalent explanation and never render missing values as zero or as synthetic chart points.

## Product Language

Core UI copy now consistently describes results as automated estimates based primarily on source/domain signals. It explicitly states that Lumen is not a fact checker, does not represent a mathematical probability of truth, and may have insufficient evidence.

## Score Explanation

The score card includes short helper text and an expandable explanation. It states that the estimate uses up to 20 recent observations and does not prove whether an article is true or false.

## Category Presentation

A/B/C/D presentations include letters, text descriptions, and percentages so color is not the only signal. Category B is described as potentially neutral, unknown, or insufficient evidence rather than confirmed trust. C and D describe risk signals without making factual verdicts.

## Removed/Disabled Actions

Unsupported Google authentication, account, achievements, settings, export, per-source verification, newsletter, social, contact, and placeholder navigation controls were removed instead of appearing functional. The remaining actions have real behavior. Minimal, honest `/privacy` and `/terms` pages replace dead links.

## Forms

Login and registration fields now have associated labels, stable `id` and `name` attributes, appropriate autocomplete/input-mode values, length bounds, accessible errors, and loading behavior. Password visibility controls expose an accessible name and `aria-pressed` state.

## Modal Accessibility

The tutorial uses `role="dialog"`, `aria-modal`, labelled/described relationships, initial focus, a focus trap, Escape handling, and focus restoration. Unit tests and a manual browser smoke test cover these behaviors.

## Keyboard Navigation

Interactive elements are native buttons or links, global `:focus-visible` styling is present, form controls are labelled, and the tutorial is keyboard-contained. Manual testing covered login controls and the tutorial’s Tab, Shift+Tab, Escape, and focus restoration paths.

## Contrast

Muted copy, links, errors, focus indicators, and dashboard helper text were adjusted for stronger contrast while preserving the existing palette. Color-dependent category/status communication was supplemented with text. A formal external WCAG color audit across every rendered state remains deferred.

## Responsive Behavior

Header/navigation, authentication cards, dashboard grids/cards/charts, source lists, and the tutorial adapt to narrow screens. Manual browser checks at 320, 360, 390, 768, 1024, and 1440 pixels found no horizontal document overflow and exactly one main landmark.

## Charts

Recharts remains the visual chart implementation. Charts are supplementary and hidden from assistive technology; each has an expandable data table with a caption and row/column headers. Empty datasets render an honest message instead of an empty or misleading graph, and null weekly values are not coerced to zero.

## Images

Frontend raw `<img>` usage was replaced with `next/image` where applicable. Dimensions and aspect ratios were preserved, and the above-the-fold mascot is prioritized. Extension assets remain outside this web-specific change.

## Navigation

Internal navigation uses Next.js `Link`, dead `#` controls were removed, and real privacy/terms routes were added. The dashboard uses router navigation for authentication redirects. The API client no longer adds unnecessary cache headers that caused CORS preflight failures in the supported local setup.

## SEO Baseline

The root server layout now provides a default title, description, Open Graph metadata, and the existing favicon. Privacy and terms pages have page-specific titles. A canonical URL is emitted only when `NEXT_PUBLIC_SITE_URL` is explicitly configured; no production URL is invented.

The pathname-dependent site chrome is isolated in a small client component, so the root layout and metadata remain server-rendered instead of hydrating the entire layout.

## Accessibility Tests

Frontend tests increased from 7 to 20. The 13 new tests cover form associations, password visibility, alerts, busy/disabled submission, dialog semantics, keyboard cycling, Escape, focus restoration, score explanation, category B wording, and real internal links. Total repository tests increased from 94 to 107 (backend 71, extension 16, frontend 20).

The final frontend coverage run reports 99.19% line coverage, 80.00% branch coverage, and 87.50% function coverage for the included frontend utility modules. Component accessibility behavior is covered by focused rendering tests rather than a global numerical threshold.

## Remaining UX Debt

- Validate the final palette with a dedicated automated and human WCAG contrast audit.
- Perform assistive-technology testing with at least NVDA/JAWS and VoiceOver.
- Add browser-level E2E coverage when the project adopts a lightweight E2E strategy.
- Replace the development privacy/terms notices with owner-approved legal documents before production.
- Revisit bundle and Web Vitals measurements under production traffic; this phase avoids premature micro-optimization.
