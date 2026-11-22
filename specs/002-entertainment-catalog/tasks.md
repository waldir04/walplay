---
description: "Task list for Entertainment Catalog implementation"
---

# Tasks: Entertainment Catalog

**Input**: Design documents from `/specs/002-entertainment-catalog/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md, `.specify/memory/constitution.md`

**Tests**: Included because the Walplay Constitution (Principle VIII, Definition of Done) mandates tests for every delivered behavior, and `plan.md`/`quickstart.md` define the required test matrix. Tests use Vitest + React Testing Library + jest-dom + vitest-axe on the frontend, and Vitest plus real-Express route integration tests on the backend. Provider network access is always mocked; no test performs a real TMDB call. Tests MUST fail before their implementation task is closed.

**Organization**: Tasks are grouped by user story. Phases 1–2 deliver the toolchain and shared scaffolding required by every story; Phases 3–8 deliver US1–US6 as independently testable increments.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story label (US1–US6) only in user-story phases
- Every task names its exact file path under `backend/`, `frontend/`, `docs/`, or the repository root
- Source of truth: `plan.md` structure, `data-model.md` shapes, and `contracts/` interfaces. Do not add scope beyond them.

## Path Conventions

- Backend application: `backend/src/`; tests are co-located as `*.test.ts` and `*.integration.test.ts`
- Frontend application: `frontend/src/`; tests are co-located as `*.test.ts(x)` or `*.integration.test.tsx`
- Feature artifacts: `specs/002-entertainment-catalog/`
- Root tooling: repository root (`package.json`, `.husky/`, `.github/workflows/`, `docs/`)
- Ignore `node_modules`, `dist`, `coverage`, and lockfiles when auditing scope

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the approved `backend/` application and add the approved frontend server-state dependency. No catalog behavior yet.

- [X] T001 Scaffold `backend/` exactly as approved in plan.md: create `backend/package.json`, `backend/package-lock.json`, and the directory tree `backend/src/{config,domain,providers/tmdb,services,routes,controllers,middleware,lib}`; install only `express` 5 and `zod` 4 as runtime dependencies (no HTTP client, logger, cache, date, or CORS-with-wildcard dependency) and `typescript`, `tsx`, `vitest`, `@vitest/coverage-v8`, ESLint, `typescript-eslint`, and Prettier as dev dependencies.
- [X] T002 [P] Pin Node.js 22 LTS for the backend: add `backend/.nvmrc` (`22`) and an `engines.node` entry in `backend/package.json`; do not use a floating Node version.
- [X] T003 [P] Configure strict TypeScript in `backend/tsconfig.json`: enable `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax`; keep `tsc --noEmit` runnable for the whole backend.
- [X] T004 [P] Configure backend linting and formatting in `backend/eslint.config.js`, `backend/.prettierrc.json`, and `backend/.prettierignore`: `typescript-eslint`, zero warnings, no `any`, no `@ts-ignore`, no floating promises, ignore `dist`, `coverage`, and `package-lock.json`.
- [X] T005 [P] Configure `backend/vitest.config.ts`: Node environment, co-located test discovery, v8 coverage, global 80% thresholds, and 90% per-file thresholds for `src/providers/tmdb/tmdb.mapper.ts`, `src/services/catalog-cache.ts`, `src/domain/errors.ts`, and `src/services/catalog.service.ts` (error classification).
- [X] T006 [P] Add the canonical backend scripts to `backend/package.json`: `dev`, `lint` (zero warnings), `typecheck` (`tsc --noEmit`), `test` (run once, no watch), `build`, and `start`.
- [X] T007 [P] Create `backend/.env.example` with the complete inventory from `data-model.md` §12: `NODE_ENV`, `PORT`, `CORS_ALLOWED_ORIGINS`, `TMDB_ACCESS_TOKEN`, `TMDB_BASE_URL`, `TMDB_TIMEOUT_MS`, `TMDB_MAX_RETRIES`, `TMDB_CACHE_TTL_SECONDS`, `TMDB_CACHE_STALE_SECONDS`, `TMDB_CACHE_MAX_ENTRIES`, `TMDB_IMAGE_CONFIG_TTL_SECONDS`, and `LOG_LEVEL`, with safe local defaults and no real credential.
- [X] T008 [P] Create `backend/README.md` documenting prerequisites, `npm ci`, `cp .env.example .env.local`, the script contract, the server-side-only provider credential rule, and that no database or persistence is used.
- [X] T009 [P] Add `@tanstack/react-query` v5 to `frontend/package.json`, update `frontend/package-lock.json`, and do not add any other runtime dependency outside the approved stack.
- [X] T010 [P] Extend `frontend/src/shared/config/env.ts` and `frontend/.env.example` with `VITE_API_BASE_URL` (required in non-test builds, local default `http://localhost:4000`, URL-validated, frozen into `AppConfig`), and extend `frontend/src/shared/config/env.test.ts` for present, absent, and invalid values.
- [X] T011 [P] Update `.husky/pre-push` to run the documented script contract in both applications when present: `frontend` lint/typecheck/test/build and `backend` lint/typecheck/test/build; fail if an introduced application is missing its lockfile or `.nvmrc`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Provider-neutral domain, backend provider boundary, cache, app composition, and the frontend data/download layer that every story depends on.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

### Backend foundation

- [X] T012 Create `backend/src/domain/catalog.ts` with the provider-neutral types from `data-model.md`: `MediaType = 'movie' | 'tv'`, `SectionId = 'trending' | 'popular' | 'top-rated'`, `CatalogRating` (`scale: 10`), `CatalogGenre`, `CatalogPoster`, `CatalogItem`, `CatalogPage`, `CatalogSectionCapability`, `CatalogResponseMeta` (`language`, `stale`, `lastUpdatedAt`, `source`), and `ProviderLanguage`; create `backend/src/domain/errors.ts` with the stable codes `VALIDATION_ERROR`, `CATALOG_NOT_FOUND`, `CATALOG_RATE_LIMITED`, `CATALOG_TIMEOUT`, `CATALOG_UNAVAILABLE`, `CATALOG_INVALID_RESPONSE`, `INTERNAL_ERROR`, and `ROUTE_NOT_FOUND`, a typed `CatalogError`, and their HTTP status mapping from `contracts/catalog-api.md`.
- [X] T013 [P] Implement `backend/src/config/env.ts` as the only backend module that reads `process.env`, using a Zod schema for the full inventory in T007; require `TMDB_ACCESS_TOKEN` and production `CORS_ALLOWED_ORIGINS`, parse comma-separated exact origins without wildcards, apply documented defaults, export a frozen typed config, and fail fast with a field-only developer message that never includes values. Add `backend/src/config/env.test.ts` for required/optional values, defaults, invalid origins, and secret non-disclosure.
- [X] T014 [P] Implement `backend/src/lib/itemId.ts`: encode `wl1:<mediaType>:<providerId>` as base64url and decode it with strict validation of the `wl1` prefix, a positive numeric provider ID, and the media-type segment; reject malformed tokens and type mismatches without exposing the encoding. Add `backend/src/lib/itemId.test.ts` for round-trip, malformed, oversized, wrong-prefix, and mismatched-type tokens.
- [X] T015 [P] Implement `backend/src/lib/logger.ts`: field-only structured logging with request ID, provider, route, media type, section, language, page, duration, outcome, and status class; never log tokens, URLs with credentials, provider payloads, titles, genre bodies, or provider error bodies. Add `backend/src/lib/logger.test.ts` proving sensitive fields are omitted.
- [X] T016 [P] Implement `backend/src/middleware/requestId.ts`: generate a correlation ID, expose it to handlers, return it as `X-Request-Id`, and never echo internal identifiers in response bodies. Add `backend/src/middleware/requestId.test.ts`.
- [X] T017 [P] Implement `backend/src/middleware/cors.ts`: exact-origin allowlist from `CORS_ALLOWED_ORIGINS`, no wildcard, no credentials, `Vary: Origin`, `GET`/`OPTIONS` only, and a safe preflight response. Add `backend/src/middleware/cors.test.ts` for allowed, disallowed, and preflight requests.
- [X] T018 [P] Implement `backend/src/middleware/error.ts`: one error envelope `{ error: { code, message, details? } }`, map typed `CatalogError` and unknown exceptions to the documented status codes, keep messages stable English developer text, and never expose provider payloads, status text, credentials, or stack traces. Add `backend/src/middleware/error.test.ts`.
- [X] T019 [P] Create `backend/src/providers/catalog-provider.ts` with the internal `CatalogProvider` interface from `contracts/provider-boundary.md`: `id: 'tmdb'`, `capabilities()`, `fetchSectionPage({ mediaType, section, language, page })`, and `fetchItem({ mediaType, providerId, language })`; no provider DTO may appear in `domain/`.
- [X] T020 [P] Create `backend/src/providers/tmdb/tmdb.schemas.ts` with Zod DTOs for every used TMDB response: trending movie/TV, popular movie/TV, top-rated movie/TV, movie/TV detail, movie/TV genre list, and image configuration. Treat nullable poster/date/overview fields as optional, and add `backend/src/providers/tmdb/tmdb.schemas.test.ts` for valid, malformed, and nullable fixtures.
- [X] T021 [P] Implement `backend/src/providers/tmdb/tmdb.client.ts`: native `fetch`, `Authorization: Bearer` from `TMDB_ACCESS_TOKEN` only, `AbortSignal.timeout(TMDB_TIMEOUT_MS)`, at most `TMDB_MAX_RETRIES` idempotent GET retries with exponential full-jitter backoff (base 200 ms, cap 2 s), `429`/`Retry-After` respect without blind retry storms, and Zod parsing before returning data. Add `backend/src/providers/tmdb/tmdb.client.test.ts` for timeout, network failure, 5xx, 429 with `Retry-After`, malformed JSON, retry bounds, and credential absence from logs/errors.
- [X] T022 [P] Implement `backend/src/providers/tmdb/tmdb.capabilities.ts` with the declaration from `data-model.md` §2 and `contracts/provider-boundary.md`: `trending` order 1, movie+tv, `paginated: false`; `popular` order 2, movie+tv, `paginated: true`; `top-rated` order 3, movie+tv, `paginated: true`. Add `backend/src/providers/tmdb/tmdb.capabilities.test.ts`.
- [X] T023 [P] Implement `backend/src/providers/tmdb/tmdb.images.ts`: fetch and cache `/configuration`, use approved poster sizes `w342` for grid and `w780` for large candidates, compose absolute URLs only from the documented secure base URL, size, and a non-empty file path, and omit artwork when configuration or path is unavailable. Add `backend/src/providers/tmdb/tmdb.images.test.ts`.
- [X] T024 [P] Create `backend/src/providers/tmdb/tmdb.language.ts` as the single provider language mapping (`en -> en-US`, `es -> es-ES`) and add `backend/src/providers/tmdb/tmdb.language.test.ts`; then implement `backend/src/providers/tmdb/tmdb.genres.ts`: fetch genre lists once per media type and language using that mapping, cache them separately, resolve known IDs to localized names, and omit unknown IDs, empty lists, and unavailable names without ever exposing raw identifiers. Add `backend/src/providers/tmdb/tmdb.genres.test.ts`.
- [X] T025 Implement `backend/src/providers/tmdb/tmdb.mapper.ts` per `contracts/provider-boundary.md` and `data-model.md` §3: `id` is the opaque base64url of `wl1:<mediaType>:<providerId>` (never a raw provider ID); `title` uses the localized title when non-empty, otherwise the original title, and the item is dropped when both are unusable; `originalTitle` is present only when usable and different from `title`; `releaseYear` is the four-digit year from a valid release/first-air date and is absent for empty, malformed, or unusable dates; `rating` is present only for a finite `0..10` average and `voteCount > 0` and never zero-as-missing; `genres` are localized names only; `poster` is resolved from the boundary or omitted; `adult === true` items are excluded before mapping; missing/invalid media type or identity drops the item. Add `backend/src/providers/tmdb/tmdb.mapper.test.ts` for every rule and for invalid-item dropping.
- [X] T026 Implement `backend/src/providers/tmdb/tmdb.provider.ts` implementing `CatalogProvider` by composing the client, schemas, capabilities, mapper, images, and genres: use `tmdb.language.ts` for section and detail language parameters; `trending` uses the weekly window and page 1 only; `popular`/`top-rated` accept `page`; detail uses `/movie/{id}` or `/tv/{id}`; no `region`, discover filters, search, or undocumented endpoint is used. Add `backend/src/providers/tmdb/tmdb.provider.test.ts` proving the adapter is replaceable through the interface and page restrictions are enforced.
- [X] T027 Implement `backend/src/services/catalog-cache.ts`: bounded in-memory entries with `value`, `freshUntil`, `staleUntil`, and `lastUpdatedAt`; fresh hits avoid provider traffic; expired entries attempt the provider and serve labeled stale data only within the stale window; no usable entry yields a stable error; keys include media type, section, language, and page (plus provider ID for detail, and separate keys for image configuration and genre lists); identical concurrent misses share one in-flight promise; eviction respects `TMDB_CACHE_MAX_ENTRIES`. Add `backend/src/services/catalog-cache.test.ts` for fresh/stale/no-stale/key isolation/single-flight/bounded size.
- [X] T028 Implement `backend/src/app.ts` and `backend/src/server.ts`: compose JSON responses, request IDs, CORS, error middleware, `GET /api/health` returning `200 { "status": "ok" }` without a provider call, and an unknown-route `ROUTE_NOT_FOUND` envelope; listen on `PORT` and never log configuration. Add `backend/src/app.test.ts` for health, unknown route, JSON content type, request ID, and absence of secrets.
- [X] T029 [P] Create reusable backend fixtures in `backend/src/test/fixtures/` for valid movie/TV list pages, detail records, genre lists, image configuration, malformed DTOs, and null/missing optional fields; fixtures contain no real credential and are shared by unit and route tests.

### Frontend foundation

- [X] T030 [P] Implement `frontend/src/shared/api/httpClient.ts`: typed `fetch` wrapper using `VITE_API_BASE_URL`, a 10 s `AbortController` timeout, JSON parsing, `X-Request-Id` awareness, the `{ data, meta }` success shape, and `{ error: { code, message, details? } }` failure parsing into a typed catalog error; never surface raw provider text. Add `frontend/src/shared/api/httpClient.test.ts` for success, non-2xx envelope, timeout, and malformed JSON.
- [X] T031 Implement `frontend/src/app/App.tsx` and a new `frontend/src/app/providers/QueryClientProvider.tsx`: one `QueryClient` at the application root with retries disabled by default, deliberate `staleTime` (default 5 minutes) and `gcTime` (30 minutes), and no refetch-on-focus requirement; tests inject a fresh client. Add `frontend/src/app/providers/QueryClientProvider.test.tsx`.
- [X] T032 Implement `frontend/src/entities/catalog/model/catalogItem.ts` with Zod schemas and `z.infer` types matching `contracts/catalog-api.md`: opaque `id` pattern `^[A-Za-z0-9_-]{8,64}$`, `mediaType`, `title`, optional `originalTitle`, optional four-digit `releaseYear`, optional `rating` with `value`, `voteCount`, and `scale: 10`, `genres` as `{ id, name }`, and optional `poster` with absolute `url` and optional `urlLarge`; export `mediaType` literal unions and arrow-function formatters for localized rating, year, and accessible names using `Intl`, including an explicit out-of-10 rating scale in the accessible name. Add `frontend/src/entities/catalog/model/catalogItem.test.ts`.
- [X] T033 [P] Implement `frontend/src/entities/catalog/model/catalogSection.ts` with Zod schemas for `CatalogSectionCapability`, `CatalogPage`, and `CatalogResponseMeta`, including optional `totalPages`/`totalResults` and required `hasMore`; export the fixed section order, media-type slugs `movies`/`tv-shows` mapped to `movie`/`tv`, and category slugs `popular`/`top-rated` mapped to their section ids (with no category for `trending`). Add `frontend/src/entities/catalog/model/catalogSection.test.ts`.
- [X] T034 [P] Implement `frontend/src/entities/catalog/model/catalogError.ts` with the stable code union from `contracts/catalog-api.md` and a mapping of each code to a localized `catalog.states.*` key; distinguish `unavailable`, `rate-limited`, `timed-out`, `not-found`, and `empty`; never map raw status codes to user text. Add `frontend/src/entities/catalog/model/catalogError.test.ts`.
- [X] T035 [P] Implement `frontend/src/entities/catalog/api/catalogKeys.ts` as the single query-key factory: `['catalog','capabilities']`, `['catalog','section',mediaType,section,language,page]`, `['catalog','item',mediaType,itemId,language]`; every key includes the interface language where provider data is language-dependent. Add `frontend/src/entities/catalog/api/catalogKeys.test.ts`.
- [X] T036 Implement `frontend/src/entities/catalog/model/catalogLanguage.ts` as the single frontend locale mapping (`en -> en-US`, `es -> es-ES`) and add `frontend/src/entities/catalog/model/catalogLanguage.test.ts`; then implement `frontend/src/entities/catalog/api/catalogClient.ts`: typed calls to `GET /api/catalog/capabilities`, `GET /api/catalog/:mediaType/:section`, and `GET /api/catalog/:mediaType/titles/:itemId`, using the shared HTTP client and Zod response schemas; use the mapping when sending `language` and never send provider credentials. Add `frontend/src/entities/catalog/api/catalogClient.test.ts`.
- [X] T037 Create `frontend/src/entities/catalog/index.ts` with the public catalog entity API for model types/schemas, the locale mapping, formatters, query keys, and client functions only; UI component exports are added by T042 after the components exist. No backend or provider imports.
- [X] T038 Extend `frontend/src/shared/i18n/resources/en.json` and `frontend/src/shared/i18n/resources/es.json` with every key listed in `contracts/i18n-resources.md` under `navigation.browse`, `meta.title.*`, `catalog.*`, and the required attribution keys, except `catalog.states.appended_one`, `catalog.states.appended_other`, and `catalog.states.endOfList`, which T085a adds; keep identical key sets, no raw provider text, and update `frontend/src/shared/i18n/resources/resources.test.ts` for leaf-key parity and no empty strings.
- [X] T039 [P] Implement `frontend/src/entities/catalog/ui/PosterFallback.tsx`: a neutral artwork fallback containing the title and media type, with fixed card aspect ratio, no broken-image icon, no layout shift, and decoration hidden from the accessible name. Add `frontend/src/entities/catalog/ui/PosterFallback.test.tsx`.
- [X] T040 Implement `frontend/src/entities/catalog/ui/CatalogCard.tsx`: one interactive router link per card whose accessible name includes the full title and textual media type plus year and rating with explicit out-of-10 context when present; show poster or `PosterFallback`, optional year/rating/genres omitted cleanly (no blank label, dash, zero, or invented value), artwork/fallback decoration `aria-hidden`, reserved artwork aspect ratio, `loading="lazy"`, `decoding="async"`, responsive `srcSet` candidates where a large poster exists, and `line-clamp` for visible titles with the full title preserved for assistive technology. Add `frontend/src/entities/catalog/ui/CatalogCard.test.tsx`.
- [X] T041 [P] Implement `frontend/src/entities/catalog/ui/CatalogGrid.tsx`: a semantic list with an accessible name, provider-order rendering, and a responsive grid that yields at least 2 columns at 360 px, 3 at 768 px, 4 at 1024 px, and 5 at 1440 px using token-only Tailwind utilities. Add `frontend/src/entities/catalog/ui/CatalogGrid.test.tsx`.
- [X] T042 Implement `frontend/src/entities/catalog/ui/CatalogCardSkeleton.tsx`: a layout-matching skeleton that reserves the poster aspect ratio and text lines, is `aria-hidden="true"`, uses the shared `Skeleton`, and animates only when reduced motion is not preferred. Add `frontend/src/entities/catalog/ui/CatalogCardSkeleton.test.tsx`. After T039–T041 exist, extend `frontend/src/entities/catalog/index.ts` to export `PosterFallback`, `CatalogCard`, `CatalogGrid`, and `CatalogCardSkeleton` as the public UI API.
- [X] T043 Implement `frontend/src/widgets/provider-attribution/ui/ProviderAttribution.tsx` and `frontend/src/widgets/provider-attribution/index.ts`: a reusable page-level region rendering the official unmodified TMDB mark from `frontend/src/shared/assets/tmdb-logo.svg` plus the localized non-endorsement statement; source and commit the official mark (do not draw, approximate, or substitute a placeholder); present wherever provider data is displayed, including partial-failure states. Add `frontend/src/widgets/provider-attribution/ui/ProviderAttribution.test.tsx` and record the asset source and legal confirmation (OD-13) as a release gate.
- [X] T044 [P] Create reusable frontend fixtures in `frontend/src/test/fixtures/catalog/` for capabilities, section pages, category pages, detail items, incomplete-metadata items, all-invalid pages, stale responses, and each error-code envelope; fixtures mirror `contracts/catalog-api.md` exactly.

**Checkpoint**: Backend provider boundary, cache, app composition, frontend HTTP/query layer, catalog entity, card primitives, attribution, i18n keys, and fixtures exist. User stories can now start.

---

## Phase 3: User Story 1 — Browse movies and TV shows by media type (Priority: P1) 🎯 MVP

**Goal**: A visitor reaches the Browse destination from the primary navigation, sees Movies by default with trending/popular/top-rated sections in provider order, switches to TV Shows and back, and keeps the address, selected type, and content in agreement.

**Independent Test**: Open Browse from the primary navigation, verify the default media type and section order, switch to TV Shows, verify movie content is fully replaced, use browser back/forward, and open both type addresses directly with controlled catalog data.

### Implementation for User Story 1

- [X] T045 [US1] Implement `backend/src/services/catalog.service.ts` capabilities and section-page behavior: return declared capabilities in order; validate that the requested section is supported for the media type before calling the provider; reject `trending` pages greater than 1; map provider failures to `CatalogError` codes once in the service; compute `hasMore` only when pagination is supported and a next page is reported. Add `backend/src/services/catalog.service.test.ts`.
- [X] T046 [US1] Implement `backend/src/controllers/catalog.controller.ts` for capabilities and section reads: parse `mediaType`, `section`, `language`, and `page` with Zod, map typed errors to the documented HTTP status and envelope, and never expose provider data. Add `backend/src/controllers/catalog.controller.test.ts`.
- [X] T047 [US1] Implement `backend/src/routes/catalog.routes.ts` and mount it at `/api/catalog` in `backend/src/app.ts`: `GET /capabilities` and `GET /:mediaType/:section?language=&page=`; reject unknown query keys, unsupported sections, non-positive/invalid pages, and `trending` page > 1 as `VALIDATION_ERROR`. Add `backend/src/routes/catalog.routes.integration.test.ts` against a real Express app on an ephemeral port using native `fetch`, covering success, status mapping, CORS preflight, and no secret/provider payload in responses.
- [X] T048 [P] [US1] Implement `frontend/src/entities/catalog/api/catalogQueries.ts` capabilities and section-preview query options using `useQuery`, the key factory, and the entity client; each section preview is an independent query so one failure cannot collapse the landing. Add `frontend/src/entities/catalog/api/catalogQueries.test.ts`.
- [X] T049 [P] [US1] Implement `frontend/src/features/switch-catalog-media/ui/MediaTypeSwitch.tsx` and `frontend/src/features/switch-catalog-media/index.ts`: a labeled Movies/TV Shows control with the selected type exposed by text plus `aria-pressed` or an equivalent selected state, targeting the other type's landing; minimum 44×44 CSS px targets and token-only styling. Add `frontend/src/features/switch-catalog-media/ui/MediaTypeSwitch.test.tsx`.
- [X] T050 [P] [US1] Implement `frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.tsx` and `frontend/src/widgets/catalog-section-preview/index.ts`: one labelled region per supported section with an `h2`, a bounded first-page preview in provider order, a "See all" action only when the capability declares pagination, and no "Load more" or fabricated ranking copy. Add `frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.test.tsx`.
- [X] T051 [US1] Implement `frontend/src/pages/browse/ui/BrowsePage.tsx` and `frontend/src/pages/browse/index.ts`: exactly one `h1` with `id="page-heading"` and `tabIndex={-1}`, the media switch, supported sections in declared order, page-level provider attribution, and composition of the section-preview widget; no unsupported section placeholder. Add `frontend/src/pages/browse/ui/BrowsePage.test.tsx`.
- [X] T052 [US1] Extend `frontend/src/shared/config/routes.ts` with catalog route metadata: `/browse` redirect, `/browse/movies`, `/browse/tv-shows`, category paths, detail paths, and the catalog not-found path; include title keys `meta.title.browse`, `meta.title.catalogCategory`, `meta.title.titleDetail`, and `meta.title.catalogNotFound` without removing Home, Settings, or the foundation not-found route.
- [X] T053 [US1] Add the RouteObject entries in `frontend/src/app/routing/routes.tsx`: `/browse` redirects with `replace` to `/browse/movies`; `/browse/movies` and `/browse/tv-shows` render the Browse page inside the existing shell using dynamic `import()` so the Browse page loads as its own lazy chunk shared by both landing routes; the existing `*` foundation not-found remains. Do not add nested catalog routes here; T070 and T073 own them.
- [X] T054 [P] [US1] Add the Browse destination to `frontend/src/widgets/app-shell/model/navigationItems.ts` and the localized `navigation.browse` label; exactly one new navigation entry, no change to Settings.
- [X] T055 [US1] Extend `frontend/src/widgets/app-shell/ui/PrimaryNavigation.tsx` with a match-prefix rule for Browse only, so `/browse` and every nested catalog address mark Browse active while other destinations keep exact matching. Add `frontend/src/widgets/app-shell/ui/PrimaryNavigation.test.tsx` cases.
- [X] T056 [US1] Update `frontend/src/pages/home/ui/HomePage.tsx` to replace the outdated "nothing to browse" placeholder with a working entry point to Browse using the shared `Link`; add no other Home functionality. Update `frontend/src/pages/home/ui/HomePage.test.tsx` and `frontend/src/pages/home/ui/HomePage.emptyState.test.tsx`.
- [X] T057 [P] [US1] Write `frontend/src/pages/browse/BrowsePage.integration.test.tsx`: default Movies, section order trending/popular/top-rated, one `h1`, media switch replaces content with no cross-type items, direct type addresses, and back/forward restoration.
- [X] T058 [P] [US1] Write `frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.order.test.tsx`: unsupported sections are omitted entirely, provider order is preserved without re-sorting, previews never exceed one provider page, and trending has no "See all".
- [X] T059 [US1] Add catalog route titles in `frontend/src/app/routing/usePageTitle.ts` integration: Browse, category, detail, and catalog-not-found `titleKey` values resolve from `meta.title.*` in both languages. Add `frontend/src/app/routing/catalogTitles.test.tsx`.
- [X] T060 [P] [US1] Write `frontend/src/app/routing/catalogRoutes.integration.test.tsx`: `/browse` redirects without a duplicate history entry, both type landings render in the shell from lazy route chunks, Browse stays active on `/browse` and both landings, the catalog is reachable from Home and Settings in at most two actions, and Settings/Home behavior is unchanged. Nested-path active state and unknown catalog paths are covered by T078.
- [X] T061 [P] [US1] Add `frontend/src/pages/browse/ui/BrowsePage.a11y.test.tsx` with vitest-axe assertions for the landing, asserting one `h1`, meaningful section names, labelled media switch, and zero critical/serious violations.
- [X] T062 [US1] Verify `CatalogSectionPreview` does not paginate and does not render a "Load more" control; record the assertion in `frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.test.tsx`.
- [X] T063 [US1] Render `ProviderAttribution` on the Browse landing and assert its presence when provider data is displayed, including when one section fails; add the assertion to `frontend/src/pages/browse/ui/BrowsePage.test.tsx`.

**Checkpoint**: US1 delivers a working Browse landing with media switching, provider order, capability-driven sections, navigation state, Home entry, and attribution.

---

## Phase 4: User Story 2 — Open a category list and a title (Priority: P1)

**Goal**: A visitor opens a full category list from "See all" or a direct address, selects a card, reaches the minimal detail destination, and returns to the catalog without dead links.

**Independent Test**: Open a supported category through its section action and directly, verify the first page and provider order, activate a card, confirm the detail ends at the selected title and media type, return, open a detail directly, and open unknown addresses.

### Implementation for User Story 2

- [X] T064 [US2] Extend `backend/src/services/catalog.service.ts` with `fetchItem`: decode the opaque ID, verify the embedded media type matches the route, call the provider's minimal detail lookup, map only card fields, and return `CATALOG_NOT_FOUND` for unknown, invalid, mismatched-type, or adult-flagged items; never fabricate metadata. Add service tests for all outcomes.
- [X] T065 [US2] Extend `backend/src/controllers/catalog.controller.ts` and `backend/src/routes/catalog.routes.ts` with `GET /api/catalog/:mediaType/titles/:itemId?language=`: validate `itemId` against `^[A-Za-z0-9_-]{8,64}$` before decoding, require `language`, and map not-found/failure to the documented envelope. Add `backend/src/routes/catalogDetail.routes.integration.test.ts`.
- [X] T066 [P] [US2] Extend `frontend/src/entities/catalog/api/catalogQueries.ts` with the item-detail `useQuery` using language-aware keys; do not add a separate category query because T066a owns the category infinite query. Add `frontend/src/entities/catalog/api/catalogQueries.item.test.ts`.
- [X] T066a [US2] Implement the `frontend/src/entities/catalog/api/catalogQueries.ts` category infinite-query foundation with `initialPageParam: 1`, a `getNextPageParam` derived only from the server's `hasMore`/next page, and a pure flatten-and-dedupe helper; do not trigger the next page or render a load-more control yet. Add `frontend/src/entities/catalog/api/catalogQueries.category.test.ts` for the page-parameter derivation and dedupe helper.
- [X] T067 [US2] Implement `frontend/src/widgets/catalog-category-list/ui/CatalogCategoryList.tsx` and `frontend/src/widgets/catalog-category-list/index.ts`: category heading structure, first page in provider order, category grid, and page-level attribution; no load-more control yet (US3). Add `frontend/src/widgets/catalog-category-list/ui/CatalogCategoryList.test.tsx`.
- [X] T068 [US2] Implement `frontend/src/pages/catalog-category/ui/CatalogCategoryPage.tsx` and `frontend/src/pages/catalog-category/index.ts`: read the media type and category slug from the address, resolve the slug through the T033 category map, render exactly one `h1` naming the localized category and media type, compose the category-list widget, and show the catalog not-found for unknown slugs. Add `frontend/src/pages/catalog-category/ui/CatalogCategoryPage.test.tsx`.
- [X] T069 [US2] Implement `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx` and `frontend/src/pages/title-detail/index.ts`: render the direct-address path by calling the detail query and showing a skeleton then content or a localized not-found/unavailable state. Content is only the card metadata, textual media type, localized "complete details are not yet available" statement, attribution, and a working return action. Router-state consumption for card-origin navigation belongs to T074; do not define a second state path here. Add `frontend/src/pages/title-detail/ui/TitleDetailPage.test.tsx`.
- [X] T070 [US2] Add category and detail RouteObjects in `frontend/src/app/routing/routes.tsx` using the metadata from T052: `/browse/:mediaTypeSlug/:categorySlug` for `popular`/`top-rated`, and `/browse/:mediaTypeSlug/title/:itemId`, each loaded with dynamic `import()` as a dedicated chunk. Do not add the nested catalog not-found route here; T073 registers it. Add route integration coverage to `frontend/src/app/routing/catalogRoutes.integration.test.tsx`.
- [X] T071 [US2] Extend `frontend/src/features/switch-catalog-media/ui/MediaTypeSwitch.tsx` and its callers so a media switch on a category opens the same category for the other type when supported, otherwise that type's landing; on a landing it opens the other landing. Add tests to `frontend/src/features/switch-catalog-media/ui/MediaTypeSwitch.test.tsx`.
- [X] T072 [US2] Implement validated return-origin handling for the detail page: accept only a catalog category or media landing origin, verify it matches the selected media type, and otherwise return to that type's landing; always render a working in-app link. Add `frontend/src/pages/title-detail/ui/detailReturn.test.tsx`.
- [X] T073 [US2] Implement `frontend/src/pages/catalog-not-found/ui/CatalogNotFoundPage.tsx` and `frontend/src/pages/catalog-not-found/index.ts`: a localized catalog not-found state inside the shell with a working return to the type landing and no technical detail. Register the nested `/browse/*` catalog not-found RouteObject in `routes.tsx` with a dynamic `import()` after the page exists. Add `frontend/src/pages/catalog-not-found/ui/CatalogNotFoundPage.test.tsx`.
- [X] T074 [US2] Pass the validated card item through router state on card activation in `frontend/src/entities/catalog/ui/CatalogCard.tsx` and consume it in `TitleDetailPage`; do not pass provider DTOs, and reject state whose ID or media type disagrees with the address.
- [X] T075 [P] [US2] Write `frontend/src/pages/title-detail/ui/TitleDetailPage.fromCard.test.tsx`: a navigation-state item renders title, media type, available metadata, the "complete details not yet available" statement, attribution, and return; assert no additional network request is issued.
- [X] T076 [P] [US2] Write `frontend/src/pages/title-detail/ui/TitleDetailPage.direct.test.tsx`: direct address triggers the minimal lookup, shows a skeleton, renders content, and shows a localized not-found/unavailable state with a working return for unknown or failed lookups; assert no fabricated metadata or technical detail.
- [X] T077 [P] [US2] Write `frontend/src/pages/catalog-category/ui/CatalogCategoryPage.direct.test.tsx`: direct category addresses load page 1 for the correct type/category only, unknown slugs show the catalog not-found, and no items from another type/category appear.
- [X] T078 [P] [US2] Write `frontend/src/app/routing/catalogCategoryDetail.integration.test.tsx`: See all targets the stable category address, card activation updates the address to a unique type-specific detail, back/forward restore the view, Browse stays active on nested category and detail paths, and unknown nested catalog paths render inside the shell.
- [X] T079 [P] [US2] Add backend route tests for the detail endpoint in `backend/src/routes/catalogDetail.routes.integration.test.ts`: opaque ID handling, type mismatch, invalid/adult/unknown item not-found, invalid `itemId`, missing language, no provider identifiers, and no secret leakage.
- [X] T080 [P] [US2] Add vitest-axe assertions in `frontend/src/pages/catalog-category/ui/CatalogCategoryPage.a11y.test.tsx` and `frontend/src/pages/title-detail/ui/TitleDetailPage.a11y.test.tsx` for the loaded, not-found, and unavailable states.
- [X] T081 [US2] Add category and detail document titles through the existing `usePageTitle` route handles and assert them in `frontend/src/app/routing/catalogTitles.test.tsx` for both languages.
- [X] T082 [US2] Render `ProviderAttribution` on category and detail surfaces and assert presence in `frontend/src/pages/catalog-category/ui/CatalogCategoryPage.test.tsx` and `frontend/src/pages/title-detail/ui/TitleDetailPage.test.tsx`.

**Checkpoint**: US2 delivers category lists, minimal detail from a card and direct address, return behavior, not-found handling, and attribution.

---

## Phase 5: User Story 3 — Load more results without losing context (Priority: P2)

**Goal**: A visitor loads additional category pages, keeps every already-displayed item in order, sees a clear end state, and recovers from a later-page failure without losing the loaded list.

**Independent Test**: Open a paginated category with known multi-page data, load successive pages, verify append/duplicates/end messaging, force a later-page failure and retry, and activate "Load more" repeatedly while pending.

### Implementation for User Story 3

- [X] T083 [US3] Wire the user-initiated next-page request into the T066a infinite query: request the next page only on user action, append results through the T066a flatten-and-dedupe helper, preserve existing order, and expose the derived items and page metadata to the widget. Do not redefine the query parameters or duplicate the helper. Add `frontend/src/entities/catalog/api/catalogInfinite.test.ts`.
- [X] T084 [US3] Implement `frontend/src/features/load-more-catalog/ui/LoadMoreControl.tsx` and `frontend/src/features/load-more-catalog/index.ts`: render only when `hasMore` and no load is pending; expose a busy/disabled state while pending; issue one request per activation; minimum 44×44 CSS px; token-only styling. Add `frontend/src/features/load-more-catalog/ui/LoadMoreControl.test.tsx`.
- [X] T085 [US3] Integrate `LoadMoreControl` into `frontend/src/widgets/catalog-category-list/ui/CatalogCategoryList.tsx`: existing items remain visible and usable while loading, the control is busy and disabled, and duplicate submissions are prevented. Add `frontend/src/widgets/catalog-category-list/ui/CatalogCategoryList.loadMore.test.tsx`.
- [X] T085a [US3] Add the three keys deferred by T038 (`catalog.states.appended_one`, `catalog.states.appended_other`, and `catalog.states.endOfList`) to `frontend/src/shared/i18n/resources/en.json` and `frontend/src/shared/i18n/resources/es.json` with i18next plural forms; update `frontend/src/shared/i18n/resources/resources.test.ts`. This must land before T086 and T087.
- [X] T086 [US3] Announce the number of newly appended items exactly once in `CatalogCategoryList` using the i18next plural keys from `contracts/i18n-resources.md`; do not announce on initial load or duplicate the announcement. Add `frontend/src/widgets/catalog-category-list/ui/CatalogCategoryList.announcement.test.tsx`.
- [X] T087 [US3] Implement the final-page behavior in `CatalogCategoryList`: remove "Load more", show and announce the localized end-of-list message, and move focus to the end-of-list status when the control had focus. Add `frontend/src/widgets/catalog-category-list/ui/CatalogCategoryList.end.test.tsx`.
- [X] T088 [US3] Implement later-page failure handling in `CatalogCategoryList`: keep existing items, show an inline localized error with a retry for the failed page, and never replace the list with a page-level error. Add `frontend/src/widgets/catalog-category-list/ui/CatalogCategoryList.error.test.tsx`.
- [X] T089 [US3] Implement rapid-activation protection in `LoadMoreControl` and the category query: while a request is pending, further activations are ignored or disabled, only one request is issued per settled activation, and no duplicate items appear. Add `frontend/src/widgets/catalog-category-list/ui/CatalogCategoryList.rapid.test.tsx`.
- [X] T090 [US3] Verify and test that a direct category address loads page 1 only and does not require or restore previously loaded pages; add the assertion to `frontend/src/pages/catalog-category/ui/CatalogCategoryPage.direct.test.tsx`.
- [X] T091 [US3] Complete backend end conditions in `backend/src/services/catalog.service.ts`: `hasMore` is false when the provider reports the last page, the next page would exceed the total, or the next page returns no valid items; contradictory metadata ends safely; page size stays the provider's. Add `backend/src/services/catalogPagination.test.ts`.
- [X] T092 [P] [US3] Add backend pagination route tests in `backend/src/routes/catalogPagination.routes.integration.test.ts`: page validation, page 1 default, `trending` page > 1 rejection, `hasMore` for paginated categories, omitted totals when unreported, and no invented page size.
- [X] T093 [P] [US3] Write `frontend/src/widgets/catalog-category-list/CatalogCategoryList.multiPage.integration.test.tsx`: successive pages append below existing items, all existing items remain, no duplicates, no reordering, end state after the final page, and a later-page failure preserves the list.
- [X] T094 [P] [US3] Add keyboard coverage for load-more in `frontend/src/features/load-more-catalog/ui/LoadMoreControl.keyboard.test.tsx`: reachable, visible focus, activation by keyboard, busy state, and focus movement at the end.
- [X] T095 [P] [US3] Add vitest-axe coverage for a loaded multi-page category in `frontend/src/widgets/catalog-category-list/ui/CatalogCategoryList.a11y.test.tsx`.

**Checkpoint**: US3 delivers incremental loading with append, dedupe, single-flight, end-of-list, inline recovery, focus, and announcements.

---

## Phase 6: User Story 4 — See consistent cards when metadata is incomplete (Priority: P2)

**Goal**: Every displayed card remains complete and readable when the provider omits a poster, year, rating, genre, localized title, or other optional field; invalid items are excluded.

**Independent Test**: Render controlled items that omit each optional field, contain empty values, and include an item with no usable identity; verify complete cards, clean omission, fallback behavior, and exclusion of invalid items.

### Implementation for User Story 4

- [X] T097 [US4] Harden `backend/src/providers/tmdb/tmdb.mapper.ts` title resolution: use the localized title when non-empty, otherwise the original title; include `originalTitle` only when usable and different; drop items where both are unusable. Add `backend/src/providers/tmdb/tmdb.mapper.title.test.ts`.
- [X] T098 [US4] Harden `backend/src/providers/tmdb/tmdb.mapper.ts` year and rating rules: `releaseYear` is the four-digit year from a valid release/first-air date and is absent for empty, malformed, or unusable dates; `rating` is present only for a finite `0..10` average and `voteCount > 0`, never zero-as-missing or out-of-range. Add `backend/src/providers/tmdb/tmdb.mapper.numbers.test.ts`.
- [X] T099 [US4] Harden `backend/src/providers/tmdb/tmdb.mapper.ts` genre, poster, adult, and identity rules: genres are localized names only with unknown IDs omitted; poster is omitted when configuration or path is unavailable; `adult === true` items are excluded; missing/invalid media type or opaque identity drops the item. Add `backend/src/providers/tmdb/tmdb.mapper.media.test.ts`.
- [X] T100 [US4] Refine `frontend/src/entities/catalog/ui/CatalogCard.tsx` optional-field rendering: no year label or placeholder when missing, no rating when zero/unavailable, no genre row when unresolved, and a neutral fallback containing title and media type when poster is absent. Add `frontend/src/entities/catalog/ui/CatalogCard.incomplete.test.tsx`.
- [X] T101 [US4] Implement poster image-failure handling in `frontend/src/entities/catalog/ui/PosterFallback.tsx` and `CatalogCard.tsx`: a failed image load swaps to the fallback without layout shift, without exposing an error, and with the same reserved aspect ratio. Add `frontend/src/entities/catalog/ui/PosterFallback.failure.test.tsx`.
- [X] T102 [US4] Ensure long titles and metadata wrap or truncate without clipping in `CatalogCard.tsx`, keep the full title available to assistive technology, and never hide the only occurrence of the title; add `frontend/src/entities/catalog/ui/CatalogCard.longTitle.test.tsx`.
- [X] T103 [US4] Treat an all-invalid provider page as an empty/unavailable result, never a blank grid or crash, in `frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.tsx` and `frontend/src/widgets/catalog-category-list/ui/CatalogCategoryList.tsx`; add `frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.allInvalid.test.tsx`.
- [X] T104 [P] [US4] Extend `frontend/src/entities/catalog/model/catalogItem.test.ts` for omitted optional fields, empty arrays, missing poster, zero-vote ratings, and out-of-range ratings rejected or omitted per the contract.
- [X] T105 [P] [US4] Add vitest-axe coverage for incomplete-metadata cards in `frontend/src/entities/catalog/ui/CatalogCard.a11y.test.tsx`, asserting one interactive target and an accessible name with title and media type.
- [X] T106 [P] [US4] Add backend tests in `backend/src/providers/tmdb/tmdb.mapper.invalid.test.ts` proving invalid individual items are dropped and an all-invalid page becomes an empty successful page rather than a crash.
- [X] T107 [P] [US4] Add incomplete-metadata fixtures to `frontend/src/test/fixtures/catalog/incomplete.ts` and `backend/src/test/fixtures/tmdb/incomplete.ts` covering every optional-field omission.
- [X] T108 [US4] Add `frontend/src/entities/catalog/ui/CatalogCard.noFabrication.test.tsx` asserting no blank label, dash, zero-as-rating, invented date, raw genre ID, or "Untitled" appears.

**Checkpoint**: US4 delivers honest, stable cards and provider boundary handling for incomplete metadata.

---

## Phase 7: User Story 5 — Recover from loading, empty, and provider failures (Priority: P2)

**Goal**: A visitor always understands whether catalog content is loading, empty, stale, rate limited, timed out, or unavailable and can recover or keep using the rest of the application.

**Independent Test**: Force slow, empty, malformed, timed-out, rate-limited, and partially failed provider responses; verify skeletons, announcements, per-section isolation, retry behavior, stale labeling, and continued navigation and language switching.

### Implementation for User Story 5

- [X] T109 [US5] Implement error classification in `backend/src/services/catalog.service.ts` and `backend/src/domain/errors.ts`: map provider `429` to `CATALOG_RATE_LIMITED`, abort/timeout to `CATALOG_TIMEOUT`, `401`/`403`/`5xx`/network to `CATALOG_UNAVAILABLE`, schema failure to `CATALOG_INVALID_RESPONSE`, and unexpected exceptions to `INTERNAL_ERROR`; map once, not in controllers. Add `backend/src/services/catalogErrors.test.ts`.
- [X] T110 [US5] Implement stale metadata in `backend/src/services/catalog.service.ts`: when a usable stale cache entry exists after a provider failure, return it with `meta.stale = true`, `meta.source = 'stale-cache'`, and the original `lastUpdatedAt`; when no usable entry exists, return the stable error. Add `backend/src/services/catalogStale.test.ts`.
- [X] T111 [US5] Add focused cache tests in `backend/src/services/catalog-cache.stale.test.ts` for fresh hit, stale hit after failure, no stale when empty, key isolation by media type/section/language/page, single-flight, and bounded eviction.
- [X] T112 [US5] Add backend route integration coverage in `backend/src/routes/catalogErrors.routes.integration.test.ts` for the error envelope, status mapping, CORS allowlist and preflight, unknown routes, and absence of provider payloads, credentials, field names, and stack traces in every non-2xx response.
- [X] T113 [P] [US5] Complete `frontend/src/entities/catalog/model/catalogError.ts` and tests so each stable code resolves to the correct localized state key and never to a raw status code, provider message, or internal identifier.
- [X] T114 [US5] Implement per-section isolation in `frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.tsx`: a failed section shows a localized inline error with a retry while sibling sections, media switch, navigation, and attribution remain usable; retry affects only that section. Add `frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.error.test.tsx`.
- [X] T115 [US5] Implement the all-sections-failed page-level state in `frontend/src/pages/browse/ui/BrowsePage.tsx`: one localized page-level error with retry inside the shell, no duplicate section errors, and navigation/language switching remains usable. Add `frontend/src/pages/browse/ui/BrowsePage.allFailed.test.tsx`.
- [X] T116 [US5] Implement empty states for sections and categories in `CatalogSectionPreview` and `CatalogCategoryList`: localized explanation that no titles are available now, a retry, and a media-type switch where meaningful; no fabricated titles or non-functional actions. Add `frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.empty.test.tsx`.
- [X] T117 [US5] Implement stale labeling in `CatalogSectionPreview`, `CatalogCategoryList`, and `TitleDetailPage`: a localized cached/stale label with a locale-formatted `lastUpdatedAt` from `Intl.DateTimeFormat`; never present stale data as current. Add `frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.stale.test.tsx`.
- [X] T118 [US5] Implement layout-matching initial loading in `CatalogSectionPreview` and `CatalogCategoryList`: skeleton cards that reserve the final layout, region `aria-busy="true"`, decorative skeletons `aria-hidden`, no spinner-only or bare "Loading" treatment, and no content jump. Add `frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.loading.test.tsx`.
- [X] T119 [US5] Implement retry single-flight and no-loop behavior across section and category surfaces: only the failed surface enters loading, concurrent duplicate retries are prevented, retries are user-initiated, and repeated failure shows the same stable localized state. Add `frontend/src/features/load-more-catalog/ui/retrySingleFlight.test.tsx` and a section retry test.
- [X] T120 [US5] Prevent an older response from replacing a newer selection across media/category/language/title changes in the query keys and component data selection; the final selection's loading/success/empty/error state is the only one shown. Add `frontend/src/pages/browse/ui/BrowsePage.rapidSwitch.test.tsx` and `frontend/src/pages/title-detail/ui/TitleDetailPage.rapid.test.tsx`.
- [X] T121 [P] [US5] Add vitest-axe coverage for error, empty, stale, and loading states in `frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.states.a11y.test.tsx`.
- [X] T122 [P] [US5] Add UI mapping tests for `429`, timeout, malformed/invalid response, and unavailable in `frontend/src/entities/catalog/model/catalogError.states.test.tsx`, asserting calm localized copy and no technical detail.

**Checkpoint**: US5 delivers isolated failure recovery, truthful stale labeling, layout-matching loading, and safe retry behavior.

---

## Phase 8: User Story 6 — Use the catalog on any screen with keyboard or assistive technology (Priority: P3)

**Goal**: The catalog is usable at every supported viewport, with keyboard and screen readers, in both interface languages, and under reduced motion.

**Independent Test**: Exercise the full journey at 360/768/1024/1440 px and 200% zoom, with keyboard only, with a screen reader, with reduced motion, and in English and Spanish.

### Implementation for User Story 6

- [X] T123 [US6] Verify and adjust the responsive grid in `frontend/src/entities/catalog/ui/CatalogGrid.tsx`: at least 2 columns at 360 px, 3 at 768 px, 4 at 1024 px, and 5 at 1440 px when enough items exist, consistent artwork aspect ratio, and no horizontal page scrolling. Add `frontend/src/entities/catalog/ui/CatalogGrid.responsive.test.tsx`.
- [X] T124 [US6] Implement and test the keyboard journey across the landing, category, and detail in `frontend/src/app/routing/catalogKeyboard.test.tsx`: media switch, See all, every card, Load more, retry, and return actions are reachable in logical order with visible focus and no trap.
- [X] T125 [US6] Enforce one interactive target per card and the accessible-name contract in `frontend/src/entities/catalog/ui/CatalogCard.tsx`: title and media type plus year/rating when present, including the out-of-10 scale for ratings; artwork/fallback decoration does not duplicate announcements; no essential information or action requires hover, and keyboard focus exposes the same content and actions. Add `frontend/src/entities/catalog/ui/CatalogCard.targets.test.tsx`.
- [X] T126 [US6] Implement single, meaningful announcements in `frontend/src/shared/ui/LiveRegion.tsx` and catalog surfaces: errors as alerts, loading/append/end/stale as polite status, no duplicate or stale-language announcements. Add `frontend/src/widgets/catalog-category-list/ui/CatalogCategoryList.announcements.test.tsx`.
- [X] T127 [US6] Implement reduced-motion behavior in `CatalogCardSkeleton.tsx`, `Skeleton.tsx`, and catalog transitions: suppress skeleton animation and avoid layout-affecting motion. Add `frontend/src/entities/catalog/ui/CatalogCardSkeleton.motion.test.tsx`.
- [X] T128 [US6] Verify that the backend constant from T024 and the frontend constant from T036 remain the only provider language mappings and are used by section, detail, and genre requests; extend `backend/src/providers/tmdb/tmdb.language.test.ts` and `frontend/src/entities/catalog/model/catalogLanguage.test.ts` with usage assertions. Do not introduce a second mapping.
- [X] T129 [US6] Implement catalog language-change behavior in `frontend/src/entities/catalog/api/catalogKeys.ts` and surfaces: all catalog labels and provider metadata update without a full reload, query keys include the locale, the UI swaps atomically when the new-language data resolves, and no mixed-language final state remains. Add `frontend/src/features/switch-language/catalogLanguageSwitch.integration.test.tsx` and record the SC-010 one-second post-availability budget in T146.
- [X] T130 [US6] Ensure a category with loaded pages restarts at page one in the new language and discards old pages, driven by the language-aware infinite-query key; add `frontend/src/pages/catalog-category/ui/CatalogCategoryPage.languageReset.test.tsx`.
- [X] T131 [US6] Verify locale-aware formatting in `CatalogCard`, stale timestamps, and appended counts with `Intl.NumberFormat`/`Intl.DateTimeFormat`, including tabular numerals for ratings; add `frontend/src/entities/catalog/model/catalogFormatting.test.ts` for both locales.
- [X] T132 [US6] Verify long Spanish titles at 360 px and 200% zoom reflow without clipping or loss of controls in `CatalogCard.tsx`, `CatalogGrid.tsx`, `MediaTypeSwitch.tsx`, and `LoadMoreControl.tsx`; add `frontend/src/entities/catalog/ui/CatalogCard.spanishLongTitle.test.tsx`.
- [X] T133 [P] [US6] Add vitest-axe coverage for the landing, category, detail, error, empty, and stale states in `frontend/src/app/routing/catalog.a11y.test.tsx`, asserting zero critical/serious violations.
- [X] T134 [P] [US6] Add a responsive viewport test matrix in `frontend/src/app/routing/catalogResponsive.test.tsx` for 360/768/1024/1440 px behavior and 200% zoom reflow via `matchMedia` and layout classes.
- [X] T135 [US6] Enforce target sizes in catalog controls: ≥24×24 CSS px for all interactive targets and ≥44×44 CSS px for primary controls, media-switch destinations, and "Load more"; assert in `frontend/src/features/load-more-catalog/ui/LoadMoreControl.test.tsx` and `MediaTypeSwitch.test.tsx`.
- [X] T136 [US6] Add `frontend/src/widgets/provider-attribution/ui/ProviderAttribution.languages.test.tsx` asserting the mark and non-endorsement statement are present in English and Spanish and at all supported widths.

**Checkpoint**: US6 satisfies the responsive, keyboard, screen-reader, reduced-motion, and bilingual requirements of the catalog.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, ADR, repository gates, security verification, and end-to-end validation across all stories.

- [X] T137 [P] Add `docs/adr/0002-catalog-provider-boundary-and-cache.md` recording the backend-only TMDB boundary (rejecting a client key, Vite proxy, serverless edge, and SSR), the provider-neutral opaque ID, the in-memory TTL cache with labeled stale serving, and the no-persistence rationale for omitting a repository layer under constitution v1.4.0.
- [X] T138 [P] Finalize `backend/README.md`: environment inventory, local setup, scripts, provider credential handling, CORS configuration, cache freshness/stale behavior, logging rules, and the release dependency on current TMDB terms (OD-13).
- [X] T139 [P] Finalize `frontend/README.md`: catalog routes, scripts, `VITE_API_BASE_URL`, query/caching behavior, bilingual and accessibility conventions, manual keyboard/screen-reader procedure, and scope boundaries.
- [X] T140 [P] Verify and, only if necessary, update `docs/ci.md` and `.github/workflows/ci.yml` for the introduced backend: detection requires `backend/package.json`, `backend/package-lock.json`, and `backend/.nvmrc`, runs the same four scripts, and remains independent from the frontend job. Do not weaken removal protection.
- [X] T141 [P] Update `frontend/vitest.config.ts` coverage thresholds for the catalog: keep global 80% and add 90% thresholds for `src/entities/catalog/model/*`, `src/entities/catalog/api/*`, `src/entities/catalog/ui/CatalogCard.tsx`, `src/entities/catalog/ui/PosterFallback.tsx`, and `src/entities/catalog/model/catalogError.ts`.
- [X] T142 Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in `backend/`; resolve every failure and unexpected warning, including timeout/retry flakiness, unhandled rejections, and coverage below 80% global / 90% for mapping, cache, and error classification.
- [X] T143 Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in `frontend/`; resolve every failure and unexpected warning, including `act()`, missing keys, invalid DOM properties, unhandled rejections, and coverage below 80% global / 90% for catalog mapping, cache-adjacent logic, and error classification.
- [X] T144 Perform the security verification from `quickstart.md`: search `frontend/dist`, source maps, browser-delivered bundles, API responses, and logs for `TMDB_ACCESS_TOKEN`, provider base URLs, provider error text, provider field names, and stack traces; confirm image requests carry no credential; confirm the deployment configuration can set a CSP that allowlists only approved API and image hosts; record results in `frontend/README.md` and `backend/README.md`.
- [X] T145 [P] Inspect the frontend production build output in `frontend/dist/`: one lazy chunk per catalog page, no `TMDB_` value or provider error text, no third-party tracking/advertising script, and no fabricated catalog content in bundle output.
- [X] T146 Execute every scenario in `quickstart.md` (Scenarios 1–6), the security/compliance checks, and the performance smoke check under the SC-007 profile (1.6 Mbps down / 750 Kbps up / 150 ms RTT with 4× CPU throttling) at 360/768/1024/1440 px and 200% zoom, including reduced motion, provider failure injection, language switching with loaded pages, and the SC-010 one-second post-availability budget; record outcomes in `frontend/README.md`.
- [X] T147 [P] Run the scope audit against `backend/src/` and `frontend/src/`: no search, filters, watchlist, favorites, availability, playback, accounts, authentication, cast, seasons, episodes, trailers, full detail pages, database/Prisma, scraping, undocumented endpoints, fabricated metadata, machine translation, or auto-localization of provider text; provider text remains attributed; no global footer or legal-link region.
- [X] T148 [P] Audit dependencies in `backend/package.json` and `frontend/package.json` against the approved stack: Express 5, Zod 4, TanStack Query v5, and existing frontend dependencies only; no unapproved HTTP client, logger, cache, date, UI, or state library; lockfiles committed.
- [X] T149 Confirm the Definition of Done and record the completed checklist in `frontend/README.md` and `backend/README.md`: all tasks complete, all quickstart scenarios pass, automated accessibility reports zero critical/serious violations, manual keyboard/screen-reader pass recorded, quality gates green in both applications, and the TMDB legal/attribution dependency explicitly confirmed or recorded as a release blocker.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; T001 blocks backend work, T009 blocks the frontend query layer.
- **Foundational (Phase 2)**: depends on Setup; blocks all user stories. T012 and T019 block backend provider work; T030–T042 block frontend catalog work.
- **US1 (Phase 3)**: depends on Foundational; delivers the backend list read path and the Browse landing.
- **US2 (Phase 4)**: depends on US1 (routes, Browse page, provider list path) and Foundational; adds category/detail reads and pages.
- **US3 (Phase 5)**: depends on US2 (category list and infinite-query foundation); adds pagination behavior.
- **US4 (Phase 6)**: depends on Foundational mapper/card and US1/US2 surfaces; hardens incomplete-metadata behavior.
- **US5 (Phase 7)**: depends on US1/US2 surfaces and Foundational cache/error classification; adds failure, stale, empty, and loading behavior.
- **US6 (Phase 8)**: depends on US1–US5 surfaces; adds responsive/a11y/i18n hardening and verification.
- **Polish (Phase 9)**: depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: first deliverable after Foundational; no dependency on another story.
- **US2 (P1)**: depends on US1 routes, navigation, and list backend; independently testable through category/detail addresses.
- **US3 (P2)**: depends on US2 category list and its infinite-query foundation.
- **US4 (P2)**: depends on Foundational mapper/card; can run alongside US5 once US1/US2 surfaces exist, but avoid parallel edits to shared card/mapper files.
- **US5 (P2)**: depends on US1/US2 surfaces; can run alongside US4 with file discipline.
- **US6 (P3)**: final hardening; depends on all catalog surfaces.

### Within Each User Story

- Tests are written before implementation and must fail first.
- Models and pure helpers before components; components before pages; pages before cross-page integration.
- Backend service rules before controllers, controllers before routes, routes before route integration tests.
- Story checkpoint must pass before the next priority story begins, except where an explicit dependency is documented above.

### Parallel Opportunities

- Setup `[P]` tasks can run after T001; T009 is independent of backend setup.
- Foundational `[P]` tasks are file-independent, except T025 (mapper) which depends on T012/T020/T022/T023/T024, and T026 which depends on T019/T021/T024/T025.
- Within US1, T048–T050 are independent; T052/T053/T055/T056 are sequential within routing/navigation.
- Within US2, T066/T066a are independent of T064/T065; T075–T080 tests are independent once their implementations exist.
- Within US3, T092–T095 tests are independent once T083–T090 land.
- Within US4, T104–T107 tests/fixtures are independent once the mapper/card rules land.
- Within US5, T113 and T121/T122 are independent.
- Within US6, T133/T134 are independent once the surfaces exist.
- US4 and US5 may run concurrently by different authors because they edit different files, except `CatalogCard.tsx`, `PosterFallback.tsx`, and `tmdb.mapper.ts`, which are owned by US4 during overlap.

---

## Parallel Example: User Story 1

```bash
# After Foundational completes, launch independent frontend pieces together:
Task: "Implement catalogQueries capabilities/preview queries in frontend/src/entities/catalog/api/catalogQueries.ts"
Task: "Implement MediaTypeSwitch in frontend/src/features/switch-catalog-media/ui/MediaTypeSwitch.tsx"
Task: "Implement CatalogSectionPreview in frontend/src/widgets/catalog-section-preview/ui/CatalogSectionPreview.tsx"

# After Browse routes land, run independent verifications together:
Task: "BrowsePage.integration.test.tsx"
Task: "CatalogSectionPreview.order.test.tsx"
Task: "BrowsePage.a11y.test.tsx"
```

## Parallel Example: User Story 3

```bash
# After the infinite query and LoadMoreControl exist, run these in parallel:
Task: "Write backend/src/routes/catalogPagination.routes.integration.test.ts"
Task: "Write CatalogCategoryList.multiPage.integration.test.tsx"
Task: "Write LoadMoreControl.keyboard.test.tsx"
Task: "Write CatalogCategoryList.a11y.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (blocks all stories).
3. Complete Phase 3: US1 Browse landing and media switching.
4. **STOP and VALIDATE**: run the US1 independent test and confirm the landing contract from `contracts/routes.md`; a real Browse destination now exists.
5. US2 is also P1 and must follow before the browse-to-detail journey is complete.

### Incremental Delivery

1. Setup + Foundational → provider boundary, cache, API shell, frontend data layer ready.
2. US1 → Browse landing and media switch demo.
3. US2 → category and minimal detail journey.
4. US3 → long category lists with load-more.
5. US4 → trustworthy incomplete-metadata cards.
6. US5 → resilient loading/empty/error/stale behavior.
7. US6 → responsive, keyboard, screen-reader, and bilingual sign-off.
8. Polish → quality gates, security verification, quickstart matrix, DoD.

### Scope Guard

Do not add search, text search, filters, watchlists, favorites, watched status, availability, provider links, recommendations, notifications, sharing, accounts, authentication, playback, live television, cast/crew, seasons, episodes, trailers, full detail pages, a global footer, a database, Prisma, scraping, undocumented endpoints, or any dependency outside the approved stack. Do not change the Settings destination or the established shell contract beyond the Browse entry, catalog surfaces, and the minimal Home entry point.

---

## Notes

- `[P]` = different files, no dependency on incomplete work.
- `[Story]` labels exist only in story phases for traceability.
- Each user story is independently testable at its checkpoint.
- Verify tests fail before implementing; never suppress unexpected warnings.
- Commit after each task or logical group using Conventional Commits.
- Avoid vague tasks, same-file parallel edits, and cross-story scope creep.
