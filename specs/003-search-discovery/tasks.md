---

description: "Task list for Search and Discovery implementation"
---

# Tasks: Search and Discovery

**Input**: Design documents from `/specs/003-search-discovery/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required. The plan's Testing Strategy and the constitution's Principle VIII/XVII mandate
colocated Vitest tests, 80% global coverage, 90% coverage on search mapping, identity, cache keys,
and the state machine, and zero unexpected test warnings. Tests are listed before the
implementation they verify.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and
delivered independently. Repository paths are relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story label (US1–US6); present only in user story phases
- Every task names an exact file path

## Path Conventions

Existing web application: `backend/src/` (Express API) and `frontend/src/` (React SPA). Tests are
colocated with their subject as `*.test.ts` / `*.test.tsx`, and route/integration tests live in
`backend/src/routes/` and `frontend/src/app/routing/` or next to the page under test.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Named business constants required by both applications before any search code exists.

- [ ] T001 [P] Add `SEARCH_MIN_QUERY_LENGTH = 2` (non-whitespace characters), `SEARCH_MAX_QUERY_LENGTH = 200` (Unicode code points), and `SEARCH_SETTLE_MS = 350` to `frontend/src/shared/config/constants.ts`
- [ ] T002 [P] Create `backend/src/domain/search.ts` with `SEARCH_QUERY_MIN_NON_WHITESPACE_CHARS = 2`, `SEARCH_QUERY_MAX_CODE_POINTS = 200`, `SEARCH_MAX_REQUEST_PAGE = 1000`, and the provider-neutral `ProviderSearchPage` (`page` positive integer, `items` readonly `CatalogItem[]`, optional non-negative `totalPages`) plus `SearchPageRequest` types

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend search boundary and frontend search data layer that every user story consumes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend domain and provider boundary

- [ ] T003 Write failing tests for query identity in `backend/src/domain/search.test.ts`: trim, preserved internal whitespace, `identity` = trimmed with whitespace runs collapsed to one space and case folded, non-whitespace count, code-point count (astral-plane characters counted once), `empty`/`too-short`/`too-long`/`valid` (2 non-whitespace minimum, 200 code-point maximum), and cache-key component composition (`provider`, `search`, identity, language, page)
- [ ] T004 Implement the query helpers in `backend/src/domain/search.ts` so T003 passes; expose no function that sends `identity` to the provider
- [ ] T005 [P] Create `backend/src/providers/search-provider.ts` with the segregated `SearchProvider` interface: `readonly id: 'tmdb'` and `fetchSearchPage({ query, language, page })` returning `ProviderSearchPage`; no adult, media-type, filter, region, year, genre, or sort parameter
- [ ] T006 Write failing tests for the multi-search DTO in `backend/src/providers/tmdb/tmdb.search.schemas.test.ts`: required `page`, `results` array, optional `total_pages`/`total_results`, item fields `id`, optional `media_type`, `title`/`name`, `original_title`/`original_name`, `release_date`/`first_air_date`, `poster_path`, `adult`, `vote_average`/`vote_count`, `genre_ids`; unknown fields ignored; `popularity` not declared
- [ ] T007 Implement `backend/src/providers/tmdb/tmdb.search.schemas.ts` so T006 passes
- [ ] T008 Write failing mapper tests in `backend/src/providers/tmdb/tmdb.search.mapper.test.ts`: movie and TV items; `adult === true` dropped; non-`movie`/`tv` `media_type` (including `person`) dropped; missing `media_type` dropped; missing/non-positive/non-integer provider ID dropped; neither usable localized nor original title dropped; date → `releaseYear` integer 1888–2100 only for valid `YYYY-MM-DD`; rating only for finite `0..10` with `voteCount > 0` rounded to one decimal; genre IDs resolved by the item's own media-type map with unknown IDs omitted; poster omitted on missing path; opaque ID keeps media type + provider ID (`^[A-Za-z0-9_-]{8,64}$`); duplicate opaque IDs within one page dropped first-occurrence-wins; a page whose items are all dropped maps to a successful empty page; output order equals input order after drops
- [ ] T009 Implement `backend/src/providers/tmdb/tmdb.search.mapper.ts` reusing `resolveTitle`/`extractReleaseYear`/`buildRating`/`encodeItemId` and the existing `PosterResolver`, including within-page first-occurrence dedupe by opaque ID, so T008 passes
- [ ] T010 Write failing adapter tests in `backend/src/providers/tmdb/tmdb.search.provider.test.ts`: exactly `GET /3/search/multi`; parameters limited to `query`, `language`, `page`, `include_adult=false`; no filter/region/year/genre/sort keys; shared `TmdbClient`, `ImageResolver`, and genre resolver; movie and TV genre maps resolved in parallel for the selected language
- [ ] T011 Implement `backend/src/providers/tmdb/tmdb.search.provider.ts` so T010 passes and return `ProviderSearchPage` with optional `totalPages` only
- [ ] T012 [P] Create `backend/src/test/fixtures/fakeSearchProvider.ts` implementing `SearchProvider` with configurable pages, delays, and errors for service and route tests

### Backend service and endpoint

- [ ] T013 Write failing service tests in `backend/src/services/search.service.test.ts`: cache key `tmdb:search:<identity>:<language>:<page>` isolates every result-affecting component; normalized-query reuse; fresh hit `source: cache`; expired entry + provider failure within the stale window serves `stale: true` `source: stale-cache` with the original timestamp; single flight for concurrent identical misses; `data.page` echoes the requested page; `hasMore = totalPages !== undefined && totalPages > page` including an empty page with more pages; absent `totalPages` ends pagination; `totalResults` never present; provider 400/422 → `VALIDATION_ERROR`; timeout → `CATALOG_TIMEOUT`; 429 → `CATALOG_RATE_LIMITED`; network/5xx/auth → `CATALOG_UNAVAILABLE`; invalid JSON/schema → `CATALOG_INVALID_RESPONSE`; the shared catalog `mapProviderError` mapping is unchanged; no query text in errors
- [ ] T014 Implement `backend/src/services/search.service.ts` (`SearchService.getSearchPage`) with a dedicated `CatalogCache` instance, defense-in-depth query/page validation (code-point counting and the named page ceiling), `{ data, meta }` with `data.page` set to the requested page, and `mapProviderError` for all non-HTTP provider failures plus a search-local `ProviderHttpError` 400/422 → `VALIDATION_ERROR` branch that leaves the shared catalog mapper unchanged, so T013 passes
- [ ] T015 Write failing route integration tests in `backend/src/routes/search.routes.integration.test.ts` against the real Express app: `GET /api/search` success envelope and `meta`; `query` required, trimmed, 2 non-whitespace minimum, 200 code-point maximum with astral-plane characters counted once; `language` `en|es`; `page` positive integer default 1 with the named `SEARCH_MAX_REQUEST_PAGE` maximum; unknown query keys rejected; duplicated `query` key rejected; empty/whitespace/too-short/too-long return `VALIDATION_ERROR` without a provider call; `Cache-Control: no-store` on success and errors; exact-origin CORS; no provider payload, credential, provider field name, `totalResults`, or query echo in any response
- [ ] T016 [P] Implement `backend/src/controllers/search.controller.ts` with strict Zod query validation using a code-point refinement (not `.max()` UTF-16 counting) and the named page ceiling, and delegation to `SearchService`, mapping validation failures to the existing error envelope
- [ ] T017 [P] Implement `backend/src/routes/search.routes.ts` mounting `GET /api/search` with `Cache-Control: no-store` for every response
- [ ] T018 Wire the search provider and second cache instance in `backend/src/server.ts`, pass the resulting `SearchService` into `createApp` (an added required option in `backend/src/app.ts` that mounts the search router), and update `backend/src/app.test.ts` for the new dependency; keep catalog wiring unchanged

### Frontend search model and data layer

- [ ] T019 [P] Add the English `search` namespace plus `navigation.search`, `meta.title.search`, and `catalog.actions.returnToSearch` to `frontend/src/shared/i18n/resources/en.json` exactly as specified in `contracts/i18n-resources.md`
- [ ] T020 [P] Add the identical Spanish leaf-key set with the contract's Spanish values to `frontend/src/shared/i18n/resources/es.json`; `frontend/src/shared/i18n/resources/resources.test.ts` must stay green
- [ ] T021 [P] Create `frontend/src/entities/catalog/model/searchQuery.ts` with colocated `searchQuery.test.ts`: `raw`/`trimmed`/`identity`/`nonWhitespaceLength`/`length`/`validity` discriminated union backed by a Zod validity schema/refinement that the form and address parser share (Principle VI); `identity` trims, collapses whitespace runs, and case folds but is never sent to the provider; code-point length counts astral-plane characters once; parse address `q` with first occurrence wins, `+` as space, extra/duplicated parameters ignored; only `valid` enables a request
- [ ] T022 [P] Create `frontend/src/entities/catalog/model/searchPage.ts` with colocated `searchPage.test.ts`: Zod schema for `{ data: { page, items, totalPages?, hasMore }, meta }` reusing `catalogItemSchema` and `catalogResponseMetaSchema`; `totalResults` absent; append-only dedupe by opaque `id` preserving order; `loadedPageHadNoTitles` when the last page had zero valid items and `hasMore`
- [ ] T023 [P] Create `frontend/src/entities/catalog/model/searchState.ts` with colocated `searchState.test.ts` mapping `CATALOG_UNAVAILABLE`/`CATALOG_RATE_LIMITED`/`CATALOG_TIMEOUT`/`CATALOG_INVALID_RESPONSE`/`VALIDATION_ERROR` to `unavailable`/`rate-limited`/`timed-out`/`unavailable`/`query-invalid`, mapping `INTERNAL_ERROR` and any unrecognized client error to `unavailable`, and copy keys for guidance, no-results, stale, interim-empty, end-of-results, and page-error states
- [ ] T024 [P] Extend `frontend/src/entities/catalog/api/catalogClient.ts` with `getSearchPage({ query, language, page })` calling `/api/search` with URI-encoded `query`, `language`, and `page`, validated by the T022 response schema; add `catalogClient.search.test.ts` for path, encoding, and schema rejection
- [ ] T025 [P] Add `catalogKeys.search(identity, language)` = `['catalog', 'search', identity, language]` to `frontend/src/entities/catalog/api/catalogKeys.ts` and cover it in `catalogKeys.test.ts` (identity and language isolation)
- [ ] T026 Create `frontend/src/entities/catalog/api/searchQueries.ts` with `useSearchQuery` (`useInfiniteQuery`) and colocated `searchQueries.test.ts`: page param starts at 1, next page derived from `data.page + 1` only when `hasMore`, key includes identity and language, `enabled` false for invalid queries, `retry: false`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, existing `CATALOG_STALE_TIME_MS`/`CATALOG_GC_TIME_MS`, no placeholder data from another key, and late responses for superseded keys never surfacing in the current render
- [ ] T027 [P] Create reusable frontend fixtures in `frontend/src/test/fixtures/catalog/search.ts` (valid movie/TV page, empty-but-more page, all-invalid page, error responses) for widget, page, and route tests
- [ ] T028 [P] Export the new search model, client method, key factory, and query hook from `frontend/src/entities/catalog/index.ts`; no new entity slice

**Checkpoint**: The API endpoint and the frontend data layer are complete; user story phases can begin.

---

## Phase 3: User Story 1 - Search movies and TV shows from one place (Priority: P1) 🎯 MVP

**Goal**: One Search destination with one labelled input and a unified movie/TV result collection; every result opens the existing detail destination and returns to the same search.

**Independent Test**: Search a term matching both a movie and a TV show; verify both appear in one collection with text type labels; open a result; return with browser back and the detail return action; open and reload a search address directly.

- [ ] T029 [P] [US1] Create `frontend/src/features/search-query/index.ts` and `frontend/src/features/search-query/ui/SearchForm.tsx` as a controlled presentational form: one visible label, hint via `aria-describedby`, `role="search"` with accessible name, submit action, clear action only when a draft exists, accessible names, `autoComplete="off"`, and `autoComplete`/form-history suppression; add `SearchForm.test.tsx`
- [ ] T030 [P] [US1] Create `frontend/src/widgets/search-results/index.ts` and `frontend/src/widgets/search-results/ui/SearchResults.tsx` rendering the unified collection in provider order using `CatalogGrid`/`CatalogCard`, the displayed valid-title count (never a provider total), text media-type labels, and a collection accessible name containing the active query; add `SearchResults.test.tsx`
- [ ] T031 [P] [US1] Create `frontend/src/pages/search/index.ts` and `frontend/src/pages/search/ui/SearchPage.tsx` with exactly one `h1` (`id="page-heading"`, `tabIndex={-1}`), the form, the results surface, initial guidance when no `q` is present, and provider attribution passed as a slot into the results widget; add `SearchPage.direct.test.tsx` (no `q` loads no request; valid direct address activates and submits its query; empty, too-short, and too-long direct addresses show guidance with zero requests)
- [ ] T032 [US1] Register exactly one Search destination in `frontend/src/shared/config/routes.ts` (`PageKind` `'search'`, `/search`, `navigation.search`, `meta.title.search`, exact match with no prefix) and add the lazy importer in `frontend/src/app/routing/routes.tsx`; extend `frontend/src/widgets/app-shell/ui/PrimaryNavigation.test.tsx` to assert Search is current only on `/search` and not on catalog or detail routes, and add a document-title assertion for the search route to `frontend/src/app/routing/usePageTitle.test.tsx`
- [ ] T033 [US1] Add `frontend/src/entities/catalog/ui/CatalogCard.searchOrigin.test.tsx` proving results pass `from` as the full `/search?q=<encoded active query>` path for the active query whose results are displayed (never the input draft) into router state, while catalog origins are unchanged; adjust `CatalogCard` only if the test reveals a gap
- [ ] T034 [P] [US1] Extend `frontend/src/pages/title-detail/ui/detailReturn.ts` to accept only an internal `/search` path whose `q` is syntactically present, returning `isSearch` with the origin; malformed, foreign, or missing origins keep the media-landing fallback; update `detailReturn.test.tsx`
- [ ] T035 [US1] Update `frontend/src/pages/title-detail/ui/TitleDetailPage.tsx` to use `catalog.actions.returnToSearch` when the origin is search, keep the catalog label otherwise, and keep the detail address and Browse current state; add `TitleDetailPage.fromSearch.test.tsx`
- [ ] T036 [US1] Add `frontend/src/app/routing/searchRoutes.integration.test.tsx`: navigation and direct address both render Search inside the shell; results open the existing detail route; browser back, browser forward, and the return action restore the active query and cached results; the selected interface language survives the detail round-trip; direct/reloaded detail from search falls back to the media landing without fabricated search state; catalog-origin detail behavior is unchanged

**Checkpoint**: User Story 1 is functional and independently testable; it is the MVP.

---

## Phase 4: User Story 2 - Type, submit, and clear a search without unnecessary requests (Priority: P1)

**Goal**: Debounced, duplicate-free, immediately submittable input with address `replace` semantics, invalid-length guidance, and clearing.

**Independent Test**: Type without pausing, submit with Enter, resubmit the same query, clear, and try empty/whitespace/one-character/over-long input while asserting request counts, focus, guidance, and history entries.

- [ ] T037 [US2] Write failing tests in `frontend/src/features/search-query/model/useSearchInput.test.ts` with fake timers: 350 ms settling; no request while input changes; at most one request after settling; explicit submit cancels the timer and submits immediately; resubmitting the same identity/language makes no request; empty and `nonWhitespaceLength < 2` and `length > 200` produce zero requests and guidance, not error/no-results; deleting a previously valid query below the minimum cancels the settling timer, supersedes in-flight work, and discards its results; clear removes `q`, cancels pending settling, supersedes in-flight work (late responses are ignored), discards results, and keeps focus; settled queries use history `replace`
- [ ] T038 [US2] Implement `frontend/src/features/search-query/model/useSearchInput.ts` so T037 passes, keeping debounce, URL, and focus logic out of components
- [ ] T039 [US2] Wire `useSearchInput` into `SearchForm`/`SearchPage` (`frontend/src/features/search-query/ui/SearchForm.tsx`, `frontend/src/pages/search/ui/SearchPage.tsx`) and add `frontend/src/pages/search/ui/SearchPage.input.integration.test.tsx` asserting zero requests for intermediate typing, one for the settled identity, one on submit, none on resubmit, none for invalid lengths, and refocus after clear
- [ ] T040 [P] [US2] Add `frontend/src/app/routing/searchHistory.test.tsx`: each settled query adds zero history entries (replace), opening a result adds exactly one, and back returns to the active search rather than an intermediate query
- [ ] T041 [US2] Keep previous results visibly and accessibly identified with the active query while the draft differs, in `frontend/src/widgets/search-results/ui/SearchResults.tsx`; add `SearchResults.settling.test.tsx` covering FR-051 and the transition to the new query's loading state

**Checkpoint**: Input discipline is complete without changing the results contract delivered by US1.

---

## Phase 5: User Story 3 - The newest query always wins (Priority: P1)

**Goal**: No superseded response may change results, counts, pagination, focus, or announcements.

**Independent Test**: Resolve controlled responses in reverse order, change queries and languages rapidly, and verify only the newest selection changes the visible state.

- [ ] T042 [P] [US3] Add `frontend/src/widgets/search-results/ui/SearchResults.race.test.tsx`: search A resolving after B is discarded; a pending load-more page for A arriving after B starts is discarded without appending; A is never presented as B's results; announcements describe only the newest state; fix gating in `SearchResults.tsx` if any assertion fails
- [ ] T043 [P] [US3] Add `frontend/src/pages/search/ui/SearchPage.language.integration.test.tsx`: a language change re-runs the active query in the new language, discards previous-language pages, and leaves no mixed-language final state; fix keying if needed
- [ ] T044 [US3] Add `frontend/src/entities/catalog/api/searchQueries.race.test.ts` verifying one key per identity + language, no cross-key placeholder reuse, prior pages never surfaced for a new key, `retry: false`, no refetch on focus or reconnect, and that superseded responses remain confined to their own keys; adjust `searchQueries.ts` only if the assertions fail

**Checkpoint**: Ordering safety is proven by construction and by tests.

---

## Phase 6: User Story 4 - Load more results without losing context (Priority: P2)

**Goal**: Order-preserving, duplicate-free incremental loading with a busy control, one announcement per append, a safe end state, and an inline later-page retry.

**Independent Test**: Search a multi-page term, load successive pages, load a page containing a duplicate identity, force a later-page failure, and activate load more twice while pending.

- [ ] T045 [US4] Extend `frontend/src/widgets/search-results/ui/SearchResults.tsx` with a load-more action shown only when `hasMore` and not fetching, one request per activation, a busy/disabled state while `isFetchingNextPage`, and appended pages via the T022 dedupe helper; add `SearchResults.loadMore.test.tsx`
- [ ] T046 [US4] Announce the number of newly added titles exactly once per append and never reorder or remove loaded results; extend `SearchResults.loadMore.test.tsx` with order, duplicate-identity, and announcement assertions
- [ ] T047 [US4] Remove load more when `hasMore` is false after at least one item, show and announce the localized end-of-results message, and move focus to the end status only when load more had focus; add `SearchResults.end.test.tsx`
- [ ] T048 [US4] Keep loaded results visible and usable when a later page fails, show an inline localized page-error alert with a retry for that page only, and prevent concurrent duplicate retries; add `SearchResults.pageError.test.tsx`
- [ ] T049 [US4] Add `frontend/src/widgets/search-results/SearchResults.multiPage.integration.test.tsx` covering first page, two appends without duplicates, final page end state, and a failed later page followed by a successful retry

**Checkpoint**: Incremental loading works independently of US5's state distinctions.

---

## Phase 7: User Story 5 - Distinguish no results from failure and recover (Priority: P2)

**Goal**: Honest, distinct, localized loading, no-results, failure, query-invalid, stale, interim-empty, and end states with genuine retries.

**Independent Test**: Force slow, empty, malformed, timed-out, rate-limited, and rejected-query responses for the same query and verify distinct presentation, announcements, retries, and a usable shell.

- [ ] T050 [P] [US5] Add the initial-loading state to `frontend/src/widgets/search-results/ui/SearchResults.tsx` using layout-matching `CatalogCardSkeleton` shapes, `aria-busy`, decorative shapes hidden from assistive technology, and no spinner or bare "Loading"; add `SearchResults.loading.test.tsx`
- [ ] T051 [P] [US5] Add the no-results state for a successful response with zero valid items and `hasMore === false`, echoing the query, offering edit/clear actions, and remaining semantically distinct from an error; add `SearchResults.noResults.test.tsx`; render provider attribution for this provider-derived state
- [ ] T052 [US5] Add the unavailable, rate-limited, timed-out, and invalid-response states from the T023 mapping (`CATALOG_INVALID_RESPONSE` and unrecognized errors render as unavailable): localized title/description, an alert with retry that genuinely re-requests only the failed surface, no raw status/provider detail, concurrent duplicate retries prevented, and repeated failure without a retry loop; when a first-page refresh fails while previously loaded results exist, keep those results, label them cached with the last successful `lastUpdatedAt`, and offer an inline retry instead of a page-level error; a retry for a previous query is no longer presented once the query changes; add `SearchResults.error.test.tsx`
- [ ] T053 [US5] Add the query-invalid state for `VALIDATION_ERROR` (including provider query rejection): editable localized guidance that echoes the query, no retry action, and no automatic repetition; extend `SearchResults.error.test.tsx`
- [ ] T054 [US5] Add the stale state when `meta.stale === true` with items: localized cached label and last-update time via `Intl.DateTimeFormat`, never presented as current; add `SearchResults.stale.test.tsx`
- [ ] T055 [US5] Add the interim-empty state for a loaded page with zero valid items while `hasMore` is true: preserve existing results, state that the page had no titles, keep load more available, and issue no automatic request; add `SearchResults.interimEmpty.test.tsx`
- [ ] T056 [US5] Add `frontend/src/pages/search/ui/SearchPage.states.integration.test.tsx` proving no-results, failure, and query-invalid are three distinct states, retry calls the provider again, the shell/navigation/language switch stay usable during failure, navigation to another destination still works after a failure, the no-results edit action focuses the input, and attribution is present on successful results, no-results, stale, and partial-page surfaces

**Checkpoint**: All search states are honest and independently verifiable.

---

## Phase 8: User Story 6 - Use search on any screen with keyboard or assistive technology (Priority: P3)

**Goal**: WCAG 2.2 AA, single meaningful announcements, focus retention, reduced motion, responsive widths, and bilingual parity.

**Independent Test**: Complete the search-to-detail journey at 360/768/1024/1440 px and 200% zoom, keyboard-only, with a screen reader, with reduced motion, and in both languages.

- [ ] T057 [P] [US6] Add `frontend/src/pages/search/ui/SearchPage.states.a11y.test.tsx` running axe on initial/empty/short/long guidance, loading, success, no-results, error, stale, interim-empty, and end states; fix any critical or serious violations in `SearchResults.tsx`/`SearchPage.tsx`
- [ ] T058 [P] [US6] Add `frontend/src/app/routing/searchKeyboard.test.tsx`: logical tab order, no trap, visible ≥2 px focus ring with offset, focus stays in the input after debounced and submitted searches, append keeps focus on load more, end moves focus to the end status, no essential information or action is hover-only, and minimum target sizes (24×24, primary controls 44×44)
- [ ] T059 [P] [US6] Add `frontend/src/widgets/search-results/ui/SearchResults.announcements.test.tsx` asserting one announcement per change: polite for settling/arrival/append/interim-empty/end/no-results/stale/refresh-failure cached label and assertive for failures, with superseded responses silent
- [ ] T060 [P] [US6] Add `frontend/src/app/routing/searchResponsive.test.tsx` with the same structural contract the catalog uses: responsive grid classes, no fixed or overflowing width utilities, reserved aspect ratios, 44 px primary-control classes, and long Spanish titles retaining full accessible names. jsdom cannot measure scrolling or zoom; the 360/768/1024/1440 px and 200 % zoom visual checks remain in T067.
- [ ] T061 [P] [US6] Add `frontend/src/widgets/search-results/ui/SearchResults.motion.test.tsx`: reduced motion suppresses skeleton animation and no layout-affecting motion occurs
- [ ] T062 [P] [US6] Add `frontend/src/features/switch-language/searchLanguage.integration.test.tsx` and `frontend/src/pages/search/ui/SearchPage.i18n.test.tsx`: all search-owned copy resolves in both locales, the query is interpolated as plain text and never translated, counts use i18next pluralization, and years/ratings/dates use locale-aware `Intl` formatting with tabular numerals

**Checkpoint**: Accessibility, responsive behavior, and localization pass for the whole journey.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T063 [P] Record ADR `docs/adr/0003-search-query-identity-and-origin.md` covering the address-as-source-of-truth, normalized identity vs. provider query, `replace` history semantics, logical cancellation by query-key supersession, the no-background-refetch policy, search-origin return with media-landing fallback, and the rejected per-type merge and separate-entity alternatives referenced in `plan.md`
- [ ] T064 Add per-file 90 % coverage thresholds for `domain/search.ts`, `tmdb.search.mapper.ts`, and `search.service.ts` to `backend/vitest.config.ts`, then verify backend coverage (`npm run test`): ≥80 % global and ≥90 % for those files, including cache-key/pagination logic; add missing behavioral tests, never lower thresholds
- [ ] T065 Add per-file 90 % coverage thresholds for `searchQuery.ts`, the search key factory in `catalogKeys.ts`, and `searchState.ts` to `frontend/vitest.config.ts`, then verify frontend coverage (`npm run test`): ≥80 % global and ≥90 % for those subjects; add missing behavioral tests, never lower thresholds
- [ ] T066 Audit search privacy, security, and scope: no query text, credential, provider payload, provider field name, or `totalResults` in logs, error bodies, or built assets; no analytics, persistence, autocomplete history, or fabricated data; and the SC-015 scope audit finds no discovery filters, availability, watchlists, favorites, accounts, playback, Live TV, or second detail destination; run `npm run build` in both applications and inspect emitted assets
- [ ] T067 Execute `specs/003-search-discovery/quickstart.md` manual scenarios: initial/direct open, request counts while typing, race and language-switch behavior, provider failure/rate-limit injection, keyboard and VoiceOver/NVDA journey, responsive widths and 200 % zoom, and the SC-010 mobile profile check
- [ ] T068 Run the full quality gate in both applications: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, with zero warnings or errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS every user story.
- **US1 (Phase 3)**: Depends on Foundational; MVP.
- **US2 (Phase 4)**: Depends on US1 (form, page, results surface).
- **US3 (Phase 5)**: Depends on US2 (query transitions) and T026/T044 key isolation.
- **US4 (Phase 6)**: Depends on US1; independent of US5 except shared file edits.
- **US5 (Phase 7)**: Depends on US1 and T013/T023 error mapping; T055 also depends on US4's load-more control.
- **US6 (Phase 8)**: Depends on US1–US5 so every state exists to test.
- **Polish (Phase 9)**: Depends on all desired stories being complete.

### Within Each Phase

- Tests are written first and must fail before the corresponding implementation.
- Domain types before mappers; mapper before provider; provider before service; service before controller/router; router wiring before integration tests.
- Backend endpoint (T018) completes before any frontend story integration test can pass.
- Models before client/keys/queries; data layer before UI.
- In `SearchResults.tsx`, order file edits sequentially: T030 → T041 → T045–T048 → T050–T055 → T059. Do not run these in parallel.
- In `SearchPage.tsx`, order edits: T031 → T039 → T043 → T062.

### Parallel Opportunities

- Setup: T001 and T002.
- Foundational independent files: T005, T012, T019, T020, T021, T022, T023, T024, T025, T027 (T003/T006/T008/T010/T013/T015 are test-first gates for their implementation).
- US1: T029, T030, T031 in parallel; T034 in parallel with them; T033 after T030.
- US2: T040 can run alongside T037–T039.
- US3: T042 and T043 in parallel.
- US6: T057–T062 are all parallel after US5.

---

## Parallel Example: User Story 1

```bash
# Different files, no dependency between them:
Task: "Create search-query SearchForm in frontend/src/features/search-query/ui/SearchForm.tsx"
Task: "Create SearchResults success surface in frontend/src/widgets/search-results/ui/SearchResults.tsx"
Task: "Create SearchPage composition in frontend/src/pages/search/ui/SearchPage.tsx"
Task: "Extend detail return resolver in frontend/src/pages/title-detail/ui/detailReturn.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (blocks everything).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run the US1 independent test plus backend route integration tests.
5. Deploy or demo the unified search-to-detail journey.

### Incremental Delivery

1. Setup + Foundational → API and data layer ready.
2. US1 → unified results, route, and detail return (MVP).
3. US2 → request discipline and address semantics.
4. US3 → ordering guarantees under races.
5. US4 → incremental loading.
6. US5 → complete state coverage and recovery.
7. US6 → accessibility, responsiveness, and localization.
8. Polish → ADR, coverage, privacy audit, quickstart, quality gates.

### Notes

- The backend has no persistence; do not add a database, repository, or Prisma layer.
- Do not add dependencies (no debounce, search, or state library) or new environment variables.
- Do not expose `totalResults`, `popularity`, provider totals, or provider field names.
- Commit only after explicit user authorization and after the relevant tests pass.
