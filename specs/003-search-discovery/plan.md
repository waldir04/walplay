# Implementation Plan: Search and Discovery

**Branch**: `feat/003-search-discovery` | **Date**: 2026-11-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-search-discovery/spec.md`

## Summary

Add one Search destination to the Walplay SPA that searches movies and TV shows by title through
TMDB's documented unified multi-search operation. The browser never calls TMDB. The existing
`backend/` Express boundary gains one `GET /api/search` read endpoint that validates the query,
language, and page with Zod, calls only `GET /3/search/multi`, drops non-movie/non-TV and invalid
results, reuses the catalog item mapper, caches pages with the existing TTL + stale + single-flight
cache, and returns the provider-neutral catalog item shape.

The frontend reuses the feature 001 shell and feature 002 catalog entity: one new Search page
composed from a search-input feature and a search-results widget, using the existing card, grid,
skeleton, empty/error states, attribution widget, TanStack Query, and i18n. The address
`/search?q=` is the single source of truth for the active query. Settled input replaces the current
history entry; opening a result pushes an entry and carries a search-origin context so the existing
minimal detail destination returns to the active search.

Technical approach, in short:

- Defer the request until input settles (350 ms), submit immediately on explicit submission, and
  never request empty, short, over-long, or duplicate requests.
- Key requests by a normalized identity (trim, collapse whitespace, case fold) plus language, while
  sending the trimmed raw query to the provider for relevance. This satisfies duplicate detection
  without rewriting the visitor's query.
- Treat cancellation as supersession: changing the query key, clearing the address, or starting a
  newer search discards late responses. No extra network-abort layer is required beyond the existing
  request timeout, because the address/query-key change already prevents stale data from rendering.
- Make response ordering safe by construction: every query/language selection has its own infinite
  query key, so only the current key's data can render; stale responses land in discarded keys.
- Keep provider totals out of the interface. Pagination follows provider `total_pages`; the
  interface shows only the number of valid titles currently displayed.
- No database, no persistence, no new runtime dependency, no new top-level destination beyond
  Search.

## Technical Context

**Language/Version**: TypeScript 5.9 strict in both applications (`strict`,
`noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`,
`noUnusedParameters`, `verbatimModuleSyntax`). Node.js 22 LTS pinned per application.

**Primary Dependencies**:

- Frontend (existing, no additions): React 19, Vite 7, React Router 7, Tailwind CSS 4 via
  `@tailwindcss/vite`, `@tanstack/react-query` v5, `zod` 4, `i18next` + `react-i18next`.
- Backend (existing, no additions): Express 5, `zod` 4, Node native `fetch`/`AbortSignal`.
  Reuses the existing TMDB client, image resolver, genre resolver, mapper primitives, cache, error
  envelope, CORS middleware, request IDs, and restricted logger.

**Storage**: No database and no persistence. Search results use a second process-local
`CatalogCache` instance (same TTL/stale/entry-cap configuration as the catalog cache) keyed by
provider, normalized query identity, language, and page. Cache entries are lost on restart, which
is acceptable because no user data exists and stale entries are labeled.

**Testing**: Vitest + React Testing Library + jest-dom + `vitest-axe` for frontend unit, component,
and router tests with fake timers for debounce. Vitest for backend units plus route integration
tests against a real Express app on an ephemeral port. Provider traffic is always mocked; no test
calls TMDB.

**Target Platform**: Evergreen desktop and mobile browsers (latest two major versions); Node.js 22
LTS server deployed independently.

**Project Type**: Web application — existing React SPA (`frontend/`) plus existing JSON API
(`backend/`).

**Performance Goals**: Results visible within 2.5 s after the query settles under the SC-010 mobile
profile; zero provider requests while typing; at most one Walplay search request per settled query,
language, and page; no request waterfall; provider pages served from cache within freshness;
artwork lazy-loaded with reserved aspect ratio; the new page is a lazy route chunk.

**Constraints**: No credential, provider DTO, provider field name, or raw provider error in the
browser, assets, logs, or errors; query text never logged or persisted; WCAG 2.2 AA; no horizontal
scrolling at 360/768/1024/1440 px or 200 % zoom; tokens only; English and Spanish with `es-ES`
provider metadata; 80 % global coverage and 90 % on search mapping, identity, cache keys, and state
machine; zero unexpected test warnings.

**Scale/Scope**: One new destination, one new API endpoint, one provider operation, two media types
in one collection, two locales. Query limits: minimum 2 non-whitespace characters, maximum 200
characters, settling interval 350 ms (within the specified 300–500 ms). No filters, suggestions,
history, accounts, availability, or playback.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Clean Code, SOLID, Simplicity | One responsibility per module; no speculative abstraction; no duplicated search framework | PASS — search is one service, one route, one provider operation; the small `SearchProvider` interface is segregated from `CatalogProvider` and implemented over the same client/resolvers; no generic search abstraction |
| II. Strict TypeScript | Strict flags, no `any`, Zod at every boundary, literal unions, `z.infer` contracts | PASS — TMDB multi-search DTOs and the internal search response are Zod schemas; the query validity model is a discriminated union |
| III. Feature-Sliced Design | Downward imports only, public `index.ts`, no same-layer imports | PASS — search models, API, and card reuse stay inside `entities/catalog` (avoiding an `entities/search` → `entities/catalog` same-layer import); a `features/search-query` interaction owns input/debounce; `widgets/search-results` composes entity UI; the page composes both and passes attribution as a slot |
| IV. Arrow Function Syntax | Arrow functions in frontend application code; ESLint enforced | PASS — all new frontend code uses arrows; backend follows Principle V |
| V. Backend Architecture | `routes → controllers → services → provider adapters`, Zod on body/params/query, centralized errors | PASS — no persistence, so the constitutional no-persistence flow applies; the TMDB search adapter is the infrastructure boundary |
| VI. React Component Design | Small, typed, presentational UI; logic in hooks; controlled form with shared Zod validation | PASS — `SearchForm` is presentational and controlled; debounce/URL logic in a hook; query validity is a Zod schema shared by the form and address parser; result rendering is prop-driven over the existing card/grid |
| VII. Styling & Tokens | Tailwind 4 only, `@theme` tokens, skeleton/empty/error states, reduced motion | PASS — no raw colors; layout-matching card skeletons; distinct empty and error states; reduced-motion respected |
| VIII. Testing & Zero Warnings | Vitest/RTL, AAA, observable behavior, all async states, 80 %/90 %, no unexpected warnings | PASS — test strategy below covers debounce, request counts, races, pagination, all states, a11y, and i18n |
| IX. Performance | Route splitting, no waterfalls, deliberate staleness, lazy images, no repeated requests | PASS — lazy route chunk, one request per settled identity, server cache + single flight, existing lazy artwork |
| X. Resilience | Fault isolation, timeouts/retries/cache, stable codes, labeled stale data, local degradation | PASS — reuses bounded retries and TTL/stale cache; search failure cannot affect navigation, language, or other destinations |
| XI. API Contracts | Zod source of truth, single error envelope, correct status mapping, explicit CORS, no-store | PASS — `contracts/search-api.md`; routes reuse the existing envelope and CORS allowlist; search responses are `Cache-Control: no-store` |
| XII. Constants & Configuration | Named business constants, centralized validated config, no magic values | PASS — query limits, the settling interval, and the defensive request-page ceiling are named constants on the owning side; no new environment variable is introduced; existing provider/cache settings are reused |
| XIII. Security | Secrets server-side, untrusted provider input validated, no sensitive logs, no raw errors | PASS — bearer token stays backend-only; provider payloads validated and never logged; query text is never logged, persisted, or included in errors |
| XIV. Accessibility | WCAG 2.2 AA, semantic structure, keyboard, live regions, targets, reduced motion | PASS — labelled search region and input, one `h1`, status/alert split, focus preserved in the input, ≥24/44 px targets |
| XV. Internationalization | i18next only, externalized text, `Intl` formatting, provider language parity | PASS — new `search` namespace in both locales; `en-US`/`es-ES` mapping reused; pluralized counts via i18next |
| XVI. Documentation | Plan, ADR for durable decisions, English, contracts kept current | PASS — plan + contracts + ADR-0003 for URL/identity and search-origin return |
| XVII. Quality Gates | Same `lint`/`typecheck`/`test`/`build` contract; hooks and CI unchanged | PASS — no new scripts; both applications already expose the contract |
| XVIII. Server State | TanStack Query exclusive, key factory, deliberate `staleTime`/`gcTime`, no fetch in components | PASS — one central key factory extension; search uses `useInfiniteQuery`; `retry: false` so retries are explicit; no component fetches |
| XIX. Prisma Persistence | Prisma/PostgreSQL official persistence | N/A — no persistence; introducing it would violate Principles I, XIX (for unused layers), and XXI |
| XX. External Providers | Isolated adapter, Zod validation, internal models, timeout/retry/cache, no direct browser calls | PASS — `SearchProvider` adapter over TMDB, validated DTOs, catalog item model, existing client resilience |
| XXI. Stack Governance | Approved stack only, new dependencies justified, lockfiles committed | PASS — zero new dependencies; no new libraries for debounce, search, or state |

**Post-design re-evaluation**: PASS. Phase 1 added no technology, no persistence, and no new
top-level capability. The only contract extension is the additive `from` search-origin path accepted
by the existing detail return resolver, which is required by FR-007 and does not create a second
detail destination.

## Project Structure

### Documentation (this feature)

```text
specs/003-search-discovery/
├── plan.md              # This file
├── research.md          # Phase 0 decisions and rejected alternatives
├── data-model.md        # Phase 1 entities, shapes, invariants, state machine
├── quickstart.md        # Phase 1 end-to-end validation guide
├── contracts/
│   ├── search-api.md        # Backend search HTTP contract
│   ├── routes.md            # Search destination, address, history, and detail return
│   ├── provider-boundary.md # TMDB search adapter, mapping, cache, and error contract
│   └── i18n-resources.md    # Search translation keys and language mapping
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
└── src/
    ├── app.ts                              # mount search router; accept SearchService
    ├── server.ts                           # wire TMDB search provider + search cache
    ├── config/env.ts                       # unchanged; reuse provider/cache settings
    ├── domain/
    │   ├── search.ts                       # provider search page, constants, query identity
    │   └── errors.ts                       # unchanged; reuse stable codes
    ├── providers/
    │   ├── catalog-provider.ts             # unchanged
    │   ├── search-provider.ts              # internal SearchProvider interface
    │   └── tmdb/
    │       ├── tmdb.search.schemas.ts      # Zod DTO for /search/multi
    │       ├── tmdb.search.mapper.ts       # media_type-aware mapping to CatalogItem
    │       └── tmdb.search.provider.ts     # uses shared client/images/genres
    ├── services/
    │   ├── catalog-cache.ts                # reused unchanged (generic)
    │   └── search.service.ts               # cache key, hasMore, stale meta, error mapping
    ├── routes/
    │   ├── catalog.routes.ts               # unchanged
    │   └── search.routes.ts                # GET /api/search, no-store
    ├── controllers/search.controller.ts    # Zod query/params validation
    └── test/fixtures/                      # extend with a fake search provider

frontend/
└── src/
    ├── app/routing/routes.tsx              # add /search route + lazy importer
    ├── shared/
    │   ├── config/routes.ts                # add search page kind + Search nav entry
    │   ├── config/constants.ts             # query limits + settling interval
    │   └── i18n/resources/{en,es}.json     # search namespace, meta/navigation keys
    ├── entities/catalog/
    │   ├── index.ts                        # export search model/API
    │   ├── model/
    │   │   ├── searchQuery.ts              # validity, trimming, identity normalization
    │   │   ├── searchPage.ts               # response schema + append/dedupe helpers
    │   │   └── searchState.ts              # state copy keys + error→state mapping
    │   ├── api/
    │   │   ├── catalogClient.ts            # add getSearchPage using the same HttpClient
    │   │   ├── catalogKeys.ts              # add search key factory
    │   │   └── searchQueries.ts            # useSearchQuery (useInfiniteQuery)
    │   └── ui/CatalogCard.tsx              # accepts a full origin path (pathname+search)
    ├── features/search-query/
    │   ├── index.ts
    │   ├── model/useSearchInput.ts         # debounce, submit, clear, URL replace, focus
    │   └── ui/SearchForm.tsx               # labelled input, submit, clear
    ├── widgets/search-results/
    │   ├── index.ts
    │   └── ui/SearchResults.tsx            # states, append, announcements, attribution slot
    ├── pages/search/
    │   ├── index.ts
    │   └── ui/SearchPage.tsx               # h1, form, results, attribution, guidance
    └── pages/title-detail/ui/
        ├── detailReturn.ts                 # accept /search?q= origin; keep catalog behavior
        └── TitleDetailPage.tsx             # return label for search origin

docs/adr/
└── 0003-search-query-identity-and-origin.md
```

**Structure Decision**: Search is a use case over the existing catalog content domain, not a new
domain. Search models, response schemas, query identity, and the search endpoint client therefore
live inside `entities/catalog`; a separate `entities/search` slice would violate the same-layer
import rule the moment it reused the catalog item model and card. The input interaction lives in
`features/search-query`, the results surface in `widgets/search-results`, and the page composes
them. The backend follows the constitutional no-persistence flow and adds one provider adapter
over the same TMDB client rather than a second integration. Frontend and backend share no code; the
JSON contract is the boundary, covered by contract tests on both sides.

## Implementation Phases

1. **Backend search boundary**: `search` domain types and constants, multi-search Zod DTO, media
   type-aware mapper reusing `resolveTitle`/`extractReleaseYear`/`buildRating`/`encodeItemId`,
   `SearchProvider`, TMDB implementation sharing the client and resolvers.
2. **Backend search endpoint**: search service with normalized cache key, `hasMore` from provider
   page metadata (including empty-but-more pages), stale meta, error mapping, controller validation,
   router with `no-store`, app/server wiring, integration tests.
3. **Frontend search model and data layer**: query validity/identity helpers, response schema,
   append/dedupe helper, client method, key factory, infinite query with `retry: false`,
   search state copy mapping.
4. **Frontend interaction and results**: debounced controlled input with immediate submit, clear,
   focus retention, URL `replace` semantics; results widget with skeleton, success, no-results,
   error/retry, stale, interim-empty page, append, end, and single announcements.
5. **Frontend destination and detail origin**: Search route/navigation/title/announcement, page
   composition and attribution gating, card origin path, detail return resolver and label for
   search origin with catalog fallback.
6. **Completion**: bilingual resources, responsive/a11y verification, ADR-0003, contract and
   quickstart validation, full quality gates.

## Dependencies

| Dependency | Impact |
|---|---|
| Feature 001 foundation | Shell, routing, state components, tokens, i18n, language persistence, quality scripts. Reused, not duplicated. |
| Feature 002 catalog | Item model, card/grid/skeleton/fallback, detail destination, attribution, error codes, server boundary, cache, logger. Reused; only additive origin-path support and one client/key/query extension. |
| TMDB provider approval and terms | Unified search operation, language behavior, pagination metadata, adult flag, attribution, and rate limits. Legal confirmation remains a release dependency (OD-02 recorded decision; OD-13 for artwork licensing, caching, and display rules). |
| Existing TanStack Query and cache | No new dependency; search adds one keyed infinite query and one cache instance. |
| Deployment topology | No new configuration; the existing API base URL and CORS allowlist carry the new endpoint. |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Debounce and URL sync produce duplicate requests | Provider traffic and flicker | Settle to the address, key by normalized identity, `retry: false`, server single-flight and TTL cache; tests assert request counts |
| Out-of-order responses | Stale results overwrite newer ones | One query key per normalized identity and language; discarded responses land in other keys; announcements and append are gated on the current key |
| Unified search includes people and other types | Wrong counts and gaps | `media_type` filter at the boundary; invalid items dropped; provider `total_results` never exposed; displayed count only |
| Zod `.max()` counts UTF-16 code units, not code points | Over-long astral-plane input accepted at one boundary | An explicit code-point counter/refinement on both boundaries, with astral-plane fixtures in the model and route tests |
| Provider reports more pages but a page has no valid titles | False no-results state | `hasMore` derives from `total_pages > page` regardless of item count; interim-empty message, load more retained, no auto-request |
| Provider rejects a query or a late page | Misleading retry loop | Provider 400/422 maps to `VALIDATION_ERROR`; the interface shows editable guidance without retry; explicit retry only for outages |
| Query privacy leakage | Compliance defect | No query text in logs, errors, analytics, storage, or error responses; responses are `no-store`; only the address and in-memory cache hold the query |
| Search origin lost on reload | Broken return action | Origin travels in route state only; on reload the detail falls back to the media landing without error, as specified |
| Language switch with pending pages | Mixed-language results | Language is part of the key; the previous key is never rendered; old pages are discarded rather than retained |
| Long Spanish titles and 360 px | Clipping or overflow | Existing card clamp with full accessible name; grid verified at 360 px and 200 % zoom |
| Provider page ceiling or metadata drift | Infinite load more | End when `hasMore` is false; a later page failure stays inline with retry; no assumption about an undocumented page cap |
| Same-layer FSD violation | Architectural defect | Search lives in `entities/catalog`; attribution is passed into the results widget as a slot instead of importing a sibling widget |

## Testing Strategy

**Backend**

- `domain/search`: trim, internal whitespace preservation, minimum/maximum validity, identity
  normalization (case fold, collapsed whitespace), cache-key component isolation.
- `tmdb.search.schemas` / `tmdb.search.mapper`: valid movie and TV items, `person`/unknown
  `media_type` excluded, missing `media_type` excluded, adult excluded, missing localized title
  fallback, missing/invalid dates, zero-vote ratings, unknown genres, missing posters, invalid IDs,
  duplicate IDs within one page removed first-occurrence-wins, an all-invalid page mapping to an empty
  page, order preservation.
- `tmdb.search.provider`: only `/search/multi`, only query/language/page/`include_adult=false`
  parameters, shared client/resolvers, genre maps per media type.
- `search.service`: `hasMore` from `total_pages` including an empty page with more pages, no
  `totalResults` exposure, stale meta, cache hit/stale/single-flight, normalized-query cache reuse,
  provider 400/422 → `VALIDATION_ERROR` without changing the shared catalog `mapProviderError`
  behavior, requested-page echoing, timeout/429/5xx/invalid response mapping, no query text in
  errors.
- `routes/search.routes.integration`: envelope, status mapping, required/invalid/oversized query,
  language, page, unknown keys, duplicated query keys, `Cache-Control: no-store`, CORS allowlist,
  no provider payload/credential/query echo.

**Frontend**

- `searchQuery`: validity states, code-point counting, identity normalization, address parsing
  with first `q` occurrence, extra parameters ignored.
- `searchPage`: schema validation, append-only dedupe by opaque ID, order preservation.
- client/keys/queries: path and encoding, error code mapping, key includes identity and language,
  `enabled` behavior for invalid queries, `retry: false`, deliberate
  `refetchOnWindowFocus`/`refetchOnReconnect: false` (no background provider traffic), late-response
  supersession, stale/gc times.
- `SearchForm`: 350 ms debounce with fake timers, no request while typing, one request after
  settling, immediate submit cancels the timer, resubmitting the same identity makes no request,
  short/empty/over-long guidance with zero requests, clear cancels and refocuses, address uses
  `replace` for settled queries.
- `SearchResults`: skeleton with busy state and hidden decoration, mixed movie/TV success with type
  labels, displayed-count wording, stale label, no-results versus error with retry, query-invalid
  guidance without retry, interim-empty page with load more, append without duplicates or reorder,
  end state and focus, one announcement per change, out-of-order resolution keeps the newest query,
  language switch discards previous-language pages.
- `SearchPage`/routing: direct address with a valid query, direct address with an invalid query,
  Search navigation entry and current state, Search not marked on catalog/detail routes, browser
  back/forward restore, detail opened from search returns to the active search, direct/reloaded
  detail falls back to the media landing, catalog-origin behavior unchanged.
- Accessibility: axe on guidance, loading, success, no-results, error, stale, and interim states;
  keyboard-only journey; focus retention after debounced search and clear; live-region politeness;
  reduced motion; structural responsive assertions at 360/768/1024/1440 px plus the manual 200 %
  zoom check in quickstart; long Spanish titles.
- i18n: identical leaf keys in both locales, no hardcoded user-facing text, `Intl` count/date/rating
  formatting, no mixed-language final state.

**Quality gates**

- `frontend`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- `backend`: the same four scripts.
- Manual: VoiceOver/NVDA search-to-detail journey, request-count observation while typing,
  provider failure/rate-limit injection, language switch with pending pages, SC-010 mobile profile.

## Complexity Tracking

No constitutional violations are required. The plan adds no persistence layer, no new runtime
dependency, no new top-level destination beyond Search, and no second provider integration. The
additive detail-origin support is an extension of the existing route contract required by FR-007,
not a parallel detail destination.

| Decision | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Search models live in `entities/catalog` | Search results reuse the catalog item model and card UI | A separate `entities/search` slice would import a sibling entity slice, violating Principle III; moving the item model to `shared` would put business rules in `shared` |
| `SearchProvider` is separate from `CatalogProvider` | Search is one operation with a different request shape; catalog code should not depend on it | Adding `search` to `CatalogProvider` would force every catalog consumer and test fake to carry an unused method and blur the catalog contract |
| Provider 400/422 maps to the existing `VALIDATION_ERROR` code | The interface must show editable guidance without retry for query rejections | A new search-specific error code adds contract surface without changing the required UI; malformed responses already map separately to `CATALOG_INVALID_RESPONSE` |

## Phase 0 and Phase 1 Outputs

- `research.md` — every technical decision, rationale, and rejected alternative.
- `data-model.md` — search query, page, item reuse, identity, origin, states, invariants.
- `contracts/search-api.md` — internal HTTP contract, envelope, validation, and status mapping.
- `contracts/routes.md` — destination, address, history, focus, and detail-return contract.
- `contracts/provider-boundary.md` — search adapter interface, mapping, cache, and error contract.
- `contracts/i18n-resources.md` — search translation keys and provider language mapping.
- `quickstart.md` — runnable end-to-end validation guide.
