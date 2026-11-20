# Walplay Frontend

Single-page React foundation for Walplay: one responsive shell, three routes,
genuine on-demand route loading, English/Spanish localization, and fail-fast
startup configuration. The application is frontend-only and renders without
network data.

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

`.env.local` must contain a valid `VITE_APP_ENV` (`local` is the safe default).
No secret, endpoint, provider key, or database URL is used.

## Environment inventory

The inventory is closed. `src/shared/config/env.ts` is the only module that reads
`import.meta.env`; every other module receives the validated configuration.

| Variable           | Required | Default | Accepted values                                 | User-facing |
| ------------------ | -------- | ------- | ----------------------------------------------- | ----------- |
| `VITE_APP_ENV`     | yes      | —       | `local`, `development`, `staging`, `production` | no          |
| `VITE_APP_VERSION` | no       | `0.0.0` | non-empty version-like string (e.g. `1.4.2`)    | never       |

If `VITE_APP_ENV` is missing or invalid, the application renders only a localized
`AppConfigError` screen. If `VITE_APP_VERSION` is missing, empty, or invalid, the
documented default applies and a field-only developer warning is emitted. Warnings
never contain values.

## Scripts

| Script              | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Vite development server                       |
| `npm run lint`      | ESLint flat config, zero warnings tolerated   |
| `npm run typecheck` | `tsc --noEmit` for the app and node projects  |
| `npm run test`      | Vitest single run with V8 coverage thresholds |
| `npm run build`     | Type-check plus production Vite build         |
| `npm run preview`   | Serve the production build                    |
| `npm run format`    | Prettier write                                |

## Architecture

Feature-Sliced Design under `src/`:

- `app/` — bootstrap, providers, i18n initialization, route table, page loader,
  title synchronization, route announcements.
- `pages/` — Home, Settings, and Not-found screens.
- `widgets/app-shell/` — header, navigation, compact menu, shell regions.
- `features/switch-language/` — language radio group and preference hook.
- `shared/` — token-driven UI primitives, validated configuration, translation
  resources, storage adapter, small utilities.
- `test/` — Vitest setup, matchMedia mock, providers helper, axe helper.

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

Latest run in `frontend/`:

- `npm run lint` — pass, zero warnings.
- `npm run typecheck` — pass with all strict flags.
- `npm run test` — 40 files, 167 tests, zero unexpected warnings.
- Coverage: 95.88% lines, 87.55% branches, 94.64% functions. Per-file thresholds
  of 90% pass for configuration (`env.ts`), language storage, and the page loader.
- `npm run build` — pass with no application or third-party annotation warnings.

## Scope boundaries

This foundation contains no catalog, search, availability, watchlist, accounts,
authentication, playback, notifications, recommendations, ratings, social
features, backend, database, provider integration, analytics, or third-party
tracking. It persists only `walplay.language.v1`. The home placeholder contains no
invented titles, artwork, ratings, availability, or promotional claims, and no
call to action because none is functional yet.

## Definition of Done

- [x] `lint`, `typecheck`, `test`, and `build` pass with zero unexpected warnings.
- [x] Automated accessibility checks report zero critical or serious violations on
      every route and state.
- [ ] Manual keyboard and screen-reader pass completed (automated keyboard checks
      pass; physical screen-reader pass pending reviewer execution).
- [x] Responsive matrix at 360/768/1024/1440 px and 200% zoom recorded with no
      horizontal overflow and the correct compact/wide presentation.
- [x] Performance check recorded: LCP 2021 ms ≤ 2.5 s and bundle budget passed.
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
| 9. Performance                              | PASS — LCP 2255 ms, bundle budget met                                                                                                                                 |
