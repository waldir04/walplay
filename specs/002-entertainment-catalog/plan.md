# Implementation Plan: Entertainment Catalog

**Branch**: `feat/002-entertainment-catalog` | **Date**: 2026-11-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-entertainment-catalog/spec.md`

## Summary

Add a Browse destination to the Walplay SPA that presents movies and TV shows supplied by TMDB,
organized into supported sections (trending, popular, top rated), with paginated category lists,
card-consistent incomplete metadata, isolated loading/empty/error/stale states, responsive and
accessible layouts, a minimal title detail destination, and a server-side provider boundary that
keeps TMDB credentials, DTOs, and popularity scores out of the browser.

Technical approach:

- Introduce the approved `backend/` Express + TypeScript application as the only caller of TMDB.
  It exposes an internal JSON catalog API validated with Zod, maps provider DTOs to a
  provider-neutral catalog model, resolves artwork and genre names, enforces timeouts, bounded
  retries with jitter, single-flight request coordination, and a TTL cache with a labeled stale
  fallback.
- Keep the existing `frontend/` FSD architecture. Add one `entities/catalog` slice for catalog
  models, API schemas, and card UI; small `features` for media switching and load-more; and
  `widgets` for section previews, category lists, and provider attribution. Pages compose those
  into four catalog screens: landing, category, minimal detail, and catalog not-found.
- Add TanStack Query to the frontend as the exclusive server-state mechanism. Section previews use
  independent queries so one section can fail without collapsing the page; category lists use
  `useInfiniteQuery` with provider order, append-only deduplication, and a language-aware query key
  so a language change restarts the list at page one.
- Introduce no database, authentication, watchlist, search, availability, playback, or full detail
  page. The minimal detail destination is part of this feature.
- Update Home only enough to replace the outdated foundation placeholder with a working entry point
  to Browse. Settings and the rest of the shell contract remain unchanged.

## Technical Context

**Language/Version**: TypeScript 5.9 strict (`strict`, `noUncheckedIndexedAccess`,
`noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`,
`verbatimModuleSyntax`) in both applications. Node.js 22 LTS pinned per application (`.nvmrc`).

**Primary Dependencies**:

- Frontend (existing): React 19, Vite 7, React Router 7, Tailwind CSS 4 via `@tailwindcss/vite`,
  `i18next` + `react-i18next`, `zod`, `@fontsource-variable/inter`.
- Frontend (added): `@tanstack/react-query` v5 — approved stack, required by Principle XVIII now
  that the catalog has server state.
- Backend (new): `express` 5, `zod` 4, `cors`-free explicit allowlist middleware, Node native
  `fetch`/`AbortSignal`. Development-only: `typescript`, `tsx`, `vitest`, `@vitest/coverage-v8`,
  ESLint, Prettier. No HTTP client, logger, cache, or date library dependency.

**Storage**: No database or persistence. The backend uses a bounded in-memory TTL cache with a
stale window, keyed by media type, section, language, and page (plus item ID for lookups). Cache
contents are process-local and are lost on restart; this is acceptable because no user data exists
and stale data is always labeled. Prisma/PostgreSQL are intentionally not introduced.

**Testing**: Vitest + React Testing Library + jest-dom + `vitest-axe` for frontend unit, component,
and router integration tests. Vitest for backend units plus route-level integration tests against a
real Express app on an ephemeral port using native `fetch` (no supertest dependency). Provider
network access is always mocked; no test performs a real TMDB call.

**Target Platform**: Evergreen desktop and mobile browsers (latest two major versions) for the SPA;
Node.js 22 LTS server, deployable independently from the frontend.

**Project Type**: Web application — existing `frontend/` SPA plus new `backend/` JSON API.

**Performance Goals**: Primary catalog content visible within 2.5 s under the SC-007 mobile profile;
section previews requested in parallel; no request waterfalls; provider reads served from cache
within the freshness period; artwork lazy-loaded with reserved aspect ratio; route-level code
splitting for the four catalog pages.

**Constraints**: No provider credential or DTO in client code, assets, logs, errors, or source maps;
WCAG 2.2 AA; no horizontal scrolling at 360/768/1024/1440 px or 200% zoom; token-only styling;
English and Spanish with `es-ES` provider metadata; 80% global coverage and 90% on catalog
mapping, cache, and error classification; zero unexpected test warnings.

**Scale/Scope**: Two media types, three sections per type, two locales, four new page destinations
(landing, category, minimal detail, catalog not-found), one provider adapter, one in-memory cache.
No user accounts, persistence, filters, or search.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Clean Code, SOLID, Simplicity | One responsibility per module; no speculative abstraction; provider adapter only where replaceability is required | PASS — `entities/catalog` is the single catalog domain slice; no generic provider framework; cache is a small focused module |
| II. Strict TypeScript | All strict flags, no `any`, Zod at every boundary, literal unions instead of enums | PASS — both `tsconfig` files enable every required flag; TMDB DTOs and internal API are Zod schemas with `z.infer` types |
| III. Feature-Sliced Design | Downward imports, public `index.ts` per slice, no same-layer imports, no `../..` chains | PASS — one entity slice, two features, three widgets, four pages; pages compose slices |
| IV. Arrow Function Syntax | Arrow functions in all frontend application code; ESLint enforced | PASS — new frontend code uses arrows; backend follows Principle V and uses idiomatic functions |
| V. Backend Architecture | `routes → controllers → services → repositories`; Zod on body/params/query; centralized errors | PASS — repositories are the persistence boundary; this feature has no persistence, so the flow is `routes → controllers → services → provider adapters`, as clarified in constitution v1.4.0 |
| VI. React Component Design | Small, typed, presentation-only shared UI; no data fetching in presentational components | PASS — cards and attribution are prop-driven; queries live in entity/feature/widget data layers |
| VII. Styling & Tokens | Tailwind 4 only; `@theme` single token source; skeleton, empty, error states | PASS — no raw hex in components; skeletons match card grids; semantic tokens only |
| VIII. Testing & Zero Warnings | Vitest/RTL, AAA, observable behavior, all async states, 80% coverage | PASS — test plan below covers loading, success, empty, error, stale, retry, pagination, a11y |
| IX. Performance | Route splitting, no request waterfalls, deliberate query staleness, image optimization | PASS — parallel section queries, server cache, lazy images, route chunks |
| X. Resilience | Fault isolation, explicit timeouts/retries/caching, stable error codes, stale labeling | PASS — per-section isolation, bounded retries, TTL + stale window, stable catalog codes |
| XI. API Contracts | Zod source of truth, single error envelope, correct status codes, explicit CORS | PASS — `contracts/catalog-api.md`; shared envelope; no wildcard CORS with credentials |
| XII. Constants & Configuration | Zod-validated env, centralized env access, named TTLs/timeouts/endpoints, `.env.example` | PASS — `backend/src/config/env.ts` and `frontend/src/shared/config/env.ts`; no magic values in modules |
| XIII. Security | Secrets server-side, untrusted provider input, no raw errors, no sensitive logs | PASS — bearer token only in backend env; provider payloads never logged; opaque item IDs |
| XIV. Accessibility | WCAG 2.2 AA, semantic structure, keyboard, live regions, targets, reduced motion | PASS — one `h1` per surface, labelled sections, one card target, focus/live-region plan below |
| XV. Internationalization | i18next only, externalized text, `Intl` formatting, provider language matching | PASS — new keys in both resources; `en-US`/`es-ES`; category resets on language change |
| XVI. Documentation | Plan, ADR-worthy decisions, setup docs, English | PASS — research decisions, ADR-0002, backend README, `.env.example` updates |
| XVII. Quality Gates | Same `lint`/`typecheck`/`test`/`build` contract; hooks and CI use them | PASS — backend exposes the same scripts; pre-push and CI extended |
| XVIII. Server State | TanStack Query exclusive; key factory; deliberate `staleTime`/`gcTime` | PASS — one `QueryClient`, central key factory, no fetch in components |
| XIX. Prisma Persistence | Prisma/PostgreSQL official persistence | N/A — no persistence in this feature; introducing an unused database would violate Principle XXI |
| XX. External Providers | Isolated adapter, Zod validation, internal models, timeout/retry/cache, no direct frontend calls | PASS — TMDB adapter behind `CatalogProvider`; all requirements implemented server-side |
| XXI. Stack Governance | Only approved stack; new dependencies justified; lockfiles committed | PASS — TanStack Query and Express are approved; no other runtime dependency added; backend lockfile committed |

**Post-design re-evaluation**: PASS. Constitution v1.4.0 clarifies the no-persistence request
flow, so the provider adapter is the infrastructure boundary and no repository layer is required.
No other deviation is open.

## Project Structure

### Documentation (this feature)

```text
specs/002-entertainment-catalog/
├── plan.md              # This file
├── research.md          # Phase 0 decisions and rejected alternatives
├── data-model.md        # Phase 1 entities, shapes, and state machines
├── quickstart.md        # Phase 1 end-to-end validation guide
├── contracts/
│   ├── catalog-api.md       # Backend HTTP contract
│   ├── routes.md            # Frontend route and navigation contract
│   ├── provider-boundary.md # Adapter, mapping, cache, and error contract
│   └── i18n-resources.md    # Catalog translation keys and provider language mapping
└── tasks.md             # Task breakdown
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx                      # add QueryClientProvider
│   │   ├── routing/routes.tsx           # add Browse, category, detail routes
│   │   └── routing/navigationActivity.ts# Browse active-state prefix helper (if extracted)
│   ├── entities/
│   │   └── catalog/
│   │       ├── index.ts                 # public API
│   │       ├── api/
│   │       │   ├── catalogClient.ts     # typed calls to the internal API
│   │       │   ├── catalogKeys.ts       # query key factory
│   │       │   └── catalogQueries.ts    # query options and infinite-query helper
│   │       ├── model/
│   │       │   ├── catalogItem.ts       # Zod schema, types, formatters
│   │       │   ├── catalogSection.ts    # capabilities, page slice, and category slugs
│   │       │   ├── catalogLanguage.ts   # single en/es locale mapping
│   │       │   └── catalogError.ts      # error code union and localization mapping
│   │       └── ui/
│   │           ├── CatalogCard.tsx
│   │           ├── CatalogGrid.tsx
│   │           ├── CatalogCardSkeleton.tsx
│   │           └── PosterFallback.tsx
│   ├── features/
│   │   ├── switch-catalog-media/
│   │   │   ├── index.ts
│   │   │   └── ui/MediaTypeSwitch.tsx
│   │   └── load-more-catalog/
│   │       ├── index.ts
│   │       └── ui/LoadMoreControl.tsx
│   ├── widgets/
│   │   ├── catalog-section-preview/
│   │   │   ├── index.ts
│   │   │   └── ui/CatalogSectionPreview.tsx
│   │   ├── catalog-category-list/
│   │   │   ├── index.ts
│   │   │   └── ui/CatalogCategoryList.tsx
│   │   └── provider-attribution/
│   │       ├── index.ts
│   │       └── ui/ProviderAttribution.tsx
│   ├── pages/
│   │   ├── browse/
│   │   ├── catalog-category/
│   │   ├── title-detail/
│   │   ├── catalog-not-found/
│   │   └── home/                         # placeholder replaced by Browse entry
│   ├── shared/
│   │   ├── api/httpClient.ts            # fetch wrapper + error envelope parsing
│   │   ├── config/env.ts                # add validated VITE_API_BASE_URL
│   │   ├── config/routes.ts             # Browse and catalog route metadata
│   │   ├── i18n/resources/{en,es}.json  # catalog keys
│   │   └── assets/tmdb-logo.svg         # official provider mark (legal review gate)
│   └── widgets/app-shell/
│       └── ui/PrimaryNavigation.tsx     # prefix-aware active state for Browse
├── public/
└── package.json                          # add @tanstack/react-query
backend/
├── .env.example
├── .nvmrc
├── package.json
├── package-lock.json
├── tsconfig.json
├── eslint.config.js
├── vitest.config.ts
└── src/
    ├── server.ts                         # listen
    ├── app.ts                            # Express composition
    ├── config/env.ts                     # Zod-validated backend config
    ├── domain/
    │   ├── catalog.ts                    # CatalogItem, CatalogPage, capabilities
    │   └── errors.ts                     # catalog error codes and typed errors
    ├── providers/
    │   ├── catalog-provider.ts           # internal adapter interface
    │   └── tmdb/
    │       ├── tmdb.provider.ts
    │       ├── tmdb.client.ts            # timeout, retry, auth, fetch
    │       ├── tmdb.schemas.ts           # Zod DTOs for every used response
    │       ├── tmdb.mapper.ts            # DTO -> internal model
    │       ├── tmdb.capabilities.ts      # supported sections and pagination flags
    │       ├── tmdb.images.ts            # configuration-driven poster URLs
    │       ├── tmdb.genres.ts            # localized genre resolution
    │       └── tmdb.language.ts          # single en/es provider language map
    ├── services/
    │   ├── catalog.service.ts
    │   └── catalog-cache.ts              # TTL + stale window + single-flight
    ├── routes/catalog.routes.ts
    ├── controllers/catalog.controller.ts
    ├── middleware/
    │   ├── cors.ts
    │   ├── error.ts
    │   └── requestId.ts
    └── lib/
        ├── logger.ts                     # field-only structured logs, no payloads
        └── itemId.ts                     # opaque Walplay catalog ID codec
```

**Structure Decision**: The frontend keeps the feature 001 shell, page container, state components,
tokens, and i18n. Catalog domain logic is isolated in one `entities/catalog` slice so item and
section models can share Zod schemas without same-layer imports. Backend follows the constitutional
layers; the provider adapter is the external-data source consumed by `CatalogService`. No repository
or Prisma module is introduced because there is no persistence. The backend and frontend share no
code; the JSON contract is the boundary and is covered by contract tests on both sides.

## Implementation Phases

1. **Backend foundation**: backend scaffold, env validation, error envelope, CORS allowlist,
   request IDs, logger, provider interface, TMDB client and Zod DTOs.
2. **Backend catalog**: mapping, capabilities, image and genre resolution, cache with stale
   fallback and single-flight, service, routes, controllers, and integration tests.
3. **Frontend data layer**: `@tanstack/react-query`, `QueryClientProvider`, HTTP client, Zod
   response schemas, key factory, query options, error-code mapping.
4. **Frontend entities and widgets**: card, fallback, grid, skeleton, section preview, category list,
   load-more control, attribution, media switch.
5. **Frontend pages and routing**: Browse landing, category, minimal detail, catalog not-found,
   and the `/browse` redirect; lazy-loaded route chunks; navigation entry and active state,
   localized titles and announcements, and a working Browse entry on Home in place of the
   foundation placeholder.
6. **Cross-cutting completion**: i18n resources, responsive/a11y states, stale and degradation
   behavior, documentation, ADR, hook/CI updates, full verification.

## Dependencies

| Dependency | Impact |
|---|---|
| Feature 001 foundation | Shell, route loader, state components, tokens, i18n, persisted language, CI scripts. Reused, not duplicated. |
| TMDB approval and provider access | Bearer credential and release dependency on current terms, attribution, artwork use, caching, and rate limits (OD-13 remains open). |
| Backend introduction | First server in the repository; requires backend workspace, lockfile, `.nvmrc`, scripts, CI detection, pre-push update, and CORS configuration. |
| TanStack Query | Approved runtime dependency currently absent; required for server state and cache/refetch behavior. |
| Official TMDB attribution asset | Official mark and required non-endorsement wording must be confirmed at implementation and legal review. |
| Deployment topology | API base URL, frontend origin allowlist, and image host CSP must be configurable per environment. Topology itself remains deferred. |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| TMDB terms, attribution, artwork, or caching rules change | Release blocker | Isolate attribution asset, statement, image sizes, and TTL in configuration/components; require legal confirmation before release; no scraping or undocumented endpoints |
| Provider volatility between pages (insertions, duplicates, reordering) | Duplicate or unstable lists | Append-only accumulation, dedupe by opaque item ID, never re-sort, provider page metadata authoritative, safe end state |
| Rate limiting or provider outage | Degraded catalog | Single-flight, cache, bounded retries with jitter, `429`/`Retry-After` respect, stable codes, per-section isolation, labeled stale data |
| Credential leakage | Security defect | Token only in backend env; no token in URLs, images, client assets, logs, or errors; automated scanning test on built frontend |
| Cache inconsistency across instances | Different results per request | Process-local cache documented as a performance layer, not a source of truth; correctness comes from provider-authoritative responses |
| Language switch with loaded pages | Mixed-language list | Language in every query key and cache key; category list restarts at page one; no previous pages retained |
| Direct detail lookup for removed or invalid titles | Dead destination | Backend returns `CATALOG_NOT_FOUND`; localized not-found state with working return; no fabricated metadata |
| Opaque ID tampering | Invalid or cross-type lookup | Decode and validate the token, verify embedded media type matches the route, reject invalid tokens without detail |
| Long Spanish titles and narrow viewports | Clipping or overflow | Line clamp with full accessible name, wrapping, 2-column minimum, container-query-free responsive grid verified at 360 px and 200% zoom |
| Unsupported section assumption drift | Empty or failed surface | Capabilities are fetched at runtime from the adapter declaration; unsupported sections are omitted, not rendered empty |
| Legal placeholder attribution shipped | Compliance defect | Explicit release checklist item; no fallback/placeholder mark accepted as production |
| Backend/frontend contract drift | Runtime failures | Zod schemas mirror the documented contract; contract tests on both sides; no shared code but identical fixtures |

## Testing Strategy

**Frontend**

- `entities/catalog`: response schema validation, item formatters, fallback decisions, card
  accessible name, one interactive target, poster failure, missing year/rating/genres, long title,
  axe assertions, skeleton `aria-hidden`.
- `features`: media switch destinations and active state, load-more disabled/busy behavior.
- `widgets`: section order, See all only when paginated, per-section error with retry while siblings
  remain, inline empty state, stale label, category append/dedupe/end/error, focus after final page,
  single polite announcement per append.
- `pages`: default Movies, direct type addresses, back/forward, rapid switching, `/browse` redirect,
  one `h1` per surface, all-sections-failed page error, category direct load, invalid category,
  detail from card metadata, direct detail lookup, unknown title, return action.
- `app/routing`: Browse navigation entry, active prefix state, route titles, announcements, shell
  preservation on failures.
- `i18n`: every catalog key present in both locales; language change resets category pages; no
  mixed-language final state; `Intl` formatting.
- Accessibility: axe on landing, category, detail, error, empty, and stale states; keyboard-only
  journey including load-more and focus movement; reduced-motion assertions.

**Backend**

- `config/env`: required/optional values, secret never logged, fail-fast behavior.
- `tmdb.schemas` / `tmdb.mapper`: valid and malformed DTOs, localized/original title fallback,
  year extraction, zero-vote and out-of-range ratings, genres, adult exclusion, poster resolution,
  item invalidation, opaque ID codec.
- `tmdb.client`: timeout, network failure, 5xx, 429 with `Retry-After`, malformed JSON, bounded
  retry attempts for idempotent GETs only, no credential in logs.
- `catalog-cache`: fresh hit, stale hit after provider failure, no stale when empty, key isolation by
  media type/section/language/page, single-flight, bounded size.
- `catalog.service`: capabilities, unsupported sections, pagination flags, invalid response mapping,
  genre degradation, stale labeling, direct lookup, adult/unknown handling.
- `routes`: real Express app on an ephemeral port; envelope shape, status mapping, query/param
  validation, CORS allowlist and preflight, unknown routes, no provider payload or credential in a
  response.

**Quality gates**

- `frontend`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- `backend`: the same four scripts; lockfile and `.nvmrc` committed.
- Root pre-push runs both applications; CI's existing backend detection now activates; frontend
  bundle inspection confirms no `TMDB_` value or provider error text.
- Manual: VoiceOver/NVDA journey, 360/768/1024/1440 px, 200% zoom, reduced motion, the SC-007
  mobile profile (1.6 Mbps down / 750 Kbps up / 150 ms RTT, 4× CPU throttling), provider failure
  injection, language switch with multiple loaded pages.

## Complexity Tracking

| Decision / Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Backend has no `repositories` layer | This feature has no persistence; the only external data source is a provider adapter | Constitution v1.4.0 defines repositories as the persistence boundary. Adding an empty repository or Prisma layer would be speculative, add an unused dependency, and violate Principles I and XXI. The provider adapter is the explicit external-data boundary. |
| Second application (`backend/`) | FR-058 and Principle XX require provider credentials and DTOs to stay off the browser | A Vite proxy or serverless edge function is not in the approved architecture and would still need a deployed server boundary. A separate Express app is the approved, independently deployable option. |
| `PrimaryNavigation` active-state change | Browse must stay active on nested catalog addresses | Keeping exact path matching would leave Browse unmarked on every catalog screen, contradicting the shell's active-destination contract. Extending the item with a match prefix is smaller than duplicating navigation. |

## Phase 0 and Phase 1 Outputs

- `research.md` — every technical decision, rationale, and rejected alternative.
- `data-model.md` — catalog entities, runtime shapes, invariants, validation, and state machines.
- `contracts/catalog-api.md` — internal HTTP contract and error envelope.
- `contracts/routes.md` — frontend destinations, navigation, and return behavior.
- `contracts/provider-boundary.md` — adapter interface, mapping rules, cache and retry contract.
- `contracts/i18n-resources.md` — translation keys and provider language mapping.
- `quickstart.md` — runnable end-to-end validation guide.
