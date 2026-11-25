# Quickstart: Personalized Recommendations (Guest Baseline)

**Feature**: `009-personalized-recommendations` | **Date**: 2026-11-25

This is a validation guide, not implementation code. Shapes and rules live in
[data-model.md](./data-model.md) and [contracts/](./contracts/). The initial release is the guest
non-personalized baseline only; the seeded account-scope behavior is deferred and is not validated here.

## Prerequisites

- Node.js >= 22.12 and npm.
- Repository dependencies installed at the repository root, in `frontend/`, and in `backend/`.
- A valid backend `TMDB_ACCESS_TOKEN` for the catalog popular list. No new backend variable is required.
- The recommendation capability must be enabled locally to see the area; it is off by default.

## Configuration

Frontend (`frontend/.env.local`):

```bash
VITE_APP_ENV=local
VITE_APP_VERSION=0.0.0
VITE_API_BASE_URL=http://localhost:4000
VITE_AVAILABILITY_ENABLED=false
VITE_TRAILERS_ENABLED=false
# New in this feature. Default: false. Enable only for local validation.
VITE_RECOMMENDATIONS_ENABLED=true
```

Backend: no change. Use the existing development configuration and token.

## Run locally

Terminal 1 — backend:

```bash
npm --prefix backend run dev
```

Terminal 2 — frontend:

```bash
npm --prefix frontend run dev
```

Open the Home route (`/`).

## Validation scenarios

### 1. Capability hidden while disabled

1. Set `VITE_RECOMMENDATIONS_ENABLED=false` (or remove it) and restart the dev server.
2. Open Home.
3. Expect: no recommendation area, no attribution, no explanation, and no request to the catalog
   popular endpoint caused by this feature. The existing Home purpose and Browse entry remain.

### 2. Guest fallback renders honestly

1. Set the flag to `true` and restart.
2. Open Home with a fresh browser profile (no saved titles).
3. Expect:
   - a skeleton with reserved space and an announced busy state while loading;
   - the area reserves its layout immediately and settles to content, empty, or error within about five
     seconds under normal network conditions (SC-021, a quality benchmark rather than a provider guarantee);
   - a section headed "Popular now" with the basis "Based on provider popularity, not personalized";
   - up to 12 provider-ordered cards;
   - the official provider mark and non-endorsement statement;
   - a reachable "How recommendations work" disclosure containing the guest-scope explanation;
   - no personalization language, no sign-in prompt, no match score, and no availability claim.

### 3. Media scope

1. Use the Movies / TV shows scope control.
2. Expect: one section at a time, the selected provider list requested, provider order preserved, and
   no merged or interleaved list. The control is component state only and is confirmed by product/design
   as RV-17 (FR-153/FR-154).
3. Reload Home. Expect the scope to return to Movies; this is the documented non-persisted behavior.

### 4. Navigation

1. Activate a card.
2. Expect: the correct type-specific detail route (`/browse/movies/title/:id` or
   `/browse/tv-shows/title/:id`).
3. Use browser back. Expect Home to render and the area to be usable again. A media scope reset is
   acceptable; saved data and navigation must be unchanged.

### 5. Local exclusion of saved titles

1. Note a title in the "Popular now" section.
2. Save it from its detail page (watchlist or favorites).
3. Return to Home.
4. Expect: the saved title is no longer recommended. No network request contains the saved title or its
   identity; the exclusion is a local, read-only read permitted by FR-028/FR-077. Removing it from the
   saved collection may make it eligible again on a later render.

### 6. Empty state

1. Simulate a provider response with zero items (mock the popular response in a test or use a temporary
   local fixture).
2. Expect: a calm explanation distinct from an error, with working Browse and Search actions, no
   fabricated cards, and no spinner.

### 7. Error and retry

1. Stop the backend or force the provider to fail.
2. Open Home.
3. Expect: a contained localized error with a retry action; the rest of Home, navigation, catalog,
   search, and saved actions remain usable; no raw code, identifier, or stack trace is shown.
4. Restore the backend and activate retry.
5. Expect: one new request, the retry button disabled while pending, a single announced result, and a
   usable section or a distinct empty state.

### 8. Stale data

1. Load the area successfully.
2. Make the provider fail while the existing catalog cache still has stale data within its stale window.
3. Expect: the "loaded earlier" label and the localized last-updated time; no unlabeled stale content
   presented as current.

### 9. Accessibility and keyboard

1. Use keyboard only: reach the explanation, the media scope, every card, retry, Browse, and Search in a
   logical order with a visible focus indicator and no trap.
2. Use a screen reader: the area and section are named, the list is announced, the busy state is
   announced, and state changes are announced once.
3. Run at 360, 768, 1024, and 1440 px and at 200% zoom: no horizontal page scrolling, no clipped reason
   or control, cards remain operable.
4. Enable reduced motion: no automatic or attention-seeking motion.

### 10. Localization

1. Switch between English and Spanish.
2. Expect: all Walplay-owned area copy is translated, the explanation and state copy are complete, no
   raw keys appear, dates are localized, and provider title names stay as supplied.
3. Expect one request per active scope/language, no state loss beyond the documented media-scope reset,
   and no duplicate announcement.

## Automated validation

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run test
npm --prefix frontend run build
```

Targeted runs while developing:

```bash
cd frontend
npx vitest run src/widgets/recommendation-area
npx vitest run src/pages/home
npx vitest run src/shared/config/env.test.ts
npx vitest run src/shared/i18n
```

Backend tests are not expected to change, but the suite must stay green:

```bash
npm --prefix backend run test
```

Expected automated coverage for this feature:

- pure model tests for exclusion, dedupe, cap, provider order, and state mapping;
- component tests for loading, ready, empty (both causes), error (rate-limited, timed-out, unavailable),
  stale, retry, media scope, explanation, attribution, and flag-off;
- integration tests for Home composition with the flag on and off;
- a11y and keyboard tests for the region, section, list, explanation, scope control, retry, and actions;
- responsive tests at the four supported widths and 200% zoom;
- locale tests in English and Spanish with key parity;
- privacy tests asserting the request URL contains no saved data and no recommendation storage is written;
- per-path coverage thresholds for the new widget model and the configuration flag.

No test performs a real network request. Backend tests must pass unchanged.
