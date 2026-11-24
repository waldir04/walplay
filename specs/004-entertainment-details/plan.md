# Implementation Plan: Entertainment Details

**Branch**: `feat/004-entertainment-details` | **Date**: 2026-11-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-entertainment-details/spec.md`

## Summary

Complete the existing minimal title-detail destination into the full detail experience defined by
the specification, without adding a second destination or new top-level navigation.

The existing `pages/title-detail` route (`/browse/movies/title/:itemId` and
`/browse/tv-shows/title/:itemId`) already resolves the title from the address, reuses the catalog
item contract, provides return navigation, and renders provider attribution. This feature replaces
the placeholder body with a composed detail page and adds the missing provider data behind it.

Technical approach, in short:

- Extend the existing `entities/catalog` frontend slice instead of creating a sibling entity. The
  detail experience reuses the catalog item contract, formatting helpers, card, poster fallback,
  error-state mapping, query client, and attribution widget. Extending the slice follows the
  precedent set by feature 003 and avoids a prohibited same-layer entity-to-entity import.
- Add five additive backend read endpoints under the existing `/api/catalog` boundary:
  `GET .../titles/:itemId/detail`, `.../credits`, `.../similar`, `.../collection`, and
  `.../seasons/:seasonNumber`. The core detail response is one surface; credits, similar titles,
  collection items, and season episodes are independent secondary surfaces with independent failure
  and retry.
- Add one provider adapter, `DetailProvider`, implemented by a TMDB adapter that reuses the existing
  TMDB client, timeout/retry/jitter behavior, image resolver, genre resolver, list mapper, error
  types, cache, error envelope, CORS allowlist, and request IDs. No new runtime dependency.
- Treat TMDB as untrusted input: Zod schemas at the adapter, normalization and per-field validation,
  provider-neutral domain shapes, stable internal error codes, no provider DTO or raw error in the
  browser.
- Reflect the selected TV season as a `season` query parameter on the same detail address.
  Season changes use `replace`, so browser back restores the originating catalog or search context
  instead of stepping through previously selected seasons.
- Treat a malformed detail address as the localized not-found state, not a blank page and not a
  technical error; never issue a request for an identity that fails the item-id pattern.
- The routed catalog item may seed a provisional title/type for the first paint, but the core detail
  query always runs because card state does not contain the overview or any secondary data.
- Omit every unsupported capability instead of rendering disabled or placeholder controls. This
  feature no longer implements a trailer entry point: trailer presentation, activation, player, and
  external fallback are owned by feature 008. Availability and personal-list capabilities are absent
  because their destinations and provider decisions do not exist yet. No speculative integration is
  introduced.
- No database, no persistence, no new provider, no recommendation algorithm. This feature introduces
  no in-page playback; trailer playback belongs to feature 008.

## Technical Context

**Language/Version**: TypeScript 5.9 strict in both applications (`strict`,
`noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`,
`noUnusedParameters`, `verbatimModuleSyntax`). Node.js 22 LTS pinned per application.

**Primary Dependencies**:

- Frontend (existing, no additions): React 19, Vite 7, React Router 7, Tailwind CSS 4 via
  `@tailwindcss/vite`, `@tanstack/react-query` v5, `zod` 4, `i18next` + `react-i18next`.
- Backend (existing, no additions): Express 5, `zod` 4, Node native `fetch`/`AbortSignal`.
  Reuses the TMDB client, image resolver, genre resolver, list mapper, cache, error envelope,
  CORS middleware, request IDs, and restricted logger.

**Storage**: No database and no persistence. Detail responses use the existing generic process-local
`CatalogCache` (fresh TTL, stale TTL, entry cap, single-flight) through a dedicated
`detailCache` instance. Cache keys include provider, surface, media type, provider identity,
language, and season where applicable. Entries are lost on restart, which is acceptable because no
user data exists. Freshness and staleness are always returned as response metadata and shown in the
interface.

**Testing**: Vitest + React Testing Library + jest-dom + `vitest-axe` for frontend unit, component,
and router tests. Vitest for backend mapper, provider, service, and route integration tests against a
real Express app on an ephemeral port. All provider traffic is mocked; no test calls TMDB. Fake
timers and controlled clocks are used where behavior depends on time.

**Target Platform**: Evergreen desktop and mobile browsers (latest two major versions); Node.js 22
LTS server deployed independently.

**Project Type**: Web application — existing React SPA (`frontend/`) plus existing JSON API
(`backend/`).

**Performance Goals**: Core detail visible within 2.5 s on a representative mobile profile with a
warm or cold provider; at most one Walplay request per core surface and title/language; at most one
request per selected season/language; no request waterfall beyond the required core-identity gate for
secondary surfaces; secondary surfaces requested once per key and not on a timer; artwork lazy-loaded
with reserved dimensions; no repeated identical requests; the detail page remains a lazy route
chunk.

**Constraints**: No credential, provider DTO, provider field name, or raw provider error in the
browser, assets, logs, or errors; WCAG 2.2 AA; no horizontal scrolling at 320/360/768/1024/1440 px or
200 % zoom; design tokens only; English and Spanish interface with `en-US`/`es-ES` provider
metadata; 80 % global coverage and 90 % on detail mapping, normalization, state mapping, and season
selection; zero unexpected test warnings.

**Scale/Scope**: Two media types, two locales, five additive API endpoints, one provider adapter,
eight provider operations (movie details, TV details, TV season details, movie credits, TV aggregate
credits, appended videos, similar titles, collection details), one detail destination, no
persistence.
Displayed bounds: 10 cast, 6 crew, 12 similar titles, 12 collection items. Overview preview and
episode overview preview thresholds are named constants.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Clean Code, SOLID, Simplicity | One responsibility per module; no speculative abstraction; reuse existing primitives | PASS — one detail service, one provider interface, one router file; section components are small and prop-driven; no generic "content" framework; entry points are omitted rather than abstracted for imagined capabilities |
| II. Strict TypeScript | Strict flags, no `any`, Zod at every boundary, literal unions, `z.infer` contracts | PASS — TMDB detail/season/credits/similar/collection DTOs are Zod schemas; internal detail models are Zod-derived; status, crew role, and surface states are literal unions |
| III. Feature-Sliced Design | Downward imports only, public `index.ts`, no same-layer imports | PASS — detail models, API, and presentational primitives live inside `entities/catalog`, which already owns the title contract; `features/select-season` owns season interaction; `widgets/title-detail` composes sections; `pages/title-detail` orchestrates data, address, and the existing `ProviderAttribution` widget, passing it into the provider-metadata slot so no widget imports another widget; `shared` gains a generic `ExpandableText` primitive plus configuration and document-title infrastructure, with no business rules |
| IV. Arrow Function Syntax | Arrow functions in frontend application code; ESLint enforced | PASS — all new frontend code uses arrows; backend follows Principle V |
| V. Backend Architecture | `routes → controllers → services → provider adapters`, Zod on body/params/query, centralized errors | PASS — no persistence, so the constitutional no-persistence flow applies; `detail.routes.ts` → `detail.controller.ts` → `detail.service.ts` → `DetailProvider`/TMDB adapter; every endpoint validates params and query |
| VI. React Component Design | Small, typed, presentational UI; logic in hooks; discriminated unions over boolean flags | PASS — sections are small components fed by typed props; fetching is in entity hooks; capability gating and surface state are discriminated unions; no `useEffect` fetching |
| VII. Styling & Tokens | Tailwind 4 only, `@theme` tokens, skeleton/empty/error states, reduced motion | PASS — tokens only, layout-matching skeletons, distinct empty/error/not-found states, reserved image dimensions, no decorative motion |
| VIII. Testing & Zero Warnings | Vitest/RTL, AAA, observable behavior, all async states, 80 %/90 %, no unexpected warnings | PASS — test strategy below covers normalization, every optional field, all surface states, seasons, races, a11y, i18n, and responsive contracts |
| IX. Performance | Route splitting, no waterfalls, deliberate staleness, lazy images, no repeated requests | PASS — lazy route already exists; credits, similar, and collection start once core identity is known and load in parallel; episodes start once the effective season is known; one request per key; artwork lazy; no interval/focus refetch |
| X. Resilience | Fault isolation, timeouts/retries/cache, stable codes, labeled stale data, local degradation | PASS — independent endpoints and queries per secondary surface; reuses bounded retries and TTL/stale cache; stale data always labeled; secondary failure cannot take down core |
| XI. API Contracts | Zod source of truth, single error envelope, correct status mapping, explicit CORS, no-store | PASS — `contracts/detail-api.md`; existing envelope and CORS allowlist; `Cache-Control: no-store` on all detail routes |
| XII. Constants & Configuration | Named business constants, centralized validated config, no magic values | PASS — display bounds, preview thresholds, season limits, and capability flags are named constants/config modules; no new environment variable |
| XIII. Security | Secrets server-side, untrusted provider input validated, no sensitive logs, no raw errors | PASS — bearer token stays backend-only; provider payloads validated and never surfaced; no raw provider error or identifier in responses; no `dangerouslySetInnerHTML` |
| XIV. Accessibility | WCAG 2.2 AA, semantic structure, keyboard, live regions, targets, reduced motion | PASS — one `h1`, section `h2`s, list semantics, labelled season controls, live announcements for season changes and async results, ≥24/44 px targets |
| XV. Internationalization | i18next only, externalized text, `Intl` formatting, provider language parity | PASS — new `detail` namespace in both locales; `Intl` date/number/unit formatting; localized status and crew role labels; original-language fallback only for provider content |
| XVI. Documentation | Plan, ADR for durable decisions, English, contracts kept current | PASS — plan + contracts + ADR-0004 for the primary/secondary surface split, season address, and capability gating |
| XVII. Quality Gates | Same `lint`/`typecheck`/`test`/`build` contract; hooks and CI unchanged | PASS — no new scripts; both applications already expose the contract |
| XVIII. Server State | TanStack Query exclusive, key factory, deliberate `staleTime`/`gcTime`, no fetch in components | PASS — keys extended in the existing factory; one query per surface; `retry: false` so retries are explicit; no component fetches |
| XIX. Prisma Persistence | Prisma/PostgreSQL official persistence | N/A — no persistence; introducing it for read-only provider data would violate Principles I, XIX, and XXI |
| XX. External Providers | Isolated adapter, Zod validation, internal models, timeout/retry/cache, no direct browser calls | PASS — `DetailProvider` isolates TMDB; validated DTOs; internal detail models; existing timeout/bounded retry/jitter; TTL cache keyed by result-affecting parameters; link-out rights remain gated |
| XXI. Stack Governance | Approved stack only, new dependencies justified, lockfiles committed | PASS — zero new dependencies; no date library, state library, or UI kit |

**Post-design re-evaluation**: PASS. Phase 1 introduced no technology, no persistence, no provider
change, and no new top-level destination. Artifacts extend the existing catalog boundary with
additive endpoints and one provider-neutral detail contract. The `season` query parameter is an
additive use of the existing detail address, not a second route. Unresolved provider/legal decisions
(OD-D2, OD-D3, OD-D4, OD-D5, OD-D6, OD-D8, OD-D9) are isolated behind capability gating or existing
configuration and documented release dependencies rather than being improvised.

## Project Structure

### Documentation (this feature)

```text
specs/004-entertainment-details/
├── plan.md              # This file
├── research.md          # Phase 0 decisions and rejected alternatives
├── data-model.md        # Phase 1 entities, shapes, invariants, state machines
├── quickstart.md        # Phase 1 end-to-end validation guide
├── contracts/
│   ├── detail-api.md         # Five backend detail endpoints and error contract
│   ├── provider-boundary.md  # TMDB operations, mapping, normalization, cache
│   ├── routes.md             # Detail address, season parameter, history, focus
│   └── i18n-resources.md     # Detail translation keys and language mapping
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
└── src/
    ├── app.ts                                  # mount detail router; accept DetailService
    ├── server.ts                               # wire TMDB detail provider + detail cache
    ├── config/env.ts                            # unchanged; reuse provider/cache settings
    ├── controllers/
    │   └── detail.controller.ts                 # validate params/query, call service
    ├── domain/
    │   ├── detail.ts                            # provider-neutral detail models + limits
    │   └── errors.ts                            # add DETAIL_SEASON_NOT_FOUND (404)
    ├── providers/
    │   ├── detail-provider.ts                   # internal DetailProvider interface
    │   └── tmdb/
    │       ├── tmdb.detail.schemas.ts           # Zod DTOs for detail/season/credits/similar/collection
    │       ├── tmdb.detail.mapper.ts            # normalization, validation, bounded previews
    │       ├── tmdb.detail.provider.ts          # uses shared client/images/genres/list mapper
    │       └── tmdb.images.ts                   # add backdrop/profile/still resolvers
    ├── services/
    │   ├── catalog-cache.ts                     # reused unchanged (generic)
    │   └── detail.service.ts                    # cache keys, stale meta, season fallback signal
    └── routes/
        ├── catalog.routes.ts                    # unchanged
        └── detail.routes.ts                     # five additive GET endpoints, no-store

frontend/
└── src/
    ├── app/
    │   ├── App.tsx                              # wrap the router in the title override provider
    │   └── routing/
    │       ├── usePageTitle.ts                  # single writer: override ?? route title key
    │       └── AppLayout.tsx                    # unchanged title-hook placement
    ├── entities/catalog/
    │   ├── model/
    │   │   ├── titleDetail.ts                   # Zod detail models and enums
    │   │   ├── detailFormatting.ts              # Intl dates, durations, rating, counts
    │   │   └── detailErrors.ts                  # error code → surface state mapping
    │   ├── api/
    │   │   ├── detailClient.ts                  # fetch detail/credits/similar/collection/season
    │   │   ├── detailQueries.ts                 # five TanStack Query hooks
    │   │   └── catalogKeys.ts                   # add detail/credits/similar/collection/season keys
    │   ├── ui/detail/
    │   │   ├── DetailHero.tsx                   # identity, artwork, backdrop, type label
    │   │   ├── DetailFacts.tsx                  # date, duration, genres, rating, TV summary
    │   │   ├── DetailOverview.tsx               # overview + tagline using ExpandableText
    │   │   ├── DetailSkeleton.tsx               # layout-matching loading surface
    │   │   ├── DetailFailure.tsx                # page-level error with retry
    │   │   ├── DetailNotFound.tsx               # localized not-found state
    │   │   ├── EpisodeList.tsx                  # ordered episode list and empty state
    │   │   ├── CastList.tsx                     # bounded cast with fallbacks
    │   │   ├── CrewList.tsx                     # bounded key crew with localized roles
    │   │   └── RelatedTitles.tsx                # bounded related list (cards)
    │   └── index.ts                             # extend public API
    ├── features/select-season/
    │   ├── model/seasonAddress.ts               # season parameter parse/resolve/replace
    │   ├── model/useSeasonSelection.ts          # selected season + navigation
    │   ├── ui/SeasonSelector.tsx                # labelled list of season controls
    │   └── index.ts
    ├── widgets/title-detail/
    │   ├── ui/TitleDetailView.tsx               # composes hero, facts, overview, actions, provider metadata slot
    │   ├── ui/DetailActions.tsx                 # capability-gated actions (trailer only)
    │   ├── ui/SeasonEpisodesSection.tsx         # season selector + episode surface states
    │   ├── ui/CreditsSection.tsx                # cast/crew surface states
    │   ├── ui/RelatedSection.tsx                # similar/collection surface states
    │   ├── ui/ProviderMetadata.tsx              # popularity + provider note; attribution slot
    │   └── index.ts
    ├── pages/title-detail/
    │   ├── ui/TitleDetailPage.tsx               # address, queries, state selection, title, attribution slot composition
    │   ├── ui/detailReturn.ts                   # unchanged
    │   └── index.ts
    ├── shared/
    │   ├── config/constants.ts                  # detail display/preview limits
    │   ├── config/detailCapabilities.ts         # typed capability flags, all false
    │   ├── lib/documentTitle.tsx                # override context consumed by the app layer
    │   ├── ui/ExpandableText.tsx                # accessible clamp/expand primitive
    │   └── ui/index.ts                          # extend public API
    └── shared/i18n/resources/{en,es}.json       # new `detail` namespace and meta title
```

**Structure Decision**: Keep the existing web-application layout (`frontend/`, `backend/`). The
detail experience extends `entities/catalog` because every detail entity reuses the catalog title
identity, item contract, and presentation primitives; a sibling entity would either duplicate those
or break the FSD same-layer import rule. The page remains the route/data orchestrator, the widget
owns layout composition, and the season feature owns the only new interaction.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations. The only recorded complexity is scope size, not architecture:
five additive endpoints and four secondary surfaces. Splitting secondary surfaces into separate
endpoints is required by FR-070, FR-072, and FR-076 (independent failure and retry) and is not a
constitutionally exceptional design.

## Phase 0: Research

See [research.md](./research.md). All `NEEDS CLARIFICATION` items are resolved there, including:

- Reusing `entities/catalog` rather than a new frontend entity.
- The five-endpoint API split and why one aggregate response was rejected.
- TMDB operations, `append_to_response` use and the 20-item limit.
- Original-language overview fallback without fabricating or machine-translating.
- Season address semantics (`?season=`) and history replacement.
- Capability gating for availability, personal list, and trailer entry points.
- Image size policy for poster, backdrop, profile, and still images.
- Conservative placeholder normalization that does not drop legitimate titles.
- Rating, popularity, status, crew role, and TV summary presentation rules.

## Phase 1: Design and Contracts

- [data-model.md](./data-model.md) defines the provider-neutral entities, validation rules,
  display bounds, and observable state machines.
- [contracts/detail-api.md](./contracts/detail-api.md) defines the additive HTTP contract.
- [contracts/provider-boundary.md](./contracts/provider-boundary.md) defines TMDB operations,
  mapping, normalization, caching, and failure mapping.
- [contracts/routes.md](./contracts/routes.md) defines the detail address, season parameter,
  history, return behavior, focus, and document title.
- [contracts/i18n-resources.md](./contracts/i18n-resources.md) defines the translation keys.
- [quickstart.md](./quickstart.md) defines runnable end-to-end validation scenarios.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| TMDB optional metadata is frequently missing or malformed | Per-field validation and normalization at the adapter; complete/incomplete/empty/placeholder fixtures; explicit omission rules |
| TMDB schema drift breaks parsing | Zod schemas at the adapter, stable internal errors, route and mapper tests with malformed fixtures |
| Legal or brand guidance for attribution, caching, or link-out is unresolved | Release-dependency section; reuse existing attribution and configured TTLs; trailer capability disabled; no improvised wording |
| Season address writes break origin return or pollute history | `replace` with preserved location state; tests for direct open, season changes, back, and rapid navigation |
| Secondary surfaces couple failures | Five separate endpoints and five query keys; section-only error/retry tests |
| Secondary loading creates a request waterfall | One core-identity gate; credits/similar/collection parallel; episodes after the effective season; one request per key |
| Original-language fallback doubles provider calls | Conditional only when localized text is unusable; bounded request; cached; fallback failure swallowed |
| Very large episode or related payloads degrade rendering | Bounded previews for cast/crew/related; episodes rendered as a semantic list in provider order; virtualization only if measurement justifies it |
| Document title races the layout route title | Single-writer `usePageTitle` with a shared override context; language and route-change tests |
| Frontend and backend contract schemas drift | Contract documents, mirrored fixtures, route integration tests, and Zod validation on both sides |

## Testing Strategy

**Backend**

- Unit: normalization and placeholder handling; date/year parsing; runtime and episode-runtime
  validation; rating and popularity validation; status mapping; crew role mapping and dedupe; cast
  and related bounds and exclusions; season ordering and specials handling; language fallback.
- Provider: fixture responses for complete, partial, empty, malformed, adult, 404, and
  original-language-only titles; provider 404 on credits, similar, and collection mapped to empty
  data; assert provider-neutral output and no provider field leakage.
- Service: cache keys, fresh hit, stale fallback, single flight, season-not-found mapping, media-type
  mismatch rejection, error mapping, stale metadata.
- Route integration (real Express, mocked provider): each endpoint; language and season validation;
  404 and malformed id; media-type mismatch; stale and error codes; `Cache-Control: no-store`; CORS
  and request ID.

**Frontend**

- Model: Zod parsing of complete/incomplete payloads; formatting for `en-US`/`es-ES`; placeholder
  normalization; rating/popularity display rules; status and original-title rules; error-to-state
  mapping; document-title interpolation with the localized media type; season address parsing,
  initial-season resolution, invalid-season fallback, replace semantics.
- Component: hero and facts omit missing fields with no zero/dash placeholders; status and original
  title presentation; artwork fallback; overview expand/collapse keyboard behavior; popularity and
  provider-values note only in the secondary area; bounded cast/crew/related; related cards render no
  rating; empty credits/related omitted; episode list and empty state; season selector selected state
  and announcement; section loading/stale labels.
- Page/integration: open from card and search; direct open and reload; return action in every state;
  not-found vs error; language switch preserving title and season; rapid navigation; stale banner;
  secondary inline error and retry isolation with no duplicate requests; movie never shows seasons;
  TV season in address; back after season change returns to origin; document language and title.
- Accessibility: axe on loaded, loading, error, and not-found states; keyboard journey through
  season controls, expand controls, related titles, and retries; one `h1`; navigation focus and
  announcement; live-region behavior; manual screen-reader pass.
- Responsive: 320/360/768/1024/1440 px and 200 % zoom contract tests for no horizontal scroll and
  preserved hierarchy; desktop artwork-beside-facts layout; very large season and episode lists
  remain reachable and scannable without truncation.

**Coverage**: 80 % global minimum; approximately 90 % for detail mapping, normalization, state
mapping, and season selection. No snapshot-only tests.

## Release Dependencies

- OD-D3/OD-D6: superseded for trailers by feature 008 OD-T2/OD-T5/OD-T6. This feature no longer
  defines a trailer capability or renders a trailer control.
- OD-D4: exact TMDB attribution wording, logo treatment, placement, and link behavior. Reuse the
  existing attribution widget and its keys; add the required link treatment only in the form official
  guidance specifies, and do not improvise wording.
- OD-D5: TMDB caching permission and limits. Reuse the configured cache TTLs; record the legal
  confirmation before enabling longer retention.
- OD-D8: no rating source other than TMDB is approved. Only the TMDB rating renders; a future source
  requires a separate product and provider decision.
- OD-D9: Spanish and non-US metadata completeness affects how often fallback and omission rules are
  exercised. No machine translation is introduced.
- OD-D2: availability entry point. No provider is approved, so nothing renders.
- Personal list: no persistence feature exists, so no save control renders.

## Definition of Done for This Feature

- All seven user stories pass their independent tests.
- `lint`, `typecheck`, `test`, and `build` pass in both applications with no unexpected warnings.
- Both locales cover every Walplay-owned detail string.
- No raw provider field, DTO, identifier, or error reaches the interface.
- Every omitted field is omitted, never replaced by a zero, dash, placeholder, or invented value.
- Status labels, original title, popularity, and the provider-values note render only under their
  defined rules, and related cards never display an unattributed rating.
- Core and secondary surface failures are isolated and retryable without duplicate requests.
- Season selection is address-driven, replaces history, and preserves the origin return.
- Keyboard, screen-reader, 200 % zoom, and responsive checks pass, including document language and
  the localized document title.
- ADR-0004 records the primary/secondary surface split, season address, and capability gating.
