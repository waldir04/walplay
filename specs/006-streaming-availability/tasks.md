---

description: "Task list for Streaming Availability implementation"
---

# Tasks: Streaming Availability

**Input**: Design documents from `/specs/006-streaming-availability/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (all present)

**Tests**: Included. `plan.md` (Testing Strategy) and `quickstart.md` explicitly require automated
backend and frontend suites; tests are not optional for this feature.

**Organization**: Tasks are grouped by user story so each story produces an independently verifiable
increment. All backend provider/service/route work and frontend data plumbing are foundational
because every story consumes the same availability endpoint and contract.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependency)
- **[Story]**: `[US1]`–`[US5]`, matching `spec.md`
- Every task includes an exact repository file path

## Path Conventions

Existing two-application repository: backend under `backend/src/`, frontend under `frontend/src/`.
No new application, route, database, or dependency is introduced.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add release-gated environment defaults only. No project scaffolding is required.

- [X] T001 [P] Add commented availability defaults to `backend/.env.example`: `AVAILABILITY_ENABLED=false`, `AVAILABILITY_LOGOS_ENABLED=false`, `AVAILABILITY_SUPPORTED_REGIONS=CO`, `AVAILABILITY_CACHE_TTL_SECONDS=21600`, `AVAILABILITY_CACHE_STALE_SECONDS=604800`, `AVAILABILITY_CACHE_MAX_ENTRIES=500`, `AVAILABILITY_FRESHNESS_WINDOW_SECONDS=86400`, `AVAILABILITY_DESTINATION_HOSTS=www.themoviedb.org,themoviedb.org`
- [X] T002 [P] Add `VITE_AVAILABILITY_ENABLED=false` with a comment that it must be enabled together with the backend flag in `frontend/.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Provider-neutral domain, TMDB adapter, cached service, two additive endpoints, and the
frontend data layer. Every user story renders or queries through this phase.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

### Backend configuration and domain

- [X] T003 Add availability settings to the Zod schema and frozen `BackendConfig` in `backend/src/config/env.ts`: `AVAILABILITY_ENABLED` (default `false`), `AVAILABILITY_LOGOS_ENABLED` (`false`), `AVAILABILITY_SUPPORTED_REGIONS` (`CO`; uppercase, trimmed, unique, must include `CO`), `AVAILABILITY_CACHE_TTL_SECONDS` (`21600`), `AVAILABILITY_CACHE_STALE_SECONDS` (`604800`), `AVAILABILITY_CACHE_MAX_ENTRIES` (`500`), `AVAILABILITY_FRESHNESS_WINDOW_SECONDS` (`86400`), `AVAILABILITY_DESTINATION_HOSTS` (`www.themoviedb.org,themoviedb.org`; lowercase hostnames, no scheme or path). Enforce fresh TTL ≤ stale TTL and freshness window ≤ stale TTL.
- [X] T004 [P] Extend `backend/src/config/env.test.ts` for availability defaults, boolean parsing, region normalization/deduplication, the required `CO`, TTL ordering failures, destination-host validation, and errors that never echo the TMDB token.
- [X] T005 [P] Create provider-neutral types and constants in `backend/src/domain/availability.ts`: `AvailabilityCategory` = `'subscription' | 'free' | 'ads' | 'rent' | 'buy'`; `AvailabilityProviderEntry` `{ name: string; logo?: { url; urlLarge? } }`; `AvailabilityGroup` `{ category; providers }`; result states `'available' | 'no-information' | 'unsupported-region'`; destination `{ url }`; freshness record; `AVAILABILITY_CATEGORY_ORDER = ['subscription','free','ads','rent','buy']`; `AVAILABILITY_DEFAULT_REGION = 'CO'`; `AVAILABILITY_REGION_PATTERN = /^[A-Z]{2}$/`.
- [X] T006 [P] Create the source adapter interface in `backend/src/providers/availability-provider.ts`: `AvailabilityProvider` with `readonly id: AvailabilityProviderId` (today the literal `'tmdb'`, kept as an extensible union so another adapter does not require changing the interface) and `fetchAvailability({ mediaType, providerId, region }) => Promise<ProviderAvailability | null>`; `null` means no country entry; `ProviderAvailability` carries `groups`, optional validated `destination`, and optional `sourceUpdatedAt` only when the source truly supplies it.

### TMDB adapter

- [X] T007 [P] Create the Zod watch-provider DTO in `backend/src/providers/tmdb/tmdb.availability.schemas.ts`: `id: number`; `results?: Record<string, { link?, flatrate?, free?, ads?, rent?, buy? } | null>`; provider record `logo_path?`, `provider_id: number`, `provider_name?`, `display_priority?`. Ignore unknown fields; treat null/absent arrays as absent; require the top-level shape or fail validation.
- [X] T008 [P] Test `backend/src/providers/tmdb/tmdb.availability.schemas.test.ts` with valid, invalid, nullable, extra-field, and multi-region payloads.
- [X] T009 Add a provider-logo resolver (`w92` and optional `w154`) to `backend/src/providers/tmdb/tmdb.images.ts` that returns a valid HTTPS image URL or omits the logo, and extend `backend/src/providers/tmdb/tmdb.images.test.ts` for valid, missing, and malformed paths plus image-config failure.
- [X] T010 Create `backend/src/providers/tmdb/tmdb.availability.mapper.ts`: map only `flatrate→subscription`, `free→free`, `ads→ads`, `rent→rent`, `buy→buy`; emit groups in `AVAILABILITY_CATEGORY_ORDER`; omit unknown/empty groups; trim names and drop empty, whitespace-only, `n/a`, `null`, `undefined`, `tbd`; drop records without a usable provider identity; deduplicate by source `provider_id` inside a category keeping the first usable record; order by `display_priority` ascending with a large sentinel for missing values and stable source order for ties; resolve logos only when `AVAILABILITY_LOGOS_ENABLED=true`; never emit provider ids.
- [X] T011 [P] Test `backend/src/providers/tmdb/tmdb.availability.mapper.test.ts` for category mapping/order, duplicate collapse, missing/placeholder names, logo optionality, source-priority ordering, empty groups, missing region, invalid destination, and absence of source ids/field names.
- [X] T012 Create `backend/src/providers/tmdb/tmdb.availability.provider.ts` using the existing `TmdbClient` against documented `GET /movie/{id}/watch/providers` and `GET /tv/{id}/watch/providers`; no `language`, no `append_to_response`, no region/provider list calls; validate with T007, map the requested region only, validate the aggregate destination (`https:`, configured host allowlist, no credentials, `locale` matches the region when present, no construction or rewriting), and return `null` when the region entry is absent.
- [X] T013 [P] Test `backend/src/providers/tmdb/tmdb.availability.provider.test.ts` for request paths, language independence, missing region, 404 mapping, provider failures, destination rejection, and image-resolver interaction.
- [X] T014 [P] Create `backend/src/test/fixtures/fakeAvailabilityProvider.ts` with deterministic available, empty, missing-region, destination, stale-timestamp, and failure behaviors plus reusable sample groups for service/route tests.

### Service, controller, and routes

- [X] T015 Create `backend/src/services/availability.service.ts`: validate the region against the configured allowlist and return `unsupported-region` without a provider call for unsupported codes; treat a provider `null` (no country entry) and a country entry with no usable offers as `no-information`, never as an error or as unavailability; use a dedicated `CatalogCache` with key `<provider.id>:availability:<mediaType>:<providerId>:<region>` (fresh from config, default 6 h; stale/retention from config, default 7 days; bounded entries; single-flight); compute `lastUpdatedAt` as the observation time; accept `sourceUpdatedAt` only if valid and not future; use the earlier applicable timestamp; compute `freshness='stale'` against the configured freshness window (default 24 h), not a hardcoded value; set `stale=true` for `stale-cache` or stale freshness; withhold offers and return the source-error state beyond the configured last-known retention; return `no-information` for a successful response with no usable offers; a current successful response always replaces older cached offers for the same key; keep a valid destination; never serialize provider ids, source fields, prices, plans, or per-provider links.
- [X] T016 [P] Test `backend/src/services/availability.service.test.ts` for region allowlist, unsupported region with no provider call, fresh/cache/stale-cache sources, 24-hour boundary, 7-day retention, invalid/future source timestamps, provider 404, provider failures, provider `null` (no country entry) and empty-country outcomes both mapping to `no-information`, a current successful response superseding older cached offers for the same key, no-information, destination retention, cache keys including media type/region/provider id and not the source provider id, serialization without internal ids, and log assertions proving the region value and destination query string are never logged.
- [X] T017 Create `backend/src/controllers/availability.controller.ts`: validate `mediaType` (`movie|tv`), `itemId` with the existing `ITEM_ID_PATTERN` from `backend/src/lib/itemId.ts` and decode it with the existing `decodeItemId` (reuse, do not duplicate the pattern or the decoder; a media-type mismatch is `CATALOG_NOT_FOUND`), and `region` (optional, two ASCII letters, normalized uppercase, unknown query parameters rejected) with strict Zod; validate an empty strict query schema on the regions endpoint; call the service; map failures to the existing `CatalogError` codes.
- [X] T018 Create `backend/src/routes/availability.routes.ts` with `GET /:mediaType/titles/:itemId/availability` and `GET /availability/regions` (codes only, uppercase, unique, sorted, `CO` present), both under `/api/catalog`, both emitting `Cache-Control: no-store`.
- [X] T019 Test `backend/src/routes/availability.routes.integration.test.ts` against a real Express app on an ephemeral port: available, no-information, unsupported, regions list, invalid region, item-id mismatch, provider 404/timeout/rate-limit/unavailable/invalid-response, no-store, request id, CORS, and a response scan for tokens, provider ids, TMDB field names, and raw messages.
- [X] T019a [P] Add a contract fixture test that parses every documented success example in `contracts/availability-api.md` (available, no-information, unsupported-region, stale, source-timestamp) against the backend response schemas, and rejects the documented provider-neutrality violations. This satisfies Principle XI's contract-consistency requirement.
- [X] T020 Extend `backend/src/app.ts` with an optional `availabilityService` in `CreateAppOptions`; mount the availability router before the existing detail/catalog routers only when `config.availabilityEnabled`, and fail fast at startup if the flag is enabled without a service. Extend `backend/src/app.test.ts` to prove the disabled behavior: the title-availability path returns `404 ROUTE_NOT_FOUND`, and `/api/catalog/availability/regions` falls through to the existing `/:mediaType/:section` route and returns `400 VALIDATION_ERROR`.
- [X] T021 Wire `backend/src/server.ts`: create a dedicated `CatalogCache` and the TMDB availability provider, construct `AvailabilityService`, and pass it to `createApp` alongside existing services.

### Frontend data layer and gating

- [X] T022 Create `frontend/src/entities/catalog/model/availability.ts` with Zod-derived types for the API union: `available` (non-empty groups, required meta), `no-information` (empty groups, required meta), `unsupported-region` (empty groups, no meta); category closed union; provider `{ name: non-empty; logo?: { url: https; urlLarge?: https } }`; destination https; meta `stale`, `lastUpdatedAt`, `source` (`provider|cache|stale-cache`), `freshness` (`current|stale`), optional `sourceUpdatedAt`; region code `^[A-Z]{2}$`; regions list. Use strict objects for the envelope, `data`, and `meta` so unknown fields are a contract failure rather than silently accepted, matching the documented contract.
- [X] T023 [P] Test `frontend/src/entities/catalog/model/availability.test.ts` for valid states, invalid state combinations, missing meta, invalid categories, logo/destination URL rules, region codes, and unknown fields (rejected as a contract failure).
- [X] T024 Create `frontend/src/entities/catalog/model/availabilityFormatting.ts`: localized region name with `Intl.DisplayNames` plus always-visible ISO code, code fallback when `Intl` is unavailable, and check/source time formatting that delegates to the existing `formatLastUpdated` helper without computing freshness.
- [X] T025 [P] Test `frontend/src/entities/catalog/model/availabilityFormatting.test.ts` for English/Spanish country names, code fallback, invalid dates, and locale-sensitive check times.
- [X] T026 Create `frontend/src/entities/catalog/api/availabilityClient.ts`: `GET {apiBaseUrl}/api/catalog/{mediaType}/titles/{itemId}/availability?region={region}` and `GET {apiBaseUrl}/api/catalog/availability/regions`; no language parameter; parse with the T022 schemas; map failures to the existing catalog error shape.
- [X] T027 [P] Test `frontend/src/entities/catalog/api/availabilityClient.test.ts` for exact paths, region query, absence of language, regions request, schema failures, error mapping, and parsing of every documented success example in `contracts/availability-api.md` against the frontend Zod models (contract consistency with the backend).
- [X] T028 Extend `frontend/src/entities/catalog/api/catalogKeys.ts`: `availability: (mediaType, itemId, region) => [...catalogKeys.all, 'availability', mediaType, itemId, region]` and `availabilityRegions: () => [...catalogKeys.all, 'availabilityRegions']`.
- [X] T029 [P] Extend `frontend/src/entities/catalog/api/catalogKeys.test.ts` to assert the availability key includes media type, item id, and region; excludes language; and the regions key is static.
- [X] T030 Create `frontend/src/entities/catalog/api/availabilityQueries.ts`: availability `staleTime` 10 min, `gcTime` 30 min, `retry: false`; regions `staleTime` 24 h, `gcTime` 24 h (never less than `staleTime`, so the list is fetched at most once per session), `retry: false`; both disabled unless the capability is on, the core detail resolved, and the route is valid; the availability query does not wait for the regions query (an unsupported region is a valid `200` response); no polling or interval refetch; no prefetch for other regions.
- [X] T031 [P] Test `frontend/src/entities/catalog/api/availabilityQueries.test.tsx` for key composition, language independence, disabled behavior, no automatic retry, and per-region cache separation.
- [X] T032 Extend `frontend/src/entities/catalog/index.ts` to export the availability model, schemas/types, formatting helpers, client, query keys, and hooks.
- [X] T033 Add `VITE_AVAILABILITY_ENABLED` parsing to `frontend/src/shared/config/env.ts` as `availabilityEnabled` on `AppConfig` (default `false`; invalid input fails closed with a warning that does not echo the value), and extend `frontend/src/shared/config/env.test.ts` for true/false/missing/invalid inputs.
- [X] T034 Add `readonly availability: boolean` to `frontend/src/shared/config/detailCapabilities.ts`, set the default `false`, add `resolveDetailCapabilities(config: AppConfig)` that reads the already-validated `availabilityEnabled` value (never `import.meta.env` directly), and update the `{ trailer: true }`/`{ trailer: false }` capability literals in `frontend/src/widgets/title-detail/ui/DetailActions.test.tsx` and `frontend/src/pages/title-detail/ui/TitleDetailPage.keyboard.test.tsx`.
- [X] T035 [P] Create `frontend/src/test/fixtures/availability/index.ts` with typed API envelopes and UI samples for available, no-information, unsupported-region, stale-cache, destination, and error cases.
- [X] T036 Add the per-directory coverage threshold entry for `entities/catalog/model/*`, `entities/catalog/api/*`, `shared/config/env.ts`, and `features/select-availability-region/model/*` to `frontend/vitest.config.ts` while keeping 80 % global and 90 % critical targets.

**Checkpoint**: Both applications compile; the availability endpoint and frontend client contract exist; no user story UI is rendered yet.

---

## Phase 3: User Story 1 — See where a title can be watched (Priority: P1) 🎯 MVP

**Goal**: Render a labeled availability section on movie and TV detail pages, stating the region,
grouping offers by category in source order, naming each provider, and never implying playback.

**Independent Test**: Open controlled movie and TV detail pages with Colombian offers; verify the
section appears after the action area and before seasons/credits, states Colombia and `CO`, shows the
correct category groups and provider names in source order, never contains playback controls, and
omits provider links.

### Tests for User Story 1 ⚠️

- [X] T037 [P] [US1] Write `frontend/src/widgets/title-detail/ui/AvailabilitySection.test.tsx` for the available state: heading, region line, fixed category order, provider names in source order, a provider in two categories appearing in both, no provider anchors, and no playback/download/subscribe controls.
- [X] T038 [P] [US1] Write `frontend/src/widgets/provider-attribution/ui/AvailabilityAttribution.test.tsx` asserting the text-only JustWatch attribution is visible without interaction and does not remove or replace the TMDB notice.

### Implementation for User Story 1

- [X] T039 [P] [US1] Create `frontend/src/widgets/provider-attribution/ui/AvailabilityAttribution.tsx` (presentational, text-only, no invented logo, accessible name from `detail.availability.attribution.sectionLabel`) and export it from `frontend/src/widgets/provider-attribution/index.ts`.
- [X] T040 [US1] Create `frontend/src/widgets/title-detail/ui/AvailabilitySection.tsx` for the available state: one `h2` section heading, region text `{country} ({code})` that is also exposed through the section's accessible name/description (`aria-labelledby`/`aria-describedby`), an `h3` per category with a semantic list of provider rows, provider names always visible, optional logo box reserved with fixed dimensions and decorative when the name is adjacent, no provider rows as links, and `attribution` and `disclaimer` `ReactNode`/copy slots. The component is prop-driven and performs no fetching.
- [X] T041 [US1] Export `AvailabilitySection` and its props type from `frontend/src/widgets/title-detail/index.ts`.
- [X] T042 [US1] Extend `frontend/src/widgets/title-detail/ui/TitleDetailView.tsx` with an optional `availability?: ReactNode` prop rendered after `DetailActions` and before `SeasonEpisodesSection`; existing sections keep their order.
- [X] T043 [US1] Add the US1 translation keys to `frontend/src/shared/i18n/resources/en.json` and `es.json`: `detail.sections.availability`, `detail.availability.regionLabel`, `detail.availability.categories.{subscription,free,ads,rent,buy}`, and `detail.availability.attribution.{justWatch,sectionLabel}`; extend `frontend/src/shared/i18n/resources/resources.test.ts` for the new section key and key parity/usage.
- [X] T044 [US1] Orchestrate US1 in `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx`: resolve capabilities from the explicit prop or `resolveDetailCapabilities`, start the availability query only after the core detail resolves, use `CO` until the region preference lands, render `AvailabilitySection` with `AvailabilityAttribution`, and render nothing when the capability is off or the detail is not found.
- [X] T045 [P] [US1] Write `frontend/src/pages/title-detail/ui/TitleDetailPage.availability.test.tsx`: capability off renders no section and issues no requests; capability on renders and queries; the section is placed after the action area and before seasons/credits; default region is `CO`; movie and TV both work; not-found renders no section.

**Checkpoint**: User Story 1 is independently demonstrable with a mocked provider response.

---

## Phase 4: User Story 2 — Trust the region and the limits of the information (Priority: P1)

**Goal**: Always state the active region, let the visitor change it and remember it on the device, and
label current freshness, stale/last-known data, and the informational limitation honestly.

**Independent Test**: With controlled results for more than one region, verify Colombia is the
default, a stored/selected region is used and stated, previous-region offers disappear, freshness is
labeled as Walplay check time or source time correctly, stale data is labeled, and the disclaimer is
visible.

### Tests for User Story 2 ⚠️

- [X] T046 [P] [US2] Write `frontend/src/features/select-availability-region/model/regionPreference.test.ts`: versioned read/write, missing/malformed/wrong-version/invalid code fallback to `CO` with safe cleanup, storage unavailable, and a valid unsupported code preserved.
- [X] T047 [P] [US2] Write `frontend/src/features/select-availability-region/model/useAvailabilityRegion.test.tsx`: initial read, persistence on change, no write during render, global state across titles, and no cross-device assumption.
- [X] T048 [P] [US2] Write `frontend/src/features/select-availability-region/ui/AvailabilityRegionSelector.test.tsx`: visible label, keyboard operation, supported options rendered as `Country (CODE)`, unsupported disabled placeholder, and change callback.
- [X] T049 [P] [US2] Write `frontend/src/widgets/title-detail/ui/AvailabilitySection.trust.test.tsx`: checked-by-Walplay label when `sourceUpdatedAt` is absent, source-updated label only when present, stale banner with localized date/time and caution, stale on both available and no-information, a retry action in the stale state, and the visible disclaimer (including the unsupported-region state).
- [X] T050 [P] [US2] Write `frontend/src/pages/title-detail/ui/TitleDetailPage.availability.region.test.tsx`: default Colombia, stored region used, region change updates the query and removes old offers, language change preserves region/data and does not refetch.

### Implementation for User Story 2

- [X] T051 [P] [US2] Create `frontend/src/features/select-availability-region/model/regionPreference.ts`: key `walplay.availability-region.v1`, value `{ "version": 1, "region": "CO" }`, Zod validation, safe invalid-entry removal that never throws or logs the value, and no-op writes when storage is unavailable.
- [X] T052 [US2] Create `frontend/src/features/select-availability-region/model/useAvailabilityRegion.ts` for in-memory global region state plus persistence; the region stays out of TanStack Query data, the URL, and server state.
- [X] T053 [US2] Create `frontend/src/features/select-availability-region/ui/AvailabilityRegionSelector.tsx` as a labelled native single-select using `Intl.DisplayNames` labels, a 44 px target, visible focus, `aria-describedby` pointing at the unsupported-region explanation when the active code is unsupported, a disabled placeholder when the active code is unsupported, and only supported codes as options.
- [X] T054 [US2] Export the region feature public API from `frontend/src/features/select-availability-region/index.ts` (after T051–T053; the barrel must not be created before its modules exist).
- [X] T055 [US2] Extend `frontend/src/widgets/title-detail/ui/AvailabilitySection.tsx` with a `regionSelector` slot, freshness rendering (`checked`/`sourceUpdated` variants), stale last-known banner with date/time and caution plus a retry action (FR-051), the unsupported-region explanation with the informational notice, and the always-visible informational disclaimer. The section never computes freshness from its own clock.
- [X] T056 [US2] Wire `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx` to `useAvailabilityRegion`, the regions query, and the region-bearing availability key; pass the selector into the section and keep the section hidden until the core detail resolves.
- [X] T057 [US2] Add the US2 translation keys to `en.json` and `es.json`: `regionSelectorLabel`, `regionSelectorPlaceholder`, `freshness.{checked,sourceUpdated,lastKnown,lastChecked,caution}`, and `disclaimer`; extend `resources.test.ts` for parity and source usage.

**Checkpoint**: Region and freshness trust behavior is independently verifiable; US1 still passes.

---

## Phase 5: User Story 3 — Understand missing, incomplete, or failed availability data (Priority: P2)

**Goal**: Render distinct, honest loading, no-information, partial, and error states with retry,
without ever claiming unavailability and without breaking the rest of the detail page.

**Independent Test**: Load controlled no-region-entry, empty-group, partial-provider, timeout,
rate-limit, outage-with-cache, and outage-without-cache responses; verify distinct states, no
fabricated offers, retry behavior, and a fully usable core detail page.

### Tests for User Story 3 ⚠️

- [X] T058 [P] [US3] Write `frontend/src/widgets/title-detail/ui/AvailabilitySection.states.test.tsx`: skeleton with `aria-busy` and decorative hidden shapes, no-information copy stating that missing data does not prove unavailability, partial groups rendering only usable categories, unsupported-region rendering with the informational notice and no freshness/destination/attribution, error with `role="alert"` and retry, and neither the no-information nor the unsupported state styled or labelled as an error.
- [X] T059 [P] [US3] Write `frontend/src/pages/title-detail/ui/TitleDetailPage.availability.failure.test.tsx`: provider failure leaves title identity, overview, seasons, cast, related titles, and actions usable; retry refetches only availability/regions; duplicate concurrent retries are prevented; repeated failure produces the same localized error state; a regions-list failure renders the region line from the active code, omits the selector rather than rendering an empty one, and offers retry; not-found renders no availability content.

### Implementation for User Story 3

- [X] T060 [US3] Extend `frontend/src/widgets/title-detail/ui/AvailabilitySection.tsx` with a layout-matching loading skeleton, no-information state, unsupported-region state (region line, explanation, informational notice), and error state with retry; expose busy state; keep the region line visible and render the selector only when the region list is available; no raw error, provider id, or technical detail.
- [X] T061 [US3] Extend `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx` state mapping for pending/error/ready, an explicit retry that refetches both queries and announces the retry outcome once, duplicate-retry prevention, availability isolation from the core detail and other secondary sections, and cancellation of rendering for a superseded title/type/region query result.
- [X] T062 [US3] Add the US3 translation keys to `en.json` and `es.json`: `loading`, `noInformation.title`, `noInformation.description`, `error.title`, `error.description`, and `retry`; extend `resources.test.ts` for parity and source usage.

**Checkpoint**: Empty and failure states are honest and isolated; US1/US2 still pass.

---

## Phase 6: User Story 4 — Change region and use authorized destinations (Priority: P3)

**Goal**: Complete region switching with a single announcement, render only the validated aggregate
source destination with a leaving notice, and handle unsupported regions and stale responses without
mixing data.

**Independent Test**: Change region by keyboard and pointer, verify one announcement and complete
offer replacement; activate the aggregate destination and return with state preserved; verify
provider rows are never links and an unsupported stored code shows the unsupported state without
fallback.

### Tests for User Story 4 ⚠️

- [X] T063 [P] [US4] Write `frontend/src/widgets/title-detail/ui/AvailabilitySection.destination.test.tsx`: destination rendered only when supplied, opens in a new tab with `rel="noopener noreferrer"`, names the host and the "leaving Walplay" warning in the accessible name, provider rows remain non-links, unsupported region shows no freshness/destination/offers.
- [X] T064 [P] [US4] Write `frontend/src/pages/title-detail/ui/TitleDetailPage.availability.regionChange.test.tsx`: region change announced once, an older pending response cannot replace the newest region, a title change while a request is pending cannot replace the newest title's results, stored `FR` shows unsupported without fallback, the selector remains usable, and returning from the destination preserves title/region/results.

### Implementation for User Story 4

- [X] T065 [US4] Add the aggregate destination block to `frontend/src/widgets/title-detail/ui/AvailabilitySection.tsx`: one link only when `destination` exists, `target="_blank"`, `rel="noopener noreferrer"`, localized `destination` label, visible host notice, accessible leaving warning, no URL construction, and no playback/download/subscription action.
- [X] T066 [US4] Add the unsupported-region render to `frontend/src/widgets/title-detail/ui/AvailabilitySection.tsx`: region line names the active code, localized explanation, selector remains available, no categories/providers/freshness/destination, and it is not presented as an error or as unavailability.
- [X] T067 [US4] Add a single region-change announcement in `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx` using the existing `LiveRegion`, with the localized region name and code; prevent duplicate announcements when loading/no-information/stale/error messages also change.
- [X] T068 [US4] Add the US4 translation keys to `en.json` and `es.json`: `destination`, `destinationExternal`, `regionUnsupported`, `unsupportedRegion.title`, and `regionAnnouncement`; extend `resources.test.ts` for parity and source usage.

**Checkpoint**: Region switching, destinations, and unsupported regions work independently; earlier stories still pass.

---

## Phase 7: User Story 5 — Use availability on any device and with assistive technology (Priority: P3)

**Goal**: Meet WCAG 2.2 AA, responsive, zoom, and complete English/Spanish requirements for the
availability experience, including logo fallback and text-only meaning.

**Independent Test**: Exercise the section at 360/768/1024/1440 px and 200 % zoom with keyboard,
axe, a screen reader, and both locales; verify heading/list semantics, focus order, target sizes,
single announcements, no horizontal scrolling, no color-only meaning, and unchanged provider names.

### Tests for User Story 5 ⚠️

- [X] T069 [P] [US5] Write `frontend/src/widgets/title-detail/ui/AvailabilitySection.a11y.test.tsx` with axe, `h2`/`h3` hierarchy, list semantics, keyboard reachability of selector/retry/destination, visible focus, 44 px primary targets (class/structure assertions), role/`aria-busy` behavior, the region exposed in the section's accessible name/description, color independence, and reduced-motion behavior (no attention-seeking animation, no media autoplay).
- [X] T070 [P] [US5] Write `frontend/src/widgets/title-detail/ui/AvailabilitySection.responsive.test.tsx` for 360/768/1024/1440 px and 200 % zoom at the structural level (wrapping classes, `min-w-0`/`break-words`, no fixed widths, no clipped/inline-hidden controls); real layout, horizontal-scroll, and contrast verification remains the manual quickstart step, because jsdom has no layout engine.
- [X] T071 [P] [US5] Write `frontend/src/widgets/title-detail/ui/AvailabilitySection.logos.test.tsx` for missing logo, image-error fallback without a broken-image placeholder, long/non-Latin provider names, decorative logo when the name is adjacent, and provider identity never lost. Reserve-box layout shift is asserted structurally; visual verification remains the manual quickstart step.
- [X] T072 [P] [US5] Write `frontend/src/widgets/title-detail/ui/AvailabilitySection.locale.test.tsx` for complete Spanish Walplay-owned copy, localized country names and dates, unchanged provider names, no raw translation keys, and no availability refetch on language change.
- [X] T073 [P] [US5] Write `frontend/src/pages/title-detail/ui/TitleDetailPage.availability.a11y.test.tsx` for a single region-change announcement and non-duplicated loading/no-information/stale/error announcements in the composed page.

### Implementation for User Story 5

- [X] T074 [US5] Harden provider logo rendering in `frontend/src/widgets/title-detail/ui/AvailabilitySection.tsx`: `loading="lazy"`, reserved width/height, `alt=""` when the adjacent name conveys identity, failure fallback to the name without shift, and no recoloring/cropping/animation.
- [X] T075 [US5] Harden responsive layout in `AvailabilitySection.tsx` and `AvailabilityRegionSelector.tsx` with existing design tokens: wrapping provider lists, `min-w-0`/`break-words` for long names, 44 px primary targets, `motion-reduce`/`prefers-reduced-motion` handling for any transition, and no horizontal scrolling at supported widths or 200 % zoom.
- [X] T076 [US5] Finalize announcement semantics across `AvailabilitySection.tsx` and `TitleDetailPage.tsx`: `aria-busy` while loading, status roles for informational/stale/no-information, `role="alert"` only for errors, and exactly one region-change live message.
- [X] T077 [US5] Complete localization wiring in `AvailabilitySection.tsx`, `AvailabilityRegionSelector.tsx`, and `AvailabilityAttribution.tsx`: every Walplay-owned string via i18next, `Intl.DisplayNames`/`formatLastUpdated` for names and dates, provider names untouched, and both locale resources current.

**Checkpoint**: All five user stories meet accessibility, responsive, and localization contracts.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, release gating, and end-to-end quality gates.

- [X] T078 [P] Write `docs/adr/0006-streaming-availability-boundary-and-release-gating.md` recording the TMDB/JustWatch provider boundary, region allowlist, freshness/retention values, aggregate-destination policy, and release gates OD-SA4/OD-SA5/OD-SA7/OD-SA8.
- [X] T079 [P] Record the resolved OD-03, OD-04, and OD-12 decisions and the availability release gates in `docs/product-overview.md` without changing unrelated product decisions.
- [X] T080 Run the backend gates defined in `backend/package.json`: `npm --prefix backend run lint`, `typecheck`, `test`, `build`; resolve every failure and unexpected warning.
- [X] T081 [P] Run the frontend gates defined in `frontend/package.json`: `npm --prefix frontend run lint`, `typecheck`, `test`, `build`; resolve every failure and unexpected warning.
- [ ] T082 Run the `specs/006-streaming-availability/quickstart.md` manual scenarios with `AVAILABILITY_ENABLED=true` and `VITE_AVAILABILITY_ENABLED=true`: Colombian movie/TV samples, no-information sample, simulated failure with and without cache (including the stale-state retry), regions-list failure, stale boundary, stored unsupported `FR`, aggregate destination, both locales, keyboard/screen reader, text contrast, reduced motion, and 200 % zoom; record the titles/regions used.
- [X] T083 Perform the final leak and scope audit across `backend/src/`, `frontend/src/`, `backend/src/test/fixtures/`, and `frontend/src/test/fixtures/`: no TMDB token, provider id, source field name, raw provider error, stream/player/download URL, per-provider link, price, plan, quality claim, partnership/endorsement/certification claim, affiliate or redirect link, or region value/destination query string in logs; no playback, subscription, rental, purchase, or region-bypass affordance; confirm no dependency or lockfile change.
- [X] T084 Verify disabled-by-default release gating end to end in `backend/src/app.ts`, `frontend/src/shared/config/env.ts`, and `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx`: with `AVAILABILITY_ENABLED=false` the title-availability path returns `404 ROUTE_NOT_FOUND`, the regions path falls through to the existing `/:mediaType/:section` validation error, frontend renders no section and issues no availability/regions request when `VITE_AVAILABILITY_ENABLED=false`, and enabling both flags restores the section without data migration.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; blocks every user story.
- **US1 (Phase 3)**: Depends on Foundational.
- **US2 (Phase 4)**: Depends on US1's section shell and page composition.
- **US3 (Phase 5)**: Depends on US1; may run in parallel with US2 if different files are coordinated.
- **US4 (Phase 6)**: Depends on US2 (region state/selector) and US1.
- **US5 (Phase 7)**: Depends on US1–US4 behavior being present.
- **Polish (Phase 8)**: Depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: No story dependencies after Foundational.
- **US2 (P1)**: Requires US1's `AvailabilitySection` and page orchestration; adds region/freshness/disclaimer.
- **US3 (P2)**: Requires US1's section; adds loading/empty/error and isolation.
- **US4 (P3)**: Requires US2's region state; adds destination, announcement, unsupported handling.
- **US5 (P3)**: Requires all prior behavior; adds a11y/responsive/localization hardening and tests.

### Within Each Story

- Write the story's tests first and confirm they fail.
- Implement models/state before presentational composition.
- Wire the page after the section props exist.
- Add the story's i18n keys in the same increment that uses them, so the unused-key check stays green.
- Run the affected backend/frontend suites before advancing.

### Parallel Opportunities

- Setup T001–T002.
- Foundational backend schemas/mapper tests, domain, provider interface, and fixtures (T005–T008, T011, T014) once T003/T010 interfaces exist.
- Frontend client/query/model tasks T023, T025, T027, T029, T031, T035 once T022/T026/T028/T030 land.
- Each story's listed `[P]` test files.
- US2, US3, and US4 test authoring can run in parallel after their implementation surfaces are agreed.

---

## Parallel Example: User Story 1

```bash
# Test authoring in parallel
Task: "AvailabilitySection available-state tests in frontend/src/widgets/title-detail/ui/AvailabilitySection.test.tsx"
Task: "AvailabilityAttribution tests in frontend/src/widgets/provider-attribution/ui/AvailabilityAttribution.test.tsx"

# Independent component work in parallel
Task: "Create AvailabilityAttribution in frontend/src/widgets/provider-attribution/ui/AvailabilityAttribution.tsx"
Task: "Add US1 i18n keys in frontend/src/shared/i18n/resources/en.json and es.json"
```

## Parallel Example: User Story 2

```bash
Task: "Region preference tests in frontend/src/features/select-availability-region/model/regionPreference.test.ts"
Task: "Hook tests in frontend/src/features/select-availability-region/model/useAvailabilityRegion.test.tsx"
Task: "Selector tests in frontend/src/features/select-availability-region/ui/AvailabilityRegionSelector.test.tsx"
```

## Parallel Example: User Story 5

```bash
Task: "Axe/keyboard tests in frontend/src/widgets/title-detail/ui/AvailabilitySection.a11y.test.tsx"
Task: "Responsive/zoom tests in frontend/src/widgets/title-detail/ui/AvailabilitySection.responsive.test.tsx"
Task: "Logo fallback tests in frontend/src/widgets/title-detail/ui/AvailabilitySection.logos.test.tsx"
Task: "Spanish locale tests in frontend/src/widgets/title-detail/ui/AvailabilitySection.locale.test.tsx"
```

---

## Implementation Strategy

### Suggested MVP

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) and validate the availability display independently with mocked data.
3. **Demo checkpoint**: section, region line, category groups, provider names, no playback.
4. For an honest release, also complete Phase 4 (US2) because both US1 and US2 are P1. US2 adds the
   region/freshness/disclaimer trust contract that the product promise depends on.

### Incremental Delivery

1. Setup + Foundational → contract and data path ready.
2. US1 → available-state display → demo.
3. US2 → region persistence, selector, freshness, stale, disclaimer → demo.
4. US3 → no-information, partial, error, retry, isolation → demo.
5. US4 → region change announcement, destination, unsupported region → demo.
6. US5 → a11y/responsive/localization hardening → release candidate.
7. Polish → ADR, product decisions, full gates, manual quickstart, leak audit, release gating.

### Parallel Team Strategy

- One developer owns backend provider/service/routes; another owns the frontend entity/query layer.
- After Foundational, US1 is the shared integration point.
- Once US1 is stable, US2/US3/US4 can be distributed, keeping the i18n resource files coordinated.
- Reserve one owner for the final gates, manual quickstart, and release-gating verification.

---

## Notes

- `[P]` means different files and no dependency on incomplete work.
- Tests are mandatory here because the approved plan and quickstart define them.
- No new runtime dependency, top-level route, database, persistence, playback, per-provider link, or
  undocumented endpoint may be introduced.
- Every new i18n key must be used in source in the same increment that adds it.
- Commit only after explicit user authorization; this task list does not authorize commits or pushes.
- Stop at each checkpoint to validate the story independently before advancing.
