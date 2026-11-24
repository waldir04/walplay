# Data Model: Watchlist and Favorites

**Feature**: `007-watchlist-favorites` | **Date**: 2026-11-24

This feature has no server-side data model. All data is device-local, versioned, and validated on read. Shapes below are the intended TypeScript/Zod domains; Zod schemas are the source of truth at the storage boundary.

## Constants

| Name | Value | Purpose |
|---|---|---|
| `SAVED_LIBRARY_STORAGE_KEY` | `walplay.saved-library.v1` | Single device-local key for both guest collections |
| `SAVED_LIBRARY_STORAGE_VERSION` | `1` | Envelope schema version |
| `SAVED_COLLECTIONS` | `['watchlist', 'favorites']` (frozen) | The only two collections; order used for display and iteration |
| `SAVED_BATCH_SIZE` | `50` | Entries revealed per batch |
| `SAVED_ROUTE_PREFIX` | `/saved` | Destination prefix |
| `SAVED_COLLECTION_PATHS` | `watchlist → /saved/watchlist`, `favorites → /saved/favorites` | Stable addresses |
| `SAVED_ITEM_ID_PATTERN` | `CATALOG_ITEM_ID_PATTERN` | Reuses the existing opaque catalog id rule |

`200` entries per collection is a documented quality target, not a constant or a cap.

## Entities

### CollectionId

```ts
type CollectionId = 'watchlist' | 'favorites'
```

Canonical labels and copy are localized; the ids are internal and never displayed.

### SavedEntry

One title's membership in one collection. The same title may exist once in each collection, never twice in the same collection.

```ts
interface SavedEntry {
  readonly mediaType: 'movie' | 'tv'
  readonly itemId: string            // opaque catalog id, ^[A-Za-z0-9_-]{8,64}$
  readonly title: string             // trimmed, non-empty
  readonly originalTitle?: string    // trimmed, non-empty when present
  readonly releaseYear?: number      // integer 1800..2100
  readonly poster?: { readonly url: string; readonly urlLarge?: string }
  readonly savedAt: string           // ISO 8601 UTC timestamp
}

// Input accepted by add/toggle; savedAt is assigned by the operation.
type SavedSnapshotInput = Omit<SavedEntry, 'savedAt'>
```

Validation rules:

- `mediaType` is a closed union; storage never holds an unknown media type.
- `itemId` must match the existing opaque catalog id pattern. A stored identity that fails this rule is kept as an `unreadable` entry (removal only), not queried and not silently discarded.
- `title` is required for rendering. An entry missing a usable title is structurally invalid and is dropped on read.
- `savedAt` must parse as a valid ISO timestamp. An invalid value is normalized to the fixed sentinel `1970-01-01T00:00:00.000Z` so ordering is deterministic across reloads; the entry is not dropped.
- Unknown fields are ignored on read (forward compatibility) but never written.

### SavedCollection

```ts
interface SavedCollection {
  readonly id: CollectionId
  readonly entries: readonly SavedEntry[]
}
```

Invariants:

- `entries` is unique by `${mediaType}:${itemId}`.
- Display order is `savedAt` descending, then `${mediaType}:${itemId}` ascending for ties.
- Removing an absent entry is a no-op success; adding an existing entry is a no-op success reported as "already present".
- Maximum one entry per identity per collection. There is no product-imposed count limit.

### StoredLibraryEnvelope

```ts
interface StoredLibraryEnvelope {
  readonly version: 1
  readonly watchlist: readonly SavedEntry[]
  readonly favorites: readonly SavedEntry[]
}
```

- One envelope holds both collections so a single write is atomic within the tab and a single `storage` event refreshes both.
- No profile, contact, account, watched, rating, note, availability, or analytics data is stored.
- The envelope does not store authentication tokens or identifiers.

### TitleIdentity

```ts
type TitleIdentity = { readonly mediaType: 'movie' | 'tv'; readonly itemId: string }
```

The uniqueness key and the query key basis. The frontend never decodes `itemId`; the backend continues to own decoding and provider mapping.

### DisplaySnapshot

The persisted subset of `SavedEntry` used when catalog data is unavailable: `title`, `mediaType`, `originalTitle?`, `releaseYear?`, `poster?`, plus the stored `savedAt` used for ordering. Save-time input is `SavedSnapshotInput`, which omits `savedAt`. It is written only when the visitor saves the title. Hydration from the catalog changes what is displayed but does not rewrite the stored snapshot, so a later catalog failure shows the identity as last successfully saved.

### PersistenceScope

```ts
type PersistenceScope = { readonly kind: 'guest'; readonly deviceId: 'local' }
```

This release implements only the guest scope. The future account scope is a different repository behind the same store/service contract; guest data is never displayed together with account data.

### AdoptionRecord (future, not implemented)

The spec defines the adoption contract: explicit preview, union per collection by identity, idempotent and replay-safe, failure leaves the device copy intact and unmarked, success clears only migrated data. No adoption code, account, or server model is built by this feature. The future implementation must map the same `SavedEntry` shape into the account scope and preserve `savedAt` ordering semantics.

## Entry presentation states

| State | Cause | Visible behavior | Membership effect |
|---|---|---|---|
| `hydrated` | Item query succeeded | Current title, type, year, poster, membership in both collections, actions | Unchanged |
| `refreshing` | Item query pending | Stored snapshot plus a subtle pending indicator and `aria-busy` on the entry | Unchanged |
| `temporarily-unavailable` | Item query failed with a non-`not-found` error | Snapshot plus "details temporarily unavailable", retry for details, actions still available | Unchanged |
| `not-in-catalog` | Item query failed with `not-found` | Snapshot plus "no longer available in the catalog", removal and other-list actions | Unchanged until the visitor removes it |
| `unreadable` | Stored identity fails the catalog id pattern | Minimal row with an explanation and removal only | Removable only |

Transitions: `refreshing → hydrated | temporarily-unavailable | not-in-catalog`; `not-in-catalog → hydrated` when a later retry resolves; `temporarily-unavailable → refreshed` on retry; removal is terminal for that entry in that collection.

## Collection presentation states

| State | Cause | Visible behavior |
|---|---|---|
| `loading` | First local read has not completed | Layout-matching entry skeletons, announced busy state, no spinner |
| `empty` | Zero entries in the collection | Collection-specific explanation plus a working discovery action |
| `populated` | One or more entries | Heading, localized count, first batch of up to 50, "Show more" when more exist |
| `partially-degraded` | Some entries degraded | All usable entries render; degraded entries keep identity, are marked in text, and remain actionable |
| `recoverable-error` | A mutation or metadata action failed and can be retried | Localized inline error with retry; membership state unchanged or rolled back |
| `recovery-required` | Envelope is corrupt or from an unsupported newer version | Dedicated recovery state; reset requires explicit confirmation; data is not destroyed automatically |

`empty` is never rendered for an error or corrupt state, and `recovery-required` is never rendered for an empty collection.

## Mutation semantics

| Operation | Input | Outcome |
|---|---|---|
| `add(collection, snapshot)` | Valid snapshot | `added` or `already-present`; never duplicates |
| `remove(collection, identity)` | Identity | `removed` or `already-absent`; never errors for absence |
| `toggle(collection, snapshot)` | Valid snapshot | `added` or `removed` based on current membership |
| `clearCollection(collection)` | Collection id | `cleared`; requires explicit confirmation in the UI |
| `clearAll()` | — | `cleared`; requires explicit confirmation in the UI |
| `resetCorrupt()` | — | Replaces unusable stored data only after explicit confirmation |

Every operation is synchronous with respect to local storage. Operations return a discriminated result that distinguishes success, idempotent no-op, unavailable storage, write failure, and unreadable stored data. The UI never derives success from an optimistic state alone.

Multi-tab rule: each operation reads the latest envelope, applies its delta, validates, and writes. A `storage` event from another tab reloads the store. Same-title concurrent writes resolve last-write-wins; disjoint writes are preserved.

## Capacity and privacy

- Expected payload: 200 entries per collection at ~250 bytes each ≈ 100 KB total, well under typical `localStorage` limits.
- No product-imposed entry limit. When storage rejects a write or is full, the UI reports that the change is session-limited rather than claiming durable success.
- Stored data contains only what is needed to render and maintain saved titles. It is never used for recommendations, profiling, analytics enrichment, or advertising, and is never transmitted in guest mode.
- Clearing a collection or all saved titles removes the corresponding entries from the device. A corrupt store can only be reset after explicit confirmation.
