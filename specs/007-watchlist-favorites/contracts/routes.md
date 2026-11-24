# Contract: Saved Routes, Composition, and Interaction

**Feature**: `007-watchlist-favorites` | **Type**: Frontend route and interaction contract

No backend route is added or changed. Saved membership is device-local; hydration reuses the existing `GET /api/catalog/:mediaType/titles/:itemId` endpoint through `useCatalogItemQuery`.

## Routes

| Path | Kind | Behavior | Document title |
|---|---|---|---|
| `/saved` | `saved` | Redirects to `/saved/watchlist`; the primary-navigation entry targets `/saved` | `meta.title.saved` |
| `/saved/watchlist` | `saved` | Renders the Watchlist collection | `meta.title.saved` |
| `/saved/favorites` | `saved` | Renders the Favorites collection | `meta.title.saved` |
| `/saved/*` unknown subpath | — | Matches the global not-found route; it must not render a collection for an unrecognized segment | `meta.title.notFound` |

Route metadata changes:

- `PageKind` gains `'saved'`.
- `APP_ROUTES` gains one entry: `path: '/saved'`, `kind: 'saved'`, `navigable: true`, `navigationLabelKey: 'navigation.saved'`, `titleKey: 'meta.title.saved'`, `matchPrefix: '/saved/'`, `loadsOnDemand: true`.
- The `saved` entry is ordered after `search` and before `settings` in `APP_ROUTES`, which places it in that position in the primary navigation.
- `pageImporters` gains `saved: () => import('@/pages/saved')`.
- `routes.tsx` adds a redirect from `saved` to `saved/watchlist` and two content routes for the collection addresses. No other route changes.

`PrimaryNavigation` already derives active state from `matchPrefix`, so `/saved/watchlist` and `/saved/favorites` both mark the single "Saved" entry as current.

## Capability and existing detail composition

- `DetailCapabilities` gains `personalLists: boolean`.
- `DETAIL_CAPABILITIES.personalLists` is `true`; `resolveDetailCapabilities` also returns `true`. No environment flag is introduced.
- `DetailActions` remains the single actions section. It renders when the trailer capability and a validated trailer exist, or when `personalLists` is true, or both.
- When `personalLists` is true, `DetailActions` renders `SaveToListControls` for the current title. When false, no personal control, heading fragment, disabled state, placeholder, or teaser is rendered.
- The controls receive the title identity and snapshot from the already-loaded `TitleDetail`. They do not issue a request and do not depend on availability, credits, seasons, similar, or collection queries.

## Page composition

```text
pages/saved/ui/SavedPage.tsx
├── useSavedLibrary()                      (entities/saved-library)
├── useSavedEntriesHydration()             (useQueries over visible entries;
│                                           entities/catalog item query)
├── savedEntryView.ts                      (query result -> hydrated/degraded/deleted/unreadable)
├── parseSavedCollectionPath(pathname)     (pages/saved/model)
└── widgets/saved-collection/SavedCollectionSection  (presentational)
    ├── SavedCollectionNav                 (links to both addresses, aria-current)
    ├── SavedStorageNotice                 (persistent device-only notice)
    ├── SavedEntryList                     (batches of 50, Show more)
    │   └── SavedEntryCard                 (entry view model + actions)
    │       ├── PosterFallback / img       (existing entity UI)
    │       └── SavedEntryActions          (features/toggle-saved-title)
    └── SavedCollectionManage              (two-step delete controls)
```

Layer rules: the page composes downward and is the data orchestrator, matching the existing `TitleDetailPage` pattern. It owns `visibleCount` (batching) and the per-entry `useQueries` hydration, because two slices at the `entities` layer must not import each other; `saved-library` therefore imports only `shared` and never the catalog entity. The widget imports entities and features only and receives the visible entries plus `onShowMore`; the feature imports `saved-library` and `shared` only.

Terminology: the **Saved destination** is the `/saved` page; a **saved collection** is the Watchlist or Favorites view inside it; a **saved entry** is one title within one collection.

## Section behavior

| State | Contract |
|---|---|
| Loading (own saved data unread) | Entry skeletons matching the final row layout, busy state announced, skeletons hidden from assistive technology, no spinner or bare loading text |
| Refreshing (catalog details pending) | Each entry keeps its stored snapshot with a busy indicator; no skeleton replaces meaningful content and no layout shift occurs |
| Empty | Collection-specific heading, explanation, and one primary discovery action to `/browse/movies`; not an error; no fabricated content |
| Populated | One `h1` for the collection, localized count, semantic list label per collection, first batch of up to 50 most recent entries; the page owns `visibleCount` and passes it to the list |
| More than 50 | "Show more" button reveals the next batch, announces "Showing {from}–{to} of {total}", preserves scroll and focus |
| Partially degraded | Usable entries render normally; degraded entries keep identity, are labeled in text, and remain removable |
| Recoverable error | Localized inline error with retry; sibling collection remains usable when the other fails |
| Recovery required | Corrupt or newer-version storage: explanation, reload action, and two-step reset; the empty state is not shown |

## Announcements and focus

- A save, removal, duplicate no-op, absent-removal no-op, clear, reset, and failure each produce exactly one polite live-region message.
- Save controls use `aria-pressed` and a label that names the collection and the title.
- Removing an entry moves focus to the next entry's action, or to the collection heading when no entries remain, and announces once.
- "Show more" announces the revealed range once and leaves focus on the button.
- Switching collections is a route navigation; the existing route focus and announcement behavior applies. The collection `h1` is focusable (`tabIndex={-1}`) and receives focus on direct load, matching other pages.

## Data and query contract

- Membership reads and writes never call the network.
- Only rendered entries hydrate, using `useCatalogItemQuery(mediaType, itemId, language)` with existing stale/GC times. Snapshots render first; hydration updates display only.
- `not-found` marks "no longer available in the catalog"; other errors mark "details temporarily unavailable" with a per-entry retry. Availability errors never affect membership.
- The existing query keys are reused; no new key family is required. No saved data is added to the React Query cache as server state.

## Out-of-scope differences

- No saved-origin support in `resolveDetailReturn`; opening a detail page from a saved entry shows the existing catalog return action. Changing that belongs to feature 004.
- No account, sync, adoption, notification, watched-status, rating, note, or recommendation surface is rendered or advertised. The device-only notice never links to a nonexistent account feature.
