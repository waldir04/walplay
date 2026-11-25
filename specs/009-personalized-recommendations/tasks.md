---

description: "Task list for Personalized Recommendations (guest baseline)"
---

# Tasks: Personalized Recommendations — Guest Baseline

**Input**: Design documents from `specs/009-personalized-recommendations/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required. The plan, quickstart, and constitution (Principle VIII) mandate automated coverage; no test may perform a real network request.

**Scope gate**: Only the initial-release rows of plan.md "Scope Decision" are eligible. The area ships dark
behind `VITE_RECOMMENDATIONS_ENABLED=false`. The in-place Movies / TV shows scope is component state only
(FR-153/FR-154) and is not a recommendation preference; its product/design confirmation is RV-17.
Account-scope seed personalization, dismissals, rotation, personalization toggle, reset, account prompts,
the provider recommendation/similar endpoint, and any guest preference store are **not tasks** (see
"Deferred Scope" below).

**Organization**: Tasks are grouped by the implemented user stories in priority order. User Story 2 is the
MVP. User Story 1 and User Story 3 are deferred by the approved plan and have no implementation tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: `US2`, `US4`, `US5`, `US6` (implemented stories only)
- Every task names the exact file path it changes or creates

## Path Conventions

Web application in the existing repository: `frontend/src/` (initial release), `frontend/vitest.config.ts`,
`frontend/.env.example`. No backend path is eligible.

## Deferred Scope (no tasks generated)

These rows stay deferred until their recorded gates are resolved. They MUST NOT be implemented from this
task list.

- **User Story 1 (P1) — "Get suggestions based on titles I saved"**: requires an approved account scope
  (OD-07), provider-terms approval for recommendation/similar lists (RV-01), privacy/consent approval for
  saved-title use (RV-02), the post-MVP product decision (OD-11 + `docs/product-overview.md` Sections
  5/6/11), and the feature 001 home contract update (RV-04).
- **User Story 3 (P2) — "Understand and control why I see a recommendation"**: seed reasons, first-use
  disclosure, dismissals, personalization toggle, and reset are account-scope controls; guest scope has
  none in the initial release (FR-088, FR-121, FR-124, FR-125, FR-133).
- **Deferred design only**: `backend/src/**` recommendation endpoint, `entities/catalog/**` recommendation
  client/model, `widgets/recommendation-area/model/{seedSelection,sectionCandidates,useRecommendationPreferences}.ts`
  from plan.md's "Deferred design" tree.
- **Prohibited guest additions**: guest recommendation preferences, guest dismissals, guest rotation, guest
  seed-based personalization, and any transmission of guest saved data (FR-076–FR-078, FR-131, FR-133). The
  local read-only exclusion of already-saved titles is permitted (FR-028/FR-077) and is tested by T012/T034.
- **US4 acceptance scenario 2 (partial failure)**: requires at least two sections. The initial guest
  baseline has one fallback section, so the area-level error applies (FR-091/FR-092); per-section partial
  failure is deferred with the account-scope personalized sections.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Make the capability flag dark by default and keep the test environment hermetic.

- [ ] T001 [P] Document the new capability flag in `frontend/.env.example` as `VITE_RECOMMENDATIONS_ENABLED=false` with a comment that it is a validated optional flag, defaults to `false`, and must be enabled only with the product/documentation release gates; do not add backend variables.
- [ ] T002 [P] Update `frontend/vitest.config.ts` to add `VITE_RECOMMENDATIONS_ENABLED: 'false'` to the hermetic `test.env` block and add per-path coverage thresholds (`statements/branches/functions/lines: 90`) for `src/widgets/recommendation-area/model/*` (the existing `src/shared/config/env.ts` threshold already covers the flag parser).

**Checkpoint**: Flag is off by default in local examples and tests; no capability request can occur by default.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Validated config flag and localized copy that every implemented story consumes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Add `recommendationsEnabled: boolean` to `AppConfig` in `frontend/src/shared/config/env.ts`; parse `VITE_RECOMMENDATIONS_ENABLED` with the same trim/lowercase boolean rules as `VITE_AVAILABILITY_ENABLED`/`VITE_TRAILERS_ENABLED`, default `false`, and add a warning constant stating the value is invalid and recommendations are disabled (contracts/area.md "Flag contract").
- [ ] T004 Extend `frontend/src/shared/config/env.test.ts` to cover `VITE_RECOMMENDATIONS_ENABLED`: absent/empty/`false` → `false` and no warning; `' true '` → `true`; invalid value → `false` plus a warning containing `VITE_RECOMMENDATIONS_ENABLED`; valid config object remains frozen.
- [ ] T005 [P] Add the complete `recommendations` namespace to `frontend/src/shared/i18n/resources/en.json` using the exact English key/value table in `contracts/i18n-resources.md` (area, explanation, section, states, actions, announcements); use `{{mediaType}}` and `{{date}}` interpolation only as specified.
- [ ] T006 [P] Add the same `recommendations` namespace to `frontend/src/shared/i18n/resources/es.json` with the exact Spanish values from `contracts/i18n-resources.md`, including `{{mediaType}}`/`{{date}}` placeholders and no English fallbacks.
- [ ] T007 Add `frontend/src/shared/i18n/recommendationResources.test.ts` asserting the `recommendations.*` leaf keys are identical in `en.json` and `es.json`, every value is non-empty, the prohibited phrases/equivalents are absent (`for you`, `recommended for you`, `picked for you`, `because you watched`, `matches your taste`, `para ti`, `recomendado para ti`, `porque viste`), and `explanation.noAi`, `explanation.savedTitles`, `explanation.scope`, and `explanation.retention` state their required facts.

**Checkpoint**: The flag parses and defaults off; both locales have complete, truthful copy.

---

## Phase 3: User Story 2 — Discover something when Walplay has no personal signal yet (Priority: P1) 🎯 MVP

**Goal**: A guest visiting Home sees one honest, labelled provider-popularity section or a truthful empty
state, with a Movies/TV shows scope, working navigation, attribution, and an always-reachable explanation.

**Independent Test**: With `VITE_RECOMMENDATIONS_ENABLED=true` and a mocked catalog popular response, open
Home: verify one section headed "Popular now" with the "not personalized" basis, up to 12 provider-ordered
cards linking to existing detail routes, one media scope at a time, Browse/Search actions on empty, provider
attribution, and the explanation panel. With the flag off, verify no area, no request, and the existing Home
content unchanged.

### Tests for User Story 2

> Write these tests first; they must fail before the implementation tasks below.

- [ ] T008 [P] [US2] Create `frontend/src/widgets/recommendation-area/model/fallbackCandidates.test.ts` covering: provider order preserved after exclusions; saved identity excluded; duplicate identity dropped once; cap stops at 12 without backfill or padding; unsupported/adult/missing-name/missing-identity candidates defensively dropped; empty input → `[]`; all items excluded → `[]`; identical inputs produce identical output.
- [ ] T009 [P] [US2] Create `frontend/src/widgets/recommendation-area/model/recommendationState.test.ts` covering: pending → `loading`; success with eligible items → `ready` with `basis: 'provider-popularity'`, `mediaScope`, and `items`; zero raw items → `empty/no-provider-items`; items but zero eligible → `empty/all-excluded`; error code mapping `CATALOG_RATE_LIMITED` → `rate-limited`, `CATALOG_TIMEOUT` → `timed-out`, and `CATALOG_UNAVAILABLE`/`CATALOG_INVALID_RESPONSE`/`INTERNAL_ERROR`/`CATALOG_NOT_FOUND` → `unavailable`; `meta.stale` and `meta.lastUpdatedAt` carried only on `ready`.
- [ ] T010 [P] [US2] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.test.tsx` for the ready and empty baseline: area is a labelled region with one `h2`; section is an `h3` with accessible name `Popular now, {mediaType}`; exactly one provider list rendered; at most 12 cards in provider order; card accessible names include title, type, and release year when present (FR-103); cards link to `/browse/movies/title/:id` or `/browse/tv-shows/title/:id`, and browser back re-renders Home with the area usable (a media-scope reset is acceptable) (FR-101, FR-102); the official provider mark and non-endorsement statement are visible (FR-138); no `for you`/`recommended for you`/`because you watched`/match score/availability claim text; `home.title` and `home.browse.action` still present; empty state uses `role="status"` and Browse (`/browse`) plus Search (`/search`) links.
- [ ] T011 [P] [US2] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.mediaScope.test.tsx` asserting: default scope is `movie`; selecting TV shows requests only the `tv` popular list and replaces the movie list (never merges/interleaves); each scope uses `page=1`; switching language refetches the active scope without switching media scope; scope choice is component state and resets to Movies on remount.
- [ ] T012 [US2] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.exclusions.test.tsx` asserting: a title in the watchlist or favorites is not rendered and remains absent from the request; removing it from the saved collection may make it eligible on a later render; saved exclusion does not change saved counts or membership; exclusions never trigger page 2 backfill.

### Implementation for User Story 2

- [ ] T013 [P] [US2] Create `frontend/src/widgets/recommendation-area/model/constants.ts` exporting frozen values exactly as `data-model.md` "Constants": `RECOMMENDATION_MAX_ITEMS = 12`, `RECOMMENDATION_DEFAULT_MEDIA_TYPE = 'movie'`, `RECOMMENDATION_MEDIA_TYPES = ['movie', 'tv']`, `RECOMMENDATION_FALLBACK_SECTION = 'popular'`, `RECOMMENDATION_FALLBACK_PAGE = 1`, `RECOMMENDATION_SECTION_BASIS = 'provider-popularity'`, and the frozen state→copy-key map for every `recommendations.states.*` entry; export the `RecommendationMediaScope`, `RecommendationItemView`, `RecommendationSectionState`, and `RecommendationAreaView` types from `data-model.md`.
- [ ] T014 [US2] Create `frontend/src/widgets/recommendation-area/model/fallbackCandidates.ts` with the pure arrow function `selectFallbackCandidates(items, input, cap)` implementing `data-model.md`: iterate in provider order; drop the seed (not applicable), saved identities (`${mediaType}:${itemId}`), dismissed identities (always empty), duplicates, adult-flagged, unsupported content types, and items missing a usable identity or displayable name; stop at `cap`; never re-sort, backfill, pad, or fabricate.
- [ ] T015 [US2] Create `frontend/src/widgets/recommendation-area/model/recommendationState.ts` with pure arrow functions mapping TanStack Query state + `meta` to `RecommendationSectionState`, using the existing `stateForError` classification (`frontend/src/entities/catalog/model/catalogError.ts`) and the `empty` cause split (`no-provider-items` vs `all-excluded`); map `stateForError`'s `rate-limited` and `timed-out` to the matching causes and fold `unavailable` plus `not-found` (for example `CATALOG_NOT_FOUND`) into the `unavailable` cause; `stale`/`lastUpdatedAt` only on `ready`.
- [ ] T016 [US2] Create `frontend/src/widgets/recommendation-area/model/recommendationView.ts` with a pure arrow function `deriveRecommendationAreaView({ mediaScope, savedIdentities, queryState })` that composes T014/T015 into `RecommendationAreaView`, including the fixed `scope: 'guest'` and explanation flags; it performs no fetching, storage, or side effects. Data-fetching wiring using the existing entity hooks (`useSectionPreviewQuery`, `useSavedLibrary`) belongs in T020, matching the existing `catalog-section-preview` widget pattern.
- [ ] T017 [P] [US2] Create `frontend/src/widgets/recommendation-area/ui/RecommendationMediaScope.tsx`: a labelled group of two native buttons (`aria-pressed`) using `recommendations.section.mediaScope.label`, `.movie`, `.tv`; the button name includes the media type it selects; keyboard and touch operable with visible focus; no hover-only behavior; no persistence.
- [ ] T018 [P] [US2] Create `frontend/src/widgets/recommendation-area/ui/RecommendationExplanation.tsx`: a native `<details>`/`<summary>` using `recommendations.explanation.summary`, rendering `basis`, `savedTitles`, `noAi`, `scope`, `retention`, and `controls` copy; always rendered in the area header, reachable during loading/empty/error, keyboard operable, no dialog/focus trap, no hover-only access, no raw keys.
- [ ] T019 [US2] Create `frontend/src/widgets/recommendation-area/ui/RecommendationSection.tsx` rendering the `ready` and `empty` states: `<section>` with an `h3` heading using `recommendations.section.popular.heading`, accessible name `recommendations.section.accessibleName` interpolated with the localized media type, basis sub-label `recommendations.section.popular.basis`, `CatalogGrid` labelled with `recommendations.section.listLabel`, one `<li>` + reused `CatalogCard` per item (no new card system), and the `role="status"` empty panel with `empty.noProvider` / `empty.allExcluded` copy and working Browse (`/browse`) and Search (`/search`) links. Do not render personalization language, match scores, availability claims, or "Watch now"/"Play".
- [ ] T020 [US2] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.tsx` composing the area: gate on `getAppConfig().recommendationsEnabled` (render `null` and make no request when false); keep `mediaScope` in `useState` defaulting to `RECOMMENDATION_DEFAULT_MEDIA_TYPE`; resolve language with `resolveInterfaceLanguage(i18n.language)`; call `useSectionPreviewQuery(mediaScope, RECOMMENDATION_FALLBACK_SECTION, language)` (page 1 only); read `useSavedLibrary()` watchlist + favorites and build saved identities with `savedIdentity`; derive the view through T016; expose `retry` as one `refetch()` with `isRetrying` disabling duplicate submissions; perform no storage write and no `useEffect` fetch. Render one `<section aria-labelledby>` with an `h2` (`recommendations.area.heading`) and `recommendations.area.description`; render `RecommendationExplanation`, `RecommendationMediaScope` (above the section it controls), and `RecommendationSection`; render the reused `ProviderAttribution` wherever provider data appears; keep the page's single `h1` untouched and append after existing Home content. Leave `loading`/`error` branches for Phase 4.
- [ ] T021 [US2] Create `frontend/src/widgets/recommendation-area/index.ts` exporting `RecommendationArea` and the public model types/constants needed by `pages/home` (no deep-import leakage of component internals).
- [ ] T022 [US2] Modify `frontend/src/pages/home/ui/HomePage.tsx` to render `<RecommendationArea />` after the existing "Start browsing" section inside the page container; do not add a route, navigation entry, Settings content, provider, or query provider; do not reorder or hide the existing heading, tagline, or Browse entry.
- [ ] T023 [US2] Create `frontend/src/pages/home/ui/HomePage.recommendations.test.tsx` asserting: with the flag off, no recommendation region/attribution/explanation renders and no popular request is issued (mock `getAppConfig`); with the flag on, the area renders after the existing Home content, the page still has exactly one `h1`, and the existing Home assertions in `HomePage.test.tsx` remain valid.

**Checkpoint**: User Story 2 works independently. This is the MVP; stop and validate before Phase 4.

---

## Phase 4: User Story 4 — See an honest state when recommendations cannot load (Priority: P2)

**Goal**: Loading, empty, and failing recommendations are contained, honest, and distinct; Home stays usable.

**Independent Test**: Simulate pending, zero-item, all-excluded, rate-limited, timed-out, unavailable, and
stale provider responses; verify the layout-matching skeleton with an announced busy state, `role="status"`
empty vs `role="alert"` error, a genuine single retry with the button disabled while pending, the localized
stale label with date, and no spinner, raw provider detail, or automatic retry loop. The rest of Home remains
interactive throughout.

### Tests for User Story 4

> Write these tests first; they must fail before the wiring tasks below.

- [ ] T024 [P] [US4] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.loading.test.tsx` asserting: skeleton matches the settled section/card layout, skeleton grid is `aria-hidden`, region has `aria-busy="true"`, `recommendations.states.loading` is exposed to assistive technology, no spinner or bare loading text, no cards are announced, the explanation and media scope remain reachable, and no auto-advance starts.
- [ ] T025 [P] [US4] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.error.test.tsx` asserting: rate-limited, timed-out, and unavailable copy render in a contained `role="alert"` panel with no raw code/identifier/stack trace; retry issues exactly one new request, is disabled while pending, re-enables after success or another failure; Home heading/Browse link and the explanation/scope control stay usable; no automatic retry loop.
- [ ] T026 [P] [US4] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.empty.test.tsx` asserting: `no-provider-items` and `all-excluded` are visually/semantically distinct from error, use `role="status"` (not `alert`), show no fabricated cards, offer working Browse and Search links, and never state or imply that guest saved titles could enable personalization.
- [ ] T027 [P] [US4] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.stale.test.tsx` asserting: a stale `ready` shows `recommendations.states.stale.label` plus `recommendations.states.stale.lastUpdated` with a localized `Intl.DateTimeFormat` date in EN and ES; a non-stale `ready` shows neither; content is never presented as current without the stale label.
- [ ] T028 [P] [US4] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.announcements.test.tsx` asserting: one polite announcement per settled transition (`ready`, `empty`, `error`, stale change), no announcement on initial idle render, and no duplicate announcement for an unchanged result.

### Implementation for User Story 4

- [ ] T029 [P] [US4] Create `frontend/src/widgets/recommendation-area/ui/RecommendationSkeleton.tsx` using the shared `Skeleton` and `CatalogCardSkeleton` to reserve the section heading + grid height, with `aria-hidden="true"` on the decorative grid and no animation beyond the existing reduced-motion-safe skeleton.
- [ ] T030 [US4] Wire the `loading` state in `frontend/src/widgets/recommendation-area/ui/RecommendationArea.tsx`: render `RecommendationSkeleton`, set `aria-busy="true"` on the region, expose `recommendations.states.loading`, keep the explanation and scope control reachable, and do not render cards, attribution, or the empty/error panels while pending.
- [ ] T031 [US4] Wire the `error` state in `frontend/src/widgets/recommendation-area/ui/RecommendationArea.tsx`: render a contained `role="alert"` panel using `states.error.title`/`description` as the default (unavailable) copy and the `rateLimited`/`timedOut` title+description overrides from the copy map, a `Button` labelled `actions.retry` / `actions.retrying`, disabled while `isRetrying`; keep `actions.browse` available; expose no provider detail.
- [ ] T032 [US4] Add the stale treatment to `frontend/src/widgets/recommendation-area/ui/RecommendationSection.tsx`: render `states.stale.label` and `states.stale.lastUpdated` with an `Intl.DateTimeFormat` date based on `meta.lastUpdatedAt` when `stale` is true, using `LANGUAGE_TO_LOCALE` (`en-US`/`es-ES`).
- [ ] T033 [US4] Add single-announcement handling in `frontend/src/widgets/recommendation-area/ui/RecommendationArea.tsx` using the shared `LiveRegion` (`politeness="polite"`) driven by the settled state (ready/empty/error/stale), with no announcement on initial idle render and no announcement for retry pending.

**Checkpoint**: User Stories 2 and 4 both work independently; failures are contained and Home remains usable.

---

## Phase 5: User Story 5 — Keep guest and account recommendation scopes separate (Priority: P3)

**Goal**: Prove the shipped guest baseline uses zero guest saved data for selection, transmits nothing extra,
creates no recommendation preference, and shows no account/personalization affordance.

**Independent Test**: Load Home as a guest with saved titles; inspect the network request, storage, and
rendered controls; verify only the labelled non-personalized fallback appears, no saved identity is
transmitted, no recommendation storage key exists, and collection membership is unchanged.

- [ ] T034 [P] [US5] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.privacy.test.tsx` asserting: the mocked request URL/path contains only media type, `popular`, language, and `page=1`; no saved title, saved identity, dismissal, rotation position, account id, email, token, or session appears in the request; no localStorage/sessionStorage key outside `walplay.saved-library.v1` is written (assert the recommendation widget writes nothing); reading saved titles does not alter watchlist/favorites entries or counts; no backend/provider call is added.
- [ ] T035 [P] [US5] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.scope.test.tsx` asserting: with saved titles present, none is used as a seed or reason; no sign-in, sign-up, account, profile, sync, personalization toggle, dismiss, reset, or rotation control renders; no copy advertises account personalization; the explanation states guest scope and that guest saved titles are not used to seed or choose suggestions; no route, primary-navigation entry, or Settings content is added (assert against `APP_ROUTES`/rendered Home shell where practical).

**Checkpoint**: Guest/account separation is verified by tests; no account or personalization surface ships.

---

## Phase 6: User Story 6 — Use recommendations on any screen, with keyboard, assistive technology, or either language (Priority: P3)

**Goal**: The area is responsive, accessible, keyboard-operable, reduced-motion safe, and fully localized.

**Independent Test**: Check 360, 768, 1024, and 1440 px widths and 200% zoom; complete the journey with
keyboard only and a screen reader; switch EN↔ES; test long titles, missing artwork, and reduced motion.

- [ ] T036 [P] [US6] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.a11y.test.tsx` using `vitest-axe` and keyboard interaction: zero axe violations in loading/ready/empty/error; region and section named; items exposed as a labelled semantic list; every card, scope button, explanation summary, retry, Browse, and Search reachable in logical order with visible focus and no trap; each control names its media type/title where applicable; no hover-only or color-only state; focus stays on the activated scope/retry control and is never stolen on initial load.
- [ ] T037 [P] [US6] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.responsive.test.tsx` following the existing `CatalogGrid.responsive` harness: at 360/768/1024/1440 px and 200% zoom the area has no horizontal page scroll, no clipped basis/control/empty/error copy, cards remain operable, and very long EN/ES titles wrap without losing identity; missing artwork uses `PosterFallback` without layout shift; touch targets meet the contract minimums.
- [ ] T038 [P] [US6] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.locale.test.tsx` asserting: EN and ES render all Walplay-owned headings, basis, explanation, states, actions, and announcements in the selected language; no raw `recommendations.*` key renders; provider title names/years stay as supplied; stale date is localized; switching language keeps the active media scope and does not duplicate the request.
- [ ] T039 [P] [US6] Create `frontend/src/widgets/recommendation-area/ui/RecommendationArea.motion.test.tsx` asserting: with `prefers-reduced-motion: reduce`, no non-essential animation runs; no autoplay, auto-rotation, carousel, infinite scroll, or time-based content change occurs; the area never advances without a visitor action or explicit retry.
- [ ] T040 [US6] Apply the fixes surfaced by T036–T039 in `frontend/src/widgets/recommendation-area/ui/RecommendationArea.tsx`, `RecommendationSection.tsx`, `RecommendationMediaScope.tsx`, `RecommendationExplanation.tsx`, and `RecommendationSkeleton.tsx`: focus-visible rings, min target sizes (24×24, primary 44×44), `min-w-0`/wrapping for long titles, semantic tokens only, reduced-motion-safe styling, and localized accessible names. Do not add dependencies or change the catalog card contract.

**Checkpoint**: All implemented user stories are independently functional and accessible in both languages.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full verification and scope audit before the capability can be considered implementation-complete.

- [ ] T041 Run `npm --prefix frontend run lint`, `npm --prefix frontend run typecheck`, `npm --prefix frontend run test`, `npm --prefix frontend run build`, and `npm --prefix backend run test`; treat any unexpected `console.warn`/`console.error` output as a failure (Principle VIII); fix only failures caused by this feature and keep the backend unchanged.
- [ ] T042 Walk `specs/009-personalized-recommendations/quickstart.md` scenarios 1–10 with the flag on and off (including disabled-by-default, media scope, navigation/back, local exclusion, empty, error/retry, stale, accessibility, localization); record deviations for correction without changing the specification.
- [ ] T043 Scope audit: review the final diff and confirm changes are limited to `frontend/.env.example`, `frontend/vitest.config.ts`, `frontend/src/shared/config/env.{ts,test.ts}`, `frontend/src/shared/i18n/**`, `frontend/src/pages/home/**`, and `frontend/src/widgets/recommendation-area/**`; confirm no backend, route, navigation, Settings, Browse/Search/Saved/detail, availability, trailer, account, dependency, or storage change (SC-025, FR-145–FR-151), including no availability-based filter or field read (SC-028).
- [ ] T044 Documentation consistency check: verify `frontend/.env.example`, `quickstart.md`, `contracts/area.md`, and `contracts/i18n-resources.md` match the implemented flag, file paths, test paths, and copy keys; do not alter release gates, OD-11, or `docs/product-overview.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all implemented stories.
- **US2 (Phase 3)**: Depends on Foundational — MVP and the base of everything else.
- **US4 (Phase 4)**: Depends on US2 (extends `RecommendationArea`/`RecommendationSection` with skeleton, error, stale, announcements).
- **US5 (Phase 5)**: Depends on US2 (verifies the guest baseline privacy/scope, independent of US4).
- **US6 (Phase 6)**: Depends on US4 (a11y/motion cover retry and all settled states); can run alongside US5.
- **Polish (Phase 7)**: Depends on all implemented stories being complete.

### User Story Dependencies

- **US2 (P1)**: No dependency on other stories — independently testable MVP.
- **US4 (P2)**: Builds on US2's area/section but is independently testable via its state tests.
- **US5 (P3)**: Independent of US4; verifies absence rules over the US2 baseline.
- **US6 (P3)**: Independent of US5; needs US4 states to exist for complete keyboard/a11y coverage.

### Within Each Story

- Tests are written first and must fail before the matching implementation task.
- Constants/types → pure selectors/mappers → hook → presentational components → area composition → page composition.
- No story may add an account surface, backend call, route, Settings content, or dependency.

### Deferred Work

- **US1 (P1)** and **US3 (P2)** have zero tasks. They may not start until OD-07, RV-01, RV-02, RV-04, and the
  product promotion (OD-11 + `docs/product-overview.md`) are recorded as resolved.
- **US4 acceptance scenario 2** (one section fails while another succeeds) is deferred with the
  account-scope personalized sections; the single-section guest baseline uses the area-level error.

---

## Parallel Opportunities

- Phase 1: T001 and T002 (different files).
- Phase 2: T005 and T006 (EN/ES files); T007 after both.
- US2 tests: T008, T009, T010, T011 can be written in parallel; T012 after the widget store harness exists.
- US2 UI: T013 (constants) first; T014/T015 model can be parallel; T016 after both; T017 and T018 (independent presentational components) parallel; T019–T022 sequential composition.
- US4 tests: T024–T028 parallel; implementation T029 (skeleton) can start while tests are written; T030–T033 sequential in the shared area/section files.
- US5: T034 and T035 parallel (different files).
- US6: T036–T039 parallel (different files); T040 after all four.
- Polish: T041–T044 are sequential because T042–T044 inspect the final state.

### Parallel Example: US2

```bash
# Tests first (must fail):
Task: "fallbackCandidates tests in frontend/src/widgets/recommendation-area/model/fallbackCandidates.test.ts"
Task: "state mapping tests in frontend/src/widgets/recommendation-area/model/recommendationState.test.ts"
Task: "area ready/empty tests in frontend/src/widgets/recommendation-area/ui/RecommendationArea.test.tsx"
Task: "media scope tests in frontend/src/widgets/recommendation-area/ui/RecommendationArea.mediaScope.test.tsx"

# Then independent presentational components:
Task: "RecommendationMediaScope in frontend/src/widgets/recommendation-area/ui/RecommendationMediaScope.tsx"
Task: "RecommendationExplanation in frontend/src/widgets/recommendation-area/ui/RecommendationExplanation.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 2 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational) — flag parses, copy exists in both locales.
3. Complete Phase 3 (US2).
4. **STOP and VALIDATE**: run the US2 tests and quickstart scenarios 1–5 with the flag on and off.
5. The capability remains dark by default; no release is implied.

### Incremental Delivery

1. Setup + Foundational → safe dark scaffold.
2. US2 → guest fallback, scope, explanation, attribution, navigation (MVP).
3. US4 → honest loading/empty/error/stale states and contained retry.
4. US5 → privacy/scope proof for the guest baseline.
5. US6 → accessibility, responsiveness, localization, reduced motion.
6. Polish → full gates, quickstart, scope audit, documentation consistency.

### Parallel Team Strategy

1. Team completes Setup + Foundational together.
2. After Foundational: US2 is the critical path (one developer) while test design for US2 can be split.
3. After US2: US4 and US5 can proceed in parallel; US6 starts when US4 states exist.
4. Polish is sequential and final.

---

## Notes

- `[P]` marks tasks that touch different files and can proceed concurrently.
- `[US#]` maps every story-phase task to the implemented user story; Setup, Foundational, and Polish carry no story label.
- Every task names an exact file path; no task introduces backend, account, route, Settings, navigation, dependency, or storage scope.
- Tests must not perform real network requests; mock `fetchSectionPage`/query client and `getAppConfig`.
- Do not commit or push unless the user explicitly authorizes it (AGENTS.md, constitution).
- Deferred rows in plan.md are excluded from this list until their recorded gates are resolved.
