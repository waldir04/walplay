# Quickstart Validation: Initial App Foundation

**Feature**: `001-app-foundation` | **Date**: 2026-11-20

This guide proves the foundation works end to end. It references the contracts and data model
instead of restating them. It contains no implementation code.

Related artifacts:

- [spec.md](./spec.md) — requirements and acceptance scenarios
- [plan.md](./plan.md) — architecture and stack
- [data-model.md](./data-model.md) — entities and state machines
- [contracts/routes.md](./contracts/routes.md) — route and navigation contract
- [contracts/configuration.md](./contracts/configuration.md) — environment inventory
- [contracts/i18n-resources.md](./contracts/i18n-resources.md) — translation keys
- [contracts/language-preference.md](./contracts/language-preference.md) — storage shape

## Prerequisites

| Requirement | Value |
|---|---|
| Node.js | LTS release pinned by the repository (`.nvmrc` / `engines`) |
| Package manager | `npm` with the committed lockfile |
| Browser | Latest two major versions of a current desktop or mobile browser |
| Screen reader | Optional but required for the manual a11y pass (VoiceOver, NVDA, or equivalent) |

## Setup

```bash
cd frontend
npm ci
cp .env.example .env.local
```

`.env.local` must contain a valid `VITE_APP_ENV` (`local` is the safe default). No secret is needed;
the foundation has no provider, backend, or database dependency.

## Run

```bash
npm run dev        # local development server
npm run lint       # ESLint, zero warnings tolerated
npm run typecheck  # tsc --noEmit across all projects
npm run test       # Vitest, zero unexpected warnings
npm run build      # production build
npm run preview    # serve the production build
```

All four quality scripts must pass before the feature is considered done (Constitution XVII).

## Automated validation

| Command | Expected outcome |
|---|---|
| `npm run lint` | Exit 0; no warnings; `func-style: expression`, `prefer-arrow-callback`, and no-`any` rules active |
| `npm run typecheck` | Exit 0 with all strict flags enabled |
| `npm run test` | Exit 0; no unexpected `console.warn`/`console.error`, act() warnings, or unhandled rejections; coverage ≥ 80% global and ≥ 90% for config, language storage, and page loader |
| `npm run build` | Exit 0; one chunk per page plus the shared shell chunk |

## Scenario 1 — Shell and responsive layout (US1)

1. Open `/` at 360, 768, 1024, and 1440 px widths.
2. Repeat at 200% browser zoom.

**Expected**:

- Exactly one header with the brand, one labelled navigation region, one main region, one `h1`.
- 360 px: single readable column, compact menu control available, no horizontal page scrolling.
- 768 px and above: wide navigation visible, compact control hidden, content centered at its max
  width, no clipping or overlap.
- 200% zoom: all content and controls reachable; nothing lost.
- No footer, legal links, or header language shortcut is present.

## Scenario 2 — Navigation, direct addresses, and history (US2)

1. Start at `/`, select Settings, then select Home.
2. Use browser Back, then Forward.
3. Open `/` and `/settings` directly in a new tab.
4. Activate the Walplay brand link from `/settings`.
5. Open `/does-not-exist` and `/settings/nested/missing`.

**Expected**:

- Each destination resolves inside the full shell; address and document title update.
- Back/forward restore the previous route and content.
- Direct addresses load the correct page with the shell; **focus stays at the document start** (do
  not observe focus on the heading after a direct load).
- The brand link returns to Home.
- Unknown and nested-unknown addresses show the not-found page inside the shell with a working Home
  link and the requested address preserved. No redirect loop.
- Home contains no invented titles, artwork, availability, ratings, or non-functional CTAs.
- Settings contains only the language choice, its purpose description, and the localized local-storage notice — no version, environment, or account content.

## Scenario 3 — Keyboard and screen reader (US3)

1. Load any route and press Tab once.
2. Activate the skip link.
3. Tab through every navigation and language control.
4. At 360 px, open the compact menu with only the keyboard.
5. Press Tab and Shift+Tab repeatedly, then Escape.
6. Navigate in-app and observe announcements.

**Expected**:

- First Tab reveals the skip link; activating it moves focus to main.
- Every destination, menu control, and language control is reachable with a visible ≥ 2 px focus
  outline (2 px offset).
- Menu: focus enters the dialog, stays inside, Escape closes it, focus returns to the trigger, and
  the trigger exposes expanded/collapsed state.
- In-app route change: focus moves to the page heading and one polite announcement occurs.
- Screen reader reports meaningful names for brand link, navigation, menu control, and language
  control; decorative marks are ignored; the current destination is announced as current.
- No keyboard trap anywhere.

## Scenario 4 — Language switching and persistence (US4)

1. With a browser preferring `es-MX`, open the app with no stored preference.
2. In Settings, switch to Spanish, then to English.
3. Reload after each change.
4. Clear `localStorage`, corrupt `walplay.language.v1` with invalid JSON, then with
   `{ "version": 9, "locale": "fr" }`, and reload.
5. Set the browser preference to `fr-FR` only and clear storage.
6. Inspect the Settings layout in Spanish at 360 px and 200% zoom.

**Expected**:

- `es-*` browser preference starts in Spanish; `en-*` starts in English; unsupported-only starts in
  English.
- Switching updates every visible string, the document title, accessibility labels, and
  `<html lang>` without a reload, in under one second, with one polite confirmation.
- The choice survives reloads when storage is available.
- Invalid, outdated, missing, or unreadable storage falls back safely; no crash; switching still
  works for the session.
- Missing Spanish key falls back to English; no raw key or blank appears.
- Longer Spanish text wraps with no clipping, overlap, or horizontal scrolling.

## Scenario 5 — Loading, error, and configuration states (US5)

### 5a. Route loading

1. Hard-reload the app, then navigate to Settings for the first time in that session.
2. Throttle the network in DevTools so the page chunk is slow enough to observe.

**Expected**: a layout-matching skeleton appears inside the shell before content, with a busy state
exposed to assistive technology, decorative bars hidden from it, no spinner, and no bare
"Loading…" only. Completing the load produces no visible content jump.

### 5b. Route-load failure and retry

1. In DevTools, block the Settings page chunk request (request blocking on the page module URL).
2. Navigate to Settings.
3. Unblock the chunk and activate Retry.

**Expected**: a localized error with an explanation, a working Retry, and a Home action; no stack
trace, module path, or internal identifier. Retry genuinely re-attempts the import and then renders
Settings. A second failure shows the error again.

### 5c. Rendering failure containment

1. Temporarily introduce a render-time throw in a page component (development only), or use the
   automated containment test.
2. Open that route.

**Expected**: the header and navigation remain usable; the main region shows a safe localized
fallback with a working Home action; focus moves to the fallback heading; no technical detail is
exposed. Revert the change.

### 5d. Required configuration failure

1. Stop the dev server and set `VITE_APP_ENV=invalid-value` in `.env.local`.
2. Start the app.

**Expected**: a localized, safe configuration error replaces the interface; no shell, navigation, or
partial UI; no variable value or internal identifier is shown. Correct the value and restart: the
app loads normally.

### 5e. Optional configuration absence

1. Remove or blank `VITE_APP_VERSION`.
2. Start the app and open the browser console.

**Expected**: the documented default `0.0.0` applies; the visitor-facing experience is unchanged; a
developer-visible warning appears that names the field but not a value.

### 5f. Empty state

**Expected** on `/`: the home placeholder explains the product purpose, uses no fabricated content,
and renders no call to action (none is functional yet).

## Scenario 6 — Rapid interaction and reduced motion

1. Click between Home and Settings rapidly, including before a route finishes loading.
2. Open the compact menu at 360 px, then widen the window past 768 px.
3. Enable `prefers-reduced-motion: reduce` and repeat menu opening and route changes.

**Expected**:

- Final route wins; no duplicate headings, stale content, or stale-language announcements.
- The menu closes when the viewport widens, with no trap and no hidden focused control.
- With reduced motion, transitions are effectively immediate and all state changes remain
  understandable.

## Scenario 7 — Visual identity audit

**Expected**:

- Canvas is `#0B1215` (never pure black) and all surfaces, borders, text, and status colors come from
  the semantic tokens; no raw hex in component code.
- Inter is self-hosted; no runtime third-party font request.
- Cards/rows use 16 px radius; controls use 8 px radius.
- Borders, not shadows, provide surface separation.
- The logo uses the exact monogram geometry, token-driven mint stroke, decorative `aria-hidden`
  mark, live-text `Walplay` wordmark, and 10 px lockup gap; no per-state recolor or animation.
- No Walday product content (weather, tasks, commitments, planning) and no entertainment business
  features appear.

## Scenario 8 — Scope audit

**Expected** across the built application and bundle:

- Zero catalog, search, availability, watchlist, favorites, accounts, authentication, playback, live
  TV, notifications, recommendations, ratings, social features, database, or provider integration.
- Zero external content or tracking scripts.
- Zero fabricated entertainment content.
- Only the language preference is persisted, under `walplay.language.v1`.

## Scenario 9 — Performance

1. Run `npm run build` and `npm run preview`.
2. Record the production bundle size.
3. Run Lighthouse in mobile mode with simulated throttling against `/`.

**Expected**:

- Primary content is visible within 2.5 seconds (LCP), and the recorded bundle budget passes.
- No route-level chunk is merged into the shell chunk, and no runtime third-party font request is
  made.

## Definition of Done checklist

- [ ] `lint`, `typecheck`, `test`, `build` pass with zero unexpected warnings.
- [ ] All nine scenarios above pass.
- [ ] Automated accessibility evaluation reports zero critical or serious violations on every route
      and state.
- [ ] Manual keyboard and screen-reader pass completed for the navigation journey.
- [ ] Responsive verification completed at 360, 768, 1024, 1440 px and 200% zoom.
- [ ] Performance check recorded (LCP ≤ 2.5 s and bundle budget).
- [ ] No `any`, unjustified assertions, or suppressions introduced.
- [ ] Documentation (`.env.example`, README setup, this quickstart) matches the implementation.
