---
description: "Task list for Initial App Foundation implementation"
---

# Tasks: Initial App Foundation

**Input**: Design documents from `/specs/001-app-foundation/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md, `.specify/memory/constitution.md`

**Tests**: Included because the Walplay Constitution (Principle VIII, Definition of Done) mandates tests for every delivered behavior. Tests are written with Vitest + React Testing Library + jest-dom + vitest-axe, use the AAA pattern, and MUST fail before their implementation task is considered complete.

**Organization**: Tasks are grouped by user story. Phases 1–2 deliver shared scaffolding required by every story; Phases 3–7 deliver US1–US5 independently testable increments.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story label (US1–US5) only in user-story phases
- Every task names its exact file path under `frontend/` or the repository root
- Source of truth: `plan.md` structure, `data-model.md` shapes, and `contracts/` interfaces. Do not add scope beyond them.

## Path Conventions

- Application: `frontend/src/`
- Frontend tests are co-located as `*.test.ts(x)` or `*.integration.test.tsx`
- Root tooling: repository root (`package.json`, `.husky/`, `commitlint.config.js`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the `frontend/` toolchain exactly as approved in plan.md. No product feature yet.

- [X] T001 Scaffold `frontend/` as a Vite + React 19 + TypeScript SPA: create `frontend/package.json`, `frontend/index.html`, `frontend/vite.config.ts` (React plugin, `@/` alias to `src/`, `@tailwindcss/vite`), `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`, and the directory tree from plan.md (`src/app`, `src/pages`, `src/widgets`, `src/features`, `src/shared`, `src/test`).
- [X] T002 Pin Node.js LTS for tooling: add `frontend/.nvmrc` and an `engines` entry in `frontend/package.json`; do not use a floating Node version.
- [X] T003 Install exactly the approved runtime dependencies in `frontend/package.json`: `react` 19, `react-dom` 19, `react-router` 7, `i18next`, `react-i18next`, `zod`, `@fontsource-variable/inter`; and dev dependencies: Vite 7, `@vitejs/plugin-react`, TypeScript 5, `tailwindcss` 4 with `@tailwindcss/vite`, Vitest, jsdom, React Testing Library, `@testing-library/jest-dom`, `@testing-library/user-event`, `vitest-axe`, ESLint with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, Prettier. Do **not** install TanStack Query or any dependency outside the approved stack. Commit the lockfile.
- [X] T004 [P] Enable strict TypeScript in `frontend/tsconfig.app.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`; keep `tsc --noEmit` runnable across all projects.
- [X] T005 [P] Configure Tailwind 4 and the single token source in `frontend/src/app/styles/index.css`: `@import 'tailwindcss'`, `@import '@fontsource-variable/inter'`, and one `@theme` block with the canonical tokens `canvas #0B1215`, `surface #131D22`, `surface-raised #152026`, `surface-subtle #152026`, `border #23323A`, `border-strong #5B6B73`, `text #F3F4F6`, `text-muted #8B9BA3`, `text-inverse #0B1215`, `primary #34D399`, `primary-strong #10B981`, `success #34D399`, `warning #FBBF24`, `danger #F87171`, `focus #34D399`, `tag-border #2A3B44`, `tag-text #9CA3AF`; add the display/title/body/caption scale, `--radius-card` 1rem, `--radius-control` 0.5rem, page padding/section-rhythm spacing, the shared 2px `focus` outline with 2px offset, base `canvas`/`text` styles, `tabular-nums` utility, and `prefers-reduced-motion` overrides. `#000000` must not be the canvas.
- [X] T006 [P] Configure ESLint flat config in `frontend/eslint.config.js`: `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`; enforce `func-style: ['error', 'expression']`, `prefer-arrow-callback`, no `any`, no `@ts-ignore`, no raw hex literals in `src/**/*.{ts,tsx}`, and forbid `import.meta.env` access outside `src/shared/config/env.ts`.
- [X] T007 [P] Configure Prettier in `frontend/.prettierrc.json` and `frontend/.prettierignore` (ignore `dist`, `coverage`, lockfile); formatting must not conflict with ESLint.
- [X] T008 [P] Configure Vitest in `frontend/vitest.config.ts` with jsdom, `src/test/setup.ts`, coverage provider, global threshold 80%, per-file thresholds of 90% for `src/shared/config/env.ts`, `src/shared/lib/languageStorage.ts`, and `src/app/routing/usePageModule.ts`; add `@testing-library/jest-dom`, `vitest-axe` matchers, and console guards in `frontend/src/test/setup.ts` that fail on unexpected `console.warn`, `console.error`, and unhandled rejections.
- [X] T009 [P] Add the canonical scripts to `frontend/package.json`: `dev`, `lint` (zero warnings), `typecheck` (`tsc --noEmit -p tsconfig.app.json` plus node config), `test` (run once, no watch), `build` (`tsc` + Vite build), `preview`, and `format`.
- [X] T010 [P] Create `frontend/.env.example` documenting the closed inventory: required `VITE_APP_ENV` with accepted values `local | development | staging | production`, and optional `VITE_APP_VERSION` defaulting to `0.0.0`, never shown in the interface. No secrets or endpoints.
- [X] T011 [P] Create `frontend/public/logo.svg` as the 32×32 favicon: `canvas` color rounded background with the mint W path `M5 10 L11 22 L16 13 L21 22 L27 10`, `fill="none"`, `strokeWidth="3.6"`, round caps/joins.
- [X] T012 [P] Create `frontend/src/shared/lib/cn.ts`: a small typed class-name joiner (arrow function) that accepts conditional class values and returns a single string; no dependency outside the approved stack.
- [X] T013 [P] Create `frontend/README.md` with prerequisites, `npm ci`, `cp .env.example .env.local`, the script contract (`dev`, `lint`, `typecheck`, `test`, `build`, `preview`), and a note that the application is frontend-only and network-free at runtime.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared configuration, internationalization, persistence, design primitives, and the route table every story depends on.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [X] T014 Create `frontend/src/shared/config/constants.ts`: `LANGUAGE_STORAGE_KEY = 'walplay.language.v1'`, `LANGUAGE_STORAGE_VERSION = 1`, `DEFAULT_APPLICATION_VERSION = '0.0.0'`, supported locale codes `['en', 'es']`, `SUPPORTED_LOCALE_CODES`, wide-layout breakpoint `768`, and the main-content id `main-content`. No other configuration values.
- [X] T015 Implement `frontend/src/shared/config/env.ts` as the only module that reads `import.meta.env`: a strict Zod schema where `VITE_APP_ENV` is required and limited to `local | development | staging | production`, and `VITE_APP_VERSION` is optional and, when absent, empty, or invalid, applies `'0.0.0'` and records a field-only warning; a present non-empty value must be a valid version-like string. Export a frozen `AppConfig` and a discriminated `ConfigResult` of `{ status: 'valid', config, warnings } | { status: 'invalid-required', warnings }`. Warnings name fields only, never values.
- [X] T016 [P] Write `frontend/src/shared/config/env.test.ts`: valid required value, missing required value, invalid enum value, absent optional value applying `'0.0.0'`, empty-string optional value applying the default with a field-only warning, invalid optional value applying the default with a field-only warning, and no value leakage in warnings.
- [X] T017 Implement `frontend/src/app/AppConfigError.tsx`: an arrow-function, localized fatal screen rendering only `errors.config.title` and `errors.config.description` from i18n; no shell, navigation, variable name, value, stack trace, or internal identifier.
- [X] T018 [P] Write `frontend/src/app/AppConfigError.test.tsx`: asserts localized heading/description, absence of shell/nav regions, and absence of `VITE_` names, values, and technical detail in both English and Spanish.
- [X] T019 Implement `frontend/src/shared/lib/languageStorage.ts`: read/write `{ "version": 1, "locale": "en" | "es" }` under `walplay.language.v1` using the strict Zod schema from `contracts/language-preference.md`; return `stored | absent | invalid | unavailable`; wrap `localStorage` access and `JSON.parse` so `SecurityError`, quota errors, and parse failures never throw; reject unknown fields, other versions, and unsupported locales.
- [X] T020 [P] Write `frontend/src/shared/lib/languageStorage.test.ts`: valid value, missing key, invalid JSON, `{ "version": 9, "locale": "fr" }`, unsupported locale, unknown field, and throwing `localStorage`; verify no throw, correct persistence status, and no write on read.
- [X] T021 Implement `frontend/src/app/i18n/resolveInitialLanguage.ts` as a pure arrow function: stored valid preference → first supported base-subtag match in `navigator.languages` (`es-MX`, `es-419` → `es`; `en-GB` → `en`; `fr-FR`, then `es-ES` → `es`) → `'en'`; handle missing `navigator` and empty `languages`; also report origin `explicit | detected | fallback` and persistence state.
- [X] T022 [P] Write `frontend/src/app/i18n/resolveInitialLanguage.test.ts` covering the full detection matrix in `contracts/language-preference.md`, including unsupported-only browsers and unreadable storage.
- [X] T023 Create `frontend/src/shared/i18n/resources/en.json` with every key listed in `contracts/i18n-resources.md` (`app.*`, `navigation.*`, `meta.*`, `a11y.*`, `home.*`, `settings.*` including `settings.language.storageNotice`, `states.*`, `languages.*`, `errors.*`); English is canonical, `app.name` is `Walplay`, and no fabricated entertainment titles, artwork, ratings, or availability copy is present.
- [X] T024 [P] Create `frontend/src/shared/i18n/resources/es.json` with a complete Spanish translation of the same key set, including `settings.language.storageNotice`, identical structure, `Walplay` untranslated, and endonyms `English` / `Español` in `languages.*`.
- [X] T025 [P] Write `frontend/src/shared/i18n/resources/resources.test.ts`: leaf-key parity between `en.json` and `es.json`, no empty strings, `app.name === 'Walplay'`, and endonyms identical across locales.
- [X] T025a [P] Write a translation key-usage test that scans `frontend/src/` for `t('...')`/`i18nKey` references and asserts every referenced key exists in both resources; no raw key may reach the interface.
- [X] T026 Implement `frontend/src/app/i18n/index.ts`: initialize i18next synchronously with both bundled resources, `fallbackLng: 'en'`, `supportedLngs: ['en', 'es']`, `initImmediate: false`, `interpolation.escapeValue: false`, default namespace `translation`; set `document.documentElement.lang` on init and on every `languageChanged`; export the initialized instance and a `changeLanguage` helper; no runtime translation requests.
- [X] T027 [P] Write `frontend/src/app/i18n/index.test.ts`: synchronous initialization, English fallback, Spanish change updates `<html lang>`, and repeated init is not required on language change.
- [X] T028 Implement `frontend/src/shared/ui/WalplayLogo.tsx` exactly per the constitution: inline SVG `0 0 32 32`, path `M5 10 L11 22 L16 13 L21 22 L27 10`, 28×28, `fill="none"`, `strokeWidth="3.6"`, round caps/joins, `stroke="currentColor"` with `text-primary`, `aria-hidden="true"`, live-text `Walplay` wordmark with `text-xl font-semibold tracking-tight text-text`, `inline-flex items-center gap-2.5`, `showText` defaulting to true, `showText={false}` yielding the icon only; no per-state recolor or animation.
- [X] T029 [P] Implement `frontend/src/shared/ui/PageContainer.tsx`: centered maximum content width with `px-4 sm:px-6` page padding; props `children` and optional `className`.
- [X] T030 [P] Implement `frontend/src/shared/ui/SkipLink.tsx`: an `<a>` with the given `label` and `href="#<targetId>"`, visually hidden until focused and visible on focus; activating it moves focus to the target, which the shell renders with `tabIndex={-1}`.
- [X] T031 [P] Implement `frontend/src/shared/ui/Button.tsx`: arrow component with variants `primary | secondary | ghost`, 8px `rounded-control`, at least 44px minimum height for primary/secondary, focus-visible ring, `primary` with `text-text-inverse` and hover `primary-strong`, `secondary` with `border-border-strong` and hover `surface-raised`, `ghost` with `text-primary` and hover `surface-raised`; preserve native `<button>` semantics.
- [X] T031a [P] Implement `frontend/src/shared/ui/Link.tsx`: a presentation-only router-link wrapper with `to`, `children`, optional `className`, semantic-token styling, and the shared 2px `focus` outline with 2px offset; no raw color values, no business logic, and no non-functional `href` or `onClick`-only link behavior.
- [X] T032 [P] Implement `frontend/src/shared/ui/Skeleton.tsx`: `bg-surface-subtle` block with configurable radius/class; always `aria-hidden="true"`; no layout-shifting animation; any opacity pulse disabled under reduced motion.
- [X] T033 [P] Implement `frontend/src/shared/ui/LiveRegion.tsx`: visually hidden `aria-live` region with `polite` default and `assertive` option; clear the message before setting a new one so stale-language text is never announced.
- [X] T034 [P] Implement `frontend/src/shared/ui/EmptyState.tsx`: calm `surface` card with `border`, 16px radius, optional icon; real `h2` heading below the page `h1`; render an action only when `action` is provided and functional; with no action, render no button or link.
- [X] T035 [P] Implement `frontend/src/shared/ui/ErrorState.tsx`: `role="alert"` exactly once per failure; localized title/description; optional `retry` only when retry is genuine; always-present `homeAction` pointing to `/`; heading is focusable (`tabIndex={-1}`) and receives focus when it replaces route content; never render stack traces, module names, identifiers, or provider detail.
- [X] T036 [P] Implement `frontend/src/shared/ui/RouteLoadingState.tsx`: container with `aria-busy="true"` and an accessible label, localized heading, decorative skeleton bars mirroring the final page layout and marked `aria-hidden="true"`, no spinner, no bare "Loading…" as the only indication, and no position animation.
- [X] T037 Create `frontend/src/shared/ui/index.ts` exporting the public APIs of all `shared/ui` components, including `Button` and `Link`; no component may import from `pages`, `features`, or `widgets`.
- [X] T038 [P] Write `frontend/src/shared/ui/WalplayLogo.test.tsx`: exact path, viewBox, 28×28 size, strokeWidth 3.6, round caps/joins, `aria-hidden` mark, live-text `Walplay`, `showText={false}` behavior, token class usage, and no `<img>`/animation.
- [X] T039 [P] Write `frontend/src/shared/ui/Button.test.tsx`: native button semantics, variant classes, accessible name requirement for icon-only ghost use, focus-visible ring class, and 44px minimum height for primary/secondary.
- [X] T039a [P] Write `frontend/src/shared/ui/Link.test.tsx`: router target, accessible name from children, token classes, focus-visible outline, and no raw hex or non-functional link.
- [X] T040 [P] Write `frontend/src/shared/ui/SkipLink.test.tsx`: first-focusable behavior is covered by shell tests; here assert the link target, label, and hidden-until-focus classes.
- [X] T041 [P] Write `frontend/src/shared/ui/EmptyState.test.tsx`: heading level, description, action rendered when provided and absent when omitted, and no non-functional CTA.
- [X] T042 [P] Write `frontend/src/shared/ui/ErrorState.test.tsx`: `role="alert"`, retry present only when supplied, home action always present, heading focusability, no technical detail, plus a vitest-axe assertion with zero critical/serious violations.
- [X] T043 [P] Write `frontend/src/shared/ui/RouteLoadingState.test.tsx`: `aria-busy`, accessible label, decorative skeleton `aria-hidden`, no spinner, no bare "Loading…" text, and a vitest-axe assertion.
- [X] T044 [P] Write `frontend/src/shared/ui/LiveRegion.test.tsx`: polite/assertive behavior, visually hidden, and message cleared before replacement so stale text is not announced.
- [X] T045 Create `frontend/src/test/renderWithProviders.tsx`: an arrow-function test helper rendering a memory router and the initialized i18n instance, with optional `initialEntries` and `locale`; no network and no real timers.
- [X] T046 [P] Create the Home page slice scaffold: `frontend/src/pages/home/index.ts` and `frontend/src/pages/home/ui/HomePage.tsx` with the localized `h1` (`home.title`) and a short purpose paragraph; full home placeholder content is completed in US2.
- [X] T047 [P] Create the Settings page slice scaffold: `frontend/src/pages/settings/index.ts` and `frontend/src/pages/settings/ui/SettingsPage.tsx` with the localized `h1` (`settings.title`) and `settings.description`; no language control yet (added in US4), and no version, environment, account, or diagnostic content.
- [X] T048 [P] Create the not-found page slice scaffold: `frontend/src/pages/not-found/index.ts` and `frontend/src/pages/not-found/ui/NotFoundPage.tsx` with the localized `h1` (`states.notFound.title`), description, and a working home link; semantically distinct from an error state.
- [X] T049 Implement `frontend/src/app/routing/routes.tsx` with the authoritative route table: `/` (`home`, default, navigable, `meta.title.home`), `/settings` (`settings`, navigable, `meta.title.settings`), and `*` including nested paths (`not-found`, not navigable, `meta.title.notFound`); export route metadata (path, page kind, navigable, titleKey) as the single source for navigation items; a minimal layout route rendering `<Outlet />` for now; exactly one default route; static page imports until US5 introduces on-demand loading. Do not add other top-level destinations.
- [X] T050 Implement `frontend/src/app/routing/usePageTitle.ts`: sets the localized `document.title` from the active route's `titleKey`, updates on language change, and restores nothing beyond the documented titles.
- [X] T051 [P] Write `frontend/src/app/routing/usePageTitle.test.tsx`: each route sets its localized title and a language change updates it without a reload.
- [X] T052 Implement `frontend/src/app/App.tsx`: composition root that renders the data router via `RouterProvider`; no providers beyond routing and i18n are introduced (no TanStack Query).
- [X] T053 Implement `frontend/src/app/main.tsx` bootstrap in the normative order: resolve initial language → initialize i18n → validate configuration with `parseConfig` → render `App` when valid, or render `AppConfigError` when `invalid-required`; never render a partially working shell; no secret or raw value is exposed.
- [X] T054 [P] Write `frontend/src/app/bootstrap.test.tsx`: with a valid environment the router renders the resolved route heading; assert no variable value or internal identifier is printed. Missing or invalid required `VITE_APP_ENV` assertions live in T104 so startup configuration behavior has one integration owner.

**Checkpoint**: Shared configuration, i18n, storage, UI primitives, pages, and routing exist. User stories can now start.

---

## Phase 3: User Story 1 — Consistent, responsive application shell (Priority: P1) 🎯 MVP

**Goal**: One responsive shell with the brand lockup, primary navigation, compact menu, and main content region, stable at all supported widths.

**Independent Test**: Open each initial route at 360, 768, 1024, and 1440px and at 200% zoom; confirm one header, one labeled navigation region, one main region, one page heading, reachable controls, compact navigation below 768px, wide navigation at 768px and above, and no footer or header language shortcut.

### Implementation for User Story 1

- [X] T055 [P] [US1] Create `frontend/src/widgets/app-shell/model/navigationItems.ts`: derive the Home (`/`, `navigation.home`) and Settings (`/settings`, `navigation.settings`) items by filtering the exported route metadata for `navigable: true`; do not duplicate paths or navigation visibility rules, and no data fetching.
- [X] T056 [US1] Implement `frontend/src/widgets/app-shell/ui/AppHeader.tsx`: one `<header>` containing the brand link to `/` built on the shared `Link` treatment, whose accessible name is `app.name` and which wraps `WalplayLogo`; render the compact menu trigger and `CompactMenu` in the header; no persistent header language shortcut.
- [X] T057 [US1] Implement `frontend/src/widgets/app-shell/ui/PrimaryNavigation.tsx`: `<nav aria-label={ariaLabel}>` with a list of links built on the shared `Link` treatment; props `items`, `ariaLabel`, optional `onNavigate`; usable by both wide and compact presentations; active-state styling is completed in US2.
- [X] T058 [US1] Implement `frontend/src/widgets/app-shell/ui/CompactMenu.tsx` as the component rendered by `AppHeader`: a `<button>` trigger with a meaningful accessible name and `aria-expanded`/`aria-controls`, opening a native `<dialog>` labeled by the translated menu title; render the same navigation items; full keyboard/focus behavior is completed in US3.
- [X] T059 [US1] Implement `frontend/src/widgets/app-shell/ui/AppShell.tsx`: render exactly one `SkipLink` (first focusable), `AppHeader` (which owns the compact trigger and `CompactMenu`), the wide `PrimaryNavigation` at `md` and above, and `<main id="main-content" tabIndex={-1}>` containing `<Outlet />`; no footer, legal-link region, or header language shortcut. Do not render a second compact trigger in the shell.
- [X] T060 [US1] Create `frontend/src/widgets/app-shell/index.ts` exporting `AppShell` and `PrimaryNavigation` public APIs only.
- [X] T061 [US1] Wire the layout route in `frontend/src/app/routing/routes.tsx` to render `<AppShell />` around the route outlet so every route (including `*`) renders inside the shell.
- [X] T062 [P] [US1] Write `frontend/src/widgets/app-shell/ui/AppShell.test.tsx`: exactly one header, one labeled `nav`, one `main#main-content` with centered maximum content width and `px-4 sm:px-6`, one `h1` per route, brand link accessible name `app.name`, and absence of footer/legal/header language shortcut.
- [X] T063 [P] [US1] Write `frontend/src/widgets/app-shell/ui/PrimaryNavigation.test.tsx`: wide navigation visible at `(min-width: 768px)` and compact trigger visible below it using a `matchMedia` mock; all destinations are at least 44px in the primary direction.

**Checkpoint**: The shell structure is complete and independently inspectable on every route. US1 scenario 5 (focus moves to the new page heading after in-app navigation) is delivered by T075 and verified at the US3 checkpoint; US2 adds navigation semantics and final page content.

---

## Phase 4: User Story 2 — Navigate initial routes and understand the home page (Priority: P1)

**Goal**: Home, Settings, and not-found resolve inside the shell with correct addresses, titles, history, active-destination cues, and honest placeholder content.

**Independent Test**: Start at `/`, move to every destination and back, use browser back/forward, open direct addresses, activate the brand link, and open unknown/nested-unknown addresses; confirm the home placeholder contains no fabricated content, Settings contains only its purpose description (language control arrives in US4), and not-found is distinct from an error.

### Implementation for User Story 2

- [X] T064 [P] [US2] Complete `frontend/src/pages/home/ui/HomePage.tsx`: localized `h1`, tagline, and `EmptyState` explaining the entertainment discovery purpose with **no** action (none is functional yet); no invented titles, artwork, availability, ratings, reviews, or promotional claims.
- [X] T065 [P] [US2] Complete `frontend/src/pages/settings/ui/SettingsPage.tsx`: localized `h1`, read-only `settings.description`, and the localized local-storage notice; no version, environment, account, or other business content; leave the language section for US4. US2 scenario 8 is therefore verified at the US4 checkpoint.
- [X] T066 [P] [US2] Complete `frontend/src/pages/not-found/ui/NotFoundPage.tsx`: localized heading/description, functional home link, requested address preserved, no redirect loop, and metadata distinct from the error state.
- [X] T067 [US2] Implement the active-destination contract in `frontend/src/widgets/app-shell/ui/PrimaryNavigation.tsx`: `aria-current="page"` on the matching link plus at least two non-color cues (background surface change, 2px primary indicator/underline, and medium font weight) in both wide and compact presentations.
- [X] T068 [US2] Verify and correct navigation targets in `frontend/src/widgets/app-shell/ui/AppHeader.tsx` and `navigationItems.ts`: brand link resolves to `/`, Home to `/`, Settings to `/settings`; no dead links or non-functional controls.
- [X] T069 [US2] Align `frontend/src/app/routing/routes.tsx` with `contracts/routes.md`: exactly one default route, no extra top-level destinations, nested unknown paths match `*`, not-found never redirects, and each route exposes its `titleKey` for `usePageTitle`.
- [X] T070 [P] [US2] Write `frontend/src/app/routing/routes.integration.test.tsx` with `createMemoryRouter`: direct load of each route, link navigation, back/forward history, brand link to home, `/does-not-exist` and `/settings/nested/missing`, address preservation, in-shell rendering, and localized document titles. Not-found routing, address preservation, and titles are owned here; page content semantics are covered by T073.
- [X] T071 [P] [US2] Write `frontend/src/pages/home/ui/HomePage.test.tsx`: purpose is explained, empty state is present, no action is rendered, and no fabricated title/artwork/availability/rating/CTA appears.
- [X] T072 [P] [US2] Write `frontend/src/pages/settings/ui/SettingsPage.test.tsx`: purpose description is shown; no version, environment, account, or diagnostic content is rendered.
- [X] T073 [P] [US2] Write `frontend/src/pages/not-found/ui/NotFoundPage.test.tsx`: page content semantics only — distinct not-found wording, working home action, and no error/technical wording. Routing behavior, address preservation, and document title are covered by T070.

**Checkpoint**: All initial routes, history, direct addresses, and unknown paths work. Settings gains the language choice (US2 scenario 8) in US4. US3 adds full keyboard and assistive-technology behavior.

---

## Phase 5: User Story 3 — Keyboard and assistive-technology use (Priority: P1)

**Goal**: The shell and every state are fully operable by keyboard and meaningful to screen readers, with skip-link, focus management, menu containment, and announcements.

**Independent Test**: Complete the navigation journey with only the keyboard, then with a screen reader; confirm skip link first, visible focus, menu trap/Escape/return, current-destination announcements, and one page-change announcement.

### Implementation for User Story 3

- [X] T074 [US3] Integrate `SkipLink` in `frontend/src/widgets/app-shell/ui/AppShell.tsx` so it is the first focusable element, targets `#main-content`, becomes visible on focus, and moves focus to the main region, which has `tabIndex={-1}`.
- [X] T075 [US3] Implement `frontend/src/app/routing/useRouteAnnouncement.ts`: no focus move and no announcement on the initial document load; on in-app location changes, focus the route `h1` (stable id, `tabIndex={-1}`) after paint and emit exactly one polite announcement from `a11y.navigatedTo`; clear the previous message before reuse. This delivers US1 scenario 5, which is verified at the US3 checkpoint.
- [X] T076 [US3] Wire `useRouteAnnouncement` in `frontend/src/app/routing/routes.tsx` and add stable ids plus `tabIndex={-1}` to the `h1` in `frontend/src/pages/home/ui/HomePage.tsx`, `frontend/src/pages/settings/ui/SettingsPage.tsx`, and `frontend/src/pages/not-found/ui/NotFoundPage.tsx`.
- [X] T077 [US3] Complete `frontend/src/widgets/app-shell/ui/CompactMenu.tsx` accessibility: open with native `showModal()`, `aria-labelledby` the translated title, `aria-expanded`/`aria-controls` on the trigger, native Tab containment, Escape close, focus return to the trigger, close on route change, and close when `matchMedia('(min-width: 768px)')` matches; entrance motion ≤160ms and suppressed under reduced motion.
- [X] T078 [US3] Apply the shared interaction treatment to `frontend/src/shared/ui/Button.tsx`, `Link.tsx`, `SkipLink.tsx`, `frontend/src/widgets/app-shell/ui/PrimaryNavigation.tsx`, and `CompactMenu.tsx`: 2px `focus` outline with 2px offset, ≥24×24 targets for all interactive elements, ≥44×44 for primary controls and navigation destinations, and reduced-motion-safe transitions.
- [X] T079 [P] [US3] Write `frontend/src/app/routing/skipLink.test.tsx`: first Tab reveals the skip link, activation moves focus to `main#main-content`, and the main region is programmatically focusable.
- [X] T080 [P] [US3] Write `frontend/src/widgets/app-shell/ui/CompactMenu.test.tsx` with `user-event`: trigger exposes expanded/collapsed, focus enters the dialog, Tab/Shift+Tab stay inside, Escape closes, focus returns to the trigger, menu closes on route change, and the viewport-widen listener closes it without leaving a hidden focused control.
- [X] T081 [P] [US3] Write `frontend/src/app/routing/routeAnnouncement.test.tsx`: in-app navigation focuses the new `h1` and produces exactly one polite message; a direct initial load produces no focus move and no announcement; rapid navigation leaves no duplicate headings or stale announcements.
- [X] T082 [P] [US3] Add vitest-axe assertions for every route and shell state in `frontend/src/app/routing/a11y.test.tsx`, asserting zero critical/serious violations and meaningful names for brand, navigation, menu, and current destination.
- [X] T083 [US3] Add an **Accessibility verification** section to `frontend/README.md` documenting the manual keyboard and screen-reader procedure from `quickstart.md` Scenario 3 and the expected outcomes; record the manual pass result before the task is closed.

**Checkpoint**: US1–US3 satisfy the P1 accessibility baseline. US4 adds language switching.

---

## Phase 6: User Story 4 — Switch interface language (Priority: P2)

**Goal**: English/Spanish switching updates all text, titles, labels, and `<html lang>` without reload, persists the choice safely, and falls back correctly.

**Independent Test**: Switch in both directions, reload, clear/corrupt the stored preference, use an `es-MX`/unsupported browser locale, and inspect every route/state; confirm full localization, persistence, safe fallback, no raw keys, and no clipping at 360px/200%.

### Implementation for User Story 4

- [X] T084 [US4] Implement `frontend/src/features/switch-language/model/useLanguagePreference.ts`: initialize from `resolveInitialLanguage`, keep an always-usable `sessionValue`, call i18n `changeLanguage`, persist through `languageStorage` without blocking the change on failure, expose `{ locale, origin, persistence, setLocale }`, and emit one polite `a11y.languageChanged` confirmation after a completed change.
- [X] T085 [US4] Implement `frontend/src/features/switch-language/ui/LanguageSwitcher.tsx`: native radio group (`fieldset`/`legend` or `role="radiogroup"` with accessible name) using props `groupLabel` and optional `helperText`; one option per supported locale named by `languages.<code>` in its own language; checked state reflects the current locale; calls `setLocale` on change with no reload.
- [X] T086 [US4] Create `frontend/src/features/switch-language/index.ts` exporting `LanguageSwitcher` (and the hook only if needed outside the feature).
- [X] T087 [US4] Integrate the language section into `frontend/src/pages/settings/ui/SettingsPage.tsx`: localized `settings.language.label`, optional `settings.language.helper`, the localized `settings.language.storageNotice`, and `LanguageSwitcher`; still no version, environment, account, or diagnostic content.
- [X] T088 [P] [US4] Write `frontend/src/features/switch-language/ui/LanguageSwitcher.test.tsx`: accessible group name, each option named in its own language, checked state, change callback, and keyboard operation.
- [X] T088a [P] [US4] Extend `frontend/src/pages/settings/ui/SettingsPage.test.tsx` or `LanguageSwitcher.test.tsx` to assert `settings.language.storageNotice` renders in English and Spanish, states that the preference is browser-local and may be lost, and contains no version, environment, or technical detail.
- [X] T089 [P] [US4] Write `frontend/src/features/switch-language/languageSwitch.integration.test.tsx`: switching updates all visible strings, document title, accessibility labels, and `<html lang>` without a full reload, with one polite confirmation; assert no artificial delay or network call, and assert the completed change occurs within one second using a measured elapsed time with deterministic test timers.
- [X] T090 [P] [US4] Write `frontend/src/features/switch-language/languagePersistence.test.tsx`: selected language survives a simulated reload; invalid JSON, `{ "version": 9, "locale": "fr" }`, missing key, and throwing storage each fall back without crashing; switching still works when storage is unavailable.
- [X] T091 [P] [US4] Write `frontend/src/app/i18n/missingTranslation.test.tsx`: a deliberately missing Spanish key falls back to English and never renders the raw key, `undefined`, or an empty element.
- [X] T092 [P] [US4] Write `frontend/src/features/switch-language/languageAnnouncement.test.tsx`: a completed change announces once politely, the message is cleared before reuse, and no stale-language text remains after a rapid second change.
- [X] T093 [P] [US4] Write `frontend/src/app/routing/usePageTitle.language.test.tsx`: document titles are composed only from `meta.title.*` resources and update for all routes on language change.
- [X] T094 [US4] Verify long Spanish copy at 360px and 200% zoom: remove truncation, fixed widths, or single-line constraints in `frontend/src/pages/settings/ui/SettingsPage.tsx`, `frontend/src/features/switch-language/ui/LanguageSwitcher.tsx`, and the shared state components so text wraps without clipping, overlap, or horizontal page scrolling; add a wrapping assertion to `frontend/src/pages/settings/ui/SettingsPage.test.tsx`.

**Checkpoint**: Language switching is complete and persistent. US5 adds loading, failure, and configuration-state recovery.

---

## Phase 7: User Story 5 — Recover from loading, empty, error, and unknown states (Priority: P2)

**Goal**: Genuine on-demand route loading with layout-matching skeletons, safe retryable errors, contained render failures, and fail-fast configuration handling.

**Independent Test**: Trigger each state: unknown route, blocked page chunk, render throw, missing required config, absent optional config, and the empty home placeholder; confirm shell usability, announcements, focus, no technical detail, and localized recovery actions.

### Implementation for User Story 5

- [X] T095 [US5] Implement `frontend/src/app/routing/usePageModule.ts`: a `{ status: 'loading' | 'ready' | 'error' }` state machine that invokes the dynamic importer only inside an effect, exposes a retry that increments an attempt counter and re-invokes the failed import, ignores settled attempts from unmounted routes, and never caches a rejection globally.
- [X] T096 [P] [US5] Write `frontend/src/app/routing/usePageModule.test.ts` with deferred and rejecting importers: loading → ready, loading → error, error → loading on retry, retry succeeding, retry failing again, and unmounted-route rejection being ignored.
- [X] T097 [US5] Implement `frontend/src/app/routing/RouteContent.tsx`: render `RouteLoadingState` (`states.loading.title`, `a11y.loading`) while pending, `ErrorState` (`states.error.*`, retry, home action) on failure, and the resolved page component when ready; retry genuinely re-invokes the importer; expose no module names, stack traces, or identifiers.
- [X] T098 [US5] Refactor `frontend/src/app/routing/routes.tsx` so each route page is prepared on demand through `RouteContent` + `usePageModule` + dynamic `import()` of `pages/*/index.ts`; introduce a pathless content route inside the layout's `<main>` so the shell is outside the replaceable content subtree; keep `*` inside the shell; no artificial delay and no data request.
- [X] T099 [US5] Implement `frontend/src/app/routing/RouteRenderError.tsx` and attach it as the `errorElement` of the pathless content route rendered inside `<main>`; the layout route itself must not carry the `errorElement`, so the shell (header, navigation, skip link) survives while only the main content area is replaced. Use safe localized `errors.render.title`/`errors.render.description`, focus the fallback heading on mount, always offer the home action, and never render technical details.
- [X] T100 [US5] Complete announcement behavior in `frontend/src/app/routing/RouteContent.tsx` and `frontend/src/shared/ui/LiveRegion.tsx`: loading uses polite/busy status, completion is announced once, failures are announced as alerts once, and no duplicate or stale message remains across rapid transitions.
- [X] T101 [P] [US5] Write `frontend/src/app/routing/routeLoading.test.tsx`: a deferred importer shows a layout-matching skeleton inside the shell, `aria-busy="true"`, decorative skeletons `aria-hidden`, no spinner or bare "Loading…" only, and no content-jump-inducing layout change on swap.
- [X] T102 [P] [US5] Write `frontend/src/app/routing/routeFailure.test.tsx`: a rejecting importer shows the localized error with retry and home; retry re-invokes the import and renders the page; a second failure shows the error again; no module name, stack trace, or identifier is exposed.
- [X] T103 [P] [US5] Write `frontend/src/app/routing/renderContainment.test.tsx`: a page component that throws produces the fallback inside the shell, keeps header/navigation/skip link usable, focuses the fallback heading, offers a working home action, and exposes no technical detail.
- [X] T104 [P] [US5] Write `frontend/src/app/configStates.test.tsx`: missing/invalid required `VITE_APP_ENV` renders only `AppConfigError` in the resolved startup language with no shell or values; absent/empty/invalid optional `VITE_APP_VERSION` applies `0.0.0`, leaves the visitor experience unchanged, and warns with the field name only.
- [X] T105 [P] [US5] Write `frontend/src/app/routing/rapidNavigation.test.tsx`: navigating before a previous load settles leaves the final route, exactly one `h1`, no stale content, and no duplicate or stale-language announcements.
- [X] T106 [P] [US5] Write `frontend/src/pages/home/ui/HomePage.emptyState.test.tsx`: the home empty state offers no action when none is functional and renders no non-functional call to action; the generic `EmptyState` omits the action when not supplied.

**Checkpoint**: All five user stories are independently functional and testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Repository quality gates, documentation, ADR, and end-to-end validation across all stories.

- [X] T107 Configure repository-root Git hooks and commit validation in `/package.json`, `/commitlint.config.js`, `/.lintstagedrc.json`, and `/.husky/pre-commit`, `/.husky/pre-push`, `/.husky/commit-msg`: pre-commit runs Prettier + ESLint on staged files, pre-push runs `npm run lint && npm run typecheck && npm test && npm run build` in `frontend/`, and commit-msg enforces Conventional Commits. Document hook installation and troubleshooting.
- [X] T108 [P] Add `docs/adr/0001-route-loading-and-error-containment.md` recording the dynamic-import state machine (rejecting `React.lazy`), the pathless content-route `errorElement` inside `<main>` (rejecting class boundaries and a layout-level boundary that would unmount the shell), and their consequences, referencing research R-01/R-02.
- [X] T109 [P] Finalize `frontend/README.md`: environment inventory, local setup, scripts, Git hooks troubleshooting, i18n rule (all UI text externalized; use i18next interpolation/plurals and Intl for dates/numbers when introduced), the Settings local-storage notice, scope boundaries, and the recorded accessibility, responsive, performance, and bundle-budget verification results.
- [X] T110 Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in `frontend/`; resolve every error and unexpected warning, including `act()`, missing keys, invalid DOM properties, unhandled rejections, and coverage below 80% global / 90% for config, storage, and page loader. Record the production `dist` size budget and run Lighthouse against the production preview at `/`; fail the gate if mobile LCP exceeds 2.5 s.
- [X] T111 Execute all nine scenarios in `quickstart.md` at 360, 768, 1024, and 1440px and 200% zoom, including reduced motion, rapid navigation, Spanish wrapping, config failure, optional-config absence, and the performance check; record results in `frontend/README.md`.
- [X] T112 [P] Run the scope audit from `quickstart.md` Scenario 8 against `frontend/src/` and `frontend/dist/`: zero catalog, search, availability, watchlist, accounts, authentication, playback, provider integration, database, fabricated entertainment content, or third-party tracking scripts; only `walplay.language.v1` is persisted. Confirm zero hardcoded date, number, or plural formatting exists and document the `Intl`/i18next rule for future surfaces.
- [X] T113 [P] Run the visual identity audit from `quickstart.md` Scenario 7 against `frontend/src/app/styles/index.css`, `frontend/src/shared/ui/WalplayLogo.tsx`, and `frontend/public/logo.svg`: token-only colors (no raw hex outside `@theme` and the static SVG), `canvas` not pure black, Inter self-hosted, 16px/8px radii, border-first separation, exact logo geometry, decorative mark, and no Walday product content; add or extend automated token/logo assertions where feasible.
- [X] T114 [P] Audit `frontend/package.json` dependencies against the approved stack: all runtime dependencies are approved; TanStack Query is absent; dev-only tooling does not leak into the runtime bundle; no unapproved provider or UI library was added.
- [X] T115 Confirm the Definition of Done and record the completed checklist in `frontend/README.md`: all tasks complete, all quickstart scenarios pass, automated a11y reports zero critical/serious violations, manual keyboard/screen-reader pass is recorded, and documentation matches the implementation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; T001–T004 block everything.
- **Foundational (Phase 2)**: depends on Setup; blocks all user stories.
- **US1 (Phase 3)**: depends on Foundational; creates the shell and mounts it in the layout route.
- **US2 (Phase 4)**: depends on US1 (shell/navigation) and Foundational pages/routes.
- **US3 (Phase 5)**: depends on US1 (shell/menu) and US2 (routes/pages and `h1` targets).
- **US4 (Phase 6)**: depends on US2 (Settings page) and Foundational i18n/storage; can run in parallel with US5, but not with US3 because both edit page files.
- **US5 (Phase 7)**: depends on US2/US3 (routes, shell, focus/announcement) and Foundational state components; can run in parallel with US4 if files do not overlap.
- **Polish (Phase 8)**: depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: no dependency on other stories after Foundational.
- **US2 (P1)**: depends on US1 for the shell and navigation regions.
- **US3 (P1)**: depends on US1 and US2; it hardens the same shell and route files but adds independent a11y behavior.
- **US4 (P2)**: depends on US2's Settings page; independent of US5.
- **US5 (P2)**: depends on US2/US3 route behavior; independent of US4.

### Within Each User Story

- Tests are written before implementation and must fail first.
- Models/utilities before components; components before integration.
- Story checkpoint must pass before the next priority story begins, except for acceptance scenarios explicitly documented as deferred to a later story checkpoint (US1 scenario 5 → US3; US2 scenario 8 → US4).

### Parallel Opportunities

- All Setup `[P]` tasks T004–T013 can run in parallel after T001–T003.
- Foundational `[P]` tasks (tests, primitives, resources) can run in parallel by different authors; T023/T024 must land before T025/T025a.
- Within US1, T055 and the test tasks T062/T063 can run alongside shell components once the needed component exists.
- Within US2, page content tasks T064–T066 are independent; tests T071–T073 are independent.
- Within US3, tests T079–T082 are independent once their implementations exist.
- Within US4, tests T088–T093 are independent once T084–T087 land.
- Within US5, tests T101–T106 are independent once T095–T100 land.
- US4 and US5 may run concurrently by different authors because they edit different files (US4: Settings/feature; US5: routing/Home/state components), provided each avoids the other's files.

---

## Parallel Example: User Story 2

```bash
# Launch independent page-content tasks together:
Task: "Complete HomePage placeholder content in frontend/src/pages/home/ui/HomePage.tsx"
Task: "Complete SettingsPage purpose content in frontend/src/pages/settings/ui/SettingsPage.tsx"
Task: "Complete NotFoundPage content in frontend/src/pages/not-found/ui/NotFoundPage.tsx"

# Launch independent page tests after content lands:
Task: "HomePage.test.tsx"
Task: "SettingsPage.test.tsx"
Task: "NotFoundPage.test.tsx"
```

## Parallel Example: User Story 5

```bash
# After usePageModule/RouteContent exist, run state tests in parallel:
Task: "Write routeLoading.test.tsx"
Task: "Write routeFailure.test.tsx"
Task: "Write renderContainment.test.tsx"
Task: "Write configStates.test.tsx"
Task: "Write rapidNavigation.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (blocks all stories).
3. Complete Phase 3: US1 shell.
4. **STOP and VALIDATE**: inspect the shell at all four widths and confirm the contract from `contracts/routes.md`.
5. US1 is the structural MVP; US2 must follow before a navigation demo and US3 before any accessibility sign-off.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → shell demo.
3. US2 → navigation/home/not-found demo.
4. US3 → accessible navigation sign-off.
5. US4 → bilingual experience.
6. US5 → resilient loading/error/config states.
7. Polish → quality gates, ADR, quickstart matrix, DoD.

### Scope Guard

Do not add catalog, search, availability, watchlist, accounts, authentication, playback, notifications, recommendations, social features, database schemas, provider integrations, backend code, analytics, or any dependency outside the approved stack. The foundation renders without server data and persists only `walplay.language.v1`.

---

## Notes

- `[P]` = different files, no dependency on incomplete work.
- `[Story]` labels exist only in story phases for traceability.
- Each user story is independently testable at its checkpoint.
- Verify tests fail before implementing; never suppress unexpected warnings.
- Commit after each task or logical group using Conventional Commits.
- Avoid vague tasks, same-file parallel edits, and cross-story scope creep.
