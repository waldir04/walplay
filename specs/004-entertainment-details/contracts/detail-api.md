# Contract: Detail HTTP API

**Feature**: `004-entertainment-details` | **Type**: Internal JSON API contract

The SPA is the only consumer. The API mediates all TMDB access; no provider credential, DTO, field
name, provider identifier, or raw provider error crosses this boundary. Shapes are illustrative;
Zod schemas are the source of truth in implementation. API versioning remains deferred; all paths
extend the existing `/api/catalog` prefix.

## Base and transport

| Aspect | Contract |
|---|---|
| Base URL | `VITE_API_BASE_URL` (frontend), independently deployed backend |
| Methods | `GET` and `OPTIONS` only |
| Content type | `application/json; charset=utf-8` |
| CORS | Exact-origin allowlist from `CORS_ALLOWED_ORIGINS`; no wildcard; no credentials; `Vary: Origin` |
| Credentials | None between browser and Walplay API; TMDB bearer token is backend-only |
| API cache headers | `Cache-Control: no-store` on every detail route |
| Request correlation | Server-generated request ID returned as `X-Request-Id` |
| Body size | GET-only; no request body accepted |
| Timeouts | Backend provider timeout default 5 s; frontend request timeout 10 s |
| Compression | Enabled by deployment where supported |

## Endpoints

The core surface is one endpoint. Each secondary surface has its own endpoint so it can fail,
retry, and cache independently:

| # | Endpoint | Surface | Content types |
|---|---|---|---|
| 1 | `GET /api/catalog/:mediaType/titles/:itemId/detail` | Core identity, facts, overview, seasons list, collection membership, rating, popularity | movie, tv |
| 2 | `GET /api/catalog/:mediaType/titles/:itemId/credits` | Cast and key-crew previews | movie, tv |
| 3 | `GET /api/catalog/:mediaType/titles/:itemId/similar` | Similar titles | movie, tv |
| 4 | `GET /api/catalog/:mediaType/titles/:itemId/collection` | Collection membership parts | movie only |
| 5 | `GET /api/catalog/:mediaType/titles/:itemId/seasons/:seasonNumber` | Season header and episodes | tv only |

### Common parameters

| Name | In | Type | Rules |
|---|---|---|---|
| `mediaType` | path | `movie \| tv` | Required; authoritative for lookup |
| `itemId` | path | string | Required; `^[A-Za-z0-9_-]{8,64}$`; decodes to a positive provider id |
| `language` | query | `en \| es` | Required; mapped to `en-US` / `es-ES` |
| `seasonNumber` | path | integer string | Endpoint 5 only; `0..999`; `0` is specials |

Every endpoint validates `params` and `query` with Zod even when a part is empty. Unknown query
parameters are rejected as `VALIDATION_ERROR`. `language` is required on all five endpoints;
`seasonNumber` is a path parameter, never a query parameter. `mediaType` MUST match the type encoded
in `itemId`; a mismatch is `CATALOG_NOT_FOUND`, never a cross-type lookup.

### 1. `GET /api/catalog/:mediaType/titles/:itemId/detail`

Response `200` (movie):

```json
{
  "data": {
    "id": "d2wxMTptb3ZpZTo1NTA",
    "mediaType": "movie",
    "title": "Fight Club",
    "overview": "A ticking-time-bomb insomniac and a slippery soap salesman...",
    "tagline": "Mischief. Mayhem. Soap.",
    "releaseDate": "1999-10-15",
    "status": "released",
    "genres": [{ "id": "18", "name": "Drama" }],
    "runtime": { "minutes": 139, "kind": "movie" },
    "rating": { "value": 8.4, "voteCount": 30123, "scale": 10, "source": "tmdb" },
    "popularity": 63.421,
    "poster": {
      "url": "https://image.tmdb.org/t/p/w342/example.jpg",
      "urlLarge": "https://image.tmdb.org/t/p/w780/example.jpg"
    },
    "backdrop": {
      "url": "https://image.tmdb.org/t/p/w780/backdrop.jpg",
      "urlLarge": "https://image.tmdb.org/t/p/w1280/backdrop.jpg"
    },
    "collection": { "name": "Fight Club Collection" }
  },
  "meta": {
    "language": "en-US",
    "stale": false,
    "lastUpdatedAt": "2026-11-22T12:00:00.000Z",
    "source": "provider"
  }
}
```

Response `200` (TV):

```json
{
  "data": {
    "id": "d2wxMTp0djoyMTM",
    "mediaType": "tv",
    "title": "Dark",
    "overview": "A missing child sets four families on a frantic hunt...",
    "releaseDate": "2017-12-01",
    "status": "ended",
    "genres": [{ "id": "9648", "name": "Mystery" }],
    "episodeRuntime": { "minMinutes": 45, "maxMinutes": 60 },
    "rating": { "value": 8.4, "voteCount": 4210, "scale": 10, "source": "tmdb" },
    "popularity": 41.2,
    "poster": { "url": "https://image.tmdb.org/t/p/w342/poster.jpg" },
    "tvSummary": {
      "seasonsCount": 3,
      "episodesCount": 26,
      "firstAirDate": "2017-12-01",
      "latestAirDate": "2020-06-27",
      "networks": ["Netflix"]
    },
    "seasons": [
      { "number": 1, "name": "Season 1", "airYear": 2017, "episodeCount": 10 },
      { "number": 2, "name": "Season 2", "airYear": 2019, "episodeCount": 8 },
      { "number": 3, "name": "Season 3", "airYear": 2020, "episodeCount": 8 },
      { "number": 0, "name": "Specials", "episodeCount": 3 }
    ]
  },
  "meta": {
    "language": "en-US",
    "stale": false,
    "lastUpdatedAt": "2026-11-22T12:00:00.000Z",
    "source": "provider"
  }
}
```

Rules:

- `title` is required for a successful response. Absent localized title falls back to the original
  title; if neither is usable the response is `CATALOG_NOT_FOUND`.
- `overview` falls back to the original language before being omitted.
- A complete valid date yields `releaseDate`; a valid year without a complete date yields
  `releaseYear`. Neither is inferred from an unrelated provider field.
- `runtime` appears only for movies; `episodeRuntime` and `tvSummary` only for TV.
- `poster.urlLarge` is optional; when omitted, the interface uses `url` for both densities and
  still reserves the poster aspect ratio.
- `seasons` appears only for TV and only when at least one usable season exists; regular seasons
  ascend by number and specials (`0`) come last.
- `collection` is a membership signal for movies and contains only a display name.
- This endpoint returns no trailer field. Trailer inventory, player, and external fallback are owned
  by `specs/008-trailers-video-content/spec.md` and are not part of the detail response.
- Adult-flagged, removed, unknown, and unusable-identity titles return `CATALOG_NOT_FOUND`, never a
  partial object.

### 2. `GET /api/catalog/:mediaType/titles/:itemId/credits`

```json
{
  "data": {
    "cast": [
      { "name": "Edward Norton", "character": "The Narrator", "profile": { "url": "https://image.tmdb.org/t/p/w185/norton.jpg" } },
      { "name": "Brad Pitt", "character": "Tyler Durden", "profile": { "url": "https://image.tmdb.org/t/p/w185/pitt.jpg" } }
    ],
    "crew": [
      { "name": "David Fincher", "role": "director", "profile": { "url": "https://image.tmdb.org/t/p/w185/fincher.jpg" } },
      { "name": "Jim Uhls", "role": "writer" }
    ]
  },
  "meta": {
    "language": "en-US",
    "stale": false,
    "lastUpdatedAt": "2026-11-22T12:00:00.000Z",
    "source": "provider"
  }
}
```

Rules:

- `cast` is bounded to 10 usable credits in provider billing order.
- `crew` is bounded to 6 usable key credits; roles are limited to `director`, `creator`, `writer`.
- `profile` is optional at `w185`; absence or failure uses the neutral fallback carrying the name.
  `billingOrder` and `department` are adapter-internal and are not serialized; array order carries
  provider order.
- A person without a usable name is dropped.
- Duplicate person + role pairs are removed preserving provider order.
- Empty arrays mean the section is omitted; the response is still `200`. A provider 404 for credits is treated as empty previews, not as a missing title.
- A credits failure never affects the core detail response.

### 3. `GET /api/catalog/:mediaType/titles/:itemId/similar`

```json
{
  "data": {
    "items": [
      {
        "id": "d2wxMTptb3ZpZTo3NDU",
        "mediaType": "movie",
        "title": "Se7en",
        "releaseYear": 1995,
        "genres": [{ "id": "80", "name": "Crime" }],
        "poster": { "url": "https://image.tmdb.org/t/p/w342/se7en.jpg" }
      }
    ]
  },
  "meta": {
    "language": "en-US",
    "stale": false,
    "lastUpdatedAt": "2026-11-22T12:00:00.000Z",
    "source": "provider"
  }
}
```

Rules:

- Items use the catalog item contract so the existing card can render title, content type, year,
  genres, and artwork; the optional rating field is not displayed on related cards.
- Related-title cards MUST NOT render a rating in this feature: the shared catalog rating shape
  carries no source attribution, and FR-042 requires visible TMDB attribution on every displayed
  rating. The card renders title, content type, year, genres, and artwork only.
- Bounded to 12 after excluding the current title, adult titles, unsupported types, unusable
  identities, and duplicates.
- Provider order is preserved within the bounded subset.
- An empty array is `200`; the interface omits the section. A provider 404 for similar titles is treated as empty, not as a missing title.

### 4. `GET /api/catalog/:mediaType/titles/:itemId/collection`

Movie only. Returns `200` with an empty list when the title has no collection or the provider
reports no usable parts. TV requests return `CATALOG_NOT_FOUND`.

```json
{
  "data": {
    "name": "The Matrix Collection",
    "items": [
      {
        "id": "d2wxMTptb3ZpZTo2MDM",
        "mediaType": "movie",
        "title": "The Matrix",
        "releaseYear": 1999,
        "genres": [],
        "poster": { "url": "https://image.tmdb.org/t/p/w342/matrix.jpg" }
      }
    ]
  },
  "meta": {
    "language": "en-US",
    "stale": false,
    "lastUpdatedAt": "2026-11-22T12:00:00.000Z",
    "source": "provider"
  }
}
```

Rules:

- `items` is bounded to 12, excludes the current title, adult titles, unusable identities, and
  duplicates, and keeps provider order.
- The related-card rating rule from endpoint 3 applies: no rating is rendered on collection cards.
- `name` is omitted when unusable.
- A failed collection does not affect similar titles, credits, seasons, or core.

### 5. `GET /api/catalog/:mediaType/titles/:itemId/seasons/:seasonNumber`

TV only. Movie requests return `CATALOG_NOT_FOUND`.

```json
{
  "data": {
    "season": {
      "number": 1,
      "name": "Season 1",
      "airYear": 2017,
      "episodeCount": 10
    },
    "episodes": [
      {
        "number": 1,
        "name": "Secrets",
        "airDate": "2017-12-01",
        "runtimeMinutes": 51,
        "overview": "In 2019, a man disappears...",
        "still": { "url": "https://image.tmdb.org/t/p/w300/still.jpg" },
        "rating": { "value": 8.1, "voteCount": 820, "scale": 10, "source": "tmdb" }
      }
    ]
  },
  "meta": {
    "language": "en-US",
    "stale": false,
    "lastUpdatedAt": "2026-11-22T12:00:00.000Z",
    "source": "provider"
  }
}
```

Rules:

- Episodes are returned in provider order.
- A missing episode number and usable name drops the episode; a missing name with a usable number is
  kept and labeled by the interface.
- An empty `episodes` array is `200`; the interface shows a localized empty state inside the episode
  area.
- The season must be one the provider supplies. A missing or unsupported season number returns
  `DETAIL_SEASON_NOT_FOUND` so the frontend can fall back to the initial season without rendering a
  title-level not-found page.

## Error envelope

All failures use the existing single envelope:

```json
{ "error": { "code": "CATALOG_UNAVAILABLE", "message": "Detail data is temporarily unavailable.", "details": [] } }
```

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid path or query parameter |
| `CATALOG_NOT_FOUND` | 404 | Unknown, removed, adult, wrong-type, or unusable-identity title |
| `DETAIL_SEASON_NOT_FOUND` | 404 | TV title exists but the requested season is not supplied |
| `CATALOG_RATE_LIMITED` | 429 | Provider rate limit reached |
| `CATALOG_TIMEOUT` | 504 | Provider request timed out |
| `CATALOG_UNAVAILABLE` | 502 | Provider unreachable or network failure |
| `CATALOG_INVALID_RESPONSE` | 502 | Provider payload failed JSON or schema validation |
| `INTERNAL_ERROR` | 500 | Unexpected server failure |

Rules:

- Raw provider status codes, messages, response bodies, field names, and identifiers never appear
  in errors.
- The frontend maps `CATALOG_NOT_FOUND` to the title not-found state, `DETAIL_SEASON_NOT_FOUND` to
  initial-season fallback, and the remaining failures to a recoverable surface error with retry.
- A malformed `itemId` that fails the pattern is `VALIDATION_ERROR` at the API; the frontend detects
  the malformed address before requesting and renders the localized not-found state.
- A path `mediaType` that disagrees with the type encoded in `itemId` is `CATALOG_NOT_FOUND`; the API
  never resolves the other type.
- Repeated failure returns the same stable code.

## Caching and freshness

- The backend caches provider responses in the existing generic cache with fresh and stale TTLs
  from configuration.
- Cache keys include provider, surface, media type, provider identity, language, and season:
  `tmdb:detail:<mediaType>:<providerId>:<language>`,
  `tmdb:credits:<mediaType>:<providerId>:<language>`,
  `tmdb:similar:<mediaType>:<providerId>:<language>`,
  `tmdb:collection:<mediaType>:<providerId>:<language>`,
  `tmdb:season:<providerId>:<season>:<language>`.
- `meta.stale`, `meta.source`, and `meta.lastUpdatedAt` describe the served entry.
- The frontend labels stale data and never presents it as current.
- API responses are `no-store` so intermediaries cannot hide freshness metadata.

## Provider calls per endpoint

| Endpoint | TMDB call(s) |
|---|---|
| detail (movie) | `/movie/{id}` with `append_to_response=videos`; optional second `/movie/{id}` with original language only when localized overview is unusable |
| detail (tv) | `/tv/{id}` with `append_to_response=videos`; optional second `/tv/{id}` with original language only when localized overview is unusable |
| credits (movie) | `/movie/{id}/credits` |
| credits (tv) | `/tv/{id}/aggregate_credits` |
| similar (movie/tv) | `/movie/{id}/similar` or `/tv/{id}/similar` |
| collection (movie) | `/collection/{id}` after reading membership from cached movie detail |
| season (tv) | `/tv/{id}/season/{season_number}` |

No other TMDB operation, parameter, or undocumented endpoint is used.
