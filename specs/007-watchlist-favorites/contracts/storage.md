# Contract: Device-Local Saved Library Storage

**Feature**: `007-watchlist-favorites` | **Type**: Local persistence contract

The saved library is guest data owned by the visitor's browser profile on one device. It is never transmitted, never written to the backend, and never mixed with server data. The contract is implemented inside `entities/saved-library`; components do not touch `localStorage`.

## Key and envelope

| Aspect | Contract |
|---|---|
| Key | `walplay.saved-library.v1` |
| Format | Single JSON object |
| Version | `1` |
| Owner | Browser origin on this device and browser profile |
| Lifetime | Until the visitor deletes it or clears browsing data |
| Encryption | None; the data is non-sensitive membership and display snapshots |
| Size | Two collections; expected ≪ 100 KB at the 200-entry quality target |

```json
{
  "version": 1,
  "watchlist": [
    {
      "mediaType": "movie",
      "itemId": "d2wxMTptb3ZpZTo1NTA",
      "title": "Fight Club",
      "releaseYear": 1999,
      "poster": {
        "url": "https://image.example.test/w342/fight-club.jpg",
        "urlLarge": "https://image.example.test/w780/fight-club.jpg"
      },
      "savedAt": "2026-11-24T15:30:00.000Z"
    }
  ],
  "favorites": []
}
```

Rules:

- No account identifier, email, token, session, watched flag, rating, note, availability, or provider field is stored.
- Unknown fields are ignored on read and are never written.
- `itemId` is the existing opaque catalog token; the client does not decode it.
- The envelope is the unit of write; both collections are written atomically within a tab.

## Read outcomes

`readLibrary(storage)` returns exactly one outcome:

| Outcome | Meaning | UI behavior |
|---|---|---|
| `ready` | Valid envelope with one or more entries | Render collections |
| `empty` | Key absent or both collections empty | Render the collection-specific empty state |
| `recovery-required` with `reason: 'corrupt'` | JSON is unparseable or the envelope shape is invalid | Recovery state; no automatic reset |
| `recovery-required` with `reason: 'unsupported-version'` | Version is a number other than `1`, including newer versions | Recovery state; stored bytes are preserved until explicit reset |
| `unavailable` | Storage cannot be read (disabled, private mode, or access throws) | Render an empty library for the session plus the session-only notice |

Entry-level validation:

- Entries with valid structure but an identity that fails `CATALOG_ITEM_ID_PATTERN` are retained as `unreadable` entries for removal (never queried).
- Entries missing `title` or `mediaType`, or not objects, are dropped individually.
- An invalid `savedAt` is normalized to `1970-01-01T00:00:00.000Z`; the entry is retained and ordering remains deterministic across reloads.
- Duplicate identities within one collection are collapsed to the most recent `savedAt`.

## Write outcomes

`writeLibrary(library, storage)` returns:

| Outcome | Meaning | UI behavior |
|---|---|---|
| `written` | Stored and re-read successfully | Confirm success |
| `unavailable` | No usable storage object | Report failure; the in-memory change may apply for the session only |
| `write-failed` | `setItem` threw (quota, security, or platform error) | Report failure, offer retry, never claim durable success |
| `verification-failed` | Write appeared to succeed but the immediate re-read did not match | Treat as `write-failed` |

The store never reports durable success before a successful write. Optimistic membership presentation is rolled back on failure with visible and announced feedback.

## Mutation results

| Operation | Result values |
|---|---|
| `add(collection, snapshot)` | `added` \| `already-present` \| `unavailable` \| `write-failed` |
| `remove(collection, identity)` | `removed` \| `already-absent` \| `unavailable` \| `write-failed` |
| `toggle(collection, snapshot)` | `added` \| `removed` \| `unavailable` \| `write-failed` |
| `clearCollection(collection)` | `cleared` \| `unavailable` \| `write-failed` |
| `clearAll()` | `cleared` \| `unavailable` \| `write-failed` |
| `resetUnreadable()` | `reset` \| `unavailable` \| `write-failed` |

`already-present` and `already-absent` are success-shaped no-ops with distinct localized messages; neither is an error. `clearCollection`, `clearAll`, and `resetUnreadable` are only called after explicit UI confirmation.

## Versioning and migration

- A migration chain maps `version N → N+1`; only version `1` exists today, so the chain is empty.
- A recognized older version is migrated in memory, validated, and written back in the current shape only after the migration succeeds.
- An unrecognized or newer version is not modified or downgraded. It yields `recovery-required: unsupported-version`.
- A reset writes a fresh empty version `1` envelope and discards the previous bytes only after explicit confirmation.
- Application upgrades must not require a key rename; the version field carries the shape.

## Multi-tab and concurrency

- The store subscribes to `window` `storage` events filtered by the exact key; a matching event reloads and notifies subscribers.
- Every mutation reads the latest persisted envelope, applies its delta, validates, and writes. Disjoint additions from two tabs are therefore preserved.
- Same-title writes from two tabs in the same interval resolve last-write-wins; this is documented and accepted for a local-only scope.
- No `BroadcastChannel`, `Web Locks`, service worker, or background sync is introduced.
- An open saved section reflects a foreign-tab change without a manual reload.

## Security and privacy

- Browser storage is untrusted input: parse, validate, normalize, and never evaluate or inject it into the DOM.
- Stored title strings are rendered as text through React, never as HTML.
- Stored poster URLs must parse as URLs and are rendered through the existing image handling; malformed URLs fall back to `PosterFallback`.
- No secret, credential, token, or account identifier is stored. Authentication tokens remain out of `localStorage` as the constitution requires.
- Guest data is never used for recommendations, analytics, advertising, or profiling, and never sent to a server.

## Testability

The store is constructed by `createSavedLibraryStore({ storage, eventTarget })` so tests can inject a fake storage and a fake event target. A default browser-backed singleton is created lazily. Tests must not depend on module-level state leaking between cases; the factory is the supported isolation seam. Existing `src/test/setup.ts` already clears `localStorage` before each test.

## Future account scope (not implemented)

When an account capability is approved, an account-scoped repository must satisfy the adoption contract in the spec: explicit preview, union per collection by identity, idempotent and replay-safe, failure leaves device data intact and unmarked, success clears only migrated entries, and signed-out devices retain no readable account copy. This feature provides the seam and the shape; it does not implement accounts, sync, or merge.
