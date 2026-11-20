# Implementation Plan: Initial App Foundation

**Branch**: `feat/001-app-foundation` | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-app-foundation/spec.md`

## Summary

Build the Walplay frontend foundation as a single-page React application in `frontend/`: one responsive application shell (brand lockup, primary navigation, main region), three routes (Home, Settings, not-found), genuine on-demand route-content loading with layout-matching skeletons and retryable errors, English/Spanish internationalization with a validated persisted preference and a Settings notice about browser-local storage, startup configuration validation for one required public environment name and one optional public version, and a shared, token-only UI foundation aligned with the Walday Dark UI identity.

No backend, database, provider integration, catalog, search, availability, watchlist, account, or playback capability is introduced. The foundation renders without network data.

The plan uses a small explicit page-module loader (dynamic `import()` plus a loading/error/ready state machine) instead of `React.lazy`, because `React.lazy` caches a rejected import permanently and cannot satisfy a *genuine* retry. Render failures are contained by a pathless child route inside the shell; its `errorElement` replaces only the main content area, so the header, navigation, and skip link survive and no class component is required.

## Technical Context

**Language/Version**: TypeScript 5.x in strict mode (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`); Node.js LTS (pinned) for tooling.

**Primary Dependencies**: React 19, Vite 7 (`@vitejs/plugin-react`), React Router 7 (data router, `createBrowserRouter`/`RouterProvider`), Tailwind CSS 4 via `@tailwindcss/vite`, `i18next` + `react-i18next`, `zod`, `@fontsource-variable/inter`. Development-only: Vitest, React Testing Library, `@testing-library/jest-dom`, `@testing-library/user-event`, `vitest-axe` (axe-core), ESLint (flat config with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`), Prettier, Husky, lint-staged, commitlint. **TanStack Query is intentionally not installed** — the foundation has no server state (FR-043); installing an unused runtime dependency would violate dependency discipline (Principle XXI).

**Storage**: Browser `localStorage` only, for the language preference. Versioned key, Zod-validated on read, never trusted. No database, no server persistence.

**Testing**: Vitest + React Testing Library + jest-dom for unit/component tests; router-level integration tests with `createMemoryRouter`; `vitest-axe` for automated accessibility assertions; manual keyboard and screen-reader checks for the navigation journey.

**Target Platform**: Modern evergreen browsers (latest two major versions of current desktop and mobile browsers). Responsive web SPA, dark theme only.

**Project Type**: Web application — frontend only for this feature. `backend/` is deliberately deferred until a feature requires server data.

**Performance Goals**: Primary content visible within 2.5 s on typical mobile broadband; one route-level chunk per page; language switch completes under 1 s with no reload; loading placeholders produce no visible content jump. Validated by a recorded production bundle budget and a Lighthouse mobile run with LCP at or below 2.5 s for the home route.

**Constraints**: No network requests at runtime; no fabricated entertainment content; WCAG 2.2 Level AA; no horizontal scrolling at 360/768/1024/1440 px and 200% zoom; token-only styling (no raw hex outside `@theme` and static SVG assets); exact Walplay brand lockup contract; fail-fast configuration with no secret exposure; zero unexpected test warnings; 80% coverage minimum.

**Scale/Scope**: Three routes, two locales, one shell, one widget (app shell), one feature (language switch), approximately ten shared UI primitives, ~46 source files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Clean Code, SOLID, Simplicity | One responsibility per module; no speculative abstraction; explicit over clever | PASS — page loader is one small focused utility; no generic framework layer |
| II. Strict TypeScript | All strict flags, no `any`, no unjustified assertions | PASS — enforced by `tsconfig` + ESLint; discriminated unions for loader/config state |
| III. Feature-Sliced Design | `app/pages/widgets/features/shared`, downward imports, public `index.ts` per slice, no `../..` chains | PASS — structure below; `entities` omitted because no domain entities exist yet |
| IV. Arrow Function Syntax | Arrow functions in all frontend application code; ESLint `func-style` + `prefer-arrow-callback` | PASS — enforced by lint; no class components (see error containment decision) |
| V. Backend Architecture | Layered backend | N/A — no backend in this feature (FR-043) |
| VI. React Component Design | Small, reusable, presentation-only shared UI | PASS — shared UI is prop-driven and fetches nothing |
| VII. Styling & Tokens | Tailwind 4 only, `@theme` single token source, semantic tokens, skeletons required | PASS — `app/styles/index.css` owns `@theme`; no CSS-in-JS, no inline styles |
| VIII. Testing & Zero Warnings | Vitest/RTL, AAA, loading/empty/error coverage, 80% coverage, no unexpected warnings | PASS — test plan below; console guards in test setup |
| IX. Performance | Route-level code splitting, no avoidable startup work | PASS — per-page dynamic import; self-hosted subset font |
| X. Resilience | Fault isolation, meaningful states | PASS — nested route error boundary; shell survives content failure |
| XI. API Contracts | Versioned JSON API | N/A — no API in this feature |
| XII. Constants & Configuration | Zod-validated env, centralized `import.meta.env` access, `.env.example` | PASS — `shared/config/env.ts` is the only env reader |
| XIII. Security | Validate storage reads, no secrets client-side, no sensitive logging | PASS — Zod-validated versioned storage key; Settings displays the local-storage notice; only public `VITE_*` values |
| XIV. Accessibility | WCAG 2.2 AA, skip link, focus management, live regions, targets | PASS — skip link, `aria-current`, native `<dialog>` focus trap, `aria-busy`, polite/alert regions |
| XV. Internationalization | i18next/react-i18next, no hardcoded UI text, persisted preference, `Intl` formatting | PASS — all text in resources; English fallback; `<html lang>` synced |
| XVI. Documentation | Plan, ADR-worthy decisions recorded, setup documented | PASS — research.md records decisions; quickstart documents setup |
| XVII. Quality Gates | `lint`, `typecheck`, `test`, `build`; Husky + lint-staged; Conventional Commits | PASS — scripts defined in `frontend/package.json`; hooks at repo root |
| XVIII. Server State | TanStack Query exclusive | N/A — no server state; dependency intentionally absent |
| XIX. Prisma Persistence | Prisma sole ORM | N/A — no persistence layer |
| XX. External Providers | Provider adapters only | N/A — no providers |
| XXI. Stack Governance | Only approved stack; dependency review | PASS — every runtime dependency is in the approved table; `vitest-axe`/`user-event` are dev-only evaluation tooling |

**Post-design re-evaluation**: PASS. No constitutional violations require justification. `Complexity Tracking` is intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-app-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 decisions and rejected alternatives
├── data-model.md        # Phase 1 conceptual and runtime models
├── quickstart.md        # Phase 1 validation guide
├── contracts/           # Phase 1 interface contracts
│   ├── routes.md
│   ├── configuration.md
│   ├── i18n-resources.md
│   ├── language-preference.md
│   └── shared-ui.md
├── checklists/
│   └── requirements.md
└── spec.md
```

`tasks.md` is produced by `/speckit.tasks`, not by this command.

### Source Code (repository root)

```text
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── eslint.config.js
├── .prettierrc.json
├── .env.example
├── public/
│   └── logo.svg                     # 32x32 favicon: canvas background + mint W
└── src/
    ├── app/
    │   ├── main.tsx                 # bootstrap: i18n -> config -> render
    │   ├── App.tsx                  # providers + RouterProvider
    │   ├── AppConfigError.tsx       # safe localized configuration failure screen
    │   ├── styles/
    │   │   └── index.css            # Tailwind import + single @theme token source
    │   ├── i18n/
    │   │   ├── index.ts             # i18next instance, resources, language sync
    │   │   └── resolveInitialLanguage.ts
    │   └── routing/
    │       ├── routes.tsx           # route table, layout route, errorElement
    │       ├── RouteContent.tsx     # loading | error | ready rendering per route
    │       ├── usePageModule.ts     # retryable dynamic-import state machine
    │       ├── usePageTitle.ts      # localized document.title per route
    │       └── useRouteAnnouncement.ts
    ├── pages/
    │   ├── home/
    │   │   ├── index.ts
    │   │   └── ui/HomePage.tsx
    │   ├── settings/
    │   │   ├── index.ts
    │   │   └── ui/SettingsPage.tsx
    │   └── not-found/
    │       ├── index.ts
    │       └── ui/NotFoundPage.tsx
    ├── widgets/
    │   └── app-shell/
    │       ├── index.ts
    │       ├── ui/AppShell.tsx
    │       ├── ui/AppHeader.tsx
    │       ├── ui/PrimaryNavigation.tsx
    │       ├── ui/CompactMenu.tsx
    │       └── model/navigationItems.ts
    ├── features/
    │   └── switch-language/
    │       ├── index.ts
    │       ├── ui/LanguageSwitcher.tsx
    │       └── model/useLanguagePreference.ts
    ├── shared/
    │   ├── ui/
    │   │   ├── index.ts
    │   │   ├── WalplayLogo.tsx
    │   │   ├── PageContainer.tsx
    │   │   ├── SkipLink.tsx
│   │   ├── Button.tsx
│   │   ├── Link.tsx
│   │   ├── EmptyState.tsx
    │   │   ├── ErrorState.tsx
    │   │   ├── RouteLoadingState.tsx
    │   │   ├── Skeleton.tsx
    │   │   └── LiveRegion.tsx
    │   ├── config/
    │   │   ├── env.ts               # Zod schema + validated config singleton
    │   │   └── constants.ts         # storage key, defaults, breakpoint
    │   ├── i18n/
    │   │   ├── resources/en.json
    │   │   └── resources/es.json
    │   └── lib/
    │       ├── languageStorage.ts   # versioned, Zod-validated storage adapter
    │       └── cn.ts
    └── test/
        ├── setup.ts
        └── renderWithProviders.tsx
```

**Structure Decision**: A single `frontend/` application at the repository root, following Feature-Sliced Design. `app` owns bootstrap, providers, routing, and global styles. `pages` owns the three route screens. `widgets/app-shell` owns the shell regions and navigation. `features/switch-language` owns the language interaction and persistence. `shared` holds token-driven primitives, validated configuration, translation resources, and storage utilities only. No `entities` slice is created because the foundation has no domain entities; adding it now would be a speculative abstraction. No `backend/` is created because the feature renders without server data (FR-043).

Root-level tooling (Husky, lint-staged, commitlint) lives at the repository root and delegates to `frontend/` scripts; it is not application source.

## Complexity Tracking

> No constitutional violations. No entries required.

## Phase 0: Research Summary

Full decisions and rejected alternatives are in [research.md](./research.md). Key outcomes:

| Unknown | Decision |
|---|---|
| Genuine route loading + retry | Per-page dynamic `import()` behind a `usePageModule` state machine; failures are not cached, so retry re-imports |
| Render-failure containment without class components | Pathless child route `errorElement` inside the shell; shell preserved, main region replaced |
| Route-change focus and announcement | Skip focus on first document load; on in-app location change, focus the route `h1` (`tabIndex={-1}`) and set one polite live-region message |
| Compact navigation focus trap | Native `<dialog>` opened with `showModal()`, labeled; Escape and invoker-focus return are native; closes on route change and at `768px` |
| i18n initialization and detection | `i18next` initialized synchronously with bundled resources; base-subtag matching over `navigator.languages`; no detector dependency |
| Persisted preference safety | Versioned key `walplay.language.v1`, Zod enum validation, try/catch around storage access, detection fallback |
| Configuration validation order | Resolve language → init i18n → validate env with Zod → render; invalid required config renders a localized fatal screen |
| Design tokens | One `@theme` block using the constitution's semantic names and canonical values; `@fontsource-variable/inter` self-hosted |
| Test and a11y tooling | Vitest + RTL + jest-dom + vitest-axe; integration tests use `createMemoryRouter`; manual screen-reader pass documented in quickstart |

## Phase 1: Design Summary

- [data-model.md](./data-model.md) defines Supported Locale, Language Preference, Application Route, Application Configuration, plus the runtime route-content state machine.
- [contracts/routes.md](./contracts/routes.md) defines the route table, navigation visibility, titles, and state behavior.
- [contracts/configuration.md](./contracts/configuration.md) defines the environment inventory, validation, defaults, and failure behavior.
- [contracts/i18n-resources.md](./contracts/i18n-resources.md) defines the translation key schema, fallback rules, and locale formatting obligations.
- [contracts/language-preference.md](./contracts/language-preference.md) defines the persisted storage shape and fallback matrix.
- [contracts/shared-ui.md](./contracts/shared-ui.md) defines the shared component public APIs and accessibility contracts.
- [quickstart.md](./quickstart.md) defines runnable end-to-end validation scenarios.

## Implementation Sequencing (for `/speckit.tasks`)

1. Scaffold `frontend/` toolchain (Vite, TypeScript strict, Tailwind 4 `@theme`, ESLint/Prettier, Vitest setup, Node pin, `.env.example`).
2. Implement `shared/config`, `shared/lib/languageStorage`, translation resources, and `app/i18n` bootstrap with unit tests.
3. Implement shared UI primitives (logo, container, skip link, button and link treatments, skeletons, empty/error states, live region) with component and a11y tests.
4. Implement `widgets/app-shell` (header, wide navigation, compact menu, skip link, main region) with keyboard tests.
5. Implement `app/routing` (route table, page-module loader, title, announcement, error element) with integration tests.
6. Implement `pages/home`, `pages/settings`, `pages/not-found`, and `features/switch-language`.
7. Add root Git hooks and commitlint; run `lint`, `typecheck`, `test`, `build`; execute the quickstart validation matrix.
