# Contract: Trailer Inventory HTTP API

**Feature**: `008-trailers-video-content` | **Type**: Internal JSON API contract

The SPA is the only consumer. The API mediates all provider access; no provider credential, DTO, field
name, provider record id, or numeric provider id crosses this boundary. Shapes are illustrative; Zod
schemas are the source of truth in implementation. API versioning remains deferred; the path extends
the existing `/api/catalog` prefix.

## Base and transport

| Aspect | Contract |
|---|---|
| Base URL | `VITE_API_BASE_URL` (frontend), independently deployed backend |
| Methods | `GET` and `OPTIONS` only |
| Content type | `application/json; charset=utf-8` |
| CORS | Exact-origin allowlist from `CORS_ALLOWED_ORIGINS`; no wildcard; no credentials |
| Credentials | None between browser and Walplay API; the TMDB token is backend-only |
| API cache headers | `Cache-Control: no-store` on the trailer route |
| Request correlation | Server-generated request ID returned as `X-Request-Id` |
| Body | No request body accepted |
| Timeouts | Backend provider timeout from existing config (default 5 s); frontend request timeout 10 s |
| Language | No language parameter; inventory is language-independent; the server cache key is `provider + trailers + mediaType + providerId` |
| Cache identity | The interface language is never part of the cache key; language affects presentation ordering only |
| Region | No region parameter; country metadata is not availability data |
| Feature gate | Route is mounted only when `TRAILERS_ENABLED=true` |
| Retries | Bounded provider retries for the idempotent read only; no automatic client retry |

## Endpoint

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `GET /api/catalog/:mediaType/titles/:itemId/videos` | One title's normalized, ranked trailer inventory |

### Parameters

| Name | In | Type | Rules |
|---|---|---|---|
| `mediaType` | path | `movie \| tv` | Required; authoritative for lookup |
| `itemId` | path | string | Required; `^[A-Za-z0-9_-]{8,64}$`; decoded with the existing `decodeItemId` helper to a positive provider id |

No query parameters are accepted. Any query parameter is `400 VALIDATION_ERROR`.

### 1. `GET /api/catalog/:mediaType/titles/:itemId/videos`

Response `200` — available:

```json
{
  "data": {
    "state": "available",
    "videos": [
      {
        "id": "youtube:dQw4w9WgXcQ",
        "platform": "youtube",
        "platformName": "YouTube",
        "videoId": "dQw4w9WgXcQ",
        "title": "Official Trailer",
        "type": "trailer",
        "official": true,
        "language": "en",
        "publishedAt": "2026-01-15T12:00:00.000Z",
        "embedUrl": "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1",
        "externalUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      },
      {
        "id": "youtube:abc123DEF45",
        "platform": "youtube",
        "platformName": "YouTube",
        "videoId": "abc123DEF45",
        "title": "Teaser",
        "type": "teaser",
        "official": false,
        "externalUrl": "https://www.youtube.com/watch?v=abc123DEF45"
      }
    ]
  },
  "meta": {
    "stale": false,
    "lastUpdatedAt": "2026-11-24T12:00:00.000Z",
    "source": "provider",
    "freshness": "current"
  }
}
```

Response `200` — no eligible video:

```json
{
  "data": {
    "state": "no-videos",
    "videos": []
  },
  "meta": {
    "stale": false,
    "lastUpdatedAt": "2026-11-24T12:05:00.000Z",
    "source": "cache",
    "freshness": "current"
  }
}
```

Field rules:

| Field | Rules |
|---|---|
| `state` | `available` requires at least one video; `no-videos` has an empty array |
| `videos[].id` | `youtube:<videoId>`; stable list identity; safe to render |
| `videos[].platform` | `youtube` only in the initial release |
| `videos[].platformName` | Factual platform name; never presented as a Walplay brand |
| `videos[].videoId` | Canonical 11-character identifier; not a URL |
| `videos[].title` | Provider-supplied, non-empty, never translated or rewritten |
| `videos[].type` | One of `trailer`, `teaser`, `clip`, `featurette`, `behind-the-scenes`, `bloopers` |
| `videos[].official` | `true` only when explicitly marked; never inferred |
| `videos[].language` | Optional ISO 639-1 code that resolves through `Intl.DisplayNames`; omitted when unusable; display label is localized client-side |
| `videos[].publishedAt` | Optional valid, non-future ISO timestamp; omitted when invalid or implausible |
| `videos[].embedUrl` | Optional; documented embed shape on the configured embed host |
| `videos[].externalUrl` | Optional; canonical watch destination on the configured external host |
| `videos[].size`, country, ratings, provider order, provider record id | Never present |

`videos` is already ranked by the backend: type order, official first, provider order, identifier.
The backend returns at most 24 ranked videos. The client may apply the documented interface-language
refinement, but must not filter, drop, or reorder beyond it.

Invariants:

- At least one of `embedUrl` and `externalUrl` is present on every video; otherwise the record is
  dropped before the response.
- URLs are HTTPS, host-allowlisted, constructed from the validated identifier, and contain no visitor
  identifier, session token, analytics, advertising, or personalization parameter.
- No stream URL, media file, download reference, mirror, or redirect URL is ever returned.
- `lastUpdatedAt` is a server observation time and never in the future.
- Stale data is labeled through `meta.stale` and `meta.freshness`; it is never presented as current.
- Beyond the seven-day retention boundary the response is the unavailable error, not stale data.
- Inventory is keyed by `mediaType` and `itemId`; a late response for a previously viewed title never
  populates another title's section or announcements.

## Error responses

All errors use the existing envelope:

```json
{ "error": { "code": "CATALOG_UNAVAILABLE", "message": "...", "details": ["..."] } }
```

| Situation | Status | Code |
|---|---|---|
| Malformed `itemId` | 400 | `VALIDATION_ERROR` |
| Unknown query parameter | 400 | `VALIDATION_ERROR` |
| `mediaType` does not match `itemId` | 404 | `CATALOG_NOT_FOUND` |
| Provider reports title not found | 404 | `CATALOG_NOT_FOUND` |
| Provider payload fails validation | 502 | `CATALOG_INVALID_RESPONSE` |
| Provider timeout | 504 | `CATALOG_TIMEOUT` |
| Provider rate limit | 429 | `CATALOG_RATE_LIMITED` |
| Provider unavailable after bounded retries | 502 | `CATALOG_UNAVAILABLE` |
| Inventory older than retention | 502 | `CATALOG_UNAVAILABLE` |
| Capability disabled | — | Route not mounted; existing `404 ROUTE_NOT_FOUND` behavior |

Messages remain stable English developer-facing strings; the interface localizes the code. Raw
provider payloads, status codes, stack traces, and player error codes never appear in a response.

## Contract tests

- Envelope parses with the frontend Zod schema for both states.
- Disabled flag: route is absent; no provider call.
- Malformed item id and media-type mismatch return the specified codes.
- Every response carries `Cache-Control: no-store`.
- Fixture inventories with an official trailer, mixed types, mixed languages, duplicate identifiers,
  malformed keys, non-YouTube sites, unknown types, and missing titles produce the expected normalized
  list.
