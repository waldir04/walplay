# Phase 1 Data Model: Search and Discovery

**Feature**: `003-search-discovery` | **Date**: 2026-11-22

This feature adds no persistence. Every entity below is either a runtime value derived from the
address and provider responses or a contract shape crossing the Walplay API boundary. Zod schemas
are the source of truth in implementation; the shapes here are illustrative.

---

## 1. Search Query

The visitor's active search text, derived from the address (frontend) or query string (backend).

| Field | Type | Rules |
|---|---|---|
| `raw` | `string` | As supplied by the address, decoded; may contain internal whitespace; may be empty |
| `trimmed` | `string` | `raw.trim()`; this is what the provider receives |
| `identity` | `string` | `trimmed` with whitespace runs collapsed to one space and case folded; used only for request identity and caching |
| `nonWhitespaceLength` | `number` | `Array.from(trimmed).filter(ch => !/\s/u.test(ch)).length` |
| `length` | `number` | Count of Unicode code points in `trimmed` |
| `validity` | `'empty' \| 'too-short' \| 'too-long' \| 'valid'` | Discriminated union; see rules |
| `language` | `'en' \| 'es'` | Selected interface language, not part of the query text |

Rules:

- `empty` when `trimmed` is empty.
- `too-short` when `nonWhitespaceLength < 2`.
- `too-long` when `length > 200`.
- `valid` otherwise.
- Only `valid` may produce a provider request.
- `identity` is never displayed and never sent to the provider.
- The query is user input: never translated, rewritten, or rendered as markup (FR-070).
- On the frontend, validity is expressed as a Zod schema/refinement consumed by both the form and
  the address parser, so the controlled input and the address share one source of truth
  (Principle VI). Length is counted in Unicode code points.

Frontend and backend implement the same rules independently with the same named constants; contract
tests assert agreement. The backend re-validates rather than trusting the client.

---

## 2. Search Request Identity

The deduplication and cache identity of one search request.

| Component | Source | Notes |
|---|---|---|
| provider | adapter `id` (`tmdb`) | Prevents cross-provider collisions |
| operation | literal `search` | Distinguishes from catalog cache entries |
| `identity` | Search Query identity | Case/whitespace-insensitive |
| `language` | `en-US` / `es-ES` in the backend cache key; `en` / `es` in the frontend query key | Every parameter that affects results |
| `page` | positive integer | One identity per page |

Invariant: two raw queries with the same identity, language, and page MUST NOT produce more than one
in-flight provider request, and MUST reuse a fresh cached page (FR-014, FR-078, FR-079).

Frontend key: `['catalog', 'search', identity, language]` (the page is the infinite-query page
parameter and `language` is the interface locale `en`/`es`). Backend key:
`tmdb:search:<identity>:<language>:<page>` with the provider language `en-US`/`es-ES`.

---

## 3. Search Result Item

Search does not introduce a new item type. It reuses the catalog item contract exactly.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | opaque string | yes | `^[A-Za-z0-9_-]{8,64}$`; encodes media type + provider record ID |
| `mediaType` | `'movie' \| 'tv'` | yes | Type label is always rendered in text |
| `title` | non-empty string | yes | Provider localized title when usable, else original title |
| `originalTitle` | non-empty string | no | Present only when different from `title` |
| `releaseYear` | integer 1888–2100 | no | From release/first-air date; invalid or empty dates omitted |
| `rating` | `{ value, voteCount, scale: 10 }` | no | Only when finite `0..10` and `voteCount > 0` |
| `genres` | `{ id, name }[]` | yes (may be empty) | Localized resolved names only; unknown IDs omitted |
| `poster` | `{ url, urlLarge? }` | no | Approved provider sizes; absent means card fallback |

Exclusion rules applied at the provider boundary, in order:

1. `adult === true` → excluded.
2. `media_type` not `movie` or `tv` (for example `person`) → excluded.
3. Missing or non-positive provider ID → excluded.
4. Neither a usable localized nor original title → excluded.
5. Item fails schema validation → excluded.

Excluded items do not reorder the remaining items. A response where every item is excluded is a
successful empty page, not an error (FR-031, FR-032, FR-004).

Two distinct works with the same display title remain separate because `id` includes media type and
provider record ID (FR-035).

---

## 4. Search Result Page

One requested provider page mapped to the internal contract.

| Field | Type | Required | Notes |
|---|---|---|---|
| `page` | positive integer | yes | Echoes the requested page |
| `items` | Search Result Item[] | yes | Valid, non-adult, movie/TV only, deduplicated within the page by the mapper (first occurrence wins), provider order |
| `totalPages` | non-negative integer | no | Present only when the provider reports it |
| `hasMore` | boolean | yes | `totalPages !== undefined && totalPages > page` |

`totalResults` is intentionally absent from the contract. The provider's unified total includes
excluded types and MUST NOT be exposed as a match count (FR-028, R-02).

Invariants:

- `items` order equals the provider's order after exclusions.
- `hasMore` is true for an empty page when the provider reports more pages (FR-029).
- `hasMore` is false when `totalPages` is absent, ending pagination safely.

Wire shape:

```json
{
  "data": { "page": 1, "items": [], "totalPages": 2, "hasMore": true },
  "meta": {
    "language": "en-US",
    "stale": false,
    "lastUpdatedAt": "2026-11-22T15:00:00.000Z",
    "source": "provider"
  }
}
```

`meta` reuses the catalog response metadata: provider language, stale flag, original fetch time,
and `source` (`provider | cache | stale-cache`).

---

## 5. Accumulated Search Results (frontend)

The rendered collection is derived from `useInfiniteQuery().data.pages`.

| Field | Type | Notes |
|---|---|---|
| `items` | Search Result Item[] | Pages appended in load order |
| `duplicates` | number | Count of dropped repeated IDs; not displayed |
| `hasMore` | boolean | From the last loaded page |
| `meta` | Response metadata | From the last loaded page; drives the stale label |

Rules:

- Append-only. Existing items and their order are never removed or re-sorted on append.
- Duplicate opaque IDs across pages are dropped (FR-035).
- The displayed count is `items.length`, labeled as titles currently shown, never as total matches
  (FR-028).
- A new identity or language starts a new query key; the previous pages are not carried over
  (FR-016, FR-053).
- `loadedPageHadNoTitles` is true when the last appended page had zero valid items while `hasMore`
  remained true; this drives the interim-empty message (FR-029).

---

## 6. Search State

The observable state of the search surface. Exactly one primary state is rendered for the results
region (guidance states are rendered with the form instead).

| State | Trigger | Results region | Retry | Announcement |
|---|---|---|---|---|
| `initial-guidance` | No `q` in address | Not rendered | no | none |
| `empty-guidance` | `q` trims to empty | Not rendered | no | none |
| `too-short-guidance` | Non-whitespace length < 2 | Not rendered | no | polite guidance (once) |
| `too-long-guidance` | Length > 200 | Not rendered | no | polite guidance (once) |
| `settling` | Input differs from active query, timer pending | Previous results for active query, labelled with that query | no | none |
| `loading` | Current key has no data and is fetching | Skeleton, `aria-busy` | no | polite "searching" |
| `success` | Current key has ≥1 item | Cards in provider order | no | polite displayed count |
| `appending` | `isFetchingNextPage` | Existing cards + busy load more | no | none |
| `interim-empty` | Page succeeded with 0 valid items and `hasMore` | Existing results or guidance body; "page had no titles" | load more remains | polite once |
| `no-results` | Page(s) settled, 0 items, `hasMore === false` | Localized no-results with query echoed and edit/clear action | no | polite once |
| `stale` | `meta.stale === true` with items, or an active-query refresh failed while results were displayed | Cards plus cached-label and last-update time | inline for the failed refresh | polite once |
| `unavailable` | Failure, no usable items | Localized alert with retry | yes | assertive once |
| `rate-limited` | `CATALOG_RATE_LIMITED`, no usable items | Localized alert with retry | yes | assertive once |
| `timed-out` | `CATALOG_TIMEOUT`, no usable items | Localized alert with retry | yes | assertive once |
| `query-invalid` | `VALIDATION_ERROR` (including provider query rejection) | Editable guidance with query echoed; no retry | no | polite once |
| `page-error` | `isFetchNextPageError` with existing items | Inline localized alert with retry for that page | yes | assertive once |
| `end-of-results` | `hasMore === false` after at least one item | Load more removed; end message | no | polite once; focus moves here if load more had focus |

Transitions:

```text
initial-guidance --settled valid query--> loading
empty/too-short/too-long-guidance --settled valid query--> loading
loading --success with items--> success
loading --success without items, hasMore--> interim-empty
loading --success without items, no hasMore--> no-results
loading --failure--> unavailable | rate-limited | timed-out | query-invalid
success --load more--> appending --success items--> success
appending --success without items, hasMore--> interim-empty
appending --success, no more pages--> end-of-results
appending --failure--> page-error --retry--> appending
success --refresh fails--> stale (inline retry; results retained and labeled cached)
unavailable --explicit retry--> loading
any --query or language change--> loading (new key; previous data discarded)
any --clear--> initial-guidance
```

Invariants:

- No request is issued for `empty`, `too-short`, or `too-long`.
- `no-results` only after a successful response with zero valid items and no further pages.
- A failure never presents as `no-results`; an empty success never presents as an error.
- Superseded query/language responses cannot change the rendered state or announcements.
- Retry is presented only for failures, never for query-invalid guidance.
- A pending load more cannot be activated twice.
- No interval, focus, or reconnect refetch issues provider requests; only settle, submit, load
  more, explicit retry, and language change do.

---

## 7. Search Origin Context

The information needed for the existing detail destination to return to the active search.

| Field | Type | Notes |
|---|---|---|
| `from` | internal path string | `/search?q=<encoded active query>` supplied via router location state; the active query whose results are displayed, never the input draft |
| `origin` | `'search' \| 'catalog'` | Derived by the return resolver |

Rules:

- Search result cards pass a full `pathname + search` origin. Catalog cards keep passing the
  catalog pathname.
- The return resolver accepts only an internal `/search` path whose query is syntactically present;
  malformed or foreign origins fall back to the media landing.
- Catalog origins keep their existing landing/category behavior.
- The detail address remains `/browse/<type>/title/:itemId`; Browse remains the navigation current
  destination.
- On direct open or reload the state is absent, so the fallback is the media landing; no fabricated
  search state and no error.
- Browser back needs no extra state: it returns to the previous address, and the query key restores
  session results when present.

---

## 8. Provider Search Capability

Conceptual record of what the adapter may rely on; no capability endpoint is exposed.

| Aspect | Value |
|---|---|
| Operation | `GET /3/search/multi` only |
| Parameters sent | `query`, `language`, `page`, `include_adult=false` |
| Result types | `movie`, `tv`, `person`, and potentially others; only the first two kept |
| Pagination metadata | `page`, `total_pages`, `total_results`; only `total_pages` used |
| Language values | `en-US`, `es-ES` via the existing mapping |
| Per-type operations | Documented but intentionally unused |
| Discovery operations | Intentionally unused; filters are out of scope |

The adapter never sends filters, region, year, genre, or sort parameters (FR-075).

---

## 9. Configuration Inventory

No new environment variable is introduced.

| Setting | Source | Value / use |
|---|---|---|
| Query minimum | Named constant in both applications | 2 non-whitespace characters |
| Query maximum | Named constant in both applications | 200 code points |
| Settling interval | Frontend named constant | 350 ms |
| Provider timeout | `TMDB_TIMEOUT_MS` | Existing backend config |
| Provider retries | `TMDB_MAX_RETRIES` | Existing backend config |
| Cache freshness | `TMDB_CACHE_TTL_SECONDS` | Existing, reused by search cache |
| Cache stale window | `TMDB_CACHE_STALE_SECONDS` | Existing, reused by search cache |
| Cache entry cap | `TMDB_CACHE_MAX_ENTRIES` | Existing, reused by search cache |
| Image configuration TTL | `TMDB_IMAGE_CONFIG_TTL_SECONDS` | Existing |
| Client `staleTime` / `gcTime` | `CATALOG_STALE_TIME_MS` / `CATALOG_GC_TIME_MS` | Existing shared values |
| Provider language map | `LANGUAGE_TO_PROVIDER` (frontend) / `toProviderLanguage` (backend) | Existing |
| API base URL / CORS | `VITE_API_BASE_URL` / `CORS_ALLOWED_ORIGINS` | Existing |

---

## 10. Invariants Summary

1. The address is the only query context that survives navigation; nothing is persisted.
2. One normalized identity + language + page maps to at most one request and one cache entry.
3. Only movie and TV results are displayed; excluded types never affect order or counts.
4. Only the number of valid displayed titles is shown, never the provider total.
5. `hasMore` comes from provider page metadata, not from the item count.
6. Appends are order-preserving and duplicate-free by opaque ID.
7. No-results, query-invalid guidance, and failures are three distinct states.
8. Only the newest query and language can change results, counts, pagination, focus, or
   announcements.
9. Retry re-attempts the failed request only, is never automatic for the same invalid query, and
   never creates concurrent duplicates.
10. The detail destination stays unique and falls back to the media landing when the search origin
    cannot be restored.
