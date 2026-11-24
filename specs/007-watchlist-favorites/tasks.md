---
description: "Task list for Watchlist and Favorites"
---

# Tasks: Watchlist and Favorites

**Input**: Design documents from `specs/007-watchlist-favorites/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included. The plan (D13) and Constitution VIII require unit, store, component, integration, accessibility, responsive, and i18n tests, and the repository enforces lint at zero warnings and coverage thresholds.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and demonstrated independently after the foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no incomplete dependency).
- **[Story]**: Maps to the user story in `spec.md`. Setup, Foundational, and Polish tasks have no story label.
- All paths are relative to the repository root.

## Path Conventions

Web app: `frontend/src/` (this feature changes only the frontend), tests colocated as `*.test.ts(x)` and `*.integration.test.tsx` per existing convention.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Slice scaffolding and reusable test fixtures.

- [x] T001 [P] Create the four new slice directories with their public barrels and the saved-library constants module in `frontend/src/entities/saved-library/model/constants.ts` and `frontend/src/entities/saved-library/index.ts`, plus empty barrels `frontend/src/features/toggle-saved-title/index.ts`, `frontend/src/widgets/saved-collection/index.ts`, and `frontend/src/pages/saved/index.ts`. Constants MUST include `SAVED_LIBRARY_STORAGE_KEY = 'walplay.saved-library.v1'`, `SAVED_LIBRARY_STORAGE_VERSION = 1`, `SAVED_COLLECTIONS = ['watchlist', 'favorites']`, `SAVED_BATCH_SIZE = 50`, `SAVED_ROUTE_PREFIX = '/saved'`, and `SAVED_COLLECTION_PATHS` mapping `watchlist → /saved/watchlist` and `favorites → /saved/favorites`.
- [x] T002 [P] Create saved test fixtures in `frontend/src/test/fixtures/saved/index.ts`: `savedEntry(overrides)`, `savedSnapshot(overrides)`, and `savedEnvelope(overrides)` builders using the existing catalog fixture ids (`MOVIE_ID`, `TV_ID`) from `frontend/src/test/fixtures/catalog/index.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain, persistence, store, hooks, capability flag, and localization shared by every story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create the entry and snapshot schemas in `frontend/src/entities/saved-library/model/savedEntry.ts`. Export `SavedEntry`, `SavedSnapshotInput`, `CollectionId`, and `savedEntrySchema`. Constraints: `mediaType` is `'movie' | 'tv'`; `itemId` matches `CATALOG_ITEM_ID_PATTERN` (`^[A-Za-z0-9_-]{8,64}$`); `title` is trimmed and non-empty; `originalTitle` trimmed and non-empty when present; `releaseYear` is an integer `1800..2100`; optional `poster` is `{ url: string (valid URL), urlLarge?: string (valid URL) }`; `savedAt` is an ISO timestamp.
- [x] T004 [P] Write schema and identity tests in `frontend/src/entities/saved-library/model/savedEntry.test.ts`: accept valid movie/TV entries, reject blank titles, reject a malformed `itemId`, accept an entry with an unusable identity as the stored shape (unreadable handling happens on read), normalize an invalid `savedAt` to the fixed sentinel `1970-01-01T00:00:00.000Z`, and ignore unknown fields.
- [x] T005 Implement pure helpers in `frontend/src/entities/saved-library/model/savedEntry.ts`: `savedIdentity(mediaType, itemId)` returning `${mediaType}:${itemId}`, `compareEntries` producing `savedAt` descending then identity ascending, `dedupeEntries` collapsing duplicates to the most recent, and `isUsableSavedIdentity(entry)` using the catalog id pattern.
- [x] T006 Write helper tests in `frontend/src/entities/saved-library/model/savedEntry.test.ts` (same file as T004, new `describe` blocks; run after T004 because both edit the same file): ordering by `savedAt` and identity tie-break, dedupe keeps the newest, and malformed identities are reported unusable.
- [x] T007 Create collection operations in `frontend/src/entities/saved-library/model/savedLibraryOperations.ts`: `addEntry`, `removeEntry`, `toggleEntry`, `clearCollection`, and `clearAll` over a `StoredLibraryEnvelope`, returning the discriminated outcomes from `data-model.md` (`added` | `already-present` | `removed` | `already-absent` | `cleared`). Never duplicate within a collection; never mutate the input.
- [x] T008 [P] Write operation tests in `frontend/src/entities/saved-library/model/savedLibraryOperations.test.ts`: add, duplicate add, remove, absent remove no-op, toggle both directions, cross-collection independence, clear one collection, clear all, unchanged input reference, and idempotent replay.
- [x] T009 Create the envelope and migration module in `frontend/src/entities/saved-library/model/savedLibrary.ts`: `StoredLibraryEnvelope` (`version: 1`, `watchlist`, `favorites`), `emptyLibrary()`, `savedLibraryEnvelopeSchema`, and `migrateLibrary(raw)` returning `{ kind: 'ok', library }`, `{ kind: 'unsupported-version', version }`, or `{ kind: 'corrupt' }`. Preserve newer versions unmodified.
- [x] T010 Create persistence in `frontend/src/entities/saved-library/model/savedLibraryPersistence.ts`: injectable `Storage`-like adapter; `readLibrary` returning `ready` | `empty` | `recovery-required` (`reason: 'corrupt' | 'unsupported-version'`) | `unavailable`; `writeLibrary` returning `written` | `unavailable` | `write-failed` | `verification-failed`; and `resetLibrary` for the confirmed recovery path. Drop structurally invalid entries individually; retain entries with unusable identities as unreadable; never throw to callers.
- [x] T011 [P] Write persistence tests in `frontend/src/entities/saved-library/model/savedLibraryPersistence.test.ts` with a fake storage: absent key, empty envelope, valid envelope, unparseable JSON, schema-invalid envelope, version `2` preserved, version `1` retained after the (currently empty) migration chain, unknown fields tolerated, an invalid `savedAt` normalized to `1970-01-01T00:00:00.000Z`, storage getter throwing, `setItem` throwing, write verification mismatch, per-entry drop, and unreadable identity retention.
- [x] T012 Create the store factory in `frontend/src/entities/saved-library/model/savedLibraryStore.ts`: `createSavedLibraryStore({ storage, eventTarget })` with `getSnapshot`, `subscribe`, `add`, `remove`, `toggle`, `clearCollection`, `clearAll`, `resetUnreadable`, and `lastMutationError`. Mutations MUST read the latest persisted envelope, rebase the delta, write, then notify only on a durable result. Subscribe to `storage` events for the saved key and expose a default browser-backed singleton.
- [x] T013 [P] Write store tests in `frontend/src/entities/saved-library/model/savedLibraryStore.test.ts`: add/remove/toggle/clear, no duplicate, unavailable storage result, write failure keeps prior state, rebase preserves a disjoint entry written between reads, same-tab notification, cross-tab `StorageEvent` reload, unsubscribe on dispose, and reset of unreadable data only after the explicit call.
- [x] T014 Create hooks in `frontend/src/entities/saved-library/api/useSavedLibrary.ts`: `useSavedLibrary()` returning `{ status, watchlist, favorites, counts, mutationError }` and `useSavedCollection(collectionId)` via `useSyncExternalStore`; include collection membership selectors (`isSaved`, `isSavedIn`).
- [x] T015 [P] Write hook tests in `frontend/src/entities/saved-library/api/useSavedLibrary.test.tsx` with an injected store: initial loading then ready, membership updates after add/remove, per-collection counts, and cross-tab refresh reflected in the hook.
- [x] T016 [P] Add every key from `contracts/i18n-resources.md` to `frontend/src/shared/i18n/resources/en.json` and `frontend/src/shared/i18n/resources/es.json`: `navigation.saved`, `meta.title.saved`, and the complete `saved.*` namespace including `_one`/`_other` count pairs. Do not add keys that are absent from the contract.
- [x] T017 Add `personalLists: boolean` to `DetailCapabilities` in `frontend/src/shared/config/detailCapabilities.ts`, set it to `true` in both `DETAIL_CAPABILITIES` and `resolveDetailCapabilities`, and update every capability object literal in `frontend/src/pages/title-detail/ui/*.test.tsx` and `frontend/src/widgets/title-detail/ui/DetailActions.test.tsx` so `frontend` typecheck passes.
- [x] T018 Create `toSavedSnapshot` in `frontend/src/features/toggle-saved-title/model/toSavedSnapshot.ts` converting `CatalogItem` or `TitleDetail` into `SavedSnapshotInput` (title, mediaType, itemId, optional originalTitle/releaseYear/poster), plus its test `frontend/src/features/toggle-saved-title/model/toSavedSnapshot.test.ts`.

**Checkpoint**: Domain, persistence, store, hooks, capability flag, snapshot conversion, and copy are ready. User stories can begin.

---

## Phase 3: User Story 1 — Save a title to the watchlist as a guest (Priority: P1) 🎯 MVP

**Goal**: A guest adds and removes a title from the watchlist on a detail destination, sees honest feedback, cannot create duplicates, and keeps the choice across reloads.

**Independent Test**: Add a movie and a TV show to the watchlist from detail destinations; reload; verify membership text, announcements, duplicate handling, persistence, and that the removal action works.

### Tests for User Story 1

- [x] T019 [P] [US1] Write controller tests in `frontend/src/features/toggle-saved-title/model/useSavedTitleControls.test.tsx`: add, remove, duplicate add message, absent removal message, write failure rollback and error announcement, session-only notice, busy re-entry prevention, and no network access.
- [x] T020 [P] [US1] Write watchlist control tests in `frontend/src/features/toggle-saved-title/ui/SaveToListControls.test.tsx`: watchlist-specific visible label, `aria-pressed`, accessible name includes the title and the watchlist, pending state, visible device-only hint, success and failure live-region messages, and keyboard operability. Favorites-specific control copy is covered by T027.
- [x] T021 [P] [US1] Write `DetailActions` tests in `frontend/src/widgets/title-detail/ui/DetailActions.personalLists.test.tsx`: the watchlist control renders when `personalLists` is true, nothing personal renders when false, and the actions section renders without a trailer.
- [x] T022 [P] [US1] Write page integration tests in `frontend/src/pages/title-detail/ui/TitleDetailPage.personalLists.test.tsx`: watchlist state reflects the stored library, survives a remount/reload, remains usable when availability fails, and never renders for an invalid/not-found title.

### Implementation for User Story 1

- [x] T023 [US1] Implement `useSavedTitleControls` in `frontend/src/features/toggle-saved-title/model/useSavedTitleControls.ts`: collection parameter, membership from `useSavedLibrary`, `toggle` with `pending`, outcome-specific messages, rollback on failure, and one announcement per outcome. Depends on T007–T014.
- [x] T024 [US1] Implement `SaveToListControls` in `frontend/src/features/toggle-saved-title/ui/SaveToListControls.tsx`: collection-specific visible label and accessible name from `saved.actions.*` / `saved.actions.a11y.*`, `aria-pressed`, `aria-busy`, `min-h-11` target, visible `saved.storageNotice.hint`, and a `LiveRegion`. Render only the watchlist control in this story; the component accepts a collection prop. Export from `frontend/src/features/toggle-saved-title/index.ts`.
- [x] T025 [US1] Integrate the watchlist control into `frontend/src/widgets/title-detail/ui/DetailActions.tsx`: render the actions section when a trailer exists or `personalLists` is true, pass the title name and snapshot, and render nothing personal when the capability is false.
- [x] T026 [US1] Update `frontend/src/widgets/title-detail/ui/DetailActions.test.tsx` so the "never renders personal-list controls" assertion becomes a capability-disabled assertion, keep the coming-soon, availability, and playback assertions intact, and audit `frontend/src/pages/title-detail/ui/*.test.tsx` for button or link queries disturbed by the new controls, updating only the affected selectors.

**Checkpoint**: User Story 1 is fully functional and testable on its own.

---

## Phase 4: User Story 2 — Mark favorites as a distinct personal collection (Priority: P1)

**Goal**: Favorites is a second, independent collection with its own detail control, and removing a title from one collection never affects the other.

**Independent Test**: Mark titles as favorites and as watchlist items, verify both controls and independent membership, and verify that removing from one collection leaves the other and its count unchanged.

### Tests for User Story 2

- [x] T027 [P] [US2] Write favorites control tests in `frontend/src/features/toggle-saved-title/ui/SaveToListControls.favorites.test.tsx`: favorites labels and accessible names, favorite add/remove, already-favorite message, and distinct watchlist/favorites copy.
- [x] T028 [P] [US2] Write dual-membership tests in `frontend/src/pages/title-detail/ui/TitleDetailPage.bothCollections.test.tsx`: a title can be in both collections, each control reflects only its own state, and removing from one leaves the other and its stored count unchanged.

### Implementation for User Story 2

- [x] T029 [US2] Render the favorites control alongside the watchlist control in `frontend/src/widgets/title-detail/ui/DetailActions.tsx`, reuse `SaveToListControls` and `useSavedTitleControls`, and confirm independence through T027/T028.

**Checkpoint**: User Stories 1 and 2 work independently and together.

---

## Phase 5: User Story 3 — Review saved titles in dedicated sections (Priority: P2)

**Goal**: One "Saved" navigation entry opens a destination with two addressable collections that show entries most-recently-saved first in batches, with distinct empty, loading, partial, and error states and row actions.

**Independent Test**: Open both collection addresses with empty, populated, and long collections; verify navigation, counts, ordering, batching, empty states, row actions, removal focus, reload restoration, and cross-tab refresh.

### Tests for User Story 3

- [x] T030 [P] [US3] Write path tests in `frontend/src/pages/saved/model/parseSavedCollectionPath.test.ts`: `/saved/watchlist`, `/saved/favorites`, `/saved`, unknown segments, trailing slash, and query strings.
- [x] T031 [P] [US3] Write route tests in `frontend/src/app/routing/savedRoutes.integration.test.tsx`: `/saved` redirects to the watchlist, one "Saved" nav entry is current on both addresses, document title is `meta.title.saved`, direct load works, and an unknown `/saved/*` path shows the not-found route.
- [x] T032 [P] [US3] Write `SavedEntryActions` tests in `frontend/src/features/toggle-saved-title/ui/SavedEntryActions.test.tsx`: remove from current collection, add to the other collection, labels name the target collection, announcements fire once, and a single-entry removal requires no confirmation step (the confirmation applies only to whole-collection deletion).
- [x] T033 [P] [US3] Write list tests in `frontend/src/widgets/saved-collection/ui/SavedEntryList.test.tsx`: 50-entry first batch, 51-entry "Show more", a 200-entry collection that remains operable through batches, range announcement, deterministic order, focus stays on the button, and no numbered pagination.
- [x] T034 [P] [US3] Write card tests in `frontend/src/widgets/saved-collection/ui/SavedEntryCard.test.tsx`: snapshot title/type/year/poster, membership line, removal and other-collection actions, poster failure fallback, and no fabricated fields.
- [x] T035 [P] [US3] Write section tests in `frontend/src/widgets/saved-collection/ui/SavedCollectionSection.test.tsx`: collection-specific heading and count, skeleton busy state, watchlist vs favorites empty copy with a working discovery action, error state distinct from empty, and tab links.
- [x] T036 [P] [US3] Write page tests in `frontend/src/pages/saved/ui/SavedPage.test.tsx` rendering `SavedPage` inside `renderWithProviders` with `initialEntries: ['/saved/watchlist']` and `['/saved/favorites']`: both collections render independently, empty and populated states, entries restored after remount, and membership actions update the view.

### Implementation for User Story 3

- [x] T037 [US3] Implement `parseSavedCollectionPath` in `frontend/src/pages/saved/model/parseSavedCollectionPath.ts` returning `'watchlist' | 'favorites' | null` for exact paths only.
- [x] T038 [US3] Add the `saved` page kind and route metadata in `frontend/src/shared/config/routes.ts`: `PageKind` gains `'saved'`; `APP_ROUTES` gains `/saved` with `kind: 'saved'`, `navigable: true`, `titleKey: 'meta.title.saved'`, `navigationLabelKey: 'navigation.saved'`, `matchPrefix: '/saved/'`, ordered after `search` and before `settings`.
- [x] T039 [US3] Wire routing in `frontend/src/app/routing/routes.tsx`: add `saved: () => import('@/pages/saved')` to `pageImporters`, redirect `saved` to `saved/watchlist`, and add content routes for `saved/watchlist` and `saved/favorites` with the saved title key.
- [x] T040 [US3] Implement `SavedCollectionNav` in `frontend/src/widgets/saved-collection/ui/SavedCollectionNav.tsx`: links to both addresses, `aria-current` on the active collection, localized group label, 44 px targets, and no tablist semantics.
- [x] T041 [US3] Implement `SavedEntryActions` in `frontend/src/features/toggle-saved-title/ui/SavedEntryActions.tsx`: remove from the current collection and toggle the other collection using `useSavedTitleControls`, with collection-specific labels and titles.
- [x] T042 [US3] Implement `SavedEntryCard` in `frontend/src/widgets/saved-collection/ui/SavedEntryCard.tsx` for the snapshot-only path: poster/fallback, title, media type, year when present, saved date, membership line for the other collection, and actions slot; link to `titleDetailPath` only for a usable identity.
- [x] T043 [US3] Implement `SavedEntryList` in `frontend/src/widgets/saved-collection/ui/SavedEntryList.tsx` as a presentational component: semantic list labelled per collection, receives the already-sliced visible entries, `visibleCount`, total count, and `onShowMore` from the page; renders the "Show more" button, range announcement, and focus preservation. It MUST NOT own batching state.
- [x] T044 [US3] Implement `SavedCollectionSkeleton` in `frontend/src/widgets/saved-collection/ui/SavedCollectionSkeleton.tsx`: layout-matching rows, busy state exposed, decorative shapes hidden from assistive technology, no spinner.
- [x] T045 [US3] Implement `SavedCollectionSection` in `frontend/src/widgets/saved-collection/ui/SavedCollectionSection.tsx` composing nav, heading, count, skeleton, empty with discovery action to `/browse/movies`, section error with retry, and the list; expose one `h1` with `tabIndex={-1}`.
- [x] T046 [US3] Implement `frontend/src/pages/saved/ui/SavedPage.tsx` and `frontend/src/pages/saved/index.ts`: derive the collection from the path, read the library hook, own the per-collection `visibleCount` in state (initial `SAVED_BATCH_SIZE`, `+SAVED_BATCH_SIZE` per "Show more", reset on collection change), slice the ordered entries, and pass entries/counts/`onShowMore` down. Export both named and default components. Membership reads must not issue network requests.
- [x] T047 [US3] Implement removal focus management in `frontend/src/widgets/saved-collection/ui/SavedEntryList.tsx`: after a removal, focus the next entry's action or the collection heading when empty, with exactly one announcement.
- [x] T048 [US3] Write and pass the cross-tab test in `frontend/src/pages/saved/ui/SavedPage.crossTab.test.tsx`: a matching `StorageEvent` refreshes the page without reload and loses no entry.
- [x] T049 [US3] Export the widget public API from `frontend/src/widgets/saved-collection/index.ts` and run the story test set to green.

**Checkpoint**: Both collections are reviewable and maintainable from a single Saved destination.

---

## Phase 6: User Story 4 — Handle unavailable or deleted catalog titles (Priority: P2)

**Goal**: Saved entries remain recognizable, honest, and maintainable when catalog details fail, disappear, reappear, or cannot be interpreted.

**Independent Test**: Simulate a timeout, a not-found title, a rename, an unreadable identity, and a restored title; verify markers, retry, actions, and absence of silent deletion.

### Tests for User Story 4

- [x] T050 [P] [US4] Write hydration view tests in `frontend/src/pages/saved/model/savedEntryView.test.ts`: pending → refreshing, success → hydrated, `not-found` → not-in-catalog, other errors → temporarily unavailable, malformed identity → unreadable, and restored → hydrated.
- [x] T051 [P] [US4] Write degraded card tests in `frontend/src/widgets/saved-collection/ui/SavedEntryCard.degraded.test.tsx`: temporarily unavailable with retry, not-in-catalog with removal, unreadable removal-only, renamed title uses current data, and no silent removal.
- [x] T052 [P] [US4] Write page hydration tests in `frontend/src/pages/saved/ui/SavedPage.hydration.test.tsx` (render with `initialEntries: ['/saved/watchlist']`) mocking `fetchItem`: current information replaces the snapshot, deleted title stays counted and removable, non-not-found failure is not called deleted, retry works, membership is unchanged in every case, and only the visible batch is queried.

### Implementation for User Story 4

- [x] T053 [US4] Implement `useSavedEntriesHydration` in `frontend/src/pages/saved/model/useSavedEntriesHydration.ts` using `useQueries` over the page's visible entry slice (never the full collection) and the existing `catalogKeys.item` query options with the active interface language; expose one result per visible identity.
- [x] T054 [US4] Implement `savedEntryView` in `frontend/src/pages/saved/model/savedEntryView.ts` mapping query results and identities to the five entry presentation states defined in `data-model.md`.
- [x] T055 [US4] Extend `SavedEntryCard` in `frontend/src/widgets/saved-collection/ui/SavedEntryCard.tsx` to render refreshing, temporarily unavailable with retry, not-in-catalog, and unreadable states while retaining removal and other-collection actions.
- [x] T056 [US4] Wire hydration results from `frontend/src/pages/saved/ui/SavedPage.tsx` into `frontend/src/widgets/saved-collection/ui/SavedCollectionSection.tsx` and `frontend/src/widgets/saved-collection/ui/SavedEntryList.tsx` so snapshots render first and current data replaces them as it resolves; keep all entry actions independent of query state, and update `frontend/src/pages/saved/ui/SavedPage.test.tsx` and `SavedCollectionSection.test.tsx` to mock the item query so they remain deterministic.

**Checkpoint**: Catalog failure never hides, deletes, or mislabels a saved title.

---

## Phase 7: User Story 5 — Persistence boundaries, data controls, and documentation (Priority: P3)

**Goal**: The guest understands what is stored and where, can delete it, can recover from corrupt data, and the product documents reflect the two-collection decision. No account behavior is implemented.

**Independent Test**: Review the persistent notice and hint, delete one collection/all collections with confirmation, force corrupt and newer-version storage, reset after confirmation, and verify no guest data is transmitted.

### Tests for User Story 5

- [x] T057 [P] [US5] Write notice tests in `frontend/src/widgets/saved-collection/ui/SavedStorageNotice.test.tsx`: persistent in both sections, exact limitation wording, no account or sync advertisement, and text-not-color reliance.
- [x] T058 [P] [US5] Write manage tests in `frontend/src/widgets/saved-collection/ui/SavedCollectionManage.test.tsx`: initial delete action, two-step confirmation, cancel, per-collection and all-collection deletion, announcements, and keyboard operation.
- [x] T059 [P] [US5] Write recovery tests in `frontend/src/pages/saved/ui/SavedPage.recovery.test.tsx` (render with `initialEntries: ['/saved/watchlist']`): corrupt and unsupported-version states, empty state not shown, reload action, reset requires confirmation, and stored bytes are not modified before confirmation.
- [x] T060 [P] [US5] Write the privacy regression test in `frontend/src/entities/saved-library/model/savedLibrary.noNetwork.test.ts` asserting that read, add, remove, toggle, clear, and reset never call `fetch`, that the written envelope contains only `version`, the two collection arrays, and the allowed entry fields, and that no token, account identifier, profile, watched, rating, note, or availability field is written.

### Implementation for User Story 5

- [x] T061 [US5] Implement `SavedStorageNotice` in `frontend/src/widgets/saved-collection/ui/SavedStorageNotice.tsx` using `saved.storageNotice.title` and `saved.storageNotice.description`, and render it persistently in both sections via `SavedCollectionSection`.
- [x] T062 [US5] Implement `SavedCollectionManage` in `frontend/src/widgets/saved-collection/ui/SavedCollectionManage.tsx` with inline two-step confirmation, cancel, and localized outcome messages; integrate it into `SavedCollectionSection` and `SavedPage`.
- [x] T063 [US5] Implement the recovery state in `frontend/src/pages/saved/ui/SavedPage.tsx` and `SavedCollectionSection`: render `saved.recovery.*` for `recovery-required`, provide reload, and call `resetUnreadable` only after the second confirmation.
- [x] T064 [US5] Add device-only hint regression tests to `frontend/src/features/toggle-saved-title/ui/SaveToListControls.test.tsx`: the hint is present before and after a successful save and remains present for a returning guest with existing saved titles, without any persisted dismissal flag.
- [x] T065 [US5] (Completed 2026-11-24 during /speckit.analyze remediation) Update `docs/product-overview.md`: add Favorites as a product capability with this feature as its basis, record the two-collection decision, and record the guest-local resolution of OD-08 and the persistence portion of OD-09. Do not modify any other product decision.
- [x] T066 [US5] (Completed 2026-11-24 during /speckit.analyze remediation) Update `specs/004-entertainment-details/spec.md`: revise OD-D1 and the clause of FR-064 that prohibits a second favorites action or a separate favorites model, leaving the rest of FR-064 intact. Record the supersession reference to this feature.

**Checkpoint**: Persistence is honest and user-controlled, and the documentation no longer contradicts the shipped behavior.

---

## Phase 8: User Story 6 — Use saved titles on any device and with assistive technology (Priority: P3)

**Goal**: Both collections and the detail controls meet WCAG 2.2 AA, the supported viewports and zoom, reduced motion, and complete English/Spanish localization.

**Independent Test**: Keyboard-only and screen-reader passes at 360, 768, 1024, 1440 px and 200% zoom in both languages, including long and non-Latin titles and reduced motion.

### Tests and fixes for User Story 6

- [x] T067 [P] [US6] Write `frontend/src/shared/i18n/savedResources.test.ts` mirroring `detailResources.test.ts`: EN/ES parity, complete `_one`/`_other` pairs, every `saved.*` key referenced by application source, unique collection titles, and distinct watchlist/favorites empty copy.
- [x] T068 [P] [US6] Write Spanish and language-switch tests in `frontend/src/pages/saved/ui/SavedPage.locale.test.tsx` and `frontend/src/features/toggle-saved-title/ui/SaveToListControls.locale.test.tsx`: all owned copy and announcements in Spanish, correct localized plural counts and dates, no raw keys, titles unchanged, and switching language never alters membership, order, or counts.
- [x] T069 [P] [US6] Write axe tests in `frontend/src/pages/saved/ui/SavedPage.a11y.test.tsx` and `frontend/src/features/toggle-saved-title/ui/SaveToListControls.a11y.test.tsx` using `frontend/src/test/axe.ts`; fix any violations in the new components.
- [x] T070 [P] [US6] Write keyboard, focus, and announcement tests in `frontend/src/pages/saved/ui/SavedPage.keyboard.test.tsx`: logical order, visible focus, no trap, single announcements for save/remove/clear/show-more, and focus after removal.
- [x] T071 [P] [US6] Write responsive tests in `frontend/src/pages/saved/ui/SavedPage.responsive.test.tsx` following the existing `catalogResponsive` pattern: 360/768/1024/1440 class contracts, no fixed widths or horizontal overflow, 200% zoom expectations, and 24/44 px targets.
- [x] T072 [P] [US6] Write long-title and non-Latin tests in `frontend/src/widgets/saved-collection/ui/SavedEntryCard.longTitle.test.tsx`: full title available to assistive technology, no clipping that hides identity, controls remain usable.
- [x] T073 [US6] Verify reduced-motion behavior in `frontend/src/widgets/saved-collection/ui/SavedCollectionSkeleton.motion.test.tsx`: no attention-seeking animation, skeleton respects the preference, and no layout shift is introduced.
- [x] T074 [US6] Fix all issues found by T067–T073 across `frontend/src/features/toggle-saved-title/**`, `frontend/src/widgets/saved-collection/**`, and `frontend/src/pages/saved/**`, keeping copy and tokens within the approved contracts.

**Checkpoint**: The feature is accessible, responsive, and fully localized in both supported languages.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Repository-level gates and scope verification.

- [x] T075 [P] Add per-path coverage thresholds of 90% for `src/entities/saved-library/model/*`, `src/entities/saved-library/api/*`, and `src/features/toggle-saved-title/model/*` in `frontend/vitest.config.ts`, preserving the existing global and per-file thresholds.
- [x] T076 [P] Update shell and navigation assertions affected by the new Saved link in `frontend/src/app/routing/routes.integration.test.tsx` and `frontend/src/app/routing/a11y.test.tsx` only where link enumeration or navigation order is asserted.
- [x] T077 Remove dead code and unused exports from `frontend/src/entities/saved-library/**`, `frontend/src/features/toggle-saved-title/**`, `frontend/src/widgets/saved-collection/**`, and `frontend/src/pages/saved/**`; confirm there is no direct `localStorage` access outside `entities/saved-library`, no duplicate collection logic, and no scope beyond the spec.
- [x] T078 Add the scope audit test in `frontend/src/pages/saved/ui/SavedPage.scope.test.tsx`: exactly two collections with no user-created lists, no save control on catalog or search cards, no availability content in saved sections, zero accounts/sign-in, social or share surfaces, notifications, recommendations, watched status, ratings, notes, subscription or playback controls, and no account, sync, availability, or playback promise in copy.
- [x] T079 Run the `frontend/package.json` quality gates (`npm --prefix frontend run lint`, `run typecheck`, `run test`, `run build`); fix all failures and warnings in the new `frontend/src` slices without changing agreed behavior.
- [ ] T080 Execute the manual scenarios in `specs/007-watchlist-favorites/quickstart.md` (persistence, duplicates, batches, degraded/deleted titles, cross-tab, recovery, manage, a11y/localization) and record any deviation in `specs/007-watchlist-favorites/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup and blocks every user story.
- **User Stories (Phases 3–8)**: All depend on Foundational.
  - US1 and US3 can start in parallel after Foundational.
  - US2 depends on US1's `SaveToListControls` (T024) and `DetailActions` integration (T025).
  - US4 depends on US3's page, list, and card (T042–T046).
  - US5 depends on US3's section (T045) for notice/manage/recovery placement, and on US1's controls (T024) for the re-render hint check.
  - US6 depends on US1–US5 being functionally complete.
- **Polish (Phase 9)**: Depends on all implemented stories.

### Within Each Story

- Write the story's tests first and confirm they fail for the right reason.
- Model and pure logic before UI; UI before route or page wiring; wiring before integration tests.
- Keep every task limited to the listed files to avoid merge conflicts.

### Parallel Opportunities

- Setup: T001 and T002.
- Foundational: test tasks T004, T008, T011, T013, T015, and T016 can run in parallel with the corresponding implementation once their target type exists. T006 shares `savedEntry.test.ts` with T004 and MUST run after it. T017 and T018 are independent of the persistence chain.
- US1: T019–T022 in parallel, then T023 → T024 → T025 → T026.
- US2: T027 and T028 in parallel, then T029.
- US3: T030–T036 in parallel; then T037 → T038 → T039 → T040–T045, followed by T046–T049.
- US4: T050–T052 in parallel, then T053 → T054 → T055 → T056.
- US5: T057–T060 in parallel, then T061–T064. T065 and T066 are already complete.
- US6: T067–T072 in parallel, then T073 and T074.
- Polish: T075, T076, T077, T078 in parallel, then T079 and T080.

---

## Parallel Example: User Story 1

```text
Task T019: useSavedTitleControls tests (model)
Task T020: SaveToListControls tests (ui)
Task T021: DetailActions personalLists tests (widget)
Task T022: TitleDetailPage personalLists integration tests (page)
```

Then implement T023 → T024 → T025 → T026 in that order.

## Parallel Example: User Story 3

```text
Task T030: parseSavedCollectionPath tests
Task T031: saved routes integration tests
Task T032: SavedEntryActions tests
Task T033: SavedEntryList tests
Task T034: SavedEntryCard tests
Task T035: SavedCollectionSection tests
Task T036: SavedPage tests
```

Then implement in dependency order T037 → T038 → T039, and the components T040–T045, followed by T046–T049.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 (T001–T002).
2. Complete Phase 2 (T003–T018).
3. Complete Phase 3 (T019–T026).
4. Stop and validate: add, remove, duplicate, persistence, failure feedback, keyboard operation on detail.
5. Demo the watchlist alone; favorites, sections, and degraded handling remain unbuilt.

### Incremental Delivery

1. Foundation ready → US1 (watchlist) → validate → deploy/demo.
2. US2 (favorites) → validate → deploy/demo.
3. US3 (Saved destination and sections) → validate → deploy/demo.
4. US4 (degraded/deleted titles) → validate → deploy/demo.
5. US5 (persistence controls; documentation already aligned) → validate → deploy/demo.
6. US6 (accessibility, responsive, localization) and Phase 9 gates → final validation.

### Scope Guard

- Do not implement accounts, sign-in, sync, adoption merging, watched status, ratings, notes, sharing, notifications, recommendations, playback, backend routes, or new dependencies.
- Do not advertise an account or synchronization capability that does not exist.
- Do not add save controls to catalog or search cards.
- Do not edit unrelated specifications beyond the two documentation tasks (T065, T066).
- Commits and pushes require explicit user authorization; none of these tasks authorizes them.

---

## Notes

- [P] tasks touch different files and have no incomplete dependency.
- Every task is independently verifiable by its listed test file, a targeted Vitest run, or a named manual scenario.
- Tests MUST be written before the corresponding implementation and observed to fail first.
- The five documented adoption questions remain open; do not resolve them in code.
- Conditional account requirements FR-067 to FR-078 and their success criteria are intentionally deferred: no account capability exists, so implementing them would add unverifiable surface.
- Account-dependent outcomes (spec SC-015 and SC-024) are conditional on a future account capability and are not verifiable in this release; the guest-only success criteria (SC-001 to SC-014, SC-016 to SC-023) are the release gate.
