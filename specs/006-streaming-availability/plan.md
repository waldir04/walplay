# Implementation Plan: Streaming Availability

**Branch**: `feat/006-streaming-availability` | **Date**: 2026-11-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-streaming-availability/spec.md`

## Summary

Add a provider-backed availability surface to the existing movie and TV detail pages. The surface
shows where a title may be legally watched in an explicitly identified region, distinguishes
subscription, free, ad-supported, rental, and purchase offers, and labels freshness, staleness,
missing information, unsupported regions, and failures honestly. It is informational only: no
playback, subscription management, per-provider link construction, or geographic-restriction bypass.

Technical approach, in short:

- Reuse the existing TMDB integration rather than add a new provider or dependency. TMDB's documented
  movie/TV watch-provider operations are the initial source for planning. The data is powered by
  JustWatch, so attribution, logo-display, commercial-use, and Colombian coverage validation remain
  release gates.
- Add two additive GET endpoints under the existing `/api/catalog` boundary:
  `GET /api/catalog/:mediaType/titles/:itemId/availability?region=CO` and
  `GET /api/catalog/availability/regions`. The first returns one region's availability result; the
  second returns the validated region allowlist used by the selector. No existing route changes.
- Add an `AvailabilityProvider` interface implemented by one TMDB adapter. The adapter validates the
  TMDB watch-provider response with Zod, maps only the active region, preserves source priority,
  collapses duplicates, normalizes provider names, optionally resolves logos, validates the
  aggregate destination, and maps provider failures to existing stable error codes. Provider DTOs,
  field names, provider ids, and raw errors never cross the API.
- Add `AvailabilityService` with an in-memory `CatalogCache` (fresh 6 hours, stale/retention 7 days),
  a validated region allowlist that must include Colombia, and backend-computed freshness metadata.
  TMDB supplies no source-updated timestamp, so the interface shows a clearly labeled Walplay check
  time. Last-known offers are never shown beyond seven days.
- Extend the existing `entities/catalog` frontend slice with availability models, Zod schemas,
  client functions, query keys, and TanStack Query hooks. Add a
  `features/select-availability-region` slice for the versioned local region preference and the
  accessible selector. Add `widgets/title-detail/ui/AvailabilitySection.tsx` and compose it into the
  existing `TitleDetailView` after the detail actions and before seasons, credits, and related
  sections.
- Keep `pages/title-detail` as the data and state orchestrator, consistent with features 001–004.
  The availability query starts only after the core detail resolves, fails independently, and never
  blocks the detail identity, overview, seasons, cast, related titles, or existing actions.
- Add a dedicated `AvailabilityAttribution` in the existing provider-attribution widget and pass it
  into the detail view as a `ReactNode`, so no widget imports another widget directly. The existing
  TMDB attribution remains in place.
- Gate the entire capability behind explicit release flags:
  `AVAILABILITY_ENABLED=false` on the backend and `VITE_AVAILABILITY_ENABLED=false` on the frontend.
  `AVAILABILITY_LOGOS_ENABLED=false` keeps provider names visible while omitting logos until brand
  permission is confirmed. The section is implemented and testable with the flags enabled, but it
  remains off until the spec's release gates are satisfied.
- No database and no server persistence. The only stored value is the versioned local
  availability-region preference. No new runtime dependency, no new top-level route, no in-page
  playback, no per-provider links, no provider-region geo-detection, and no use of undocumented
  endpoints.

## Technical Context

**Language/Version**: TypeScript 5.9 strict in both applications (`strict`,
`noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`,
`noUnusedParameters`, `verbatimModuleSyntax`). Node.js 22.12+ per both application manifests.

**Primary Dependencies**:

- Frontend (existing, no additions): React 19, Vite 7, React Router 7, Tailwind CSS 4 via
  `@tailwindcss/vite`, `@tanstack/react-query` v5, `zod` 4, `i18next` + `react-i18next`.
- Backend (existing, no additions): Express 5, `zod` 4, Node native `fetch`/`AbortSignal`.
  Reuses the TMDB client, image resolver, cache, error envelope, CORS middleware, request IDs, and
  restricted logger.

**Storage**: No database and no server persistence. Availability responses use a dedicated
process-local `CatalogCache` instance with single-flight and entry caps. The browser stores only the
availability-region preference in `localStorage`, under a versioned key, validated on read. No
streaming data, provider payloads, or personal-list data are stored locally.

**Testing**: Vitest + React Testing Library + jest-dom + `vitest-axe` for frontend unit, component,
and router tests. Vitest for backend mapper, provider, service, config, and route integration tests
against a real Express app on an ephemeral port. All provider traffic is mocked; no automated test
calls TMDB. Controlled clocks cover freshness, stale, and seven-day retention boundaries.

**Target Platform**: Evergreen desktop and mobile browsers (latest two major versions); Node.js
22.12+ server deployed independently.

**Project Type**: Web application — existing React SPA (`frontend/`) plus existing JSON API
(`backend/`).

**Performance Goals**: At most one availability request per title, type, and region per client cache
window; at most one region-list request per session, with the region list retained for at least its
24-hour `staleTime` (`gcTime` ≥ `staleTime`); the availability and region-list requests run in
parallel after the core-detail identity gate, so there is no request waterfall beyond that gate; an
unsupported region never causes a provider call because the backend short-circuits it; no polling;
server cache and single-flight prevent repeated provider calls; only one region's mapped result
crosses the API; the detail page remains a lazy route chunk.

**Constraints**: No credential, provider DTO, provider field name, provider id, or raw provider
error in the browser, assets, logs, or errors; no playback or stream URLs; only an aggregate,
source-supplied external destination; HTTPS and host allowlist for external destinations; WCAG 2.2
AA; no horizontal scrolling at 360/768/1024/1440 px or 200 % zoom; design tokens only; English and
Spanish interface with provider names left as supplied; region names localized with
`Intl.DisplayNames`; 80 % global coverage and 90 % on availability mapping, normalization, state
mapping, region storage, and query behavior; zero unexpected test warnings.

**Scale/Scope**: Two media types, two locales, two additive API endpoints, one provider adapter,
one new detail section, one region selector, one in-memory cache, no server persistence. Initial supported
region allowlist is `CO`; additional regions require explicit validation and configuration. No
arbitrary provider truncation is introduced.

**Unknowns**: None. The clarified decisions are resolved for planning. The remaining open items are
release gates owned by OD-SA4 (attribution/logos), OD-SA5 (commercial terms), OD-SA7 (Colombian
coverage), OD-SA8 (ad-supported scope), and OD-SA9 (future episode-level availability). They do not
block design or task breakdown; the dependent behavior stays behind disabled flags until resolved.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Clean Code, SOLID, Simplicity | One responsibility per module; no speculative abstraction; reuse existing primitives | PASS — one availability domain, one provider interface, one adapter, one service, one controller, one router, one section component; delivery, category mapping, freshness, and UI state are separated; no generic "streaming" framework |
| II. Strict TypeScript | Strict flags, no `any`, Zod at every boundary, literal unions, `z.infer` contracts | PASS — TMDB watch-provider DTOs are Zod schemas; API and frontend availability models are Zod-derived; state, category, and freshness are literal unions; localStorage and query strings are validated |
| III. Feature-Sliced Design | Downward imports only, public `index.ts`, no same-layer imports | PASS — availability models/API/queries extend `entities/catalog`; `features/select-availability-region` owns local preference and the selector; `widgets/title-detail` owns the presentational section; `pages/title-detail` orchestrates queries and passes `AvailabilityAttribution` and the section state down; no widget imports another widget |
| IV. Arrow Function Syntax | Arrow functions in frontend application code; ESLint enforced | PASS — all new frontend code uses arrows; backend follows Principle V |
| V. Backend Architecture | `routes → controllers → services → provider adapters`, Zod on params/query, centralized errors | PASS — no persistence, so no repository layer is introduced; `availability.routes.ts` → `availability.controller.ts` → `availability.service.ts` → `AvailabilityProvider`/TMDB adapter; query and params are strict Zod schemas; existing error middleware is reused |
| VI. React Component Design | Small, typed, presentational UI; logic in hooks; discriminated unions over boolean flags | PASS — `AvailabilitySection` is presentational and prop-driven; state is a discriminated union (`loading`, `ready` with `data.state`, `error`); region state lives in a feature hook; no component fetches |
| VII. Styling & Tokens | Tailwind 4 only, `@theme` tokens, skeleton/empty/error states, reduced motion | PASS — tokens only; layout-matching skeleton; distinct no-information, unsupported-region, stale, and error surfaces; reserved logo boxes; no decorative motion |
| VIII. Testing & Zero Warnings | Vitest/RTL, observable behavior, all async states, 80 %/90 %, no unexpected warnings | PASS — test strategy below covers adapter mapping, service freshness/retention, route contracts, every UI state, region persistence, language behavior, failures, a11y, i18n, and responsive contracts |
| IX. Performance | Route splitting, no waterfalls, deliberate staleness, lazy images, no repeated requests | PASS — availability starts only after core detail; one request per title/region; regions once per session; server cache and single-flight; no interval/focus refetch; logos lazy with reserved space |
| X. Resilience | Fault isolation, timeouts/retries/cache, stable codes, labeled stale data, local degradation | PASS — dedicated endpoint, service, cache, query, and section; provider failures cannot take down the detail page; stale data is always labeled and expires after seven days; existing timeout/retry/jitter is reused |
| XI. API Contracts | Zod source of truth, single error envelope, correct status mapping, explicit CORS, no-store | PASS — `contracts/availability-api.md`; existing error envelope and CORS allowlist; `Cache-Control: no-store` on availability routes; stable error codes; provider-neutral shapes |
| XII. Constants & Configuration | Named business constants, centralized validated config, no magic values | PASS — freshness window, retention, category order, default region, region pattern, destination hosts, cache TTLs, and capability flags are named constants/validated config; `.env.example` is updated |
| XIII. Security | Secrets server-side, untrusted provider input validated, no sensitive logs, no raw errors | PASS — TMDB bearer token stays backend-only; provider payloads validated and never surfaced; external destination is HTTPS/host-allowlisted and never used as an open redirect; region values are not logged; localStorage is untrusted and validated. The region preference is coarse, non-identifying device context stored only to remember the chosen market; it is not personal data, so the Principle XIII storage-loss warning does not apply. No credentials, tokens, or provider data are stored locally. |
| XIV. Accessibility | WCAG 2.2 AA, semantic structure, keyboard, live regions, targets, reduced motion | PASS — section heading and category headings, list semantics, labelled selector, keyboard retry and destination, text status for stale/empty/error, one region-change live announcement, no color-only meaning, 44 px primary targets |
| XV. Internationalization | i18next only, externalized text, `Intl` formatting, provider names parity | PASS — new `detail.availability` namespace in both locales; `Intl.DisplayNames` for country names; `Intl.DateTimeFormat` for check times; provider names remain supplied; API returns stable codes, not localized errors |
| XVI. Documentation | Plan, ADR for durable decisions, English, contracts kept current | PASS — plan, research, data model, four contracts, quickstart; ADR-0006 records the provider boundary, region allowlist, freshness/retention, and release gating |
| XVII. Quality Gates | Same `lint`/`typecheck`/`test`/`build` contract; hooks and CI unchanged | PASS — no new scripts; both applications already expose the contract; no commit is created by this plan |
| XVIII. Server State | TanStack Query exclusive, key factory, deliberate `staleTime`/`gcTime`, no fetch in components | PASS — keys added to the existing factory; region included in the availability key, language excluded; regions keyed once; `retry: false`; no component fetches; region preference is encapsulated in a feature storage module |
| XIX. Prisma Persistence | Prisma/PostgreSQL official persistence | N/A — no persistence; a database would be unjustified for read-only provider availability and a device-local region preference |
| XX. External Providers | Isolated adapter, Zod validation, internal models, timeout/retry/cache, no direct browser calls | PASS — TMDB watch-provider access is isolated in `AvailabilityProvider`/TMDB adapter; validated DTOs; internal models; existing timeout/retry/jitter; TTL cache keyed by title, type, and region; no direct browser provider call; attribution and legal gates explicit |
| XXI. Stack Governance | Approved stack only, new dependencies justified, lockfiles committed | PASS — zero new dependencies; no date library, state library, UI kit, or streaming SDK |
| Visual Identity / Design System | Walday Dark UI tokens, typography, spacing, focus, responsive, reduced motion | PASS — existing tokens and shared primitives; no raw colors; provider names wrap; logo boxes reserve dimensions; status text remains readable at 200 % zoom |

**Post-design re-evaluation**: PASS. Phase 1 adds no technology, no server persistence, no provider other
than the selected initial TMDB source, no new top-level destination, and no new dependency. The two
endpoints extend the existing catalog boundary. The region preference is versioned local data behind
a feature storage module. The legal and coverage gates remain disabled by default and are recorded as
release dependencies rather than improvised in code.

## Project Structure

### Documentation (this feature)

```text
specs/006-streaming-availability/
├── plan.md              # This file
├── research.md          # Phase 0 decisions and rejected alternatives
├── data-model.md        # Phase 1 entities, invariants, and state transitions
├── quickstart.md        # Phase 1 end-to-end validation guide
├── contracts/
│   ├── availability-api.md    # Two backend endpoints, response states, errors
│   ├── provider-boundary.md   # TMDB watch-provider mapping, cache, freshness, links
│   ├── routes.md              # Detail integration, query keys, region storage, UI states
│   └── i18n-resources.md      # Availability translation keys and localization rules
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── .env.example                                     # AVAILABILITY_* defaults
└── src/
    ├── app.ts                                       # mount availability router when enabled
    ├── server.ts                                    # wire TMDB availability provider + cache
    ├── config/env.ts                                 # availability flags, regions, TTLs, hosts
    ├── controllers/
    │   └── availability.controller.ts                # validate params/query, call service
    ├── domain/
    │   └── availability.ts                           # provider-neutral models + constants
    ├── providers/
    │   ├── availability-provider.ts                  # internal provider interface
    │   └── tmdb/
    │       ├── tmdb.availability.schemas.ts          # Zod DTO for watch providers
    │       ├── tmdb.availability.mapper.ts           # category/order/dedupe/logo/link mapping
    │       ├── tmdb.availability.provider.ts         # documented watch-provider operation
    │       └── tmdb.images.ts                        # add provider-logo resolver (w92/w154)
    ├── services/
    │   └── availability.service.ts                   # region allowlist, cache, freshness, retention
    ├── routes/
    │   └── availability.routes.ts                    # two additive GET endpoints, no-store
    └── test/fixtures/
        └── fakeAvailabilityProvider.ts               # deterministic provider + samples

frontend/
├── .env.example                                     # VITE_AVAILABILITY_ENABLED default
├── vitest.config.ts                                 # test env defaults for validated config
└── src/
    ├── entities/catalog/
    │   ├── model/
    │   │   ├── availability.ts                       # Zod API models, state/category unions
    │   │   └── availabilityFormatting.ts             # region names, check-time formatting
    │   ├── api/
    │   │   ├── availabilityClient.ts                 # availability + regions requests
    │   │   ├── availabilityQueries.ts                # TanStack Query hooks
    │   │   └── catalogKeys.ts                        # availability and regions keys
    │   └── index.ts                                  # extend public API
    ├── features/select-availability-region/
    │   ├── model/regionPreference.ts                 # versioned localStorage validation
    │   ├── model/useAvailabilityRegion.ts            # global region state + persistence
    │   ├── ui/AvailabilityRegionSelector.tsx         # accessible single-select
    │   └── index.ts
    ├── pages/title-detail/
    │   └── ui/TitleDetailPage.tsx                    # orchestrate queries, region, retry, announcement
    ├── shared/
    │   ├── config/
    │   │   ├── detailCapabilities.ts                 # add availability capability
    │   │   └── env.ts                                # VITE_AVAILABILITY_ENABLED
    │   └── i18n/resources/
    │       ├── en.json                               # detail.availability keys
    │       └── es.json                               # detail.availability keys
    ├── widgets/
    │   ├── provider-attribution/
    │   │   ├── ui/AvailabilityAttribution.tsx        # JustWatch attribution, TMDB notice remains
    │   │   └── index.ts
    │   └── title-detail/
    │       ├── ui/AvailabilitySection.tsx            # all availability states
    │       ├── ui/TitleDetailView.tsx                # compose section after actions
    │       └── index.ts
    └── test/fixtures/
        └── availability/index.ts                     # API envelopes and UI samples

docs/
├── adr/0006-streaming-availability-boundary-and-release-gating.md
└── product-overview.md                              # record resolved OD-03/OD-04/OD-12 decisions
```

**Structure Decision**: The repository is an existing two-application web project. The feature adds
one backend provider adapter and two additive endpoints, and extends the existing frontend
entity/feature/widget/page layers. It does not create a new application, a new entity slice, or a
new route. `entities/catalog` remains the owner of title data, including availability, because
availability is a title sub-resource. The region preference is a feature because it is a user
interaction with local state, not a business entity. The section is a widget because it is a
composed layout region. The page remains the orchestrator.

## Dependencies and Sequencing

### Internal dependencies

- **Feature 001**: shared shell, design tokens, i18n resources, configuration validation, shared
  state primitives, accessibility conventions, and the same quality-gate scripts.
- **Feature 002**: the catalog provider boundary, TMDB client, timeout/retry/jitter, image resolver,
  error envelope, CORS, request IDs, and `CatalogCache`.
- **Feature 003**: title identity, origin-return behavior, and the existing catalog entity public API.
- **Feature 004**: the detail page route, core-detail identity gate, secondary-surface isolation,
  `TitleDetailView` composition, `DetailCapabilities`, stale/section state patterns, and provider
  attribution placement. Feature 004's availability entry point does not exist yet (its OD-D2 remains
  open); this feature adds the section only. If that entry point is added later, it must target this
  section and must not promise availability.

### External dependencies and release gates

- TMDB's documented movie and TV watch-provider operations, using its existing backend bearer token.
  No new provider account is created.
- JustWatch attribution and any required brand treatment. OD-SA4 remains open for exact wording,
  logo treatment, placement, and per-provider logo permission.
- Walplay's commercial classification and TMDB/JustWatch licensing. OD-SA5 remains open.
- Representative Colombian coverage and category-accuracy validation. OD-SA7 remains open.
- Product decision on ad-supported availability. OD-SA8 remains open; the plan implements the
  category so the default can be tested, and it can be disabled by removing the mapping if the
  decision changes.
- Product Overview updates recording OD-03, OD-04, and OD-12. The spec owns the behavioral decision;
  the Product Overview should become the authoritative product record.

### Sequencing

1. Backend domain and config, then TMDB schemas, mapper, provider, service, controller, and router.
2. Backend unit and route tests, including the feature-disabled route behavior.
3. Frontend availability models, schemas, client, keys, and queries.
4. Region preference storage and selector.
5. Availability section, attribution component, and `TitleDetailView` composition.
6. `TitleDetailPage` orchestration, capability/env gating, announcements, and integration tests.
7. i18n resources and key-parity tests.
8. ADR-0006 and Product Overview decision recording.
9. Full lint, typecheck, test, build, and manual quickstart validation with flags enabled.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Attribution, logo, or commercial terms are not approved | Legal exposure; feature cannot launch | Both apps default to disabled; provider logos default to omitted; text-only JustWatch attribution behind OD-SA4; no production enablement until legal sign-off |
| Colombian coverage is incomplete | Users see missing offers; trust loss | Validate a representative sample; no completeness claim; no-information copy says missing data is not proof of unavailability; allowlist starts with Colombia only |
| TMDB returns no source freshness timestamp | Users cannot judge provider update time | Backend computes and displays a clearly labeled Walplay check time; no source-freshness claim; stale and seven-day retention rules are explicit |
| TMDB supplies no per-provider deep links | Users cannot jump to a specific provider | Initial release links only the aggregate source page when supplied; provider entries are never clickable; no URL construction |
| Region allowlist drifts between frontend and backend | Unsupported or inconsistent regions | Backend is the single source; frontend reads `/api/catalog/availability/regions`; config parser requires `CO`; invalid stored region is preserved as an unsupported state, not silently replaced |
| External destination is malicious or wrong-region | Open redirect or misleading link | Backend validates HTTPS, host allowlist, no credentials, and locale/region match; frontend validates HTTPS and labels external navigation; no redirect endpoint |
| Provider failure breaks the detail page | Core content unavailable | Availability is a separate service, query, and section; route and page tests inject failures; the section shows localized error or stale data only |
| Region-list failure removes the selector or hides usable offers | Visitor cannot tell which region is active or change it | The region line always renders from the active code; the selector renders only when the region list is available, otherwise the error state's retry refetches both queries; the contract and page tests cover both regions-list and availability failures |
| Freshness or retention is mislabeled | Users trust outdated data | Freshness is computed on the backend with a controlled clock; tests cover 24-hour and seven-day boundaries; the UI never infers source freshness |
| Language change refetches or drops availability | Duplicate provider calls; lost state | Query keys exclude language; region and data remain; tests assert no refetch and translated labels |
| Provider ids or DTO fields leak | Provider coupling; security/contract violation | Mapper strips ids; API contract and route tests scan responses for provider ids, field names, tokens, and raw errors |
| Logos fail to load | Broken images or lost provider identity | Names are always rendered; logos are decorative with reserved boxes; image failure falls back to the name without layout shift |
| Screen-reader announcements duplicate or go stale | Confusing assistive experience | One availability live region for region changes; `role="status"` for informational states; `role="alert"` for errors; loading uses `aria-busy`; tests assert single announcements |
| Feature flags are enabled inconsistently | UI calls a disabled API or a live API has no UI | Backend route is mounted only when enabled; frontend section and queries are gated by the frontend flag; quickstart enables both; tests cover disabled behavior |
| Large provider lists overflow or hide options | Some providers become unreachable | No arbitrary provider truncation; groups wrap; the section remains scannable; responsive and 200 % zoom tests cover dense lists |
| Ad-supported category scope remains open | Rework if OD-SA8 changes | `ads` is a distinct internal category with a clear label; it is omitted automatically when the source does not supply it; removing the mapping is a small, isolated change |

## Release Gating and Rollout

The feature is additive and can be deployed dark:

- `AVAILABILITY_ENABLED=false` (backend default): the availability router is not mounted and no
  provider call can be triggered. Requests fall through to the existing routers:
  `GET /api/catalog/:mediaType/titles/:itemId/availability` has no matching existing route and
  returns the existing `404 ROUTE_NOT_FOUND`, while `GET /api/catalog/availability/regions` is
  matched by the existing `GET /api/catalog/:mediaType/:section` route and receives its existing
  `400 VALIDATION_ERROR`. The disabled behavior is therefore "not mounted, existing routing applies",
  not a uniform 404.
- `VITE_AVAILABILITY_ENABLED=false` (frontend default): the detail page does not render the
  availability section or issue availability/region queries. `DETAIL_CAPABILITIES.availability`
  resolves to false.
- `AVAILABILITY_LOGOS_ENABLED=false` (backend default): the API omits provider logo references. The
  UI renders provider names only. This is the safe state until OD-SA4 confirms brand permission.
- `AVAILABILITY_SUPPORTED_REGIONS=CO`: the initial allowlist. Additional regions require explicit
  validation; the selector reads the backend list, so no frontend rebuild is needed for a
  configuration-only expansion after validation.
- Production enablement requires OD-SA4, OD-SA5, and OD-SA7 to be resolved, plus a representative
  Colombia coverage check. OD-SA8 governs whether the `ads` category remains in the initial set.
  OD-SA9 remains future scope.
- No database migration, no data backfill, and no user-data migration are required. Disabling the
  flags restores the pre-feature surface without affecting existing detail data.

## Testing Strategy

### Backend

- `config/env.test.ts`: defaults, boolean parsing, region allowlist validation, `CO` requirement,
  cache TTL ordering, destination-host validation, and secret-safe errors.
- `providers/tmdb/tmdb.availability.schemas.test.ts`: valid/invalid watch-provider payloads, nullable
  fields, unknown extra fields, and region maps.
- `providers/tmdb/tmdb.availability.mapper.test.ts`: category mapping, fixed category order,
  display-priority order, duplicate collapse, missing/placeholder names, logo optionality, invalid
  destinations, missing region, empty groups, and no provider ids in the output.
- `providers/tmdb/tmdb.availability.provider.test.ts`: documented request path, no language
  dependency, 404 mapping, provider error propagation, and image-resolver interaction.
- `services/availability.service.test.ts`: region-list output, supported/unsupported regions, item-id
  and media-type validation, cache keys, fresh/cache/stale sources, 24-hour freshness boundary,
  seven-day retention boundary, invalid/future source timestamps, provider 404, provider errors,
  no-information state, destination retention, and serialization without internal ids.
- `routes/availability.routes.integration.test.ts`: available, no-information, unsupported, regions
  list, invalid region, item-id mismatch, provider errors, `Cache-Control: no-store`, request id,
  CORS, disabled route, and a leak scan for tokens, provider ids, field names, and raw messages.
- Contract fixture checks: the documented response examples validate against the backend schemas and
  the frontend Zod contract.

### Frontend

- `entities/catalog/model/availability.test.ts`: API schema unions, invalid states, category values,
  logo shape, destination HTTPS, meta requirements, and region code validation.
- `entities/catalog/model/availabilityFormatting.test.ts`: localized region names, fallback to the
  code, invalid dates, and locale-sensitive check times.
- `entities/catalog/api/availabilityClient.test.ts`: paths, region query, no language parameter,
  region-list request, schema failures, and error mapping.
- `entities/catalog/api/availabilityQueries.test.tsx`: keys include title/type/region but not
  language; disabled queries; retry behavior; cached data separation by region.
- `features/select-availability-region/model/regionPreference.test.ts`: versioned read/write,
  malformed JSON, wrong version, invalid code, localStorage unavailable, default Colombia, and
  preserving a valid unsupported region.
- `features/select-availability-region/model/useAvailabilityRegion.test.tsx`: initial read,
  persistence on change, no write during render, and no cross-device assumptions.
- `features/select-availability-region/ui/AvailabilityRegionSelector.test.tsx`: label, keyboard,
  supported options, unsupported placeholder, and change callback.
- `widgets/title-detail/ui/AvailabilitySection.test.tsx`: loading skeleton, available groups and
  order, provider names/logos/fallbacks (including long and non-Latin names), no-information,
  unsupported region, stale and current freshness, check time, disclaimer, external destination
  (new tab, `rel`, leaving notice), retry, no per-provider links, and category label mapping.
- `widgets/title-detail/ui/AvailabilitySection.a11y.test.tsx`: axe, heading hierarchy, list
  semantics, focus, target sizes, color independence, and announcement behavior.
- `widgets/provider-attribution/ui/AvailabilityAttribution.test.tsx`: required attribution text,
  TMDB notice remains present, and no invented logo.
- `pages/title-detail/ui/TitleDetailPage.availability.test.tsx`: section hidden when capability off;
  no availability request when off; section visible and queried when on; default Colombia; stored
  region; region change updates the query and removes old offers; language change preserves region
  and does not refetch; no-information and unsupported states; stale/error; region-list failure
  isolates to the section; external destination; provider failure leaves the core detail usable;
  retry; no duplicate announcements.
- `shared/i18n/resources/resources.test.ts`: update the expected section-key list and verify every
  new key is referenced in application source and exists in both locales.
- Existing capability tests: add `availability: false` to `DetailCapabilities` literals; update the
  detail keyboard test.
- Coverage thresholds remain 80 % global and 90 % on `entities/catalog/model/*`,
  `entities/catalog/api/*`, `shared/config/env.ts`, and the new
  `features/select-availability-region/model/*` module. Add the per-directory threshold entry to
  `frontend/vitest.config.ts`.

### Manual quickstart

The quickstart validates the five user stories with flags enabled, a known Colombian sample, a
no-information sample, a simulated provider failure, a stale-cache boundary, an unsupported stored
region, an external destination, both locales, keyboard/screen-reader use, and 200 % zoom. Automated
tests remain the primary proof; the manual pass confirms real provider behavior and attribution
presentation without asserting coverage completeness.

## Complexity Tracking

No constitutional violations. No complexity exceptions are requested.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | — | — |
