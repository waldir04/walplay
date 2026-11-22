# Contract: Search Provider Boundary

**Feature**: `003-search-discovery` | **Type**: Internal adapter contract (backend)

The search adapter is the only component that knows TMDB's search shapes. Services depend on the
internal `SearchProvider` interface and the provider-neutral catalog item model. Provider DTOs,
field names, numeric popularity, and raw errors never cross this boundary.

## Adapter interface

```ts
// backend/src/providers/search-provider.ts
export interface SearchProvider {
  readonly id: 'tmdb'
  readonly fetchSearchPage: (input: {
    readonly query: string      // trimmed; internal whitespace preserved
    readonly language: ProviderLanguage
    readonly page: number
  }) => Promise<ProviderSearchPage>
}

// backend/src/domain/search.ts
export interface ProviderSearchPage {
  readonly page: number
  readonly items: readonly CatalogItem[]
  readonly totalPages?: number
}
```

- The adapter receives no adult flag from the caller; adult exclusion is a fixed adapter behavior.
- The adapter accepts no media type, filter, region, year, genre, or sort parameter.
- `ProviderSearchPage` carries no provider totals other than `totalPages`.
- `CatalogItem` is the existing feature 002 model; search introduces no parallel item type.

## TMDB implementation

| Aspect | Contract |
|---|---|
| Operation | `GET /3/search/multi` only |
| Parameters | `query`, `language`, `page`, `include_adult=false` |
| Authentication | Existing bearer token from backend configuration; never logged or echoed |
| Shared dependencies | The same `TmdbClient`, `ImageResolver`, and `GenreResolver` instances as the catalog adapter |
| Genre maps | Movie and TV genre lists resolved in parallel for the selected language; each item uses the map for its own media type |
| Images | Existing configuration-driven poster URLs (`w342`, `w780`); absent path means no poster |
| Timeouts/retries | Existing client behavior: explicit timeout, bounded idempotent retries with backoff and jitter, `Retry-After` respected |
| Response validation | Zod DTOs for the top-level response and each item; top-level failure maps to `CATALOG_INVALID_RESPONSE` |

Unused documented operations (per-type search, discover) MUST NOT be called by this adapter.

## Response DTO

The DTO tolerates provider variability and lets the mapper decide what is usable:

| Field | Type | Use |
|---|---|---|
| `page` | positive integer | Response page |
| `results` | array | Candidate items |
| `total_pages` | non-negative integer, optional | Pagination metadata only |
| `total_results` | non-negative integer, optional | Parsed but never exposed or used for display |
| item `id` | positive integer | Provider record identity; encoded into the opaque ID |
| item `media_type` | optional string | `movie` / `tv` kept; anything else excluded |
| item `title` / `name` | optional string | Localized title by media type |
| item `original_title` / `original_name` | optional string | Title fallback |
| item `release_date` / `first_air_date` | optional string | Release year extraction |
| item `poster_path` | optional string | Poster resolution |
| item `adult` | optional boolean | Adult exclusion |
| item `vote_average` / `vote_count` | optional number | Rating construction |
| item `genre_ids` | optional integer array | Localized genre resolution |
| item `popularity` | not declared | Never mapped, never exposed |

Unknown additional fields are ignored by the item schema. A missing or invalid required item field
(excluding provider content such as a missing title) drops that item only.

## Mapping rules

Applied in order; the first matching rule decides:

1. `adult === true` → drop.
2. `media_type` is not `movie` or `tv` → drop (covers `person` and future unknown types).
3. Provider ID missing, non-integer, or non-positive → drop.
4. Localized title and original title both unusable → drop.
5. Otherwise build a `CatalogItem`:
   - `title` = localized title when usable, else original title.
   - `originalTitle` only when usable and different.
   - `releaseYear` from a valid `YYYY-MM-DD` date; otherwise omitted.
   - `rating` only when the average is finite in `0..10` and `voteCount > 0`; rounded to one decimal.
   - `genres` from the media-type-specific localized genre map; unknown IDs omitted; may be empty.
   - `poster` from the existing resolver; omitted on missing path or configuration failure.
   - `id` encoded with the existing opaque codec (media type + provider ID).

Mapping invariants:

- Output order equals input order after drops.
- Duplicate opaque IDs within one page are removed first-occurrence-wins before output.
- No item is reordered, merged, or fabricated.
- Distinct works with the same display title stay separate.
- A dropped item never appears in counts or pagination.

## Service contract

`SearchService.getSearchPage({ query, language, page })`:

1. Re-validate the trimmed query (Unicode code-point length) and page (defense in depth; the
   controller validates first), including the named defensive page ceiling.
2. Compose the cache key from provider, `search`, normalized identity, language, and page.
3. Load through the search cache instance; concurrent identical misses share one promise.
4. Return `{ data: { page, items, totalPages?, hasMore }, meta }`, where `page` is the requested
   page and `hasMore = totalPages !== undefined && totalPages > page`, and `meta` carries language,
   stale flag, last update, and source.
5. Map provider failures to stable internal codes before the controller responds.

Cache contract:

| Aspect | Contract |
|---|---|
| Instance | A dedicated `CatalogCache` instance for search (separate from the catalog instance) |
| Fresh hit | Served with `stale: false`, `source: cache` |
| Expired + provider failure within stale window | Served with `stale: true`, `source: stale-cache`, original timestamp |
| Expired + no usable entry | Stable mapped error |
| Single flight | One in-flight provider request per key |
| Eviction | Bounded by the existing entry cap; expired entries evicted first |
| Parameters | Every result-affecting parameter is in the key: provider, operation, identity, language, page |

## Error mapping

| Provider outcome | Internal behavior |
|---|---|
| Timeout / abort | `ProviderTimeoutError` → `CATALOG_TIMEOUT` unless stale served |
| Network failure | `ProviderNetworkError` → `CATALOG_UNAVAILABLE` unless stale served |
| `429` | `ProviderRateLimitError` → `CATALOG_RATE_LIMITED` unless stale served; `Retry-After` respected |
| `400` / `422` | `ProviderHttpError` → `VALIDATION_ERROR` through a search-local mapping branch (query-attributable guidance, no retry); the shared catalog `mapProviderError` stays unchanged |
| Other `4xx` / `5xx` / auth | `ProviderHttpError` → `CATALOG_UNAVAILABLE` unless stale served |
| Invalid JSON or schema | `ProviderValidationError` → `CATALOG_INVALID_RESPONSE` unless stale served |

No provider message, status text, body, field name, credential, or query text is included in the
mapped error, logs, or response.

## What must not cross the boundary

- TMDB numeric IDs, `media_type` string values, `title`/`name`/`release_date`/`first_air_date` field
  names, `poster_path`, `genre_ids`, `popularity`, `total_results`, or raw provider errors.
- Provider credentials or base URLs in client-delivered assets.
- Any query text in logs, cache dumps, error payloads, analytics, or persistence.

## Contract tests

- Adapter unit tests assert the single operation, exact parameter set including
  `include_adult=false`, and no accidental filter parameters.
- Mapper tests cover movie, TV, `person`, missing `media_type`, adult, missing titles, invalid dates,
  zero-vote ratings, unknown genres, missing posters, invalid IDs, duplicate IDs within a page,
  all-invalid pages, and order preservation.
- Service tests cover empty-but-more pagination, omitted `totalPages`, requested-page echoing,
  cache key isolation, stale serving, single flight, the search-local 400/422 mapping, and every
  error mapping.
- Route integration tests assert the response envelope, status codes, `no-store`, and the absence of
  provider payloads, credentials, totals, and query text.
