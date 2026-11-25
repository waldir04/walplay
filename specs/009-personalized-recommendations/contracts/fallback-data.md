# Contract: Recommendation Fallback Data

**Feature**: `009-personalized-recommendations` | **Type**: Data-source and API contract

The initial release does not add an endpoint. It reuses the existing catalog popular-list contract and
applies recommendation-specific selection rules in the widget's pure selector. The deferred
account-scope endpoint is specified at the end and is not implemented.

## Reused endpoint (initial release)

### `GET /api/catalog/:mediaType/popular`

| Aspect | Contract |
|---|---|
| Source | Existing catalog route and provider adapter |
| Method | `GET` only |
| Path | `movie` or `tv` |
| Query | `language=en \| es`, `page=1`, active media scope only (`movie` or `tv`) |
| Request body | None |
| Credentials | None from the browser; provider token stays on the backend |
| Response cache | `Cache-Control: no-store` from the existing route |
| Frontend hook | `useSectionPreviewQuery(mediaType, 'popular', language)` |
| Query key | Existing `catalogKeys.section(mediaType, 'popular', language, 1)` |

The area requests only page 1 for the active media scope. It does not use infinite pagination, "load more",
or a second page. Reusing the existing query key means a Browse visit and the Home area share the same
cached page for the same media type and language; no duplicate request is made within `staleTime`.

### Response fields used

The existing envelope and Zod schemas are authoritative. The area consumes:

| Field | Use |
|---|---|
| `data.items[]` | Candidate pool, already in provider order |
| `data.items[].id` | Opaque identity for dedupe, exclusion, and detail navigation |
| `data.items[].mediaType` | Scope check and identity |
| `data.items[].title` | Display; provider-supplied and untranslated |
| `data.items[].releaseYear` | Display when present |
| `data.items[].poster` | Display when present; existing fallback otherwise |
| `data.items[].rating` | Existing catalog card presentation when present |
| `meta.stale` | Show the "loaded earlier" label |
| `meta.lastUpdatedAt` | Localized last-updated time in the stale label |
| `meta.language` | Existing language metadata; no new use |

No provider field, identifier, or raw error reaches the DOM.

### Selection rules applied to the response

1. Request only the active media scope's popular list. Never request both scopes for one section and
   never merge or interleave the two lists (FR-153/FR-154).
2. Walk `data.items` in provider order.
3. Skip an item whose identity is already saved by the guest (watchlist or favorites), already
   dismissed (always empty in guest scope), a duplicate earlier in the walk, adult-flagged, of an
   unsupported type, or missing a usable identity/displayable name. The local saved-title check is
   read-only and transmits nothing (FR-028/FR-077).
4. Keep the first `RECOMMENDATION_MAX_ITEMS` (12) eligible items.
5. Preserve the relative order of the kept items exactly as the provider returned them.
6. Do not request additional pages to backfill, do not pad, and do not reorder.

The catalog contract already excludes adult entities and unsupported types. The widget still applies
its own defensive duplicate and identity checks; it does not trust the response shape beyond the parsed
schema.

### Empty result rules

| Provider result | Eligible after exclusions | Area state |
|---|---|---|
| `items` empty | — | `empty` (`no-provider-items`) |
| `items` non-empty | ≥ 1 | `ready` |
| `items` non-empty | 0 | `empty` (`all-excluded`) |

An empty state is a success outcome. It shows an explanation and working Browse/Search actions. It is
never rendered as an error and never filled with fabricated or catalog-substituted content.

### Error mapping

The existing catalog client maps failures to stable codes; the widget maps codes to states without
exposing them:

| Condition | Existing code | Area state |
|---|---|---|
| Provider rate limit | `CATALOG_RATE_LIMITED` | `error/rate-limited` |
| Provider or request timeout | `CATALOG_TIMEOUT` | `error/timed-out` |
| Provider unavailable, malformed response, invalid data, internal error, not found | `CATALOG_UNAVAILABLE`, `CATALOG_INVALID_RESPONSE`, `INTERNAL_ERROR`, `CATALOG_NOT_FOUND` | `error/unavailable` |

`stateForError` classifies `CATALOG_NOT_FOUND` as `not-found`; the recommendation mapper folds
`not-found` into `unavailable` so the area has one stable, truthful error family.

Rules:

- The area performs no automatic retry loop.
- Retry is explicit and re-issues the same request once per activation.
- `unavailable` uses the default `recommendations.states.error.title`/`description` copy; rate-limited
  and timed-out use their specific keys (contracts/i18n-resources.md).
- The area-level error is the only error level in the initial release because there is one section.
  Per-section containment is deferred with the personalized sections (FR-091).
- The rest of Home, navigation, catalog, search, and saved actions remain usable during an area error.

### Request privacy rules

The request URL contains only the media type, `popular`, language, and page 1. It MUST NOT contain a
saved title, saved identity, dismissal, rotation position, account identifier, or any personal data.
No recommendation preference storage is written. A test asserts the request URL and the absence of a
recommendation storage key.

## Deferred endpoint (account scope, not implemented)

This section records the intended contract if and when OD-07, RV-01, RV-02, and the product decision
are resolved. It MUST NOT be implemented from this plan.

### `GET /api/catalog/:mediaType/titles/:itemId/recommendations`

| Aspect | Contract |
|---|---|
| Auth | Approved account session; no anonymous seed use |
| Path | Existing opaque catalog item id; server resolves the provider id |
| Query | `language=en \| es`, `page` positive integer (default 1) |
| Provider policy | Recommendation list first; similar list only when a successful recommendation response yields no provider-usable candidate; never merged |
| Response source | `source: 'recommendations' \| 'similar'` |
| Ordering | Provider order after provider-side normalization; no Walplay re-ranking |
| Items | Normalized `CatalogItem` values, excluding adult, unsupported types, the seed, and unusable identities |
| Bounded | At most 12 usable items per returned page; `hasMore` reflects provider pages |
| Cache | Dedicated `CatalogCache` with configured fresh/stale TTLs and entry cap |
| Errors | Existing stable envelope; a recommendation-list failure does not switch to the similar list |

Illustrative response:

```json
{
  "data": {
    "mediaType": "movie",
    "source": "recommendations",
    "page": 1,
    "items": [
      {
        "id": "d2wxMTptb3ZpZTo1NTA",
        "mediaType": "movie",
        "title": "Fight Club",
        "releaseYear": 1999,
        "genres": [{ "id": "18", "name": "Drama" }]
      }
    ],
    "hasMore": true
  },
  "meta": {
    "language": "en-US",
    "stale": false,
    "lastUpdatedAt": "2026-11-25T12:00:00.000Z",
    "source": "provider"
  }
}
```

Open items that must be resolved before implementation:

- How client-side saved/dismissed exclusions affect `hasMore` and "Show different titles" eligibility
  (FR-047). A prefetch or server-assisted eligibility signal may be required.
- Whether dismissals are stored server-side with the account or locally with an approved account-scope
  store.
- Account retention, deletion, maximum size, and expiry (RV-06, RV-13).
- Provider-term confirmation for recommendation/similar display and caching (RV-01).
