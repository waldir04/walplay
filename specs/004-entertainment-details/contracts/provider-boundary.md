# Contract: Provider Boundary

**Feature**: `004-entertainment-details` | **Type**: Internal provider adapter contract

TMDB remains the only approved metadata provider. The backend is the only caller. Provider DTOs,
field names, identifiers, and errors never cross the API boundary. The adapter is replaceable:
services depend on `DetailProvider`, not on TMDB shapes.

## Adapter shape

```text
DetailProvider {
  readonly id: 'tmdb'
  readonly fetchDetail: (input: {
    mediaType: 'movie' | 'tv'
    providerId: number
    language: 'en-US' | 'es-ES'
  }) => Promise<ProviderTitleDetail | null>
  readonly fetchCredits: (input: {...}) => Promise<Credits>
  readonly fetchSimilar: (input: {...}) => Promise<RelatedTitle[]>
  readonly fetchCollection: (input: {
    providerId: number
    language: 'en-US' | 'es-ES'
    collectionProviderId: number
  }) => Promise<RelatedCollection>
  readonly fetchSeason: (input: {
    providerId: number
    seasonNumber: number
    language: 'en-US' | 'es-ES'
  }) => Promise<SeasonEpisodes | null>
}
```

```text
ProviderTitleDetail = {
  detail: TitleDetail
  collectionProviderId?: number   # internal only; never serialized to the API
}
```

`fetchDetail` returns `null` for a title the provider reports as absent. The service converts `null`
to `CATALOG_NOT_FOUND`. Adult-flagged and unusable-identity titles are also mapped to `null`
(not-found) and never to a partial detail.

The service caches this internal envelope, returns only `detail` to the API, and reads
`collectionProviderId` from the cached core entry before calling `fetchCollection`. The frontend
never sends or receives a provider collection id.

## TMDB operations

| Surface | Operation | Parameters | Notes |
|---|---|---|---|
| Movie core | `GET /movie/{movie_id}` | `language`, `append_to_response=videos` | `videos` is one appended item, below the documented 20-item limit |
| TV core | `GET /tv/{series_id}` | `language`, `append_to_response=videos` | Response includes `seasons`, `number_of_seasons`, `number_of_episodes`, `first_air_date`, `last_air_date` |
| Movie credits | `GET /movie/{movie_id}/credits` | `language` | `cast` billing order; `crew` jobs |
| TV credits | `GET /tv/{series_id}/aggregate_credits` | `language` | Crew jobs appear per member |
| Similar | `GET /movie/{movie_id}/similar` or `GET /tv/{series_id}/similar` | `language`, `page=1` | Only the first page is used; the interface is bounded |
| Collection | `GET /collection/{collection_id}` | `language` | Called only after cached core membership is known |
| Season | `GET /tv/{series_id}/season/{season_number}` | `language` | Episodes in provider order |

Rules:

- Only documented v3 GET operations are used. No scraping, undocumented endpoints, authentication
  bypass, or alternate providers.
- `append_to_response` is limited to `videos`. Secondary surfaces are separate requests so they can
  fail independently.
- A provider 404 on core returns `null`; a provider 404 on a season is mapped by the service to
  `DETAIL_SEASON_NOT_FOUND`; other provider failures map to the existing stable codes.
- No request contains a user identifier, query history, or personal data.

## Zod validation at the adapter

Every provider response is validated before mapping. Schemas are intentionally permissive about
unknown extra fields but strict about the fields Walplay consumes:

| Schema | Key fields |
|---|---|
| `movieDetailDto` | `id`, `title`, `original_title`, `overview`, `tagline`, `release_date`, `original_language`, `poster_path`, `backdrop_path`, `adult`, `vote_average`, `vote_count`, `popularity`, `runtime`, `status`, `genres[]`, `belongs_to_collection`, `videos.results[]` |
| `tvDetailDto` | `id`, `name`, `original_name`, `overview`, `tagline`, `first_air_date`, `last_air_date`, `original_language`, `poster_path`, `backdrop_path`, `adult`, `vote_average`, `vote_count`, `popularity`, `episode_run_time[]`, `status`, `genres[]`, `number_of_seasons`, `number_of_episodes`, `seasons[]`, `networks[]`, `videos.results[]` |
| `creditsDto` | `cast[]` (`id`, `name`, `character`, `order`, `profile_path`), `crew[]` (`id`, `name`, `job`, `department`, `profile_path`) |
| `aggregateCreditsDto` | `cast[]` (`id`, `name`, `order`, `roles[]`, `profile_path`), `crew[]` (`id`, `name`, `jobs[]`, `profile_path`) |
| `similarDto` | list response with media items (`id`, titles/names, dates, `poster_path`, `adult`, rating, `genre_ids`) |
| `collectionDto` | `id`, `name`, `parts[]` movie items |
| `seasonDto` | `id`, `name`, `season_number`, `air_date`, `poster_path`, `episodes[]` (`episode_number`, `name`, `air_date`, `runtime`, `overview`, `still_path`, `vote_average`, `vote_count`) |
| `imageConfigurationDto` | `images.secure_base_url`, `poster_sizes`, `backdrop_sizes`, `profile_sizes`, `still_sizes` |

Optional and nullable provider fields are narrowed by the mapper, never asserted. A payload that
fails schema validation raises `ProviderValidationError`, which maps to `CATALOG_INVALID_RESPONSE`.

## Mapping rules

### Identity and text

| Internal field | Source | Rules |
|---|---|---|
| `title` | movie `title`/`original_title`, TV `name`/`original_name` | Trim; localized first, original fallback; title placeholders per field class; both unusable → not-found |
| `overview` | `overview` | Localized first; conditional original-language request fallback; placeholders/empty omitted |
| `tagline` | `tagline` | Usable value only; never used as overview |
| `originalTitle` | `original_title` / `original_name` | Only when different from `title` |
| `status` | `status` | Case-insensitive literal mapping; unknown omitted |
| `genres` | `genres[]` | Usable names only; unknown ids omitted; duplicates removed preserving order |

**Placeholder classes**:

- Title fields: `n/a`, `null`, `undefined`, `tbd`.
- Descriptive/optional text fields: `n/a`, `na`, `tbd`, `unknown`, `untitled`, `-`, `--`, `—`.
- `Unknown` and `Untitled` are not treated as placeholders for primary titles.

### Dates and durations

| Internal field | Source | Rules |
|---|---|---|
| `releaseDate` / `releaseYear` | `release_date` / `first_air_date` | Strict `YYYY-MM-DD`; year `1888..2100`; invalid omitted; no inference |
| `runtime` | movie `runtime` | Integer `1..900`; otherwise omitted |
| `episodeRuntime` | TV `episode_run_time[]` | Filter to valid integers `1..600`; distinct; one → typical; several → min/max range; none → omitted |
| `tvSummary.firstAirDate/latestAirDate` | `first_air_date` / `last_air_date` | Same date rules |
| Season `airYear` | `air_date` | Valid year only |
| Episode `airDate` | `air_date` | Valid complete date or year |

### Numeric facts

| Internal field | Source | Rules |
|---|---|---|
| `rating.value` | `vote_average` | Finite, `> 0`, `<= 10`; rounded to one decimal |
| `rating.voteCount` | `vote_count` | Integer `> 0`; otherwise no rating |
| `rating.scale` | constant | `10` |
| `rating.source` | constant | `'tmdb'` |
| `popularity` | `popularity` | Finite and `> 0`; otherwise omitted |
| `tvSummary.seasonsCount` | `number_of_seasons` | Integer `>= 0`; provider-reported |
| `tvSummary.episodesCount` | `number_of_episodes` | Integer `>= 0`; provider-reported |
| `tvSummary.networks` | `networks[].name` | Usable names only; deduplicated; at most 5; order preserved |
| Season `episodeCount` | `episode_count` | Integer `>= 0`; omitted otherwise |
| Episode `number` | `episode_number` | Integer `0..9999`; otherwise unusable identity |

### Artwork

| Asset | Source | Sizes | Fallback |
|---|---|---|---|
| Poster | `poster_path` | `w342`, `w780` | Existing neutral poster fallback with title + type |
| Backdrop | `backdrop_path` | `w780`, `w1280` | Poster or neutral treatment; never carries identity alone |
| Profile | `profile_path` | `w185` | Neutral person fallback carrying the name |
| Still | `still_path` | `w300` | Omitted; episode remains identifiable |

Paths are normalized to a leading slash and resolved against the image base URL. A missing base URL
or unusable path yields no image. Original-size images are not requested.

### Credits

| Rule | Behavior |
|---|---|
| Cast order | Provider billing/order preserved |
| Cast bound | First 10 usable after exclusions |
| Crew order | Provider order preserved |
| Crew bound | First 6 usable after role mapping and dedupe |
| Job mapping | `Director` → `director`; `Creator` → `creator`; `Writer`, `Screenplay`, `Story`, `Teleplay` → `writer` |
| Character (TV aggregate) | First usable role character; omitted otherwise |
| Dedupe | Person identity + mapped role; first occurrence wins |
| Drop | No usable person name |
| Omit | Unmapped jobs, unknown departments, blank characters |

### Related titles

| Rule | Behavior |
|---|---|
| Source | Similar endpoint; collection parts endpoint |
| Type | Keep only `movie`/`tv` |
| Identity | Positive safe integer provider id and usable title |
| Adult | Drop |
| Current title | Drop from both similar and collection parts |
| Duplicates | Drop after first occurrence per section |
| Bound | 12 per section after exclusions |
| Order | Provider order within the displayed subset |
| Genre names | Resolve `genre_ids` through the existing genre resolver |
| Empty | Omit the section |

Similar and collection sections are never merged and never share a prepared list.

### Trailer reference

- Select from `videos.results` where `site` is `YouTube`, `type` is `Trailer`, and `key` matches
  `^[A-Za-z0-9_-]{6,20}$`.
- Prefer `official === true`; otherwise use the first eligible trailer in provider order.
- Build `https://www.youtube.com/watch?v=<key>`; never embed or play in-page.
- The interface renders this reference only when `DETAIL_CAPABILITIES.trailer` is enabled. Link-out
  authorization (OD-D3/OD-D6) is a release dependency.
- No third-party player, unauthorized source, or fallback video is introduced.

## Language and fallback

| Aspect | Contract |
|---|---|
| Interface → provider | `en` → `en-US`; `es` → `es-ES` |
| Localized fields | Requested language first |
| Original-language fallback | Only when localized overview is unusable and `original_language` differs from the requested base; one conditional detail request in the original language. A tagline from that response is used only when it was fetched and usable; otherwise the tagline is omitted |
| Cache effect | Alternate-language response cached under the effective language key used for the request |
| Fallback failure | Swallowed for the optional field; the overview or tagline is omitted and the core detail still succeeds |
| Titles | No second request; `original_title`/`original_name` is in the same response |
| Interface copy | Never provider text and never machine-translated |

## Timeout, retry, rate limits, and cache

| Aspect | Contract |
|---|---|
| Timeout | Existing configurable TMDB timeout (default 5 s) per request |
| Retries | Bounded idempotent GET retries with exponential backoff and full jitter, existing client behavior |
| Rate limits | Honor provider 429 and `Retry-After` within the existing bounded policy; otherwise stable `CATALOG_RATE_LIMITED` |
| Cache | Existing `CatalogCache` with configured fresh/stale TTLs, entry cap, single-flight |
| Cache keys | `tmdb:detail:<mediaType>:<providerId>:<language>`, `tmdb:credits:<mediaType>:<providerId>:<language>`, `tmdb:similar:<mediaType>:<providerId>:<language>`, `tmdb:collection:<mediaType>:<providerId>:<language>`, `tmdb:season:<providerId>:<season>:<language>` |
| Stale behavior | Serve last-known-good within the stale window with `meta.stale = true` and `source = 'stale-cache'` |
| No cache | Failure maps to a stable error; no fabricated content |
| Persistence | Process-local only; lost on restart |

## Failure mapping

| Provider condition | Internal error | HTTP |
|---|---|---|
| 404 on core detail | `CATALOG_NOT_FOUND` | 404 |
| 404 on season | `DETAIL_SEASON_NOT_FOUND` | 404 |
| 404 on credits or similar | Empty preview data | 200 |
| 404 on collection | Empty collection data | 200 |
| 401/403 | `CATALOG_UNAVAILABLE` | 502 |
| 429 | `CATALOG_RATE_LIMITED` | 429 |
| 5xx after bounded retries | `CATALOG_UNAVAILABLE` | 502 |
| Network/timeout | `CATALOG_UNAVAILABLE` / `CATALOG_TIMEOUT` | 502 / 504 |
| Invalid JSON or failed Zod validation | `CATALOG_INVALID_RESPONSE` | 502 |
| Unexpected mapper failure | `INTERNAL_ERROR` | 500 |

Raw provider errors are logged at most as an internal category with the request id, never with
credentials, full payloads, or user-facing text.

## Authorization and legal boundary

- Bearer token is backend-only and never included in frontend configuration, bundles, or errors.
- Attribution, artwork usage, caching retention, and trailer link-out must follow current official
  TMDB guidance. The existing attribution widget and keys are reused; wording is not improvised.
- Caching uses configured TTLs; OD-D5 must confirm retention before increasing them.
- Trailer link-out remains disabled until OD-D3/OD-D6 are resolved.
- No undocumented endpoints, scraping, authentication bypass, DRM circumvention, or unauthorized
  media sources.
