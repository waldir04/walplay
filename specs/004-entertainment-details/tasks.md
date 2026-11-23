---

description: "Task list for Entertainment Details implementation"
---

# Tasks: Entertainment Details

**Input**: Design documents from `/specs/004-entertainment-details/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included because the plan's Testing Strategy and the constitution's quality gates require backend mapper/provider/service/route tests and frontend model/component/page/a11y tests. Test tasks are grouped per user story where they verify that story.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story this task belongs to (US1–US7)
- Every task includes an exact file path

## Path Conventions

Web application: `backend/src/` for the Express API and `frontend/src/` for the React SPA, matching plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Detail-specific scaffolding, named constants, and provider-neutral fixture infrastructure used by every phase.

- [X] T001 Create provider-neutral detail domain types and display constants in `backend/src/domain/detail.ts` with `CAST_PREVIEW_LIMIT = 10`, `CREW_PREVIEW_LIMIT = 6`, `SIMILAR_PREVIEW_LIMIT = 12`, `COLLECTION_PREVIEW_LIMIT = 12`, `MIN_PLAUSIBLE_YEAR = 1888`, `MAX_PLAUSIBLE_YEAR = 2100`, `MAX_PLAUSIBLE_MOVIE_RUNTIME_MINUTES = 900`, `MAX_PLAUSIBLE_EPISODE_RUNTIME_MINUTES = 600`, `MIN_SEASON_NUMBER = 0`, `MAX_SEASON_NUMBER = 999`, and the `TitleDetail`, `TitleRating`, `Genre`, `Duration`, `Person`, `CastCredit`, `CrewCredit`, `Credits`, `TvSummary`, `Season`, `Episode`, `SeasonEpisodes`, `RelatedTitle`, `RelatedCollection`, `DetailResponseMeta`, and `TitleStatus` shapes from `data-model.md`
- [X] T002 [P] Add the frontend detail display/preview constants to `frontend/src/shared/config/constants.ts`, reusing the backend limit names and values from T001 and adding the frontend-only `OVERVIEW_PREVIEW_CODE_POINTS = 600` and `EPISODE_OVERVIEW_PREVIEW_CODE_POINTS = 320` so mapping, formatting, and tests share one source
- [X] T003 [P] Add `frontend/src/shared/config/detailCapabilities.ts` exporting `DetailCapabilities = { readonly trailer: boolean }` and `DETAIL_CAPABILITIES = { trailer: false } as const` (OD-D3/OD-D6 release dependency)
- [X] T004 [P] Create backend TMDB detail fixtures in `backend/src/test/fixtures/tmdb/detail.ts`: complete movie, complete TV, every-optional-field-missing, empty-string, zero/invalid numeric, adult-flagged, original-language-only, large cast/season/episode/related lists, malformed payload, and provider 404 shapes
- [X] T005 [P] Create frontend detail response fixtures in `frontend/src/test/fixtures/detail/index.ts`: loaded movie, loaded TV with seasons, omitted-field variants, stale meta, `CATALOG_NOT_FOUND`, `DETAIL_SEASON_NOT_FOUND`, and section-error envelopes for all five surfaces

**Checkpoint**: Names, limits, capability flags, and fixtures exist and are shared by later phases.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The provider boundary, HTTP contract, frontend data layer, localization resources, and shared primitives that every user story consumes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend provider boundary and API

- [X] T006 Add `DETAIL_SEASON_NOT_FOUND` (`404`) to `CatalogErrorCode`, `CATALOG_ERROR_STATUS`, and the default message map in `backend/src/domain/errors.ts`, with a factory `detailSeasonNotFoundError()` and tests in `backend/src/domain/detailErrors.test.ts`
- [X] T007 [P] Extend `backend/src/providers/tmdb/tmdb.images.ts` with `resolveBackdrop` (`w780` + `w1280`), `resolveProfile` (`w185`), and `resolveStill` (`w300`), keeping leading-slash normalization and returning no image when the base URL or path is unusable; extend `backend/src/providers/tmdb/tmdb.images.test.ts`
- [X] T008 [P] Create `backend/src/providers/tmdb/tmdb.detail.schemas.ts` with Zod DTOs `movieDetailDto`, `tvDetailDto`, `creditsDto`, `aggregateCreditsDto`, `similarDto`, `collectionDto`, and `seasonDto` exactly as listed in `contracts/provider-boundary.md` (the existing `imageConfigurationDto` is reused unchanged), permissive about unknown keys and strict about consumed fields; add `backend/src/providers/tmdb/tmdb.detail.schemas.test.ts`
- [X] T009 Create shared normalization and validation helpers in `backend/src/providers/tmdb/tmdb.detail.mapper.ts`: trim/empty handling, title placeholders `n/a|null|undefined|tbd` (never treat `Unknown` or `Untitled` as title placeholders), descriptive placeholders `n/a|na|tbd|unknown|untitled|-|--|—`, strict `YYYY-MM-DD` parsing with year range `1888..2100`, movie runtime `1..900`, episode runtime `1..600` (one value = typical, several = min/max), rating only when finite, `0 < average <= 10`, and integer `voteCount > 0`, popularity only when finite and `> 0`, case-insensitive status mapping to the nine internal statuses, and crew job mapping `Director→director`, `Creator→creator`, `Writer|Screenplay|Story|Teleplay→writer`; tests in `backend/src/providers/tmdb/tmdb.detail.normalization.test.ts`
- [X] T010 Extend `backend/src/providers/tmdb/tmdb.detail.mapper.ts` with `mapMovieDetail` and `mapTvDetail` producing the provider-neutral core `TitleDetail` plus internal `collectionProviderId`: localized-then-original title/overview, tagline never used as overview, localized genres, poster/backdrop, rating, popularity, movie runtime, TV episode runtime, TV summary (season/episode counts, first/latest air dates, up to 5 networks), ordered seasons (regular ascending then specials `0`), movie collection name, and the trailer selection rule (`site=YouTube`, `type=Trailer`, key `^[A-Za-z0-9_-]{6,20}$`, prefer `official`); return `null` for adult, unknown/removed, or unusable identity; tests in `backend/src/providers/tmdb/tmdb.detail.mapper.core.test.ts`
- [X] T011 Extend `backend/src/providers/tmdb/tmdb.detail.mapper.ts` with `mapMovieCredits` and `mapTvCredits`: provider order, first 10 usable cast after dropping unnamed credits, first 6 usable key crew after role mapping and person+role dedupe, first usable TV aggregate role character, character omitted when unusable; tests in `backend/src/providers/tmdb/tmdb.detail.mapper.credits.test.ts`
- [X] T012 Extend `backend/src/providers/tmdb/tmdb.detail.mapper.ts` with `mapSimilarItems` and `mapCollectionItems`: keep only `movie`/`tv`, drop adult, current title, unusable identity/title, and duplicates in the documented order, then bound to 12 preserving provider order; resolve `genre_ids` through the existing genre resolver; tests in `backend/src/providers/tmdb/tmdb.detail.mapper.related.test.ts`
- [X] T013 Extend `backend/src/providers/tmdb/tmdb.detail.mapper.ts` with `mapSeasonEpisodes`: provider order, season header, episode number `0..9999`, name never invented, valid `airDate`, runtime `1..600`, overview, still, and per-episode rating under the same rating rules; drop episodes with neither usable number nor name; preserve a missing name when a number exists; tests in `backend/src/providers/tmdb/tmdb.detail.mapper.season.test.ts`
- [X] T014 Create `backend/src/providers/detail-provider.ts` exporting the `DetailProvider` interface from `contracts/provider-boundary.md` and the internal `ProviderTitleDetail = { detail: TitleDetail; collectionProviderId?: number }` envelope
- [X] T015 Create `backend/src/providers/tmdb/tmdb.detail.provider.ts` implementing `DetailProvider`: `fetchDetail` (`/movie/{id}` or `/tv/{id}` with `append_to_response=videos` plus one conditional original-language request when the localized overview is unusable and `original_language` differs), `fetchCredits` (`credits` vs `aggregate_credits`), `fetchSimilar` (`page=1`), `fetchCollection` (`/collection/{id}`), and `fetchSeason` (`/tv/{id}/season/{n}`); reuse `TmdbClient`, images, genres, and the list mapper; map provider 404 on core/season to `null` and provider 404 on credits/similar/collection to empty data; add `backend/src/providers/tmdb/tmdb.detail.provider.test.ts` with mocked client responses and no real provider calls
- [X] T016 Create `backend/src/services/detail.service.ts` with `getDetail`, `getCredits`, `getSimilar`, `getCollection`, and `getSeason`; reuse `CatalogCache` through an injected `detailCache`; use keys `tmdb:detail:<mediaType>:<providerId>:<language>`, `tmdb:credits:<mediaType>:<providerId>:<language>`, `tmdb:similar:<mediaType>:<providerId>:<language>`, `tmdb:collection:<mediaType>:<providerId>:<language>`, and `tmdb:season:<providerId>:<season>:<language>`; build `{ language, stale, lastUpdatedAt, source }` meta; decode `itemId` with `decodeItemId`, reject malformed identities with `VALIDATION_ERROR`, and reject a decoded media type that disagrees with the path as `CATALOG_NOT_FOUND`; treat provider 404 on credits/similar/collection as empty data; return an empty `RelatedCollection` without a provider call when a movie has no collection membership; map `null` core to `CATALOG_NOT_FOUND`, `null` season to `DETAIL_SEASON_NOT_FOUND`, TV collection and movie season to `CATALOG_NOT_FOUND`, and provider failures through `mapProviderError`; tests in `backend/src/services/detail.service.test.ts`
- [X] T017 Create `backend/src/controllers/detail.controller.ts` with Zod schemas for `mediaType` (`movie|tv`), `itemId` (`^[A-Za-z0-9_-]{8,64}$`), `language` (`en|es`), a strict query schema allowing only `language` on all five endpoints (`seasonNumber` is a path parameter), and `seasonNumber` coerced to an integer `0..999`; reject unknown query parameters as `VALIDATION_ERROR`; add five async handlers returning `{ data, meta }`; tests in `backend/src/controllers/detail.controller.test.ts`
- [X] T018 Create `backend/src/routes/detail.routes.ts` mounting the five additive `GET` endpoints from `contracts/detail-api.md` under `/api/catalog/:mediaType/titles/:itemId/...` with `Cache-Control: no-store`, and mount it in `backend/src/app.ts` by accepting a `detailService` in `CreateAppOptions`; add `backend/src/routes/detail.routes.integration.test.ts` covering every endpoint, malformed `itemId`, mismatched `mediaType`, unknown query, out-of-range season, secondary provider 404 as empty `200`, `DETAIL_SEASON_NOT_FOUND`, existing error codes, `X-Request-Id`, CORS, and `no-store`
- [X] T019 Wire the TMDB detail provider and a dedicated `detailCache` in `backend/src/server.ts` using the existing client, image resolver, genre resolver, config TTLs, and cache options; keep endpoint behavior wired in T018

### Frontend data layer and shared primitives

- [X] T020 Create `frontend/src/entities/catalog/model/titleDetail.ts` with Zod schemas and inferred types for `TitleDetail`, `TitleRating`, `Genre`, `Duration`, `TvSummary`, `Season`, `Episode`, `SeasonEpisodes`, `Credits`, `CastCredit`, `CrewCredit`, `RelatedCollection` (items as catalog items), `TitleStatus`, `CrewRole`, and the five response envelopes using the existing `catalogResponseMetaSchema`, with `seasonsCount`/`episodesCount` for the TV summary, optional `profile` on credits, `rating.source` fixed to `tmdb`, and a typed `TitleStatus` → `detail.status.*` label-key map (kebab-case union values to camelCase keys); tests in `frontend/src/entities/catalog/model/titleDetail.test.ts`
- [X] T021 [P] Create `frontend/src/entities/catalog/model/detailFormatting.ts` with `Intl`-based localized date, year, movie duration, episode duration/range, rating value, vote count, popularity, and count formatters for `en-US` and `es-ES`, including tabular-numeral-compatible string output; tests in `frontend/src/entities/catalog/model/detailFormatting.test.ts`
- [X] T022 [P] Create `frontend/src/entities/catalog/model/detailErrors.ts` mapping `CATALOG_NOT_FOUND` → `not-found`, `DETAIL_SEASON_NOT_FOUND` → `season-fallback`, and other codes → `error`, with copy-key maps for page and section errors; tests in `frontend/src/entities/catalog/model/detailErrors.test.ts`
- [X] T023 [P] Extend `frontend/src/entities/catalog/api/catalogKeys.ts` with `detail`, `credits`, `similar`, `collection`, and `season` keys including media type, item id, language, and season where applicable; extend `frontend/src/entities/catalog/api/catalogKeys.test.ts`
- [X] T024 Create `frontend/src/entities/catalog/api/detailClient.ts` with envelope schemas, including optional credit `profile` objects, and `getDetail`, `getCredits`, `getSimilar`, `getCollection`, and `getSeason` using the existing `HttpClient`, `VITE_API_BASE_URL`, and the active `en|es` language as the required query parameter; tests in `frontend/src/entities/catalog/api/detailClient.test.ts`
- [X] T025 Create `frontend/src/entities/catalog/api/detailQueries.ts` with five TanStack Query hooks using the key factory, `retry: false`, deliberate `staleTime`/`gcTime`, language in every key, and `enabled` gates that prevent any secondary request before the core identity resolves, enable collection only for movies, and enable season only after the effective season resolves; tests in `frontend/src/entities/catalog/api/detailQueries.test.ts` and `frontend/src/entities/catalog/api/detailQueries.race.test.ts`
- [X] T026 Create `frontend/src/shared/ui/ExpandableText.tsx`: always render the complete text in the DOM, apply a visual clamp only above a configurable code-point preview (`600` for overviews, `320` for episode overviews), render a keyboard-operable `aria-expanded` control with localized `detail.overview.showMore`/`showLess` labels, and keep the full text available to assistive technology; export it from `frontend/src/shared/ui/index.ts`; tests in `frontend/src/shared/ui/ExpandableText.test.tsx`
- [X] T027 Create `frontend/src/shared/lib/documentTitle.tsx` with an override context and provider, update `frontend/src/app/routing/usePageTitle.ts` to write `override ?? t(routeTitleKey)` as the single writer, wrap the router in `frontend/src/app/App.tsx`, and update `frontend/src/app/routing/usePageTitle.test.tsx` and `frontend/src/app/routing/usePageTitle.language.test.tsx` for override with a localized media type, route change, language change, document language, and unmount
- [X] T028 Add the complete `detail` namespace plus `meta.detailTitle` (`{{title}} · {{mediaType}}`) to `frontend/src/shared/i18n/resources/en.json` and `es.json` exactly per `contracts/i18n-resources.md`, remove `catalog.states.detailsUnavailable` from both files when no other surface references it, and add `frontend/src/shared/i18n/detailResources.test.ts` asserting key parity, plural suffixes, no unused detail keys, no duplicate keys for the same state, and section-level loading/stale labels

**Checkpoint**: Foundation ready — all five API surfaces, provider mapping, frontend queries, formatting, error mapping, i18n resources, and shared primitives exist. User story implementation can begin in parallel.

---

## Phase 3: User Story 1 — Read the essential information about a title (Priority: P1) 🎯 MVP

**Goal**: A visitor opens a movie or TV show from catalog or search, or directly from the address, and sees a complete identity, facts, artwork, overview, content type in text, and a working return action inside the shared shell.

**Independent Test**: Open a movie and a TV show from catalog cards, from search results, and as direct/reloaded addresses; verify localized title, content type text, date, overview, genres, duration, artwork, rating when valid, return navigation in every state, and no prior-navigation requirement.

### Tests for User Story 1

- [X] T029 [P] [US1] Add component tests in `frontend/src/entities/catalog/ui/detail/DetailHero.test.tsx`, `DetailFacts.test.tsx`, `DetailOverview.test.tsx`, `DetailSkeleton.test.tsx`, and `frontend/src/widgets/title-detail/ui/ProviderMetadata.test.tsx` (passing a stub attribution node through the slot) asserting the primary heading, content type in text, localized date/year, genre list, movie runtime, TV episode length as typical/range, TV provider summary facts and networks, localized status, original title only when different, valid rating with TMDB label, popularity only when positive and only in the secondary area, the provider-values note, attribution visible without interaction, overview paragraph preservation, layout-matching skeleton `aria-busy` with decorative shapes hidden, and artwork fallback without layout shift
- [X] T030 [P] [US1] Add page integration tests in `frontend/src/pages/title-detail/ui/TitleDetailPage.fromCard.test.tsx`, `TitleDetailPage.fromSearch.test.tsx`, and `TitleDetailPage.direct.test.tsx` asserting card and search entry, path-authoritative media type including mismatch rejection, direct open/reload, return action in loading/loaded/error/not-found, `CATALOG_NOT_FOUND` mapping to not-found rather than error, `intersection` of routed seed with the URL identity, language switching that preserves the title, and rapid navigation where only the newest response updates the page

### Implementation for User Story 1

- [X] T031 [P] [US1] Implement `frontend/src/entities/catalog/ui/detail/DetailHero.tsx`: one `h1` title identity, localized content-type text, a localized `detail.facts.originalTitle` label only when the original title differs from the displayed title, poster with `w342`/optional `w780` sources (falling back to `url` for both densities when `urlLarge` is absent) and reserved `2:3` aspect ratio, backdrop as supporting atmosphere, `PosterFallback` when artwork is absent or fails, and return action reachable in the primary identity area
- [X] T032 [P] [US1] Implement `frontend/src/entities/catalog/ui/detail/DetailFacts.tsx`: release date for movies and first-air date for TV as a fully localized date or four-digit year, localized genres as a semantic list, movie runtime formatted in hours/minutes, TV episode length as a localized typical value or min-max range via `detail.facts.episodeRuntime`/`detail.duration.*`, valid TMDB rating with source, accessible scale/vote count (`detail.rating.a11y_one`/`_other`), and visible vote count (`detail.rating.votes_one`/`_other`), localized status via the typed status label-key map and `detail.facts.status` with unknown statuses omitted, and the TV summary facts (provider counts, first/latest air dates, networks) labeled as reported by TMDB
- [X] T033 [P] [US1] Implement `frontend/src/entities/catalog/ui/detail/DetailOverview.tsx`: localized overview preserving provider line breaks via `ExpandableText` with the `OVERVIEW_PREVIEW_CODE_POINTS` threshold, optional tagline never presented as the overview, and the whole section omitted when no usable overview exists
- [X] T034 [P] [US1] Implement `frontend/src/entities/catalog/ui/detail/DetailSkeleton.tsx`: reserved identity, artwork, facts, overview, and section dimensions matching the final layout, `aria-busy`, visible localized `detail.states.loading` label for assistive technology, and decorative shapes `aria-hidden`
- [X] T035 [P] [US1] Implement `frontend/src/entities/catalog/ui/detail/DetailFailure.tsx`: page-level localized error heading and description from `detailErrors.ts`, a retry action using `detail.states.retry` that calls the core `refetch` without concurrent duplicate retries, the return action, primary navigation and language switching preserved, and an assertive announcement; distinct from not-found
- [X] T036 [P] [US1] Implement `frontend/src/entities/catalog/ui/detail/DetailNotFound.tsx`: localized `detail.states.notFound.title`/`description`, return action, primary navigation and language switching preserved, no retry, no technical detail, and no provider identifier
- [X] T037 [US1] Implement `frontend/src/widgets/title-detail/ui/ProviderMetadata.tsx` labelled `detail.sections.providerMetadata` (TMDB popularity only when finite and positive with `detail.popularity.label`, `detail.providerValuesNote`, and an `attribution` ReactNode slot supplied by the page; never import `widgets/provider-attribution` from this widget) and `TitleDetailView.tsx` composing `DetailHero`, `DetailFacts`, `DetailOverview`, and `ProviderMetadata` in the DOM order defined by `contracts/routes.md` with the attribution slot passed through, omitting absent sections without leaving gaps, and add `frontend/src/widgets/title-detail/index.ts` exporting `TitleDetailView`
- [X] T038 [US1] Rewrite `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx` to validate the detail address before requesting, use the routed item only as a first-paint seed while always running the core detail query, select `loading`/`loaded`/`stale`/`error`/`not-found` states, announce loaded once with `detail.states.loaded`, keep the existing `resolveDetailReturn` behavior, import the existing `ProviderAttribution` from `@/widgets/provider-attribution` and pass it into `TitleDetailView` as the attribution slot, register the `{{title}} · {{mediaType}}` document-title override with the localized `catalog.mediaType.*` label while loaded and clear it otherwise, and keep exactly one `h1`
- [X] T039 [US1] Extend `frontend/src/entities/catalog/index.ts` with the public detail models, formatting helpers, error mapping, client, queries, and `ui/detail` exports without exposing internal implementation details

**Checkpoint**: User Story 1 works independently from catalog, search, and direct addresses. `npm --prefix frontend run test -- title-detail` and `npm --prefix backend run test -- detail` pass.

---

## Phase 4: User Story 2 — Trust what the page shows, including what it omits (Priority: P1)

**Goal**: Titles with missing, empty, zero, or invalid metadata render coherently, never fabricate values or placeholders, and clearly label stale/cached data.

**Independent Test**: Load detail pages for fixtures with each optional field missing, empty, whitespace-only, zero, invalid, or placeholder; confirm only supported information appears, no `0`/dash/`N/A`/empty section is rendered, and cached data is labelled with a last-update indication.

### Tests for User Story 2

- [X] T040 [P] [US2] Add omission tests in `frontend/src/entities/catalog/ui/detail/detailOmission.test.tsx` covering no overview, runtime zero/negative/implausible/missing, rating zero/zero votes/out-of-range/missing, popularity zero/negative/unavailable, no poster and no backdrop, minimal identity, and whitespace/empty/placeholder provider text; assert the DOM contains no `0`, `—`, `-`, `N/A`, `Unknown`, `Untitled`, or empty section heading, and no rating or popularity outside its source-labeled area
- [X] T041 [P] [US2] Add state tests in `frontend/src/pages/title-detail/ui/TitleDetailPage.states.test.tsx` for `meta.stale`/`meta.source === 'stale-cache'` labelling with localized `detail.states.stale.lastUpdated`, the adult/removed/unusable-identity not-found mapping, page error versus not-found semantic distinction, language switching and primary navigation preserved in both states, and offline/stale labeling with a last-update time
- [X] T042 [P] [US2] Add backend omission tests in `backend/src/providers/tmdb/tmdb.detail.mapper.omission.test.ts` asserting that each optional field missing, `null`, whitespace, empty string, placeholder, zero, negative, out-of-range, and malformed never appears in mapped output, and that only the minimum usable identity yields a valid detail or `null`

### Implementation for User Story 2

- [X] T043 [US2] Adjust `frontend/src/entities/catalog/ui/detail/DetailHero.tsx`, `DetailFacts.tsx`, and `DetailOverview.tsx` so every optional value is omitted rather than replaced by zero, dash, placeholder, or empty region, and the neutral artwork fallback always identifies the title and content type
- [X] T044 [US2] Add stale/cached presentation to `frontend/src/widgets/title-detail/ui/TitleDetailView.tsx` as a prop-driven localized note (`detail.states.stale.label`, `detail.states.stale.lastUpdated`) and map `meta.stale`, `meta.source`, and `meta.lastUpdatedAt` from the core response in `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx`

**Checkpoint**: User Story 2 passes its independent test with every omission fixture. `npm --prefix frontend run test -- title-detail` and `npm --prefix backend run test -- omission` pass.

---

## Phase 5: User Story 3 — Explore a TV show's seasons and episodes (Priority: P2)

**Goal**: A visitor can review regular seasons and specials, select a season, see that season's episodes, and have the selection reflected in the address without adding history entries; movies never show season or episode content.

**Independent Test**: Open a multi-season TV show, select different seasons including specials, reload a `?season=N` address, try malformed/out-of-range/unavailable seasons, use browser back after several changes, open a movie, and open a season with no episodes.

### Tests for User Story 3

- [X] T045 [P] [US3] Add model tests in `frontend/src/features/select-season/model/seasonAddress.test.ts` for first-occurrence `season` parsing, `0` as specials, leading zeros, non-integer/negative/out-of-range/absent values treated as absent, valid-not-supplied fallback to the first regular season, specials-only fallback, missing-name `Episode {{number}}` identification, and address building/preserving other parameters
- [X] T046 [P] [US3] Add component tests in `frontend/src/features/select-season/ui/SeasonSelector.test.tsx` and `frontend/src/entities/catalog/ui/detail/EpisodeList.test.tsx` for regular-season ascending order then specials, localised names/years/counts, visible and accessible selected state, full set exposed without clipping including a very large season list, keyboard operation, episode provider order, missing episode fields omitted, still fallback, the localized empty state inside the episode area, and section loading/stale labels
- [X] T047 [P] [US3] Add page integration tests in `frontend/src/pages/title-detail/ui/TitleDetailPage.season.test.tsx` for the initial season without extra interaction, any provider season reachable in no more than two interactions, direct `?season=2` and reload, malformed/`999`/removed-season fallback without an error page, `replace` history after several season changes, restoring the catalog/search origin on back, movie `?season=N` ignored with no season UI, and season preservation across language change

### Implementation for User Story 3

- [X] T048 [US3] Create `frontend/src/features/select-season/model/seasonAddress.ts` implementing `season` parse/normalize/resolve/build helpers, the effective-season table from `data-model.md`, and `replace`-safe search-parameter construction that preserves the existing location state and other query parameters
- [X] T049 [US3] Create `frontend/src/features/select-season/model/useSeasonSelection.ts` exposing the effective season, a `selectSeason` action using `navigate(..., { replace: true })`, the season-change announcement text from `detail.seasons.announcement`/`detail.seasons.specialsAnnouncement`, and the episode-region busy state; write no history entries on season changes
- [X] T050 [P] [US3] Create `frontend/src/features/select-season/ui/SeasonSelector.tsx`: a labelled list of single-select season controls, regular seasons ascending then specials labelled `detail.seasons.specials`, localized option text with year/count when known, visible `detail.seasons.selected` state and accessible selected state using `detail.a11y.seasonControl`, no clipping, and keyboard/touch target compliance
- [X] T051 [P] [US3] Create `frontend/src/entities/catalog/ui/detail/EpisodeList.tsx`: semantic ordered list in provider order, episode number, localized name or `detail.episodes.episodeLabel` identification, valid air date, duration, overview via `ExpandableText` with `EPISODE_OVERVIEW_PREVIEW_CODE_POINTS`, still image with reserved `16:9` dimensions and omission on absence, per-episode rating with the TMDB label and accessible scale/vote count, the localized in-area empty state, and a large episode list rendered in provider order without truncation
- [X] T052 [US3] Create `frontend/src/widgets/title-detail/ui/SeasonEpisodesSection.tsx` combining `SeasonSelector` and `EpisodeList`, starting the season query only after core identity and the effective season resolve, handling `DETAIL_SEASON_NOT_FOUND` as a one-time fallback to the initial season, and rendering section-only loading (`detail.states.sectionLoading`; episode area uses `detail.episodes.loading`), stale (`detail.states.sectionStale`), empty, and error-with-retry states without replacing the rest of the page
- [X] T053 [US3] Integrate `SeasonEpisodesSection` into `frontend/src/widgets/title-detail/ui/TitleDetailView.tsx` gated on `mediaType === 'tv'` and on at least one usable season, preserving title identity, facts, overview, actions, credits, and related sections when a season changes; extend `frontend/src/widgets/title-detail/index.ts`
- [X] T054 [US3] Update `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx` to read the season parameter, pass the effective season to the season query, perform the one-time initial-season address write with `replace` after the core season list resolves, keep the address unchanged for TV with no seasons, and preserve a still-valid season across language changes
- [X] T055 [US3] Create `frontend/src/features/select-season/index.ts` with the public season-address, hook, and `SeasonSelector` exports

**Checkpoint**: User Story 3 passes independently; a movie never renders season or episode content. `npm --prefix frontend run test -- season` passes.

---

## Phase 6: User Story 4 — Review who made the title (Priority: P2)

**Goal**: Show a bounded cast and key-crew preview in provider order with characters where known, localized roles, neutral image fallbacks, dedupe, and independent failure.

**Independent Test**: Open titles with complete, partial, duplicate, unnamed, and no credits; verify at most 10 cast and 6 crew, provider order, optional characters, localized roles, profile fallback, blank-credit omission, and that a credits failure leaves core, seasons, and related sections usable.

### Tests for User Story 4

- [X] T056 [P] [US4] Add component tests in `frontend/src/entities/catalog/ui/detail/CastList.test.tsx` and `CrewList.test.tsx` for the 10/6 bounds, provider order, character only when known, localized crew role labels, duplicate person+role removal, unnamed-credit dropping, profile fallback carrying the name, images decorative or described without duplicating the accessible name, section loading/stale labels, and empty-list section omission

### Implementation for User Story 4

- [X] T057 [P] [US4] Implement `frontend/src/entities/catalog/ui/detail/CastList.tsx`: semantic list of at most `CAST_PREVIEW_LIMIT` credits, name plus `detail.credits.character` only when known, `w185` profile image with reserved aspect ratio and lazy loading, and `detail.credits.profileFallback` neutral fallback
- [X] T058 [P] [US4] Implement `frontend/src/entities/catalog/ui/detail/CrewList.tsx`: semantic list of at most `CREW_PREVIEW_LIMIT` credits, localized `detail.crewRole.*` labels, profile fallback, and omission of unknown roles
- [X] T059 [US4] Implement `frontend/src/widgets/title-detail/ui/CreditsSection.tsx` with section-only loading skeleton (`detail.states.sectionLoading`), stale label (`detail.states.sectionStale`), inline error plus section retry that prevents duplicate requests, whole-section omission when both previews are empty, and no effect on other surfaces
- [X] T060 [US4] Integrate `CreditsSection` into `frontend/src/widgets/title-detail/ui/TitleDetailView.tsx` and start the credits query in `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx` only after the core identity resolves; keep the existing section heading hierarchy (`h2` + list semantics)

**Checkpoint**: User Story 4 passes independently, including a credits-only failure. `npm --prefix frontend run test -- credits` passes.

---

## Phase 7: User Story 5 — Move to related titles (Priority: P2)

**Goal**: Show provider-supplied similar titles and movie collection membership as two separate labelled, bounded sections that preserve content type in text, navigate to the matching detail page, and fail independently.

**Independent Test**: Open a movie with similar titles and collection membership, a TV show with similar titles only, and a title with no related data; verify separate labels, bounds, provider order, content type text, current/adult/duplicate exclusion, no empty section, type-specific navigation, and section-only retry.

### Tests for User Story 5

- [X] T061 [P] [US5] Add component tests in `frontend/src/entities/catalog/ui/detail/RelatedTitles.test.tsx` for the 12-item bound, provider order, content type in text, reuse of the catalog card contract, matching type-specific links, omission of empty lists, no rating rendered on a related card, and a large provider list staying bounded; assert similar and collection are never merged

### Implementation for User Story 5

- [X] T062 [P] [US5] Implement `frontend/src/entities/catalog/ui/detail/RelatedTitles.tsx` reusing `CatalogCard`/catalog card primitives for bounded related items, preserving type-specific detail links, rendering the related-card variant without a rating so no unattributed rating appears, with no duplicated card content or new destination
- [X] T063 [US5] Implement `frontend/src/widgets/title-detail/ui/RelatedSection.tsx` with truthful labels `detail.sections.similar` and `detail.sections.collection`, separate section-only loading (`detail.states.sectionLoading`) and stale (`detail.states.sectionStale`) states, error/retry that prevents duplicate requests, whole-section omission when empty, and no "recommended/personalized" wording
- [X] T064 [US5] Integrate two `RelatedSection` instances into `frontend/src/widgets/title-detail/ui/TitleDetailView.tsx` (similar for both types, collection for movies only) and start the two queries in `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx` only after core identity; keep failures isolated per section

**Checkpoint**: User Story 5 passes independently, including one related section failing while the other and the core remain usable. `npm --prefix frontend run test -- related` passes.

---

## Phase 8: User Story 6 — Use clearly identified entry points (Priority: P3)

**Goal**: Render only supported, functional entry points as a labelled action area; with trailer capability disabled by default, no availability, personal-list, trailer, disabled, placeholder, or "coming soon" control appears.

**Independent Test**: Render detail pages with capability flags on and off and with/without a validated trailer; verify production defaults render no entry points or placeholders, and a test-enabled trailer renders a keyboard-operable external link with visible label, external-navigation text, and no in-page playback.

### Tests for User Story 6

- [X] T065 [P] [US6] Add tests in `frontend/src/widgets/title-detail/ui/DetailActions.test.tsx` for `DETAIL_CAPABILITIES.trailer = false` omitting everything, `true` plus a validated trailer rendering an external link with visible localized label, external-navigation text, `target="_blank"`, `rel="noopener noreferrer"`, and no embed/autoplay, `true` plus no trailer rendering nothing, and the absence of availability/personal-list/disabled/"coming soon" controls

### Implementation for User Story 6

- [X] T066 [US6] Implement `frontend/src/widgets/title-detail/ui/DetailActions.tsx` as a labelled `h2` action area (`detail.sections.actions`) that receives `DetailCapabilities` by prop (defaulting to `DETAIL_CAPABILITIES`) and renders only the validated authorized trailer external link when enabled; no other capability is implemented
- [X] T067 [US6] Integrate `DetailActions` into `frontend/src/widgets/title-detail/ui/TitleDetailView.tsx` between overview and the TV seasons section, preserving the detail address and selected season when returning from an external destination

**Checkpoint**: User Story 6 passes independently with production capability defaults. `npm --prefix frontend run test -- DetailActions` passes.

---

## Phase 9: User Story 7 — Use the detail page on any device or with assistive technology (Priority: P3)

**Goal**: The full detail journey is usable at mobile/tablet/desktop widths, at 200 % zoom, with keyboard only, and with a screen reader, with correct semantics, focus, announcements, targets, and reduced motion.

**Independent Test**: Complete the detail journey at 320/360/768/1024/1440 px and 200 % zoom, keyboard only, and with a screen reader; verify no horizontal scroll, logical focus order, exactly one `h1`, heading/list semantics, single season-change announcement, busy-state announcements, and text-only state communication.

### Tests for User Story 7

- [X] T068 [P] [US7] Add axe tests in `frontend/src/pages/title-detail/ui/TitleDetailPage.a11y.test.tsx` for loaded, loading, stale, page error, section error, and not-found states, including a TV page with seasons and a movie page, and assert the document language matches the active locale
- [X] T069 [P] [US7] Add width/zoom contract tests in `frontend/src/pages/title-detail/ui/TitleDetailPage.responsive.test.tsx` for 320, 360, 768, 1024, and 1440 px contracts, 200 % zoom expectations, stacked reading order with title/type before artwork, desktop artwork-beside-facts layout, very large season and episode lists remaining reachable and scannable without truncation, and no horizontal page scroll
- [X] T070 [P] [US7] Add keyboard and announcement tests in `frontend/src/pages/title-detail/ui/TitleDetailPage.keyboard.test.tsx` for logical order through return, overview expand, season controls, related titles, retries, and an enabled trailer, visible focus, exactly one `h1`, single polite season-change announcement, busy announcements without duplicates, focus staying on the activated season control, navigation from card/search moving focus to the primary heading with one announcement, and each retry re-attempting only its own surface without duplicate requests

### Implementation for User Story 7

- [X] T071 [US7] Adjust `frontend/src/widgets/title-detail/ui/TitleDetailView.tsx`, `ProviderMetadata.tsx`, `SeasonEpisodesSection.tsx`, `CreditsSection.tsx`, `RelatedSection.tsx`, and the `frontend/src/entities/catalog/ui/detail` components for final semantics: one `h1`, `h2` section headings, list semantics for genres/cast/crew/seasons/episodes/related, `tabular-nums` on ratings/durations/counts/episode numbers, no color-only state, logical focus order, reduced-motion compliance, and WCAG 2.2 AA target/contrast tokens
- [X] T072 [US7] Adjust detail imagery and controls in `frontend/src/entities/catalog/ui/detail/DetailHero.tsx`, `CastList.tsx`, `EpisodeList.tsx`, `RelatedTitles.tsx`, and `ExpandableText` usage for reserved dimensions, lazy loading, decorative-or-described alternative text without duplicating the accessible name, defined failure fallbacks, and touch-target minimums

**Checkpoint**: User Story 7 passes axe, keyboard, announcement, width, zoom, and reduced-motion checks.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Durable documentation, coverage targets, and the full quality-gate contract.

- [X] T073 Create `docs/adr/0004-detail-surface-split-season-address-and-capability-gating.md` recording the primary/secondary endpoint split, the `?season=` address with `replace` history, `DETAIL_CAPABILITIES.trailer = false` release dependency, and the `entities/catalog` extension decision, following the style of `docs/adr/0003-search-query-identity-and-origin.md`
- [X] T074 [P] Verify coverage thresholds in both applications with focused detail runs (`npm --prefix backend run test -- --coverage detail` and `npm --prefix frontend run test -- --coverage title-detail season`) and add the missing unit tests required to reach at least 80 % global and about 90 % for detail mapping, normalization, state mapping, and season selection, including status, popularity, original-title, section-label, retry-isolation, document-language, and large-list coverage; measure a very large episode list and record whether virtualization is justified, preserving list semantics and access to every episode if it is introduced
- [X] T075 Run `npm --prefix backend run lint`, `typecheck`, `test`, `build` and `npm --prefix frontend run lint`, `typecheck`, `test`, `build`; resolve every failure and unexpected warning, confirm no raw provider field name/identifier/error appears in API bodies or the DOM, confirm both locale resources cover every detail string, record a manual keyboard and screen-reader pass for the US7 journey, and verify the provider-attribution/link copy and the no-ownership claim review (FR-047)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; starts immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks every user story. Backend provider/API (T006–T019) and frontend data layer (T020–T028) can proceed in parallel once T001–T005 exist, but T015 depends on T008–T014, T016 depends on T014–T015, T017–T019 depend on T016, and T024–T025 depend on T020–T023.
- **User Stories (Phases 3–9)**: All depend on Foundational. US1 must complete first because it creates `TitleDetailPage.tsx` and `TitleDetailView.tsx`; US2–US7 depend on US1's composition files.
- **Polish (Phase 10)**: Depends on all completed user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational — no other story dependency. MVP.
- **US2 (P1)**: Starts after US1 (adjusts US1 components and adds stale/omission behavior).
- **US3 (P2)**: Starts after US1 (adds a section to `TitleDetailView` and season orchestration to the page); does not require US2.
- **US4 (P2)**: Starts after US1; independent of US2/US3/US5.
- **US5 (P2)**: Starts after US1; independent of US2/US3/US4.
- **US6 (P3)**: Starts after US1 (needs the core trailer reference and view composition); independent of US2–US5.
- **US7 (P3)**: Starts after US1–US6 (verifies all surfaces present); can begin test authoring earlier but closes last.

### Within Each User Story

- Tests are written first and must fail before the implementation tasks they cover.
- Models/helpers before components; leaf components before the composing widget; widget before page integration.
- Section-only failure isolation is verified before the story checkpoint.

### Parallel Opportunities

- Setup: T002, T003, T004, T005 run in parallel after T001.
- Foundational backend: T006, T007, T008 are independent files; T010–T013 edit the same mapper file and must be sequential; T021, T022, T023 are independent frontend files.
- US1: T029–T036 are independent test/component files; T037 and T038 are sequential integration tasks.
- US3: T045–T047 tests parallel; T048→T049→T054 sequential; T050/T051 parallel; T052→T053 sequential.
- US4: T056→T057/T058 parallel→T059→T060.
- US5: T061→T062→T063→T064.
- US6: T065→T066→T067.
- US7: T068/T069/T070 parallel; T071/T072 parallel after tests.

---

## Parallel Example: User Story 1

```bash
# Launch the four independent component test files and component implementations:
Task: "Add DetailHero.test.tsx, DetailFacts.test.tsx, DetailOverview.test.tsx, DetailSkeleton.test.tsx in frontend/src/entities/catalog/ui/detail/"
Task: "Implement DetailHero.tsx in frontend/src/entities/catalog/ui/detail/"
Task: "Implement DetailFacts.tsx in frontend/src/entities/catalog/ui/detail/"
Task: "Implement DetailOverview.tsx in frontend/src/entities/catalog/ui/detail/"
```

## Parallel Example: User Story 3

```bash
# Independent model and component tests, then independent leaf components:
Task: "Add seasonAddress.test.ts in frontend/src/features/select-season/model/"
Task: "Add SeasonSelector.test.tsx and EpisodeList.test.tsx"
Task: "Implement SeasonSelector.tsx in frontend/src/features/select-season/ui/"
Task: "Implement EpisodeList.tsx in frontend/src/entities/catalog/ui/detail/"
```

## Parallel Example: User Story 7

```bash
Task: "Add TitleDetailPage.a11y.test.tsx"
Task: "Add TitleDetailPage.responsive.test.tsx"
Task: "Add TitleDetailPage.keyboard.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational — the backend boundary, API, frontend queries, i18n, and shared primitives.
3. Complete Phase 3: US1 core detail page.
4. **STOP and VALIDATE**: run US1's independent tests and confirm catalog/search/direct/reload/return behavior.
5. Ship the MVP increment if ready.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → MVP: complete identity, facts, overview, return, direct open.
3. US2 → omission and stale trust behavior.
4. US3 → TV seasons and episodes.
5. US4 → cast and crew.
6. US5 → related titles.
7. US6 → capability-gated entry points (production default: none).
8. US7 → responsive, keyboard, screen-reader, zoom, and reduced-motion closure.
9. Polish → ADR, coverage, full quality gates.

### Parallel Team Strategy

1. Team completes Setup and Foundational together (backend and frontend tracks in parallel where file-independent).
2. After US1 lands, US2–US6 can be developed concurrently against the foundational contracts, respecting that US3–US6 each edit `TitleDetailView.tsx` and `TitleDetailPage.tsx` and should merge sequentially at those integration points.
3. US7 closes after all surfaces exist; Polish runs last.

---

## Notes

- [P] tasks touch different files and have no dependency on an incomplete task.
- Every task includes an exact path from `plan.md` or the existing repository structure.
- Provider traffic is always mocked; no test may call TMDB.
- Every omitted field must be omitted, never replaced by `0`, `—`, `-`, `N/A`, `Unknown`, `Untitled`, or an empty section.
- Capability defaults are `DETAIL_CAPABILITIES.trailer = false`; no availability or personal-list control is ever rendered in this feature.
- No database, persistence, new dependency, new top-level route, or second detail destination is introduced.
