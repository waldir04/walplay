# Phase 0 Research: Initial App Foundation

**Feature**: `001-app-foundation` | **Date**: 2026-11-20

This document resolves every technical unknown in the Technical Context and records the
alternatives rejected. All decisions comply with the Walplay Constitution v1.2.0 and the product
overview.

---

## R-01 — Genuine route-content loading with a real retry

**Decision**: Each page slice is loaded on demand through a dynamic `import()` wrapped by a
`usePageModule(load)` hook that models `{ status: 'loading' | 'ready' | 'error' }`. The hook
invokes the importer inside an effect, renders `RouteLoadingState` while pending, renders
`RouteErrorState` with a retry callback on rejection, and renders the resolved component when
ready. Retry increments an attempt counter, re-invoking the importer.

**Rationale**: FR-012 requires a loading state that is genuinely observable on first navigation,
produced by preparing content on demand with no artificial delay and no data request. FR-013
requires retry to genuinely re-attempt preparation. A dynamic `import()` of a route chunk is the
real work the browser performs, so the skeleton is honest. Because failures are held in component
state and never memoized globally, retry re-imports.

**Alternatives considered**:

- `React.lazy` + `Suspense`: rejected. `React.lazy` caches the rejected promise for the lifetime of
  the lazy component, so retry cannot re-attempt the import without cache-busting hacks.
- React Router 7 route `lazy`: rejected. It gives code splitting but its revalidation path does not
  re-run a failed `lazy` import, and the spec requires a working retry.
- Artificial `setTimeout` delay: rejected. The spec explicitly forbids an artificial delay.
- Network request to a stub endpoint: rejected. FR-043 forbids server data and the spec forbids a
  data request for loading.

**Trade-off accepted**: A dynamic import that hits the browser module cache resolves without a
visible skeleton on repeat visits. That is correct behavior — the content is already prepared — and
the first-navigation requirement is still met.

---

## R-02 — Containing render failures without class components

**Decision**: The layout route (which renders `AppShell`) declares a nested `errorElement`. Page
render errors bubble to that element, which renders `ErrorState` inside the shell's main region
with a localized explanation, a working home action, and no technical detail. The error element
moves focus to the fallback heading on mount.

**Rationale**: Principle IV mandates arrow functions in frontend application code and the stack
standard mandates functional components. React class components are the only way to implement a
manual error boundary, and a class is not a function, so it sits awkwardly against the frontend
conventions. React Router's route-level `errorElement` is a first-class functional mechanism that
already isolates errors to the affected route subtree. Because the layout route is *outside* the
page route, the shell (header, navigation, skip link) remains mounted and usable, satisfying
FR-020's containment requirement.

**Alternatives considered**:

- Class-based `RouteErrorBoundary`: rejected as the primary mechanism; it conflicts with the
  functional-component convention and duplicates what the router already provides.
- `react-error-boundary` dependency: rejected. It wraps a class anyway and adds a dependency
  outside the approved stack.
- Root-level `errorElement` only: rejected. It would replace the shell, violating fault isolation
  and the requirement that the shell remain usable.

**Distinction preserved**: Route *loading* failure uses `RouteErrorState` with a real retry
(FR-013). Route *rendering* failure uses the router `errorElement` with a home recovery action and
no retry, because re-rendering the same failing component without a code change is not a genuine
recovery. This satisfies the spec's separate requirements for the two failure classes.

---

## R-03 — Route change focus management and announcement

**Decision**: A single `useRouteAnnouncement` hook in `app/routing` observes `useLocation()`.
It tracks whether the current commit is the initial document load:

- **Initial direct load**: no focus change and no announcement. Focus stays at the document start,
  so the skip link is the first Tab stop (FR-010, clarified 2026-11-19).
- **In-app route change**: after paint, focus the route's page-level heading, which is rendered
  with `tabIndex={-1}` and a stable `id`; then set one polite live-region message derived from the
  localized route title. The message is cleared before the next change so no stale text remains
  (FR-016).

**Rationale**: Focusing a heading without `tabIndex` is not reliable across browsers. A single
announcement source avoids duplicated output during rapid navigation (edge case in the spec).

**Alternatives considered**:

- Announce through a route-level `aria-live` element per page: rejected, it produces duplicate
  announcements and stale-language text during transitions.
- Focus the `<main>` element: rejected by the spec, which requires the page heading to receive
  focus.

---

## R-04 — Compact navigation with a real focus trap

**Decision**: The wide presentation is persistent navigation shown from the `md` breakpoint
(768 px). Below it, a menu button opens a native `<dialog>` in modal mode via `showModal()`. The
dialog contains the same navigation items and is labeled by a translated heading. A
`matchMedia('(min-width: 768px)')` listener closes it when the viewport widens. Route changes close
it before navigation completes.

**Rationale**: A native modal dialog provides focus containment, Escape dismissal, an inert
background, and focus restoration to the invoking element without custom trap code — exactly the
behavior required by US3 scenario 3 and FR-025. This matches the shared Walday Dark UI drawer
pattern (native `<dialog>`, 160 ms entrance, reduced-motion aware). One menu open at a time is
guaranteed because `showModal()` prevents a second modal.

**Alternatives considered**:

- Hand-rolled focus trap with `keydown` handlers: rejected as more code, more failure modes, and a
  duplicate of native behavior.
- Popover API / `<details>` disclosure: rejected; neither provides a reliable trap plus Escape
  restoration across the supported baseline.
- Route-based mobile menu: rejected; it would add routes outside the declared destination set.

**Accessibility contract**: The trigger is a `<button>` with `aria-expanded` and `aria-controls`
pointing at the dialog. The dialog has `aria-labelledby` referencing its heading. Closing returns
focus to the trigger (native behavior, verified by test).

---

## R-05 — Internationalization initialization and language detection

**Decision**: `i18next` is initialized synchronously in `app/i18n` with both locale resources
bundled, `fallbackLng: 'en'`, `supportedLngs: ['en', 'es']`, and namespace defaults. Initial
language resolution is a pure function, `resolveInitialLanguage()`:

1. Read and validate the persisted preference. If valid, use it.
2. Otherwise read `navigator.languages` in order and match by **base language subtag** (`es-MX`,
   `es-419`, `en-GB` all match their base).
3. Otherwise use `en`.

`i18next` is initialized with `initImmediate: false` so the first render is already translated.
A `languageChanged` listener updates `document.documentElement.lang` and the document title.

**Rationale**: Base-subtag matching is mandated by the 2026-11-19 clarification and FR-021. A
hand-written resolver is ~30 lines and avoids adding `i18next-browser-languagedetector`, which
would introduce caching and detection behavior we do not need and cannot easily constrain to the
exact fallback rules in the spec.

**Alternatives considered**:

- `i18next-browser-languagedetector`: rejected as an unnecessary dependency with its own storage
  and ordering semantics; the required policy is small and explicit.
- Lazy-loading locale JSON over HTTP: rejected. Two small JSON files belong in the bundle; a
  separate request would delay the first localized paint and add a failure mode.
- Matching only exact `en`/`es`: rejected by clarification.

**Formatting**: Dates, numbers, plurals, and interpolation use `Intl` and i18next plural/interpolation
mechanisms. The foundation has no dynamic dates or counts yet, so it establishes the rule and the
`Intl` helper location without introducing unused code.

---

## R-06 — Safe language preference persistence

**Decision**: A versioned storage key `walplay.language.v1` stores the locale as a JSON object
`{ "version": 1, "locale": "en" | "es" }`, validated with a Zod schema on every read. Reads and
writes are wrapped so that `SecurityError`, quota errors, and JSON parse failures resolve to
"unavailable" rather than throwing. The in-memory session value always remains usable even when
storage is unavailable.

**Rationale**: FR-020 requires validation on read and safe fallback for invalid, missing, outdated,
or unreadable values. Versioning handles the "stored shape is outdated" edge case without guessing.
A JSON object (rather than a bare string) allows future metadata without a key rename.

**Alternatives considered**:

- Bare string value: rejected; it cannot express shape/version and makes outdated-shape detection
  implicit.
- `sessionStorage`: rejected; the preference must survive reloads and reopenings.
- Cookies: rejected; no server, no need, and added privacy surface.
- Zod validation with a bare enum only: insufficient for versioned shape handling.

**Constitutional note (Principle XIII)**: The clause requiring a visible warning about losing
locally stored data applies to *user data*. This foundation stores only an interface preference
that safely falls back to detection. No user content is stored, so no warning is added, which also
keeps Settings within the spec's minimal content contract. If user data (watchlist) is later stored
locally, that warning becomes mandatory.

---

## R-07 — Startup configuration validation and bootstrap order

**Decision**: A single module, `shared/config/env.ts`, is the only reader of `import.meta.env`.
It exports a Zod schema and a parsed, frozen config object:

- `VITE_APP_ENV`: **required**, enum `local | development | staging | production`.
- `VITE_APP_VERSION`: **optional**, default `0.0.0`, must be a non-empty version-like string when
  present; never rendered.

Bootstrap order in `app/main.tsx`:

1. Resolve the initial language (safe, no config dependency).
2. Initialize i18n with bundled resources.
3. Parse configuration.
4. On success, render the router. On failure, render `AppConfigError` using the same i18n instance.

`AppConfigError` shows a localized, generic explanation with no variable names, values, or internal
identifiers. A developer-visible warning is emitted for missing/invalid optional values (FR-041)
and for the field name (not the value) on required failure.

**Rationale**: FR-038 requires fail-fast behavior with a safe localized message. Validating before
rendering guarantees no partially working interface appears. Initializing i18n first is what makes
the fatal screen localized. Centralizing env access satisfies Principle XII and keeps components
free of `import.meta.env`.

**Alternatives considered**:

- Validate in `vite.config.ts` only: rejected; it does not protect the runtime bundle and does not
  produce a localized screen at startup.
- Validate lazily on first use: rejected; it permits a partially working interface, violating
  FR-038.
- Show the offending value in the error: rejected; values may later become sensitive and the spec
  forbids exposing internals.
- Enable `envDir`/runtime config endpoint: rejected; adds a network dependency the foundation must
  not have.

---

## R-08 — Design tokens and typography

**Decision**: One `@theme` block in `frontend/src/app/styles/index.css` defines the canonical
semantic tokens (`canvas`, `surface`, `surface-raised`, `surface-subtle`, `border`,
`border-strong`, `text`, `text-muted`, `text-inverse`, `primary`, `primary-strong`, `success`,
`warning`, `danger`, `focus`, `tag-border`, `tag-text`), the display/title/body/caption type scale,
`--radius-card`/`--radius-control`, the page padding and section rhythm spacing, and the shared
focus ring. Inter is self-hosted through `@fontsource-variable/inter` with `system-ui` fallback.
Components consume tokens only.

**Rationale**: Principle VII and the Visual Identity section require a single token source, semantic
usage, no raw hex in components, and the canonical values. Tailwind 4's `@theme` is the mandated
mechanism. Self-hosting satisfies the prohibition on runtime third-party font requests.

**Alternatives considered**:

- `tailwind.config.js` theme extension: rejected; Tailwind 4 `@theme` is the single source of truth
  and duplicating tokens is prohibited.
- Google Fonts / CDN: rejected; runtime third-party request, prohibited.
- CSS modules or CSS-in-JS: rejected; Tailwind is the only styling mechanism.

---

## R-09 — Feature-Sliced Design shape for a foundation

**Decision**: Implement `app`, `pages`, `widgets`, `features`, `shared`. Omit `entities` until a
real domain concept exists. Slices expose public APIs through `index.ts`. Cross-layer imports use
the `@/` alias mapped to `src/`.

**Rationale**: Principle III allows avoiding layers without a clear architectural purpose. Creating
an empty `entities` layer now would be speculative. Language switching is a user interaction, so it
belongs in `features`, not `shared`. Navigation items are shell composition, so they belong in
`widgets/app-shell/model`, not `shared`.

**Alternatives considered**:

- Put language switching in `shared`: rejected; `shared` must contain no business/use-case logic.
- Put the header in `app`: rejected; `app` composes, while layout regions belong in `widgets`.
- One flat `components/` folder: rejected; violates FSD.

**Boundary rules enforced in review and lint**: pages and widgets do not import another slice's
internals; `shared` imports nothing upward; `features` do not import `widgets` or `pages`.

---

## R-10 — Testing strategy and accessibility tooling

**Decision**:

- Unit tests for `resolveInitialLanguage`, `languageStorage`, `env` schema, and `usePageModule`.
- Component tests for `WalplayLogo`, `LanguageSwitcher`, `PrimaryNavigation`, `CompactMenu`,
  `EmptyState`, `ErrorState`, and `RouteLoadingState`, including axe assertions.
- Router integration tests with `createMemoryRouter` covering: direct load of each route, navigation
  via links, browser-equivalent back/forward through router history, unknown nested path, retryable
  load failure (injected failing importer), loading state, and render-failure containment.
- Keyboard tests with `user-event`: skip link first Tab stop, menu open/trap/Escape/return focus,
  focus moves to heading on route change but not on initial load.
- Test setup fails on unexpected `console.error`/`console.warn` and unhandled rejections, per
  Principle VIII.
- Coverage thresholds: 80% global, 90% for `shared/config`, `shared/lib/languageStorage`, and
  `app/routing/usePageModule`.

**Rationale**: These are the constitution's mandated tools. `vitest-axe` is development-only and
runs axe-core on rendered output, satisfying "axe-core in development and CI, not runtime".
Integration tests at the router level exercise real route behavior without a browser driver;
Playwright is not in the approved stack and is not added.

**Alternatives considered**:

- Snapshot-only tests: rejected; not evidence of correctness (Principle VIII).
- Playwright/Cypress: rejected; outside the approved stack; manual quickstart covers the
  browser-level checks the constitution requires.
- Testing implementation details of components: rejected; tests assert roles, names, and visible
  outcomes.

---

## R-11 — Git hooks and script contract

**Decision**: `frontend/package.json` exposes `lint`, `typecheck`, `test`, `build`, plus `dev` and
`format`. Repository-root Husky hooks run lint-staged (Prettier + ESLint on staged files) on
pre-commit and the four canonical scripts in `frontend/` on pre-push. commitlint enforces
Conventional Commits with `commit-msg`.

**Rationale**: Principle XVII mandates the four-script contract, Husky + lint-staged, fast
pre-commit checks, full pre-push checks, and automated commit-message validation. Hooks delegate to
the same scripts used by CI so logic is not duplicated.

**Alternatives considered**:

- Per-hook inline command lists: rejected; duplicates the script contract and drifts.
- Running the full suite on pre-commit: rejected; too slow and explicitly discouraged.
- Bypassing hooks in normal flow: rejected by constitution.

---

## R-12 — Not-found semantics

**Decision**: The SPA declares a catch-all `*` route rendering `NotFoundPage` inside the shell, with
a working home link. No redirect is performed. Server-side 404 status and host rewrite are handled by
deployment configuration and documented as a dependency, not implemented here.

**Rationale**: FR-009 and RD-03 require the in-application experience and explicitly exclude host
guarantees. A redirect-based not-found would loop and harm back-button behavior.

**Alternatives considered**:

- Redirect unknown paths to `/`: rejected; loses the address, breaks back behavior, and contradicts
  the requirement to explain that the page does not exist.
- Static host `404.html` only: rejected; it bypasses the application shell and the localized state.

---

## R-13 — Reduced motion and transitions

**Decision**: The drawer uses a single 160 ms `ease-out` entrance and interactive states use 150 ms
`ease-out`; both are disabled under `prefers-reduced-motion: reduce`. No layout-affecting property
is transitioned. Skeletons do not animate position; a subtle opacity pulse is allowed and is also
suppressed under reduced motion.

**Rationale**: FR-029, Principle VII, and the Visual Identity motion section. The spec forbids
visible content shift and decorative animation.

**Alternatives considered**: Spinner-based loading (rejected by FR-012) and shimmer animations
(rejected as decorative motion that affects nothing functional).
