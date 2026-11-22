# Contract: Provider Boundary

**Feature**: `002-entertainment-catalog` | **Type**: Backend adapter and resilience contract

All provider access is server-side. The catalog depends on this interface, never on TMDB shapes.

## Adapter interface

```ts
interface CatalogProvider {
  readonly id: 'tmdb';

  capabilities(): Promise<readonly CatalogSectionCapability[]>;

  fetchSectionPage(input: {
    readonly mediaType: MediaType;
    readonly section: SectionId;
    readonly language: ProviderLanguage;
    readonly page: number;
  }): Promise<ProviderSectionPage>;

  fetchItem(input: {
    readonly mediaType: MediaType;
    readonly providerId: number;
    readonly language: ProviderLanguage;
  }): Promise<ProviderItem | null>;
}
```

- `CatalogProvider` is internal and never serialized.
- The service validates capability support before calling the adapter.
- Replacing the provider requires a new adapter plus capability declaration; controllers, routes, and
  the browser contract remain unchanged.
- The adapter may use additional internal helpers (client, schemas, mapper, images, genres). None of
  those types may appear in `domain/`.

## TMDB capability declaration

| Domain section | Provider call | Provider params | Paginated |
|---|---|---|---|
| `trending` (movie) | `/trending/movie/week` | `language` | No |
| `trending` (tv) | `/trending/tv/week` | `language` | No |
| `popular` (movie) | `/movie/popular` | `language`, `page` | Yes |
| `popular` (tv) | `/tv/popular` | `language`, `page` | Yes |
| `top-rated` (movie) | `/movie/top_rated` | `language`, `page` | Yes |
| `top-rated` (tv) | `/tv/top_rated` | `language`, `page` | Yes |
| detail (movie) | `/movie/{id}` | `language` | n/a |
| detail (tv) | `/tv/{id}` | `language` | n/a |
| genres | `/genre/{movie\|tv}/list` | `language` | n/a |
| image configuration | `/configuration` | none | n/a |

- Trending uses the weekly window and is preview-only. A page value greater than 1 is rejected by
  the API contract rather than silently ignored.
- No `region` parameter is sent and no regional claim is made.
- No discover filters, search, or additional categories are introduced.
- Undocumented endpoints are prohibited.

## Authentication and secrets

- Use the documented bearer access token from `TMDB_ACCESS_TOKEN` in the `Authorization` header.
- The token is read only in backend configuration and passed only to the provider client.
- The token is never placed in a URL, query string, image URL, browser response, log line, error
  envelope, test fixture, or source map.
- `401`/`403` produce `CATALOG_UNAVAILABLE`; the provider message is logged only as a safe status
  classification, never as a payload.

## Request policy

| Concern | Contract |
|---|---|
| Timeout | `AbortSignal.timeout(TMDB_TIMEOUT_MS)`, default 5000 ms |
| Retries | At most `TMDB_MAX_RETRIES` (default 2) for idempotent GETs only |
| Backoff | Exponential with full jitter, base 200 ms, capped at 2 s |
| Rate limit | `429` maps to `CATALOG_RATE_LIMITED`; `Retry-After` is respected; no blind retry storm |
| Concurrent identical reads | Single-flight coordination in the cache |
| Logging | Request ID, provider, route, media type, section, language, page, duration, outcome, status class; never token, payload, title, or provider error body |
| User agent | A documented Walplay identifier where provider terms permit |

## Validation and mapping

Provider responses are Zod-validated before mapping. Invalid top-level shapes raise
`CATALOG_INVALID_RESPONSE`; invalid individual items are dropped.

| Internal field | Source rule |
|---|---|
| `mediaType` | Request media type; mismatch with an explicit provider type drops the item |
| `title` | Localized title when non-empty, else original title; both unusable -> drop |
| `originalTitle` | Included only when usable and different from `title` |
| `releaseYear` | First four digits of a valid `release_date` / `first_air_date`; invalid/empty -> omitted |
| `rating` | Only when average is finite and within `0..10` and `vote_count > 0`; else omitted |
| `genres` | Localized names resolved from the genre list; unknown IDs omitted |
| `poster` | Resolved from configuration base URL + approved size + non-empty file path; else omitted |
| `id` | Opaque base64url `wl1:<mediaType>:<providerId>`; raw provider ID never serialized |
| adult | Items with `adult === true` are excluded before mapping |

**Mapper invariants**:

- Never invents a title, date, rating, genre, poster, or popularity explanation.
- Never exposes provider field names or numeric popularity scores.
- Never re-sorts; provider order is preserved.
- Never logs a provider item or payload.
- Never maps an item without usable identity and title.

## Genre resolution

- Genre lists are requested once per media type and language and cached separately.
- Genre resolution failure degrades to omitted genres; it does not fail a section or item.
- Raw genre identifiers are never sent to the client.
- Unknown IDs and empty lists are omitted.

## Artwork resolution

- `GET /configuration` supplies the secure base URL and poster sizes; the result is cached with
  `TMDB_IMAGE_CONFIG_TTL_SECONDS` (default 24 h).
- Approved sizes: `w342` for grid cards and `w780` for the larger candidate.
- Missing configuration or file path omits artwork; cards use the neutral fallback.
- The browser loads images from the documented image host without credentials.
- Walplay does not alter, recolor, or rebrand provider artwork.
- Artwork licensing, caching, and display remain subject to legal review (OD-13).

## Cache contract

`catalog-cache.ts` stores entries with:

| Field | Meaning |
|---|---|
| `value` | Internal mapped response data |
| `freshUntil` | End of the freshness period (`TMDB_CACHE_TTL_SECONDS`) |
| `staleUntil` | End of the labeled stale-serving window (`TMDB_CACHE_STALE_SECONDS`) |
| `lastUpdatedAt` | Provider fetch time used in response metadata |

Rules:

- Fresh hit: return without provider traffic.
- Expired with a usable stale entry: attempt provider; on failure return the entry with
  `stale: true` and `source: "stale-cache"`.
- Expired with no stale entry: return the stable error code.
- Cache key includes every result-affecting parameter: media type, section, language, page, and
  provider ID for detail. Image configuration and genre lists have their own keys.
- Identical concurrent misses share one in-flight promise.
- Entries are bounded by `TMDB_CACHE_MAX_ENTRIES`; expired entries are evicted first.
- No provider payload is stored beyond the mapped internal model.
- Cache is process-local; multi-instance deployments may serve different cached copies. Correctness
  comes from provider-authoritative content and explicit stale labeling.

## Error classification

| Condition | Internal code |
|---|---|
| Provider `429` (no stale) | `CATALOG_RATE_LIMITED` |
| Provider/connection timeout (no stale) | `CATALOG_TIMEOUT` |
| Provider `401`/`403`/`5xx`, network failure (no stale) | `CATALOG_UNAVAILABLE` |
| Response schema failure (no stale) | `CATALOG_INVALID_RESPONSE` |
| Detail `404`, invalid/mismatched ID, adult item | `CATALOG_NOT_FOUND` |
| Unexpected server exception | `INTERNAL_ERROR` |

Errors are mapped once, in the service or a dedicated mapper, not in controllers. Controllers map
the typed error to HTTP status and the envelope. Nothing provider-specific reaches the client.

## Security and compliance checklist

- [ ] No TMDB credential in frontend source, build output, source maps, or browser requests.
- [ ] No raw provider payload, field list, status text, or internal identifier in responses/logs.
- [ ] Provider terms, attribution, artwork, caching, and rate limits confirmed before production.
- [ ] No scraping, undocumented endpoints, authentication bypass, or region bypass.
- [ ] Adult titles excluded server-side on every path.
- [ ] Attribution mark and non-endorsement statement present on every provider-data surface.
