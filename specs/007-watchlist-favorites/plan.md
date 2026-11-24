# Implementation Plan: Watchlist and Favorites

**Branch**: `feat/007-watchlist-favorites` | **Date**: 2026-11-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-watchlist-favorites/spec.md`

## Summary

Add two independent, guest-first personal collections — **Watchlist** and **Favorites** — that a visitor can maintain without an account. A saved title is referenced by the product's internal title identity (content type plus opaque catalog item id) and stored with a small display snapshot in a versioned, device-local envelope, so membership and recognizable entries survive catalog or provider failure.

The work is frontend-only. It introduces one entity slice for the saved library (schema, versioning, validation, local persistence, multi-tab store), one feature slice for the two save controls and their mutation feedback, one widget for the saved collection sections, and one page with two addressable collections behind a single "Saved" primary-navigation entry. Detail pages gain the two controls through the existing `DetailActions` composition and the existing `DetailCapabilities` gate. Saved entries reuse the existing catalog item endpoint and React Query cache for hydration; no backend route, provider call, account, or authentication is added.

## Technical Context

**Language/Version**: TypeScript ~5.9, React 19.1, Node.js >= 22.12 for tooling

**Primary Dependencies**: React 19, React Router 7, TanStack Query 5, Zod 4, i18next 25 / react-i18next 15, Tailwind CSS 4; Vitest 3, React Testing Library, vitest-axe, jsdom for tests. No new runtime or dev dependency is planned.

**Storage**: Browser `localStorage` under one versioned key for the guest scope. Server persistence (PostgreSQL/Prisma) is untouched; no saved title is transmitted while the visitor is a guest.

**Testing**: `npm --prefix frontend run test` (Vitest + RTL + jsdom), `run lint`, `run typecheck`, `run build`; `npm --prefix backend run test` remains green but is not modified.

**Target Platform**: Responsive web SPA for modern evergreen browsers (Baseline), WCAG 2.2 AA, English and Spanish.

**Project Type**: Web application in an existing `frontend` + `backend` repository. This feature changes only `frontend`.

**Performance Goals**: First batch of a saved collection visible within 1 second of opening it; each additional batch of 50 revealed within 500 ms; save or removal reflected within 1 second; 200 entries per collection remain operable.

**Constraints**: No new dependency; no new backend endpoint; no authentication, accounts, or sync; no server transmission of guest data; browser storage treated as untrusted; ~5 MB `localStorage` quota; no offline or background-sync promise; one nav entry and two stable addresses.

**Scale/Scope**: Two collections, up to 200 entries per collection per device (quality target, not a cap), 2 new routes plus a redirect, 1 nav item, ~4 new FSD slices, one existing detail composition changed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Clean Code, SOLID, Simplicity | Pure model functions, small slices, single responsibility per module | Pass |
| II. Strict TypeScript | All stored data and boundaries parsed with Zod, strict `tsconfig`, no `any`, literal unions for collections and states | Pass |
| III. Feature-Sliced Design | `entities/saved-library`, `features/toggle-saved-title`, `widgets/saved-collection`, `pages/saved`; imports flow downward; each slice exposes `index.ts` | Pass |
| IV. Arrow functions | All new functions are arrow functions | Pass |
| V. Backend architecture | No backend change; existing route and provider boundaries preserved | Pass (N/A) |
| VI. Component design | Presentational cards/sections receive data and callbacks; no hidden fetching in primitives; reuse `Button`, `EmptyState`, `ErrorState`, `Skeleton`, `LiveRegion`, `PosterFallback` | Pass |
| VII. Styling, tokens, async states | Semantic Tailwind tokens only; no inline styles; skeleton, empty-with-CTA, error-with-retry, and success feedback defined for every async surface; 24 px targets, 44 px primary/row actions | Pass |
| VIII. Testing and zero warnings | Unit, component, integration, a11y, responsive, and i18n tests; per-path coverage thresholds added; lint at zero warnings | Pass |
| IX. Performance | Snapshot-first rendering; batched reveal; per-entry queries deduped by React Query; no unbounded work | Pass |
| X. Resilience and fault isolation | Catalog failure degrades only an entry; one collection's failure does not break the other; storage failure never claims success | Pass |
| XI. API contracts | No API change; the existing `GET /api/catalog/:mediaType/titles/:itemId` contract is reused unchanged | Pass (N/A) |
| XII. Constants and configuration | Storage key, schema version, batch size, route paths, and collection ids are named constants; no magic values in components | Pass |
| XIII. Security and data protection | Browser data validated on read; malformed entries dropped safely; no secrets or auth tokens; no personal profile data stored; no third-party transmission | Pass |
| XIV. Accessibility | Semantic lists and headings, keyboard order, visible focus, accessible names that include title and collection, live-region announcements, focus restoration after removal, reduced motion | Pass |
| XV. Internationalization | All Walplay-owned copy under a `saved` namespace plus nav/meta/detail keys in `en` and `es`; pluralization; no raw keys; provider titles not translated | Pass |
| XVI. Documentation | Plan, research, data model, contracts, quickstart; Product Overview capability and feature 004 supersession recorded and aligned | Pass |
| XVII. Quality gates and commits | Only `lint`, `typecheck`, `test`, `build`; no commit or push without explicit authorization | Pass |
| XVIII. Server state and local persistence | Local data encapsulated in an entity repository/store, versioned, validated, migrated; no `useEffect` fetching; no parallel store duplicating server data; local and remote data never merged implicitly | Pass |
| XIX. Prisma persistence | Not applicable: no database table, migration, or server write is introduced; guest data stays on the device | Pass (N/A) |
| XX. External integrations | No new provider integration; hydration uses the existing backend boundary and item endpoint; provider shapes never reach storage or UI | Pass |

No gate violations. No complexity exceptions are requested.

## Project Structure

### Documentation (this feature)

```text
specs/007-watchlist-favorites/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── routes.md
│   ├── storage.md
│   └── i18n-resources.md
├── checklists/
│   └── requirements.md
└── tasks.md              # created later by /speckit.tasks
```

### Source Code (repository root)

```text
frontend/src/
├── entities/
│   └── saved-library/                  # NEW entity slice
│       ├── index.ts                    # public API
│       ├── model/
│       │   ├── constants.ts          # storage key, version, collection ids, batch size, paths
│       │   ├── savedLibrary.ts         # envelope schema, version, migration
│       │   ├── savedEntry.ts           # entry schema, identity, snapshot, ordering
│       │   ├── savedLibraryOperations.ts # add/remove/toggle/clear/merge helpers
│       │   ├── savedLibraryPersistence.ts# read, write, migrate, corrupt handling
│       │   └── savedLibraryStore.ts    # external store + storage-event sync
│       └── api/
│           └── useSavedLibrary.ts      # useSyncExternalStore hooks
├── features/
│   └── toggle-saved-title/             # NEW feature slice
│       ├── index.ts
│       ├── model/
│       │   ├── useSavedTitleControls.ts# membership + mutation feedback per scope
│       │   └── toSavedSnapshot.ts       # catalog item/detail -> stored snapshot input
│       └── ui/
│           ├── SaveToListControls.tsx  # two collection controls for detail
│           └── SavedEntryActions.tsx   # row actions reused by the saved widget
├── widgets/
│   ├── saved-collection/               # NEW widget slice
│   │   ├── index.ts
│   │   ├── model/
│   │   │   ├── useSavedEntryHydration.ts # per-entry catalog item query mapping
│   │   │   └── savedEntryState.ts      # hydrated/degraded/deleted/unreadable states
│   │   └── ui/
│   │       ├── SavedCollectionSection.tsx
│   │       ├── SavedCollectionNav.tsx
│   │       ├── SavedEntryList.tsx
│   │       ├── SavedEntryCard.tsx
│   │       ├── SavedCollectionSkeleton.tsx
│   │       └── SavedStorageNotice.tsx
│   └── title-detail/                   # MODIFIED
│       └── ui/DetailActions.tsx
├── pages/
│   └── saved/                          # NEW page slice
│       ├── index.ts
│       ├── model/
│       │   ├── parseSavedCollectionPath.ts
│       │   ├── useSavedEntriesHydration.ts # useQueries over visible entries
│       │   └── savedEntryView.ts       # hydration result -> view state
│       └── ui/SavedPage.tsx
├── app/routing/routes.tsx              # MODIFIED
├── shared/config/routes.ts             # MODIFIED
├── shared/config/detailCapabilities.ts # MODIFIED
├── shared/i18n/resources/en.json       # MODIFIED
├── shared/i18n/resources/es.json       # MODIFIED
├── widgets/app-shell/model/navigationItems.ts # unchanged (derives from APP_ROUTES)
└── test/fixtures/saved/                # NEW fixtures

frontend/vitest.config.ts               # MODIFIED: per-path coverage thresholds
```

**Structure Decision**: Keep the existing single-web-app layout and FSD layering. Domain, schema, ordering, and persistence live in one entity (`saved-library`) because both collections share identical mechanics and only differ by a collection id; duplicating two entity slices would be avoidable duplication. User interactions (save/un-save controls and their feedback) live in one feature parameterized by collection. The widget composes the entry cards and section states; the page owns the route parameter, ordering into batches, and composition.

## Implementation Phases

### Phase 0 — Research and decisions

Resolved in [research.md](./research.md): local persistence mechanism, store shape and multi-tab handling, identity and snapshot model, metadata hydration and deleted detection, route/navigation shape, batching and focus behavior, storage versioning and corruption policy, feedback/announcement pattern, adoption boundary, and testing approach.

### Phase 1 — Design artifacts

- [data-model.md](./data-model.md): stored envelope, entry/snapshot schemas, invariants, states, transitions, capacity and privacy rules, and the future adoption mapping without implementing accounts.
- [contracts/routes.md](./contracts/routes.md): routes, navigation, composition, capability gate, focus and announcement contract.
- [contracts/storage.md](./contracts/storage.md): storage key, version, mutation semantics, error outcomes, multi-tab rule, migration and reset behavior.
- [contracts/i18n-resources.md](./contracts/i18n-resources.md): the complete English/Spanish key contract and pluralization rules.
- [quickstart.md](./quickstart.md): run and validation guide.

### Phase 2 — Task generation (later)

`/speckit.tasks` derives tasks from this plan. No implementation task is created by this command.

## Dependencies

- **Existing, unchanged**: `GET /api/catalog/:mediaType/titles/:itemId` and the `useCatalogItemQuery` hook for snapshot refresh; `titleDetailPath`; `PosterFallback`; `Button`, `EmptyState`, `ErrorState`, `Skeleton`, `LiveRegion`; `LiveRegion`-based announcement pattern; `CatalogItem`/`TitleDetail` types.
- **Existing, modified**: `DetailCapabilities` gains `personalLists`; `DetailActions` renders the two controls and stays the single actions section; `APP_ROUTES` gains the saved destination; both i18n resources gain the `saved` namespace.
- **Documentation alignment (completed 2026-11-24 during analysis)**: `docs/product-overview.md` now lists personal favorites and records the OD-08/OD-09 decisions, and `specs/004-entertainment-details/spec.md` OD-D1 and FR-064 are revised to defer the collection model to this feature. No further documentation prerequisite remains.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `localStorage` quota or unavailability (private mode, disabled storage) | A save could appear to succeed but not persist | Every write reports a result; the UI never claims durable success on failure, states that the change is session-limited, and offers retry |
| Concurrent writes from two tabs | Last write could drop a disjoint entry | Mutations reread the latest envelope and rebase the delta before writing; `storage` events refresh other tabs; per-title last-write-wins only for the same title is documented |
| Per-entry catalog hydration creates many requests | Provider rate limits or slow saved page | Snapshots render immediately; hydration uses the existing cached item query with 5-minute stale time and Query deduplication; only rendered batches are hydrated; if provider limits appear, a batch endpoint becomes a follow-up decision |
| Corrupt or newer-version stored data | Data loss or crash | Entries are validated individually; unreadable identities stay removable; unknown/newer versions are preserved and reset only after explicit confirmation |
| Capability gate change breaks existing detail tests | Test churn and false regressions | `DetailCapabilities` fixtures and the detail action assertions are updated deliberately; all detail tests re-run with `personalLists` enabled and disabled |
| Favorites contradicts the recorded OD-D1 decision | Misaligned product baseline | Conflict is recorded in the spec and listed as a documentation prerequisite; no silent reinterpretation |
| Membership and metadata failures conflated | Misleading "deleted" state | Only the item endpoint's `not-found` outcome marks a title as no longer in the catalog; timeouts, rate limits, and validation failures map to "temporarily unavailable" with retry |

## Post-Design Constitution Check

Re-evaluated after Phase 1 artifacts. No new violation is introduced by the design.

| Concern | Post-design evidence | Status |
|---|---|---|
| Layer boundaries | Page → widget → feature → entity → shared only; `SavedEntryCard` does not import page or widget internals; entity exposes a single `index.ts` | Pass |
| Local persistence boundary | Only `entities/saved-library` reads or writes the storage key; the widget and feature consume hooks and results | Pass |
| Server state | Membership is local only; catalog hydration uses the existing Query hook and keys; no local data is written into the Query cache | Pass |
| Async UX | Skeleton, empty-with-CTA, error-with-retry, and success feedback are defined per surface; pending and rollback are specified | Pass |
| Accessibility | Names, pressed state, list semantics, focus restoration, and single announcements are contractual | Pass |
| i18n | Every key has English and Spanish values; plural pairs complete; provider titles excluded | Pass |
| Security and privacy | Untrusted storage validated; no tokens or personal identifiers; no transmission | Pass |
| Testing | Unit, store, component, integration, a11y, responsive, and i18n obligations listed with coverage thresholds | Pass |
| Scope | No accounts, sync, backend, watched status, ratings, notes, sharing, or recommendations | Pass |

No unresolved `NEEDS CLARIFICATION` remains in the plan. The five documented adoption questions stay open by design and do not block this guest-only implementation.

## Complexity Tracking

No constitution violations or complexity exceptions. The design adds one entity, one feature, one widget, and one page slice, which is the minimum needed to respect the FSD layer rules and reuse the same mechanics for both collections.
