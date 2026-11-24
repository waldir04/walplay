# Quickstart: Watchlist and Favorites

**Feature**: `007-watchlist-favorites` | **Date**: 2026-11-24

This is a validation guide, not implementation code. Shapes and rules live in [data-model.md](./data-model.md) and [contracts/](./contracts/).

## Prerequisites

- Node.js >= 22.12 and npm.
- Repository dependencies installed (`node_modules` already present at the repository root, `frontend/`, and `backend/`).
- The backend running for catalog hydration; saved membership itself works without it.

## Run locally

Terminal 1 — backend:

```bash
npm --prefix backend run dev
```

Terminal 2 — frontend:

```bash
npm --prefix frontend run dev
```

Required frontend configuration is unchanged:

```bash
# frontend/.env.local
VITE_APP_ENV=local
VITE_APP_VERSION=0.0.0
VITE_API_BASE_URL=http://localhost:4000
VITE_AVAILABILITY_ENABLED=false
```

No new environment variable is introduced for this feature.

## Automated validation

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run test
npm --prefix frontend run build
```

Targeted runs while developing:

```bash
cd frontend
npx vitest run src/entities/saved-library
npx vitest run src/features/toggle-saved-title
npx vitest run src/widgets/saved-collection
npx vitest run src/pages/saved
npx vitest run src/pages/title-detail
npx vitest run src/shared/i18n
```

Backend tests are not expected to change, but the suite must stay green:

```bash
npm --prefix backend run test
```

## Manual scenarios

Open the app at `http://localhost:5173`.

### 1. Guest save and persistence (P1, SC-001, SC-002, SC-012)

1. Open `/browse/movies`, choose a title, and open its detail destination.
2. Confirm two distinct controls: watchlist and favorites, each labeled for its collection.
3. Add the title to the watchlist. Confirm the control changes to a removal state, a success message is announced, and the visible device-only hint appears under the controls.
4. Reload. Confirm the watchlist state is restored.
5. Open `/saved/watchlist` from the single "Saved" navigation entry. Confirm the title appears once.
6. Open `/saved/favorites`. Confirm it is empty and shows favorites-specific copy.

### 2. Independence and duplicates (P1, SC-003, SC-004)

1. Add the same title to favorites from its detail destination.
2. Confirm it appears in both collections and each entry states that it is also in the other.
3. Remove it from favorites from `/saved/favorites`.
4. Confirm `/saved/watchlist` still contains it and the watchlist count is unchanged.
5. Repeat the add action for a title already in the watchlist. Confirm no duplicate, no error, and an "already in watchlist" message.

### 3. Batches and focus (P2, SC-020)

1. Seed 51 or more entries as described below.
2. Open a collection. Confirm 50 entries and a localized total count.
3. Activate "Show more". Confirm the range announcement, the next batch, and unchanged scroll position.
4. Remove an entry with the keyboard. Confirm focus lands on the next entry's action, or on the heading when the collection becomes empty, with one announcement.

### 4. Deleted, renamed, and unreachable titles (P2, SC-010, SC-011)

1. Seed one entry whose item id matches the catalog pattern but does not exist upstream (see seeding below).
2. Open the collection. Confirm the entry remains visible, is marked "no longer available in the catalog", and can still be removed.
3. Stop the backend and reload. Confirm entries show the stored snapshot plus "details are temporarily unavailable", with retry, and membership actions still work.

### 5. Cross-tab consistency (P2, SC-002)

1. Open the same collection in two tabs.
2. Add a different title in each tab.
3. Confirm both tabs converge without a reload and neither entry is lost.

### 6. Storage failure and recovery (P3, SC-013, SC-014)

1. In DevTools, put invalid JSON in `localStorage['walplay.saved-library.v1']` and reload `/saved/watchlist`.
2. Confirm the recovery state appears, not the empty state, and that reset requires a second confirmation.
3. Set the stored version to `2` with an otherwise valid envelope. Confirm the recovery state appears and the bytes are not modified before confirmation.
4. In a private window where storage is unavailable, save a title and confirm the interface does not claim durable success and states the session-only limitation.

### 7. Clear saved data (P3, SC-021)

1. Open the manage controls in a saved collection.
2. Confirm deleting each collection and all saved titles uses a two-step confirmation and announces the result.
3. Confirm the device-only notice remains visible in both collections after deletion.

### 8. Accessibility and localization (P3, SC-017, SC-018, SC-019)

1. Navigate the controls and both collections with the keyboard only at 200% zoom and at 360, 768, 1024, and 1440 px widths.
2. Run a screen reader over both collections, including a title present in both, and confirm collection context, counts, degraded states, and action names are announced once.
3. Switch to Spanish. Confirm all owned copy, counts, dates, notices, and announcements are Spanish, with no raw keys, and titles remain as supplied.

## Seeding device data

`localStorage` is only a validation aid here. Use DevTools → Application → Local Storage for `http://localhost:5173`, key `walplay.saved-library.v1`. The envelope shape is in [contracts/storage.md](./contracts/storage.md). To produce a valid-pattern id that the backend does not know:

```bash
node -e "console.log(Buffer.from('wl1:movie:999999999','utf8').toString('base64url'))"
```

Use the output as `itemId`. The backend will answer `not-found`, exercising the "no longer available in the catalog" state without deleting real data.

## Expected results

- Every saved action is reflected in text, announced once, and persisted or explicitly reported as failed.
- Both collections survive reloads, new tabs, and later browser sessions on the same device, and disappear when browsing data is cleared.
- Saved membership never depends on catalog, availability, or network success.
- All automated checks pass with zero warnings, and the new per-path coverage thresholds are met.
