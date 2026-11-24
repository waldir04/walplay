# Tasks: Trailers and Video Content

**Input**: Design documents from `/specs/008-trailers-video-content/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included. Principle VIII makes tests mandatory for completion; they are not optional for
this feature. Write each test task before its implementation task and expect it to fail first.

**Organization**: Tasks are grouped by user story so each increment is independently verifiable.
Story labels map to `spec.md` user stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story label for story-phase tasks only
- Every task includes an exact repository-relative file path

## Path Conventions

- Backend: `backend/src/`, `backend/.env.example`
- Frontend: `frontend/src/`, `frontend/.env.example`
- Docs: `docs/`, `specs/`
- No new package, application, route destination, or runtime dependency is introduced.

## Contract constants used throughout

```text
YOUTUBE_VIDEO_ID_PATTERN       = /^[A-Za-z0-9_-]{11}$/
TRAILER_TYPE_ORDER             = trailer, teaser, featurette, clip, behind-the-scenes, bloopers
TRAILER_MAX_VISIBLE            = 6
TRAILER_MAX_INVENTORY          = 24
TRAILER_CACHE_FRESH_TTL_MS     = 24 h
TRAILER_LAST_KNOWN_RETENTION_MS= 7 days
TRAILER_PLAYER_MIN_WIDTH_PX    = 356
TRAILER_PLAYER_LOAD_TIMEOUT_MS = 15000
TRAILER_EMBED_HOST             = www.youtube-nocookie.com
TRAILER_EXTERNAL_HOST          = www.youtube.com
```

---

## Pre-Implementation Gates (completed)

The Product Overview amendment and the feature 004 amendment required by `spec.md` were completed on
2026-11-24. T091 and T092 below are now verification tasks. If either document drifts from this
specification, restore consistency before starting any implementation task.

These amendments do not authorize release: OD-T2 through OD-T11 and the disabled capability flags
remain in force.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration and localization scaffolding. No behavior yet.

- [ ] T001 Add `TRAILERS_ENABLED` (default `false`), `TRAILERS_CACHE_TTL_SECONDS=86400`, `TRAILERS_CACHE_STALE_SECONDS=604800`, `TRAILERS_CACHE_MAX_ENTRIES=500`, `TRAILERS_MAX_INVENTORY=24`, `TRAILERS_EMBED_HOSTS=www.youtube-nocookie.com`, and `TRAILERS_EXTERNAL_HOSTS=www.youtube.com` to the validated config and its tests in `backend/src/config/env.ts` and `backend/src/config/env.test.ts`
- [ ] T002 [P] Document the new backend variables with defaults and release-gate comments in `backend/.env.example`
- [ ] T003 [P] Add validated boolean `VITE_TRAILERS_ENABLED` (default `false`, invalid value warns and disables) to `frontend/src/shared/config/env.ts` and `frontend/src/shared/config/env.test.ts`
- [ ] T004 [P] Document `VITE_TRAILERS_ENABLED=false` in `frontend/.env.example`
- [ ] T005 [P] Resolve `DetailCapabilities.trailer` from `config.trailersEnabled` in `frontend/src/shared/config/detailCapabilities.ts` and add coverage in `frontend/src/shared/config/detailCapabilities.test.ts`
- [ ] T006 [P] Create `frontend/src/shared/config/trailerPlatform.ts` with the factual platform name `YouTube`, terms URL `https://www.youtube.com/t/terms`, privacy URL `https://policies.google.com/privacy`, `TRAILER_PLAYER_MIN_WIDTH_PX = 356`, `TRAILER_PLAYER_LOAD_TIMEOUT_MS = 15000`, and `TRAILER_MAX_VISIBLE = 6`
- [ ] T007 [P] Add the required `detail.trailers` key set from `contracts/i18n-resources.md` to `frontend/src/shared/i18n/resources/en.json` and `es.json` (including `player.reload` only if a per-video retry is implemented), remove legacy `detail.actions.trailer` and `detail.actions.trailerExternal`, and update `frontend/src/shared/i18n/resources/resources.test.ts` and `frontend/src/shared/i18n/detailResources.test.ts` for key parity and no raw keys

**Checkpoint**: Configuration and copy exist; no trailer surface is rendered.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Provider, inventory pipeline, API, and client data layer shared by every story.

**⚠️ CRITICAL**: No user story work begins until this phase completes.

### Backend pipeline

- [ ] T008 Create `backend/src/domain/trailer.ts` with `PromotionalType`, `TrailerVideo` (`id`, `platform`, `platformName`, `videoId`, `title`, `type`, `official`, optional `language`, `publishedAt`, `embedUrl`, `externalUrl`), `TrailerInventory` (`state: 'available' | 'no-videos'`), `TrailerMeta`, `TRAILER_TYPE_ORDER`, `TRAILER_MAX_INVENTORY = 24`, `YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/`, and the total comparator `(type rank, official true first, provider index, id)`
- [ ] T009 Write unit tests for eligibility ordering, official-first ordering, stable ties, and the total comparator in `backend/src/domain/trailer.test.ts`
- [ ] T010 Create strict Zod response schemas for the `available` and `no-videos` envelopes, HTTPS URL validation, ISO date validation, and the exact video field set in `backend/src/domain/trailer.schemas.ts`
- [ ] T011 [P] Add schema rejection tests for unknown keys, non-HTTPS URLs, bad identifiers, and invalid dates in `backend/src/domain/trailer.schemas.test.ts`
- [ ] T012 [P] Define the provider-neutral `TrailerProvider` interface and `ProviderTrailerInventory` types in `backend/src/providers/trailer-provider.ts`
- [ ] T013 [P] Create the TMDB `/videos` Zod DTO in `backend/src/providers/tmdb/tmdb.trailer.schemas.ts` with `id`, `results[]` and nullable `iso_639_1`, `iso_3166_1`, `name`, `key`, `site`, `size`, `type`, `official`, `published_at`, and record `id`
- [ ] T014 [P] Add DTO tests for missing `official`, null `results`, and malformed record fields in `backend/src/providers/tmdb/tmdb.trailer.schemas.test.ts`
- [ ] T015 Implement `backend/src/providers/tmdb/tmdb.trailer.mapper.ts`: keep only `site` = YouTube (case-insensitive), `key` matching `^[A-Za-z0-9_-]{11}$`, mapped eligible type, and non-empty normalized title; drop everything else; map type vocabulary; collapse duplicates by `youtube:<key>` with the documented merge rule; keep official tri-state; keep `language` only when `^[a-z]{2}$` and `Intl.DisplayNames` resolves it; keep `publishedAt` only when valid and not future; build `https://www.youtube-nocookie.com/embed/<key>?autoplay=1&playsinline=1` and `https://www.youtube.com/watch?v=<key>` with host allowlists; cap at 24 after ranking
- [ ] T016 [P] Add mapper eligibility, malformed-record, unknown-type, non-YouTube, and duplicate-merge tests in `backend/src/providers/tmdb/tmdb.trailer.mapper.eligibility.test.ts`
- [ ] T017 [P] Add mapper ranking, official-flag, optional-language/date, URL-shape, host-allowlist, and 24-item cap tests in `backend/src/providers/tmdb/tmdb.trailer.mapper.ranking.test.ts`
- [ ] T018 Implement `backend/src/providers/tmdb/tmdb.trailer.provider.ts` calling the documented `/{mediaType}/{providerId}/videos` operation with no `language` and no `include_video_language`; map 404 to `null`, empty `results` to an empty inventory, and other failures through the existing provider error mapping
- [ ] T019 [P] Create deterministic provider samples in `backend/src/test/fixtures/fakeTrailerProvider.ts`
- [ ] T020 [P] Add provider tests for movie and TV paths, empty inventory, 404, malformed payload, and that the request sends neither a `language` query parameter nor `include_video_language` (FR-102) in `backend/src/providers/tmdb/tmdb.trailer.provider.test.ts`
- [ ] T021 Implement `backend/src/services/trailer.service.ts` with a dedicated cache key `provider + trailers + mediaType + providerId`, 24 h fresh TTL, 7-day retention, `Cache-Control: no-store`-compatible result metadata, `no-videos` for empty results, and the existing stable error codes for timeout, rate limit, malformed, and unavailable
- [ ] T022 [P] Add service tests for available, empty, cache hit, single-flight, and error mapping in `backend/src/services/trailer.service.test.ts`
- [ ] T023 [P] Add controlled-clock tests for stale labeling, 7-day retention expiry, and `CATALOG_UNAVAILABLE` beyond retention in `backend/src/services/trailer.service.stale.test.ts`
- [ ] T024 Implement `backend/src/controllers/trailer.controller.ts` with strict params (`mediaType` `movie|tv`, `itemId` matching the existing pattern), an empty strict query schema, `decodeItemId`, media-type mismatch → `CATALOG_NOT_FOUND`, malformed id → `VALIDATION_ERROR`, and the success envelope; add tests in `backend/src/controllers/trailer.controller.test.ts`
- [ ] T025 Create `backend/src/routes/trailer.routes.ts` mounting `GET /:mediaType/titles/:itemId/videos` and setting `Cache-Control: no-store`
- [ ] T026 [P] Add real-Express route integration tests for available, empty, validation, media-type mismatch, timeout, rate limit, malformed provider response, and `Cache-Control: no-store` in `backend/src/routes/trailer.routes.integration.test.ts`
- [ ] T027 [P] Add envelope contract tests against the frontend schema in `backend/src/routes/trailer.contract.test.ts`
- [ ] T028 Wire optional `trailerService` into `backend/src/app.ts`, require it when `TRAILERS_ENABLED=true`, mount the router under `/api/catalog`, and extend `backend/src/app.test.ts` for enabled, disabled, and misconfigured states
- [ ] T029 Wire the TMDB trailer provider, dedicated `CatalogCache`, and `TrailerService` in `backend/src/server.ts`
- [ ] T030 [P] Add TMDB trailer DTO fixtures covering official, unofficial, absent official, non-YouTube, unknown type, malformed key, duplicate key, mixed language, and future date in `backend/src/test/fixtures/tmdb/trailers.ts`
- [ ] T031 [P] Remove the legacy single-trailer field and detail-time video fetch from `backend/src/domain/detail.ts`, `backend/src/providers/tmdb/tmdb.detail.mapper.ts`, `backend/src/providers/tmdb/tmdb.detail.provider.ts`, and `backend/src/providers/tmdb/tmdb.detail.schemas.ts`; update affected detail tests and `backend/src/test/fixtures/tmdb/detail.ts`
- [ ] T032 [P] Remove the legacy `trailer` field from `frontend/src/entities/catalog/model/titleDetail.ts` and `frontend/src/test/fixtures/detail/index.ts`, remove the legacy external-only trailer rendering from `frontend/src/widgets/title-detail/ui/DetailActions.tsx`, and update affected detail component tests to expect no external-only trailer link

### Frontend data layer

- [ ] T033 Create `frontend/src/entities/catalog/model/trailer.ts` with Zod envelope schemas for both states, the video/model unions, playback mode/session types, and `rankTrailerVideos(videos, language)` using `(type rank, official, language match, server index)`
- [ ] T034 [P] Add model tests for envelope validation, type/official ordering, language refinement, stable ties, and replaying a server-ordered list in `frontend/src/entities/catalog/model/trailer.test.ts`
- [ ] T035 Implement `frontend/src/entities/catalog/api/trailerClient.ts` requesting `/api/catalog/${mediaType}/titles/${itemId}/videos` through the existing HTTP client and schema, with tests in `frontend/src/entities/catalog/api/trailerClient.test.ts`
- [ ] T036 Add `catalogKeys.trailers(mediaType, itemId)` to `frontend/src/entities/catalog/api/catalogKeys.ts` and `useTrailerQuery` to `frontend/src/entities/catalog/api/trailerQueries.ts` with `staleTime` 24 h, `gcTime` 7 days, `retry: false`; add tests in `frontend/src/entities/catalog/api/trailerQueries.test.tsx` and `catalogKeys.test.ts`
- [ ] T037 [P] Create API and UI fixtures for both states in `frontend/src/test/fixtures/trailer/index.ts`
- [ ] T038 Export the trailer model, client, query hook, and key from `frontend/src/entities/catalog/index.ts`

**Checkpoint**: The inventory endpoint, provider pipeline, cache, client, and query work independently of any UI.

---

## Phase 3: User Story 1 — Watch a trailer without leaving the title (Priority: P1) 🎯 MVP

**Goal**: Show the labeled trailer section with the official trailer selected, load one authorized player on explicit activation, and keep the detail page usable.

**Independent Test**: Open controlled movie and TV detail pages with an embeddable trailer; verify the section appears, the expected video is selected first, activation loads exactly one player in the reserved area, playback starts only after activation, and the rest of the page remains usable.

### Tests for User Story 1 (write first, expect failure)

- [ ] T039 [P] [US1] Add activation tests for selected-without-playback, one iframe after activation, replacing the iframe, the loading skeleton exposing `aria-busy` with decorative shapes hidden from assistive technology, one player-readiness announcement on frame `load`, and the caption-availability note (FR-058, FR-082, FR-083) in `frontend/src/widgets/title-detail/ui/TrailerSection.activation.test.tsx`, mocking the measured width at or above 356 px
- [ ] T040 [P] [US1] Add page integration tests for movie and TV routes, section presence, entry anchor visibility, detail-page usability, and `VITE_TRAILERS_ENABLED=false` rendering neither the section nor the entry point (FR-007) in `frontend/src/pages/title-detail/ui/TitleDetailPage.trailer.test.tsx`

### Implementation for User Story 1

- [ ] T041 [US1] Create `frontend/src/features/play-trailer/model/useTrailerPlayback.ts` for selection, explicit activation, one active frame, replacement unmount, transition to `ready` on frame `load`, single readiness announcement, and unmount on component teardown; no timeout yet
- [ ] T042 [US1] Create `frontend/src/features/play-trailer/model/useEmbedWidth.ts` using `ResizeObserver` and exposing `canEmbed` at `TRAILER_PLAYER_MIN_WIDTH_PX = 356`
- [ ] T043 [US1] Create `frontend/src/widgets/title-detail/ui/TrailerSection.tsx` as the labelled region with one localized heading, an `aria-busy` loading skeleton that matches the final layout and hides decorative shapes from assistive technology, and state props from the page
- [ ] T044 [P] [US1] Create `frontend/src/widgets/title-detail/ui/TrailerCover.tsx` with the selected video identity and an accessible play control named for the video; disclosure is added in US5
- [ ] T045 [P] [US1] Create `frontend/src/widgets/title-detail/ui/TrailerPlayer.tsx` with a reserved 16:9 area, a single iframe whose `src` is the server-supplied `embedUrl`, `title` includes video title and platform, `referrerPolicy="strict-origin-when-cross-origin"`, minimal `allow="autoplay; encrypted-media; picture-in-picture"`, and `allowFullScreen`, a frame `load` handler that reports readiness once, and the localized caption-availability note from `detail.trailers.player.captionNote` (FR-083); render no iframe when `canEmbed` is false and no overlay in any state
- [ ] T046 [US1] Create `frontend/src/widgets/title-detail/ui/TrailerList.tsx` and `frontend/src/widgets/title-detail/ui/TrailerItem.tsx` with list semantics, selected-state text, and a play action whose accessible name includes the video title
- [ ] T047 [US1] Wire the inventory query, capability gate, pending/error/ready status, and entry condition (`videos.length > 0`) in `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx`
- [ ] T048 [US1] Add the `trailerEntryPoint` anchor in `frontend/src/widgets/title-detail/ui/DetailActions.tsx`, add the trailer section after actions in `frontend/src/widgets/title-detail/ui/TitleDetailView.tsx`, give the section heading `tabIndex={-1}` and a stable id, and update `frontend/src/widgets/title-detail/ui/DetailActions.test.tsx`
- [ ] T049 [US1] Export `TrailerSection` and its public types from `frontend/src/widgets/title-detail/index.ts` and `frontend/src/features/play-trailer/index.ts`
- [ ] T050 [US1] Verify all US1 copy is wired to `detail.trailers` keys in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx`, `TrailerCover.tsx`, `TrailerItem.tsx`, and `TrailerPlayer.tsx`, with no hardcoded text
- [ ] T051 [US1] Run the US1 tests in `frontend/src/widgets/title-detail/ui/` and `frontend/src/pages/title-detail/ui/` plus `npm --prefix frontend run typecheck`; resolve failures without weakening assertions

**Checkpoint**: US1 is independently demonstrable and testable.

---

## Phase 4: User Story 2 — Understand what each video is and where it will play (Priority: P1)

**Goal**: Each item states its type, provider title, source platform, language, official status when explicitly supplied, and whether it plays in-page or opens an external destination.

**Independent Test**: Present a controlled inventory of trailer, teaser, clip, and featurette; verify type, title, source, language, official presence/absence, and playback mode are visible and accessible text.

### Tests for User Story 2

- [ ] T052 [P] [US2] Add item tests for localized type, provider title, platform name, language label, published date, and embedded/external mode text in `frontend/src/widgets/title-detail/ui/TrailerItem.metadata.test.tsx`
- [ ] T053 [P] [US2] Add tests that no official claim appears for false/absent flags and that a non-interface-language video is labeled but not presented as localized in `frontend/src/widgets/title-detail/ui/TrailerItem.official.test.tsx`

### Implementation for User Story 2

- [ ] T054 [P] [US2] Implement `frontend/src/entities/catalog/model/trailerFormatting.ts` for type-label keys, `Intl.DisplayNames` language labels with an unusable-code fallback, and `Intl.DateTimeFormat` publication dates
- [ ] T055 [US2] Add formatting tests for English/Spanish type labels, valid/invalid language codes, and valid/future dates in `frontend/src/entities/catalog/model/trailerFormatting.test.ts`
- [ ] T056 [US2] Extend `frontend/src/widgets/title-detail/ui/TrailerItem.tsx` with type, platform name, language, publication date, `Official` only when `official === true`, and explicit playback-mode text
- [ ] T057 [US2] Add the canonical external link to `frontend/src/widgets/title-detail/ui/TrailerItem.tsx` and `TrailerCover.tsx` using `externalUrl`, `target="_blank"`, `rel="noopener noreferrer"`, a localized leaving-Walplay notice, and that notice in the accessible name
- [ ] T058 [US2] Add and wire the metadata, mode, and external-link copy keys in `frontend/src/shared/i18n/resources/en.json` and `es.json`; add assertions in `frontend/src/widgets/title-detail/ui/TrailerItem.metadata.test.tsx`

**Checkpoint**: Every listed video is identifiable and its playback mode is unambiguous.

---

## Phase 5: User Story 3 — Choose among the available videos (Priority: P2)

**Goal**: Rank and order videos predictably, select the best usable video by default without playing, let any listed video replace the current playback as one coherent change, and expand the list in place.

**Independent Test**: Present multiple official/unofficial videos in mixed languages and types; verify ranking, default selection, choice replacement, single-player behavior, rapid-choice handling, language-change preservation, and in-place expansion.

### Tests for User Story 3

- [ ] T059 [P] [US3] Add tests for official-first ordering, language refinement within a step, stable ties, and no random reordering in `frontend/src/entities/catalog/model/trailer.ranking.test.ts`
- [ ] T060 [P] [US3] Add component tests for default selection, switching videos, rapid successive choices, language change preserving selection/player, and expansion without a new request in `frontend/src/widgets/title-detail/ui/TrailerSection.selection.test.tsx`

### Implementation for User Story 3

- [ ] T061 [US3] Apply `rankTrailerVideos` in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx` and make the first ranked usable video the default selected item without starting playback
- [ ] T062 [US3] Implement explicit choice in `frontend/src/features/play-trailer/model/useTrailerPlayback.ts`: stop and unmount the current frame, update selection, show the new identity, and start the new video as one change
- [ ] T063 [US3] Implement expansion in `frontend/src/widgets/title-detail/ui/TrailerList.tsx`: show `TRAILER_MAX_VISIBLE = 6`, reveal additional videos already in the response up to the 24-item cap, and never issue a new request
- [ ] T064 [US3] Add a latest-choice guard in `frontend/src/features/play-trailer/model/useTrailerPlayback.ts` so late activations from older choices cannot create or replace a frame
- [ ] T065 [US3] Preserve the current selection and active iframe across an interface-language change in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx` and `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx` while re-ranking labels/order for the next render; keep the iframe element bound to the active video id so the localized `title` update does not remount it
- [ ] T066 [US3] Announce selection and loading once per change through the existing live-region pattern in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx` and `frontend/src/shared/ui/LiveRegion.tsx`, and never announce the default selection as activation

**Checkpoint**: Multiple videos are ordered, selectable, expandable, and robust to rapid interaction and language changes.

---

## Phase 6: User Story 4 — Recover when a video cannot be played (Priority: P2)

**Goal**: Explain playback failures honestly, keep the list usable, and always provide the authorized external option as a recovery path.

**Independent Test**: Force each unavailable condition or a blocked player; verify a localized explanation, the external option, other videos still selectable, no automatic retry, and an unaffected detail page.

### Tests for User Story 4

- [ ] T067 [P] [US4] Add fake-timer tests for the 15 s load timeout, frame unmount, unavailable state, no automatic retry, and the external option remaining adjacent in `loading`, `ready`, and `unavailable` states in `frontend/src/widgets/title-detail/ui/TrailerSection.unavailable.test.tsx`

### Implementation for User Story 4

- [ ] T068 [US4] Add the `TRAILER_PLAYER_LOAD_TIMEOUT_MS = 15000` timer in `frontend/src/features/play-trailer/model/useTrailerPlayback.ts`: on expiry unmount the frame, set `unavailable`, and do not retry automatically
- [ ] T069 [US4] Add the localized unavailable UI in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx` and `TrailerPlayer.tsx` that names the possible causes (owner-disabled embedding, private/deleted, age/sign-in, region, network block) without asserting a cause and without showing raw codes
- [ ] T070 [US4] Implement the `external-only` state when measured width is below 356 CSS px in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx` and `TrailerPlayer.tsx`: state the width reason, render no iframe, and offer the canonical external destination
- [ ] T071 [US4] Render the external option adjacent to the player in `ready`, `loading`, and `unavailable` states in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx`, always available regardless of detected failure, and never preload/prefetch it
- [ ] T072 [US4] Wire the unavailable, external-only, and recovery copy keys and announcements in `frontend/src/shared/i18n/resources/en.json`, `frontend/src/shared/i18n/resources/es.json`, and `frontend/src/widgets/title-detail/ui/TrailerSection.unavailable.test.tsx`

**Checkpoint**: Failure and recovery are honest, localized, and never leave the visitor without an authorized path.

---

## Phase 7: User Story 5 — Use the video section privately and with informed expectations (Priority: P2)

**Goal**: Make zero third-party contact before activation and disclose the platform, third-party loading, terms, and privacy policy adjacent to every activation.

**Independent Test**: In a clean profile, load a detail page and verify zero requests/cookies/storage/preconnect to the video platform; activate and verify the disclosure, links, and one privacy-enhanced player request.

### Tests for User Story 5

- [ ] T073 [P] [US5] Add privacy tests asserting no iframe, no platform resource-loading reference (script/img/font/stylesheet/preconnect/DNS-prefetch/preload/prefetch), and no storage before activation, and exactly one privacy-enhanced frame afterward in `frontend/src/widgets/title-detail/ui/TrailerSection.privacy.test.tsx`

### Implementation for User Story 5

- [ ] T074 [US5] Add the pre-activation disclosure to `frontend/src/widgets/title-detail/ui/TrailerCover.tsx`: platform name, statement that activation loads third-party content, and accessible links to the platform terms and privacy policy from `frontend/src/shared/config/trailerPlatform.ts`
- [ ] T075 [US5] Place the disclosure adjacent to the list and every play action so each activation is preceded by it in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx` and `TrailerCover.tsx`, and keep the cover separate from any loaded player (no overlay)
- [ ] T076 [US5] Audit `frontend/src/widgets/title-detail/ui/TrailerSection.tsx`, `TrailerCover.tsx`, and `TrailerPlayer.tsx` for third-party contact: no platform-hosted imagery, scripts, fonts, styles, preconnect, DNS prefetch, preload, prefetch, cookies, or storage; use title artwork already loaded by detail or a Walplay treatment
- [ ] T077 [US5] Wire disclosure and link copy keys in `frontend/src/shared/i18n/resources/en.json` and `frontend/src/shared/i18n/resources/es.json`, assert the external destination accessible name states the leaving-Walplay warning and the terms/privacy links name the platform and their purpose, and keep the copy free of privacy guarantees

**Checkpoint**: The section satisfies the zero-contact privacy baseline and informed-activation requirement.

---

## Phase 8: User Story 6 — Use trailers on any device and with assistive technology (Priority: P3)

**Goal**: Make the section keyboard operable, screen-reader understandable, responsive at supported widths and 200 % zoom, and respectful of reduced motion.

**Independent Test**: Run keyboard-only, screen-reader, 200 % zoom, and 360/768/1024/1440 px checks across loading, available, playing, unavailable, and external-only states.

### Tests for User Story 6

- [ ] T078 [P] [US6] Add axe checks for available, playing, unavailable, and external-only states in `frontend/src/widgets/title-detail/ui/TrailerSection.a11y.test.tsx`
- [ ] T079 [P] [US6] Add keyboard and focus tests for entry anchor → heading focus, list/play/external/expansion order, focus after player replacement, and no trap in `frontend/src/widgets/title-detail/ui/TrailerSection.keyboard.test.tsx`
- [ ] T080 [P] [US6] Add responsive tests at 360, 768, 1024, and 1440 px and 200 % zoom asserting no horizontal page scroll, no clipped controls, and no iframe below 356 px with external fallback in `frontend/src/widgets/title-detail/ui/TrailerSection.responsive.test.tsx`
- [ ] T081 [P] [US6] Add a reduced-motion test asserting no attention-seeking animation in `frontend/src/widgets/title-detail/ui/TrailerSection.motion.test.tsx`

### Implementation for User Story 6

- [ ] T082 [US6] Implement focus management (entry moves focus to the heading, focus remains visible after player load/replacement), visible focus, 44 px primary targets, and one live announcement per transition in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx`, `TrailerPlayer.tsx`, and `frontend/src/features/play-trailer/model/useTrailerPlayback.ts`
- [ ] T083 [US6] Fix responsive layout, long-title/platform wrapping, cover/list sizing, and the 360 px external fallback in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx`, `TrailerList.tsx`, `TrailerItem.tsx`, and `TrailerCover.tsx`; run US6 tests and `npm --prefix frontend run lint`

**Checkpoint**: The section passes the critical accessibility and responsive journey.

---

## Phase 9: User Story 7 — Understand when no promotional video exists (Priority: P3)

**Goal**: Distinguish loading, no-video, error, and stale states clearly, with the labeled section always present when the capability is enabled.

**Independent Test**: Open titles with empty, malformed, and failed inventories and verify distinct localized states with no dead player or future promise.

### Tests for User Story 7

- [ ] T084 [P] [US7] Add state tests for empty inventory, inventory error, stale cache with last-checked label, retry single-flight, error/no-video distinction, the case where the only eligible video is in a non-interface language (the section stays `available` and does not show the no-video state, SC-018), and axe checks for the no-video and error states in `frontend/src/widgets/title-detail/ui/TrailerSection.states.test.tsx`

### Implementation for User Story 7

- [ ] T085 [US7] Implement the localized no-video state in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx` with no frame, play control, disabled control, spinner, or future-content promise, and do not style or announce it as an error
- [ ] T086 [US7] Implement the localized inline error with retry in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx`, single-flight retry, and no automatic retry
- [ ] T087 [US7] Implement the stale label and last-checked rendering from `meta` in `frontend/src/widgets/title-detail/ui/TrailerSection.tsx` without presenting cached data as current
- [ ] T088 [US7] Complete page status mapping in `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx` for pending, error, ready, stale, and retry so trailer failure never blocks detail, availability, seasons, credits, related, or personal lists
- [ ] T089 [US7] Wire no-video, error, stale, and retry copy keys in `frontend/src/shared/i18n/resources/en.json` and `frontend/src/shared/i18n/resources/es.json` and add assertions in `frontend/src/widgets/title-detail/ui/TrailerSection.states.test.tsx`

**Checkpoint**: Absence, failure, and staleness are intentional, distinct, and localized.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, release gates, coverage, scope, and final validation.

- [ ] T090 [P] Write `docs/adr/0007-trailer-inventory-and-embedded-playback-boundary.md` covering the TMDB inventory boundary, cache, YouTube-only embed, privacy-enhanced host, server-side URL allowlists, 16:9 sizing floor, timeout-only detection, ranking, and release gating
- [ ] T091 [P] Verify that the 2026-11-24 `docs/product-overview.md` amendment still records authorized promotional trailers as a conditional capability distinct from deferred in-app title playback, including the relevant sections and BR/OD references; correct any drift before implementation
- [ ] T092 [P] Verify that `specs/004-entertainment-details/spec.md` FR-065/FR-066 and the affected 004 contract/data-model notes still defer to this specification for trailers; update only the Markdown/contract text, and leave the removed legacy fixture fields to T031/T032
- [ ] T093 Run all ten scenarios in `specs/008-trailers-video-content/quickstart.md` against local services with both flags enabled; record anything blocked by missing credentials or platform availability rather than marking it passed. Include the manual keyboard and screen-reader passes in scenario 6 and do not mark SC-002 or SC-016 passed without the participant validation those criteria require
- [ ] T094 [P] Verify coverage thresholds (80 % global, ~90 % on eligibility, ranking, dedupe, playback-state mapping, player lifecycle, URL authorization, caption statement, and readiness announcement) and zero unexpected warnings by inspecting `backend/coverage/` and `frontend/coverage/` and the two test command outputs
- [ ] T095 [P] Run the scope audit against `backend/src/`, `frontend/src/`, `backend/.env.example`, and `frontend/.env.example`: no new dependency, no download/proxy/scrape/probe/DRM bypass, no stream URL or provider id in logs/responses, only configured hosts, both flags default `false`
- [ ] T096 Run `npm --prefix backend run lint`, `typecheck`, `test`, and `build` in `backend/`; run `npm --prefix frontend run lint`, `typecheck`, `test`, and `build` in `frontend/`; resolve every failure without suppression
- [ ] T097 [P] Trace every FR-001–FR-106 and SC-001–SC-019 to at least one task or test and record the mapping in `specs/008-trailers-video-content/tasks.md` or the Pull Request description; record any unmapped requirement as a blocker rather than silently passing
- [ ] T098 Re-read `specs/008-trailers-video-content/plan.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md` against the implementation diff for drift; correct documentation or code so the artifacts describe what shipped

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; blocks every user story.
- **US1 (Phase 3)**: Depends on Foundational; MVP.
- **US2 (Phase 4)**: Depends on US1 section/list/item components.
- **US3 (Phase 5)**: Depends on US1 playback hook/list; benefits from US2 labels.
- **US4 (Phase 6)**: Depends on US1 player and US2 external link.
- **US5 (Phase 7)**: Depends on US1 cover/section.
- **US6 (Phase 8)**: Depends on US1, US4 (unavailable/external-only), and US2/US3 content.
- **US7 (Phase 9)**: Depends on US1 section and US3 selection; adds the remaining states.
- **Polish (Phase 10)**: Depends on all desired stories.

### Within Each Story

- Tests first; expect failure before implementation.
- Models/formatting before components.
- Hook/state before composition.
- Page wiring after section components.
- Verify the story checkpoint before the next story.

### Parallel Opportunities

- Setup tasks T002–T007 are independent.
- Foundational schema/DTO/parser test tasks T011, T013, T014, T019, T030, T031, T032 can run alongside the pipeline.
- US1 tests T039/T040 are parallel; cover T044 and player T045 are parallel.
- US2 tests T052/T053 and formatting T054 are parallel.
- US3 tests T059/T060 are parallel.
- US5 privacy test T073 can run alongside disclosure T074.
- US6 tests T078–T081 are four independent files.
- Polish docs T090–T092 are independent.

---

## Parallel Example: User Story 1

```bash
# Write the failing tests together:
Task: "Activation tests in frontend/src/widgets/title-detail/ui/TrailerSection.activation.test.tsx"
Task: "Movie/TV page tests in frontend/src/pages/title-detail/ui/TitleDetailPage.trailer.test.tsx"

# Then build the independent presentation pieces together:
Task: "Cover in frontend/src/widgets/title-detail/ui/TrailerCover.tsx"
Task: "Player in frontend/src/widgets/title-detail/ui/TrailerPlayer.tsx"
```

## Parallel Example: User Story 6

```bash
Task: "Axe checks in TrailerSection.a11y.test.tsx"
Task: "Keyboard/focus checks in TrailerSection.keyboard.test.tsx"
Task: "Responsive/zoom checks in TrailerSection.responsive.test.tsx"
Task: "Reduced-motion checks in TrailerSection.motion.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phases 1–2.
2. Complete Phase 3 (US1).
3. Stop and validate US1 independently: section, default selection, one player, no playback on load, detail page unaffected.
4. Do not enable production flags; the release gates still apply.

### Incremental Delivery

1. US1 → core trailer playback.
2. US2 → trustworthy identity and playback-mode text.
3. US3 → ordering, selection, expansion, rapid-choice safety.
4. US4 → honest failure handling and recovery.
5. US5 → privacy baseline and disclosure.
6. US6 → accessibility and responsive completion.
7. US7 → empty, error, and stale states.
8. Polish → ADR, product documents, coverage, scope, final quality gates.

### Release Gate

Do not enable `TRAILERS_ENABLED` or `VITE_TRAILERS_ENABLED` in a shared or production environment until
the Product Overview amendment, the feature-004 amendment, and OD-T2 through OD-T11 are resolved. The
task list implements and verifies the capability behind disabled flags; it does not authorize release.

## Notes

- `[P]` tasks touch different files and have no dependency on an incomplete task.
- Each user story is independently verifiable at its checkpoint.
- No task introduces hosting, downloading, proxying, stream extraction, DRM/region bypass, a player
  SDK, a per-video route, playback telemetry, or a new dependency.
- Commits are not part of this task list and require explicit user authorization.
