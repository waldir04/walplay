# Walplay Frontend

Single-page React application for Walplay: one responsive shell, the
entertainment catalog (Browse, category, and minimal title detail), genuine
on-demand route loading, English/Spanish localization, and fail-fast startup
configuration. Catalog data comes from the internal Walplay backend; the browser
never calls the external provider and never holds a provider credential.

## Prerequisites

| Requirement     | Value                                                                 |
| --------------- | --------------------------------------------------------------------- |
| Node.js         | LTS pinned in `.nvmrc` (Node 22 line); `engines` requires `>=22.12.0` |
| Package manager | `npm` with the committed `package-lock.json`                          |
| Browser         | Latest two major versions of current desktop and mobile browsers      |

## Setup

```bash
cd frontend
npm ci
cp .env.example .env.local
```

`.env.local` must contain a valid `VITE_APP_ENV` (`local` is the safe default)
and the internal catalog API origin in `VITE_API_BASE_URL`. No provider key,
provider endpoint, or database URL is used in the browser.

## Environment inventory

The inventory is closed. `src/shared/config/env.ts` is the only module that reads
`import.meta.env`; every other module receives the validated configuration.

| Variable            | Required   | Default                 | Accepted values                                 | User-facing |
| ------------------- | ---------- | ----------------------- | ----------------------------------------------- | ----------- |
| `VITE_APP_ENV`      | yes        | —                       | `local`, `development`, `staging`, `production` | no          |
| `VITE_APP_VERSION`  | no         | `0.0.0`                 | non-empty version-like string (e.g. `1.4.2`)    | never       |
| `VITE_API_BASE_URL` | production | `http://localhost:4000` | http(s) URL                                     | no          |

If `VITE_APP_ENV` is missing or invalid, the application renders only a localized
`AppConfigError` screen. If `VITE_APP_VERSION` is missing, empty, or invalid, the
documented default applies and a field-only developer warning is emitted. In
production, `VITE_API_BASE_URL` is required; outside production the local default
applies with a field-only warning. An invalid URL fails fast without echoing the
value. Warnings never contain values.

## Scripts

| Script                     | Purpose                                                     |
| -------------------------- | ----------------------------------------------------------- |
| `npm run dev`              | Vite development server                                     |
| `npm run lint`             | ESLint flat config, zero warnings tolerated                 |
| `npm run typecheck`        | `tsc --noEmit` for the app and node projects                |
| `npm run test`             | Vitest single run with V8 coverage thresholds               |
| `npm run test:reliability` | Repeated shuffled Vitest runs with flake and skip detection |
| `npm run build`            | Type-check plus production Vite build                       |
| `npm run preview`          | Serve the production build                                  |
| `npm run format`           | Prettier write                                              |

## Reliability validation

The frontend suite runs with Vitest's default file-level concurrency and per-file isolation.
Use Node.js 22 so local results match CI:

```bash
cd frontend
nvm use            # reads .nvmrc (Node 22)
npm ci
npm run test
```

`npm run test:reliability` repeats the complete suite with shuffled files, shuffled tests, and
a deterministic seed per iteration, then reports any flaky or skipped test and exits non-zero
when it finds one:

```bash
npm run test:reliability -- --runs 10
npm run test:reliability -- --runs 20 --report reliability-report.json
```

| Option            | Effect                                            |
| ----------------- | ------------------------------------------------- |
| `--runs <n>`      | Iterations, default `10`                          |
| `--seed <n>`      | Base seed; each iteration derives a distinct seed |
| `--report <path>` | Report path, default `reliability-report.json`    |
| `--no-shuffle`    | Fixed-order baseline mode                         |
| `--coverage`      | Enable coverage for every iteration               |

The report records the commit, Node.js version, command, per-run seeds, per-test outcomes, and
the median and p95 duration. A fixed wall-clock wait is not used in the suite: timer-driven
behavior uses fake timers and promise races use `act`/`waitFor`.

## Architecture

Feature-Sliced Design under `src/`:

- `app/` — bootstrap, providers, i18n initialization, route table, page loader,
  title synchronization, route announcements.
- `pages/` — Home, Settings, Browse landing, catalog category, minimal title
  detail, catalog not-found, and the foundation not-found screens.
- `entities/catalog/` — catalog Zod models and formatters, the API client and key
  factory, TanStack Query hooks, and card/grid/skeleton/poster primitives.
- `features/switch-catalog-media/` and `features/load-more-catalog/` — the
  catalog interactions; `features/switch-language/` keeps the language control.
- `widgets/` — app shell, catalog section previews, category lists, and provider
  attribution.
- `shared/` — token-driven UI primitives, the typed HTTP client, validated
  configuration, translation resources, storage adapter, small utilities.
- `test/` — Vitest setup, matchMedia mock, providers helper, axe helper, and
  catalog fixtures.

## Catalog implementation

Routes (all inside the existing shell):

| Address                                                        | Surface                                                |
| -------------------------------------------------------------- | ------------------------------------------------------ |
| `/browse`                                                      | Redirect with `replace` to `/browse/movies`            |
| `/browse/movies`, `/browse/tv-shows`                           | Landing with trending, popular, and top-rated previews |
| `/browse/:media-type/popular`, `/browse/:media-type/top-rated` | Paginated category list                                |
| `/browse/:media-type/title/:itemId`                            | Minimal title detail, from a card or direct address    |
| `/browse/*`                                                    | Catalog not-found inside the shell                     |

- TanStack Query is the only server-state mechanism. A single `QueryClient` is
  created at the app root with retries disabled, `staleTime` 5 minutes, `gcTime`
  30 minutes, and no refetch-on-focus requirement.
- Query keys live in `entities/catalog/api/catalogKeys.ts` and include media type,
  section/category, locale, page, and item id. A language change therefore starts
  a category at page one and discards old-language pages.
- Landing previews are independent queries, so one failed section cannot collapse
  the page. A page-level error appears only when every supported section fails.
- Category lists use `useInfiniteQuery`, append-only deduplication by opaque id,
  provider order, single-flight activation, an announced appended count, and an
  end-of-list status.
- Cards have exactly one interactive target. The accessible name includes the
  title, textual media type, and optional year and rating with explicit out-of-10
  context. Missing metadata is omitted, never fabricated; artwork failure swaps to
  a neutral fallback with the same reserved ratio.
- Loading uses layout-matching skeletons with `aria-busy`; errors use alert
  semantics; append, end, and stale changes use one polite status. Reduced motion
  suppresses skeleton animation.
- The official TMDB mark and non-endorsement statement are rendered on every
  provider-data surface from `shared/assets/tmdb-logo.svg`; the source URL is recorded in
  `shared/assets/README.md`, and OD-13 legal review remains a release gate.

Imports flow downward. Shared UI never imports pages, features, or widgets.

## Internationalization

- All user-facing text comes from `shared/i18n/resources/en.json` and `es.json`.
- English is canonical and the fallback. A missing Spanish key falls back to
  English; a raw key, `undefined`, or an empty element must never reach the UI.
- `<html lang>` follows the active locale. Document titles come only from
  `meta.title.*` resources.
- Interpolation uses i18next syntax. Dates, numbers, and plurals, when introduced,
  must use `Intl` and i18next plural keys; no ad-hoc formatting.
- The language preference is stored under `walplay.language.v1` as
  `{ "version": 1, "locale": "en" | "es" }`, validated with Zod on read. Invalid,
  outdated, missing, or unreadable storage falls back to browser detection and
  then English. The session remains switchable when storage is unavailable.
- Settings displays the localized local-storage notice: the preference lives only
  in this browser and may be lost if storage is cleared or the device changes.

## Git hooks (repository root)

Install from the repository root:

```bash
npm install
```

The `prepare` script installs Husky hooks:

- `pre-commit` runs lint-staged: Prettier on staged frontend files and ESLint
  (zero warnings) on staged `frontend/src` TypeScript files.
- `pre-push` runs `lint`, `typecheck`, `test`, and `build` in `frontend/`.
- `commit-msg` enforces Conventional Commits through commitlint.

Troubleshooting:

- Hooks not running: `npm install` at the repository root, then confirm
  `git config core.hooksPath` points to `.husky/_` (Husky sets this on install).
- `npx: command not found` in a GUI Git client: ensure the client inherits your
  shell `PATH`, or run `npm install` and the commit from a terminal once.
- lint-staged cannot find ESLint/Prettier: run `npm ci` in `frontend/` so
  `frontend/node_modules` exists; the root configuration calls those binaries
  directly.
- Emergency local bypass is possible with `--no-verify`, but CI and review still
  require the same checks.

## Accessibility verification

Automated evidence (run `npm run test`):

- Keyboard tests cover the skip link as the first Tab stop, skip activation moving
  focus to `main#main-content`, compact-menu focus entry and Tab containment,
  Escape close with focus return, route-change close, and viewport-widen close.
- Route-change tests assert that in-app navigation focuses the page `h1` and emits
  one polite announcement, while a direct document load does not move focus or
  announce.
- `vitest-axe` runs on every route, on the open compact menu, and on error and
  loading primitives with zero critical or serious violations.

Manual procedure before release (quickstart Scenario 3), at 360 px width and at
200% zoom:

1. Load any route and press Tab once: the skip link is revealed.
2. Activate it: focus lands on the main region.
3. Tab through brand, navigation, menu, and language controls: every control has a
   visible focus outline with a 2 px offset.
4. Open the compact menu with the keyboard: focus enters the dialog, Tab and
   Shift+Tab stay inside, Escape closes it, and focus returns to the trigger.
5. Navigate in-app and confirm the screen reader announces the new page heading
   once and reports the current destination as current.

Recorded result: the automated keyboard and axe checks pass. A manual
screen-reader pass requires a physical screen reader (VoiceOver/NVDA) and was not
run in this headless environment; perform steps 1–5 before release.

## Responsive verification

- The shell switches presentations with `matchMedia('(min-width: 768px)')`; tests
  verify the compact trigger below 768 px and the wide navigation at and above it.
- Layout uses mobile-first Tailwind classes, a centered `max-w-5xl` main region,
  `1rem`/`1.5rem` page padding, flexible wrapping, and no fixed widths or
  truncation in Settings or the language control.
- Automated assertion: Settings page markup contains no `truncate` or
  `whitespace-nowrap`; Spanish storage-notice copy is asserted in both locales.

Recorded Chrome DevTools Protocol check against the production preview (mobile
emulation, height 900 px):

| Viewport                         | `scrollWidth` | `h1` | Presentation                        | Result |
| -------------------------------- | ------------- | ---- | ----------------------------------- | ------ |
| 360 px                           | 360           | 1    | compact trigger + dialog navigation | PASS   |
| 768 px                           | 768           | 1    | wide navigation, no compact trigger | PASS   |
| 1024 px                          | 1024          | 1    | wide navigation                     | PASS   |
| 1440 px                          | 1440          | 1    | wide navigation                     | PASS   |
| 180 px CSS (360 px at 200% zoom) | 180           | 1    | compact trigger                     | PASS   |

Settings and not-found were also checked at 360 px and 180 px CSS: no horizontal
overflow, both language radios rendered, no truncation, and Spanish Settings at
360 px renders `Ajustes` with `<html lang="es">` and the localized storage notice.
No horizontal page scrolling was observed at any recorded width.

## Performance and bundle budget

Recorded production build (`npm run build`):

- Shell entry JS: 466.06 kB (146.92 kB gzip)
- Route chunks: home 0.95 kB, settings 2.20 kB, not-found 0.56 kB
- CSS: 16.66 kB (4.64 kB gzip)
- Inter is self-hosted through `@fontsource-variable/inter`; no runtime font
  request is made.

Budget: shell JS ≤ 500 kB (gzip ≤ 160 kB) and each route chunk ≤ 5 kB. Pass.

Lighthouse 12, mobile form factor with simulated throttling, production preview
at `/`:

| Metric              | Result                          |
| ------------------- | ------------------------------- |
| Performance score   | 0.97                            |
| LCP                 | 2255 ms (gate ≤ 2500 ms) — PASS |
| FCP                 | 2029 ms                         |
| Total blocking time | 0 ms                            |
| CLS                 | 0                               |
| Transfer size       | 203,619 bytes                   |

The shell chunk and each page chunk are emitted separately; no route chunk is
merged into the shell chunk.

## Quality gates and coverage

Latest run in `frontend/` after the catalog implementation:

- `npm run lint` — pass, zero warnings.
- `npm run typecheck` — pass with all strict flags.
- `npm run test` — 112 files, 389 tests, zero unexpected warnings.
- Coverage: 96.93% lines, 91.84% branches, 94.36% functions. The global 80%
  threshold and the 90% catalog thresholds pass for `entities/catalog/model/*`,
  `entities/catalog/api/*`, `CatalogCard.tsx`, and `PosterFallback.tsx`, plus the
  existing configuration, storage, and loader thresholds.
- `npm run build` — pass, no warnings. Catalog pages emit one lazy chunk each:
  browse, catalog-category, title-detail, and catalog-not-found.

## Scope boundaries

The catalog contains no search, filters, watchlist, favorites, availability,
playback, accounts, authentication, cast, seasons, episodes, trailers, full detail
pages, recommendations, analytics, or third-party tracking. There is no database
and no browser persistence beyond `walplay.language.v1`. Provider text is shown
with attribution and is never machine-translated. The Home surface offers only a
working Browse entry. Settings is unchanged.

## Catalog security verification

Recorded against `frontend/dist` after `npm run build`:

- No `TMDB_ACCESS_TOKEN`, provider bearer value, `api.themoviedb.org` base URL,
  provider DTO field name (`poster_path`, `vote_average`), provider error text, or
  stack trace appears in any browser-delivered bundle or source map.
- The only provider string in the bundle is the user-facing non-endorsement
  statement from translation resources.
- Image URLs arrive from the backend as absolute URLs on the documented provider
  image host and carry no credential.
- Deployment can apply a Content Security Policy that allowlists the configured
  API origin plus `https://image.tmdb.org` for images, with no wildcard.
- No third-party tracking or advertising script is present.

Verification commands:

```bash
cd frontend
npm run build
grep -RInE "TMDB_ACCESS_TOKEN|api\.themoviedb\.org|poster_path|vote_average|test-token" dist || true
ls dist/assets | grep -E "browse|catalog-category|title-detail|catalog-not-found"
```

## Catalog quickstart record

| Scenario                                         | Result                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Browse movies and TV shows                    | PASS (automated) — default Movies, declared section order, media switch replaces content, direct type addresses, back/forward, Browse active on nested paths, one `h1`.                                                                                                                                                                              |
| 2. Category and title navigation                 | PASS (automated) — See all addresses, page 1 only, category-specific content, card detail from router state without a second request, direct lookup, unknown item/category not-found in the shell, validated return.                                                                                                                                 |
| 3. Load more                                     | PASS (automated) — append below existing items, no duplicates or reordering, single request per activation, busy state, announced count, end-of-list with focus, later-page failure keeps the list and retries inline.                                                                                                                               |
| 4. Incomplete metadata                           | PASS (automated) — missing poster/year/rating/genre omitted cleanly, image failure fallback, long Spanish titles, all-invalid page becomes an empty state, no fabricated values.                                                                                                                                                                     |
| 5. Loading, empty, provider failures             | PASS (automated) — layout-matching skeletons, isolated section errors, one page-level all-failed error, empty/rate-limited/timeout/invalid states, labeled stale data, no technical detail, retry single-flight.                                                                                                                                     |
| 6. Responsive, keyboard, screen reader, language | Automated PASS — 2/3/4/5-column classes, keyboard journey, one card target, axe coverage, reduced-motion skeleton, Spanish long titles, language-aware keys and category reset. Manual screen-reader and live-provider passes require a physical screen reader and an approved TMDB token; they are reviewer release checks, not automated evidence. |

The SC-010 one-second post-availability budget and the SC-007 mobile profile are
design budgets. Automated tests verify that the new-language request starts at
page one and that the final selection wins; the wall-clock budget must be observed
in the manual release pass with the live provider.

## Definition of Done

- [x] `lint`, `typecheck`, `test`, and `build` pass with zero unexpected warnings.
- [x] Automated accessibility checks report zero critical or serious violations on
      every route and state.
- [ ] Manual keyboard and screen-reader pass completed (automated keyboard checks
      pass; physical screen-reader pass pending reviewer execution).
- [x] Responsive matrix at 360/768/1024/1440 px and 200% zoom recorded with no
      horizontal overflow and the correct compact/wide presentation.
- [x] Performance check recorded for the shell baseline; the catalog adds four
      lazy page chunks and deliberate query caching. The live-provider SC-007
      profile remains a manual release check.
- [x] No `any`, unjustified assertions, or suppressions introduced in application
      code.
- [x] Documentation (`.env.example`, this README, ADR, quickstart) matches the
      implementation.

## Quickstart scenario record

| Scenario                                    | Result                                                                                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Shell and responsive layout              | PASS — CDP width matrix above plus `AppShell` tests                                                                                                                   |
| 2. Navigation, direct addresses, history    | PASS — `routes.integration.test.tsx`                                                                                                                                  |
| 3. Keyboard and screen reader               | Keyboard PASS (`skipLink`, `CompactMenu`, announcement tests); physical screen-reader pass pending reviewer                                                           |
| 4. Language switching and persistence       | PASS — language unit/integration/persistence tests and Spanish narrow-width CDP check                                                                                 |
| 5. Loading, error, and configuration states | PASS — loader, retry, containment, config-state tests; the invalid-environment build rendered only the localized configuration screen                                 |
| 6. Rapid interaction and reduced motion     | PASS — rapid-navigation tests; reduced-motion overrides present with no position animation                                                                            |
| 7. Visual identity audit                    | PASS — token and logo assertions; no raw hex outside `@theme`, tests, and the static favicon                                                                          |
| 8. Scope audit                              | PASS — no catalog, search, availability, watchlist, account, auth, playback, provider, database, analytics, or tracking code; only `walplay.language.v1` is persisted |
| 9. Performance                              | PASS — shell baseline LCP 2255 ms; catalog chunks split per page and query caching in place                                                                           |
| Catalog scenarios 1–6 (feature 002)         | PASS (automated) — see "Catalog quickstart record"; manual screen-reader and live-provider checks pending reviewer                                                    |
