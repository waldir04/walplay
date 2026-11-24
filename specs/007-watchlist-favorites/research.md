# Research: Watchlist and Favorites

**Feature**: `007-watchlist-favorites` | **Date**: 2026-11-24

All decisions below are constrained by `.specify/memory/constitution.md` and `docs/product-overview.md`. The feature is guest-first, frontend-only, and must not assume an account model.

## D1 — Persistence mechanism: one versioned `localStorage` envelope

**Decision**: Store both guest collections in a single JSON envelope under `walplay.saved-library.v1` in `localStorage`, mirroring the existing `walplay.availability-region.v1` pattern in `frontend/src/features/select-availability-region/model/regionPreference.ts`.

**Rationale**: The repository already establishes `localStorage` + Zod + version envelope as the device-preference pattern; it is synchronous, avoids loading-state complexity for the core membership check on the detail page, is supported in every target browser, and is more than sufficient for the expected payload (200 entries × ~250 bytes per collection is well under 100 KB against a ~5 MB quota). Membership must be available synchronously to render the correct detail control on first paint, and the spec requires that a save is visible within one second.

**Alternatives considered**:
- **IndexedDB**: transactional and larger, but asynchronous everywhere, requires a new test double in jsdom, and adds complexity disproportionate to the data volume. Rejected.
- **TanStack Query cache with a persistence plugin**: would mix local persistence into server-state machinery and need a new dependency. Constitution XVIII treats local data as not server state. Rejected.
- **`sessionStorage`**: would violate persistence across browser sessions. Rejected.
- **Backend persistence**: requires accounts, a schema, and server transmission that the spec forbids for guests. Rejected.

## D2 — State architecture: entity-scoped external store with `useSyncExternalStore`

**Decision**: Put the library in `entities/saved-library` with a module-level store created by a factory (`createSavedLibraryStore(storage, eventTarget)`), a default browser-backed singleton, and hooks (`useSavedLibrary`, `useSavedCollection`) using React's `useSyncExternalStore`.

**Rationale**: Detail controls, the saved page, and other tabs must observe the same state. `useSyncExternalStore` is the React-native primitive for that, adds no dependency, avoids a parallel state library (prohibited for server data and unnecessary here), and keeps the persistence boundary in one place as Constitution XVIII requires. Pure mutation functions in the entity model are independently unit-testable; the store only sequences read-modify-write and notification.

**Alternatives considered**:
- **React Context + reducer**: requires a provider and re-renders broad subtrees, and risks ad hoc stores. Rejected.
- **Zustand/Redux**: new dependency; the constitution discourages parallel stores. Rejected.
- **Local component state per surface**: cannot keep the detail control and the saved page consistent. Rejected.

## D3 — Envelope, versioning, and corruption policy

**Decision**: Version the envelope (`version: 1`) with `savedAt` ISO timestamps, two named collections, and no provider-specific fields. Validate on every read. Distinguish four read outcomes: `ready`, `empty`, `corrupt`, `unsupported-version`. Validate entries individually and drop structurally invalid records, but preserve entries whose structure is valid and whose identity is not a usable catalog id as `unreadable` entries so the visitor can remove them. Migration is a pure function keyed by version; a newer/unknown version is preserved, never overwritten, until the guest confirms a reset.

**Rationale**: Constitution XIII requires browser data to be treated as untrusted and validated on read; XVIII requires versioning and safe migration. Spec FR-049 requires a removable unreadable-entry state, while FR-059 requires malformed entries to be dropped individually. The distinction above reconciles both: structural garbage is dropped; a syntactically stored entry with an unusable identity remains removable rather than vanishing silently.

**Alternatives considered**: A single strict envelope parse that resets everything on any error (would lose valid data); trusting stored JSON (violates the constitution); storing provider identifiers (violates the domain-boundary requirement).

## D4 — Title identity and display snapshot

**Decision**: Identity is `{ mediaType, itemId }`, where `itemId` is the existing opaque catalog item id (`^[A-Za-z0-9_-]{8,64}$`). Each entry stores a display snapshot: `title`, `mediaType`, optional `originalTitle`, optional `releaseYear`, optional `poster`, and `savedAt`. The frontend never decodes the item id and never stores TMDB numeric ids or provider field names.

**Rationale**: `encodeItemId` already produces the stable, opaque identity used by catalog, detail, and availability routes. Storing the snapshot is what allows a deleted or unreachable title to remain recognizable and removable. Snapshot writes happen only when the guest saves a title; hydration does not rewrite snapshots, so a later catalog failure shows the identity as last successfully saved, exactly as FR-045 and FR-035 require, without write amplification.

**Alternatives considered**: Storing the raw provider id (couples storage to TMDB); storing only the id (breaks degraded rendering); storing full detail payloads (duplicates server data, risks over-fetching, and mixes local and remote data).

## D5 — Catalog hydration and deleted-title detection

**Decision**: Each rendered saved entry hydrates through the existing `useCatalogItemQuery(mediaType, itemId, language)` (5-minute stale time, 30-minute GC, deduplicated by React Query). Render the snapshot immediately and replace it with current item data when the query resolves. `stateForError(error) === 'not-found'` marks the entry as no longer available in the catalog; every other error marks it as temporarily unavailable with a retry. A malformed identity is never queried and renders the unreadable state.

**Rationale**: Reuses the approved catalog boundary and query discipline, avoids a new endpoint, keeps the provider out of the client, and satisfies FR-035, FR-046, FR-047, and FR-048. Snapshot-first rendering meets the first-batch timing target regardless of metadata latency.

**Alternatives considered**: A new batch endpoint (new API surface and provider fan-out on the server; not justified yet); fetching `detail` per entry (over-fetching); no hydration (would never show current titles or detect deletion).

**Known risk**: up to 50 small item requests per revealed batch. Mitigation is snapshot-first paint, Query deduplication/caching, hydrated batches only, and the follow-up option of a batch endpoint if provider limits appear. Recorded in the plan risks.

## D6 — Routes and navigation: one "Saved" destination, two link-addressable collections

**Decision**: Add `/saved/watchlist` and `/saved/favorites`, redirect `/saved` to `/saved/watchlist`, and add a single navigable `saved` route with `matchPrefix: '/saved/'`. The two collections are presented as route links with `aria-current`, not as an ARIA tablist.

**Rationale**: Matches the clarified product decision and keeps the primary navigation calm. Because each collection is a real destination with a URL that survives reload and can be shared or tested directly, links are the honest semantic choice; a tablist would imply in-place panels and require roving focus. The existing `AppRoute`/`PrimaryNavigation` `matchPrefix` mechanism already supports this shape.

**Alternatives considered**: Two top-level nav entries (rejected in clarification); ARIA tabs with panels (incorrect semantics for distinct addresses); a query parameter instead of path segments (weaker deep-link and document-title behavior).

## D7 — Ordering, batching, and focus

**Decision**: Sort most recently saved first by `savedAt`, then by identity for determinism. Reveal entries in batches of 50 with a "Show more" button; keep a per-collection `visibleCount`; announce the revealed range once. On removal, move focus to the next entry, or to the section heading when the collection becomes empty, and announce once.

**Rationale**: Satisfies FR-022, FR-043, FR-083, and SC-020 with explicit, testable behavior and no infinite scrolling. Focus restoration prevents keyboard and screen-reader users from losing their place when a row's remove button disappears.

**Alternatives considered**: Numbered pagination (extra navigation for a personal list); infinite auto-load (unbounded work and poor keyboard ergonomics); rendering all entries (violates the 200-entry operability target).

## D8 — Mutation feedback, pending state, and the device-only disclosure

**Decision**: The two detail controls render as `Button`s with `aria-pressed`, collection-specific labels that include the title, and a busy/disabled state during the (synchronous) persistence write. `SaveToListControls` owns a `LiveRegion` for outcome messages. A static visible hint under the controls states that saved titles stay on this device; both saved sections render a persistent, detailed notice. No toast system is introduced.

**Rationale**: Local writes are synchronous, so the pending state protects against re-entry and is observable only if persistence becomes asynchronous later; the contract is still implemented and tested. A visible static hint satisfies FR-057 for the first save and for returning guests without an extra persisted flag. Reusing the existing `LiveRegion` keeps announcements consistent with detail and search.

**Alternatives considered**: A transient toast library (new dependency, weaker accessibility); a one-time modal (adds friction and a persisted flag, and risks resembling a dark pattern); an `aria-pressed` toggle without text change (fails the no-color-only and explicit-copy requirements).

## D9 — Storage failure, corruption, and deletion UX

**Decision**: Writes return a result; on failure the control rolls back any optimistic presentation, announces a localized error, and offers retry. A corrupt or unreadable store renders a dedicated recovery state inside the saved destination with a "Reset saved titles on this device" action that requires an inline second confirmation; no automatic reset. The saved destination also exposes two-step delete controls for each collection and for both collections.

**Rationale**: Implements FR-061 to FR-063 without a modal primitive that the codebase does not have. Two-step inline confirmation is keyboard accessible, announced, and avoids a silent destructive action. The saved page is the natural home for data controls because they operate on the collections the visitor is viewing.

**Alternatives considered**: Automatic reset on corruption (data loss without consent); deleting data only in Settings (harder to discover from the affected surface); adding a dialog dependency (unnecessary for two confirmations).

## D10 — Multi-tab behavior and concurrent writes

**Decision**: Subscribe to the window `storage` event for the saved key and refresh the store; notify same-tab subscribers synchronously after each mutation. Each mutation reads the latest stored envelope before applying its delta and writing, so disjoint changes from two tabs are preserved. Two writes to the same title in the same millisecond resolve last-write-wins, documented as the only accepted conflict.

**Rationale**: Meets FR-025 and SC-002 without locks, BroadcastChannel, or async storage. Rebasing on the latest value removes the common lost-update case (two tabs adding different titles). Cross-tab simultaneous same-title toggles are rare, non-destructive (both outcomes are valid membership states), and become fully resolvable only with a server-backed model.

**Alternatives considered**: Ignoring `storage` events (stale UI); the Web Locks API (extra platform surface and a new failure mode for a local-only feature); BroadcastChannel (same-tab messaging is not needed beyond the store).

## D11 — Optional account adoption: seam now, no implementation

**Decision**: Do not implement account adoption, authentication, sync, or server storage. Express the repository boundary so a future account-scoped repository can replace the device scope, and keep the adoption contract (explicit, union merge, idempotent, failure-safe) documented in the spec and data model. The `Persistence Scope` concept is represented in the store API, not in the UI.

**Rationale**: No account capability exists, and Product Overview OD-07 remains open. Building an unused merge engine would add untested surface. Constitution XIX requires such a migration to be explicit, safe, replay-safe, and specified before implementation; it is specified, not implemented.

**Alternatives considered**: Implementing a dormant merge utility (dead code); advertising accounts in the UI (forbidden by FR-058); designing a database schema (explicitly out of scope).

## D12 — Capability gating and test migration

**Decision**: Add `personalLists: boolean` to `DetailCapabilities`, default it to `true` in `DETAIL_CAPABILITIES` and in `resolveDetailCapabilities`, and keep `DetailActions` as the single actions section; render it when either the trailer or the personal controls are available. Update every capability fixture and the detail assertions that currently guarantee no personal-list control.

**Rationale**: The spec makes the capability available in this release, so no environment flag is justified; the existing capability object is the established composition seam and lets tests exercise enabled and disabled states. Making the property optional to avoid fixture churn would hide configuration errors under strict TypeScript.

**Alternatives considered**: A new environment flag (unnecessary rollout complexity with no provider dependency); a second actions widget (duplicates the section heading and composition).

## D13 — Testing and coverage strategy

**Decision**: Pure model and store first, then components, then route integration.
- Unit: schema/version/migration, ordering and dedupe, identity validation, corrupt and unknown-version reads, write failure, operation outcomes.
- Store: add/remove/toggle/clear, rebase-on-write, disposal, `storage` event reaction with a fake storage and synthetic `StorageEvent`.
- Feature: control labels, `aria-pressed`, busy state, announcements, failures and rollback, first-save hint.
- Widget/page: empty/loading/degraded/deleted/unreadable states, batching, `Show more`, focus after removal, two collections independent, clear-data confirmation, device notice.
- Integration: detail page shows both controls and reflects state; saved routes restore by address; reload persistence; cleared storage; cross-tab update; Spanish; no network call required for membership.
- Accessibility/responsive: axe checks, keyboard traversal, live-region assertions, 360/768/1024/1440 class contracts and 200% zoom expectations following the existing `catalogResponsive` pattern.
- i18n: add a `saved` resource test mirroring `detailResources.test.ts` (parity, plural pairs, every key referenced), plus `resources.test.ts` parity.

Add per-path coverage thresholds at 90% for `src/entities/saved-library/model/*`, `src/entities/saved-library/api/*`, and `src/features/toggle-saved-title/model/*`, alongside the global 80% thresholds.

**Rationale**: Matches the repository's Vitest/RTL/vitest-axe stack and Constitution VIII. No new testing dependency is needed; jsdom supports `localStorage` and `StorageEvent`, and the existing setup clears storage before each test.

**Alternatives considered**: Browser-level E2E for localStorage semantics (no E2E harness exists and the behavior is testable in jsdom); snapshot tests (brittle for user-facing copy).

## D14 — Follow-ups recorded but not implemented

- **Saved-origin return**: `resolveDetailReturn` does not recognize `/saved/*` as a return origin; opening a saved entry and pressing the detail return action falls back to the catalog landing page. Extending it would change feature 004's contract, so it is a deliberate follow-up, not part of this feature.
- **Batch item endpoint**: revisit only if per-entry hydration hits provider rate limits.
- **Account adoption and cross-device sync**: blocked on OD-07, OD-08, and OD-09 decisions.
- **Product documentation updates**: completed 2026-11-24. Favorites is recorded in the Product Overview, OD-08/OD-09 are recorded, and feature 004's OD-D1/FR-064 are revised. No follow-up remains.
