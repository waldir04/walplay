# Contract: Availability Provider Boundary

**Feature**: `006-streaming-availability` | **Type**: Backend provider integration

The availability feature uses TMDB's documented watch-provider capability as its initial source.
TMDB supplies data powered by JustWatch. No new vendor is introduced. The adapter isolates TMDB so
the source can be replaced without changing the service, controller, route, or frontend behavior.

## Provider interface

```ts
export interface AvailabilityProvider {
  readonly id: AvailabilityProviderId
  readonly fetchAvailability: (input: {
    readonly mediaType: MediaType
    readonly providerId: number
    readonly region: string
  }) => Promise<ProviderAvailability | null>
}
```

`AvailabilityProviderId` is `'tmdb'` today and is modelled as an extensible union so a replacement
adapter does not require changing the interface or its callers.

`ProviderAvailability` is an internal provider-neutral shape:

```ts
interface ProviderAvailability {
  readonly groups: readonly AvailabilityGroup[]
  readonly destination?: { readonly url: string }
  readonly sourceUpdatedAt?: string
}
```

- `null` means the source responded successfully but has no country entry for the requested region.
  The service maps `null`, like an empty country entry, to the `no-information` state; it is never an
  error and never evidence of unavailability.
- An empty `groups` array with a destination means the country entry exists but has no usable offers.
- `sourceUpdatedAt` is optional because TMDB's watch-provider response has no freshness field.
  The adapter must not invent one.
- `AvailabilityGroup` and `AvailabilityProviderEntry` are the internal domain shapes. Provider ids
  are not part of the public provider entity.

## TMDB operation

| Need | Operation |
|---|---|
| Movie availability | `GET /movie/{id}/watch/providers` |
| TV availability | `GET /tv/{id}/watch/providers` |

- Use the existing `TmdbClient` with its bearer token, user agent, timeout, bounded retry with
  jitter, and `AbortSignal`.
- Do not add `language`; the operation is language-independent for this use.
- Do not use `append_to_response`; availability is a separate secondary surface.
- Do not call TMDB's watch-provider region/provider list operations for the initial release. The
  region allowlist is a Walplay validation policy, not a provider-completeness claim.
- Do not scrape JustWatch, provider sites, or undocumented endpoints.

## DTO validation

The adapter validates the response with Zod before mapping. At minimum:

```text
watchProvidersDto
  id: number
  results?: Record<string, {
    link?: string | null
    flatrate?: WatchProviderDto[] | null
    free?: WatchProviderDto[] | null
    ads?: WatchProviderDto[] | null
    rent?: WatchProviderDto[] | null
    buy?: WatchProviderDto[] | null
  }> | null

WatchProviderDto
  logo_path?: string | null
  provider_id: number
  provider_name?: string | null
  display_priority?: number | null
```

- Extra unknown fields are ignored by Zod.
- Missing/empty category arrays are treated as absent.
- Missing results or a missing region key produces `null`.
- Invalid numbers, names, or paths do not crash the whole response; unusable offers are dropped.
- A response that fails the top-level schema maps to `CATALOG_INVALID_RESPONSE`.

## Category mapping

| TMDB group | Internal category | User-facing label |
|---|---|---|
| `flatrate` | `subscription` | Included with a subscription |
| `free` | `free` | Free |
| `ads` | `ads` | Free with ads |
| `rent` | `rent` | Rent |
| `buy` | `buy` | Buy |

- Groups are emitted in the fixed order above.
- Unknown groups are omitted.
- A category with no usable providers is omitted.
- Do not merge categories or infer a category from a provider name, price, popularity, or another
  group.
- OD-SA8 remains open for ad-supported scope. Removing the `ads` mapping is an isolated change.

## Provider mapping

For each category:

1. Read the source array.
2. Trim `provider_name`.
3. Drop empty, whitespace-only, `n/a`, `null`, `undefined`, and `tbd` names.
4. Drop records without a usable provider identity.
5. Deduplicate by source `provider_id` within the category, preserving the first usable record.
6. Sort by `display_priority` ascending; when missing, use a large sentinel; ties preserve source
   array order.
7. Resolve the logo only when `AVAILABILITY_LOGOS_ENABLED=true`. If the image configuration is
   unavailable or the path is unusable, omit the logo. The name remains.
8. Emit `{ name, logo? }`. Never emit the source provider id.

**Ordering invariants**:

- Category order is fixed.
- Provider order is source priority, not alphabetical, popularity, or Walplay ranking.
- No provider is duplicated within a category.
- A provider in multiple categories appears in each supplied category.

## Destination validation

The source may supply one aggregate `link` per country entry. It is optional.

Accept only when:

- The value parses as a URL.
- The protocol is `https:`.
- The host is in `AVAILABILITY_DESTINATION_HOSTS` (default official TMDB hosts).
- No username or password is present.
- If a `locale` query parameter is present, its value matches the active region case-insensitively.
  A language-region form such as `es-CO` is accepted when its region subtag matches the active
  region; a different region is rejected.
- The URL is not a redirector, shortener, player, stream, or download endpoint.

The adapter returns the URL exactly as supplied. It never constructs, rewrites, or normalizes the
path or query beyond validation. An invalid destination is omitted; it is never replaced with a
search engine, provider home page, affiliate URL, or Walplay redirect.

Provider entries are never linked. There is no per-provider destination in the initial release.

## Cache

Use the existing `CatalogCache` class with a dedicated instance:

| Setting | Default | Notes |
|---|---|---|
| Fresh TTL | 6 h | Availability changes slowly; avoids per-request provider calls |
| Stale TTL | 7 days | Matches the spec's last-known retention |
| Max entries | 500 | Bounded process-local memory |

Cache key:

```text
<provider.id>:availability:<mediaType>:<providerId>:<region>
```

- The key includes media type, provider id, and region, and the prefix comes from the adapter's
  `id` rather than a hardcoded provider name, so the service is not coupled to TMDB.
- The key excludes language because the data is language-independent.
- Single-flight is provided by `CatalogCache`.
- A provider failure returns the stale entry when it is within the stale TTL; otherwise the failure
  propagates.
- A successful response always replaces the cache entry, including an empty/no-information result.

## Freshness and retention

The service, not the provider adapter, owns freshness semantics:

1. `lastUpdatedAt` is the cache entry's observation time (or the current fetch time).
2. `sourceUpdatedAt` is accepted only if it parses and is not in the future.
3. `applicableTimestamp` is the earlier of a valid source timestamp and the observation time.
4. `freshness` is `stale` when `now - applicableTimestamp > 24 h`.
5. `stale` is true when the cache source is `stale-cache` or freshness is stale.
6. If the applicable timestamp is older than 7 days, return the source-error state and do not return
   offers.
7. If the source supplies no timestamp, the interface shows the labeled Walplay check time. It never
   claims source freshness.

The adapter must not set `sourceUpdatedAt` from a documentation date, release date, or any field that
is not an actual source update timestamp.

## Error mapping

| Provider condition | Service result |
|---|---|
| 404 | `CATALOG_NOT_FOUND` (404) |
| 429 | `CATALOG_RATE_LIMITED` (429) |
| Timeout | `CATALOG_TIMEOUT` (504) |
| 5xx / network failure | `CATALOG_UNAVAILABLE` (502) |
| Invalid/unparseable payload | `CATALOG_INVALID_RESPONSE` (502) |
| Unknown/unexpected | `INTERNAL_ERROR` (500) |

No raw provider error, status body, URL, token, or field name reaches the client. The frontend maps
the stable code to a localized availability error with retry.

## Logging and privacy

- Do not log the TMDB bearer token, full provider URL, provider payload, or region preference value.
- Logging may include the outcome, status class, cache source, and a request correlation id.
- Provider failures are correlated with the request id through the existing middleware and logger.
- No unnecessary personal data is collected. The only visitor-level input is the coarse region code
  and the local device preference.

## Legal and release gates

- **Attribution**: TMDB documentation requires JustWatch attribution when using this capability.
  The exact wording, link, logo, and placement are OD-SA4. Until confirmed, the UI uses a text-only
  JustWatch attribution and keeps the existing TMDB notice visible.
- **Logos**: Provider logo references are omitted unless `AVAILABILITY_LOGOS_ENABLED=true` after
  brand-display permission is confirmed. Names remain visible.
- **Commercial terms**: TMDB's free tier is non-commercial with attribution; commercial use requires
  a license. OD-SA5 remains a release gate.
- **Coverage**: Colombia appears in official examples but completeness is not guaranteed. OD-SA7
  requires representative validation before release.
- **Link policy**: The aggregate source page is the only external destination; per-provider links are
  out of scope for the initial release.
- **No playback**: This boundary never returns streams, players, DRM data, downloads, subscription
  actions, or provider account operations.
- **No scraping**: Only the documented TMDB operation is used. Undocumented JustWatch endpoints and
  provider pages are prohibited.

If TMDB fails the coverage, attribution, or commercial gates, the provider-neutral interface allows
Watchmode or a JustWatch direct relationship to be evaluated as a replacement without rewriting the
feature. That replacement requires a new provider adapter, contract validation, and legal review.
