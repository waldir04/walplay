# Contract: Catalog HTTP API

**Feature**: `002-entertainment-catalog` | **Type**: Internal JSON API contract

The SPA is the only consumer. The API mediates all TMDB access; no provider credential or provider
DTO crosses this boundary. Shapes are illustrative; Zod schemas are the source of truth in
implementation. API versioning remains deferred; the path prefix is `/api/catalog`.

## Base and transport

| Aspect | Contract |
|---|---|
| Base URL | `VITE_API_BASE_URL` (frontend), independently deployed backend |
| Methods | `GET` and `OPTIONS` only on catalog routes |
| Content type | `application/json; charset=utf-8` |
| CORS | Exact-origin allowlist from `CORS_ALLOWED_ORIGINS`; no wildcard; no credentials; `Vary: Origin` |
| Credentials | None between browser and Walplay API; TMDB bearer token is backend-only |
| API cache headers | `Cache-Control: no-store` so freshness/stale metadata is never hidden by an intermediary |
| Request correlation | Server-generated request ID returned as `X-Request-Id`; logs use it, responses do not expose internals |
| Body size | GET-only; no request body accepted |
| Timeouts | Backend provider timeout default 5 s; frontend request timeout 10 s with `AbortController` |
| Compression | Enabled by deployment where supported |

## Endpoints

### `GET /api/catalog/capabilities`

Returns the active provider's section declarations. Language-independent.

Response `200`:

```json
{
  "data": {
    "sections": [
      { "id": "trending", "order": 1, "mediaTypes": ["movie", "tv"], "paginated": false },
      { "id": "popular", "order": 2, "mediaTypes": ["movie", "tv"], "paginated": true },
      { "id": "top-rated", "order": 3, "mediaTypes": ["movie", "tv"], "paginated": true }
    ]
  }
}
```

Rules:

- Order is authoritative and returned in declared order.
- `paginated` is a documentation-derived declaration, not inferred from response fields.
- The frontend renders only sections present here for the requested media type.
- Capability failure produces a page-level unavailable state; no fallback list is invented.

### `GET /api/catalog/:mediaType/:section`

Parameters:

| Name | In | Type | Rules |
|---|---|---|---|
| `mediaType` | path | `movie \| tv` | Required |
| `section` | path | `trending \| popular \| top-rated` | Required; must be supported for the media type |
| `language` | query | `en \| es` | Required; mapped to provider `en-US` / `es-ES` |
| `page` | query | positive integer | Optional, default `1`; `trending` accepts only `1` |

Response `200`:

```json
{
  "data": {
    "mediaType": "movie",
    "section": "popular",
    "page": 1,
    "items": [
      {
        "id": "d2wxMTptb3ZpZTo1NTA",
        "mediaType": "movie",
        "title": "Fight Club",
        "originalTitle": "Fight Club",
        "releaseYear": 1999,
        "rating": { "value": 8.4, "voteCount": 30123, "scale": 10 },
        "genres": [{ "id": "18", "name": "Drama" }],
        "poster": {
          "url": "https://image.tmdb.org/t/p/w342/example.jpg",
          "urlLarge": "https://image.tmdb.org/t/p/w780/example.jpg"
        }
      }
    ],
    "totalPages": 500,
    "totalResults": 10000,
    "hasMore": true
  },
  "meta": {
    "language": "en-US",
    "stale": false,
    "lastUpdatedAt": "2026-11-22T15:00:00.000Z",
    "source": "provider"
  }
}
```

Rules:

- Items are valid, non-adult, deduplicated within the page, in provider order.
- Invalid items are dropped; an all-invalid response is an empty successful page, not a crash.
- `totalPages` and `totalResults` are omitted when the provider does not report them.
- `hasMore` is true only when pagination is supported and a next page is reported.
- For `trending`, the response is a first-page preview and `hasMore` is always `false`; a `page`
  greater than `1` is `VALIDATION_ERROR`.
- `meta.stale` is true only when last-known-good data was used after a provider failure.

### `GET /api/catalog/:mediaType/titles/:itemId`

Parameters:

| Name | In | Type | Rules |
|---|---|---|---|
| `mediaType` | path | `movie \| tv` | Must match the type encoded in the opaque ID |
| `itemId` | path | opaque string | Base64url, 8–64 chars; decoded and validated server-side |
| `language` | query | `en \| es` | Required |

Response `200`:

```json
{
  "data": {
    "id": "d2wxMTptb3ZpZTo1NTA",
    "mediaType": "movie",
    "title": "Fight Club",
    "originalTitle": "Fight Club",
    "releaseYear": 1999,
    "rating": { "value": 8.4, "voteCount": 30123, "scale": 10 },
    "genres": [{ "id": "18", "name": "Drama" }],
    "poster": {
      "url": "https://image.tmdb.org/t/p/w342/example.jpg",
      "urlLarge": "https://image.tmdb.org/t/p/w780/example.jpg"
    }
  },
  "meta": {
    "language": "en-US",
    "stale": false,
    "lastUpdatedAt": "2026-11-22T15:00:00.000Z",
    "source": "provider"
  }
}
```

Rules:

- Only card fields are returned. No overview, cast, seasons, episodes, availability, or provider
  identifiers.
- Unknown, invalid, mismatched-type, or adult-flagged items return `CATALOG_NOT_FOUND`.
- The endpoint never fabricates missing metadata.

### `GET /api/health`

Returns `200 { "status": "ok" }` without calling the provider. Used for deployment liveness only.

## Error envelope

Every non-2xx response uses the constitutional envelope:

```json
{
  "error": {
    "code": "CATALOG_UNAVAILABLE",
    "message": "Catalog data is temporarily unavailable.",
    "details": []
  }
}
```

- `message` is a stable English developer message, never shown directly to users.
- `details` is optional, contains only safe field names or validation paths, and never contains
  provider payloads, status text, credentials, tokens, or stack traces.
- The frontend localizes by `code`; it does not display `message`.

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid path/query, unknown key, unsupported section, or invalid page for the section |
| `CATALOG_NOT_FOUND` | 404 | Unknown title, invalid ID, type mismatch, or adult-flagged title |
| `CATALOG_RATE_LIMITED` | 429 | Provider rate limit with no usable stale entry |
| `CATALOG_TIMEOUT` | 504 | Provider timeout with no usable stale entry |
| `CATALOG_UNAVAILABLE` | 502 | Network, authorization, 5xx, or provider outage with no usable stale entry |
| `CATALOG_INVALID_RESPONSE` | 502 | Provider response failed boundary validation and no stale entry exists |
| `INTERNAL_ERROR` | 500 | Unexpected server failure |
| `ROUTE_NOT_FOUND` | 404 | Unknown API path |

## Validation rules

- `body`, `params`, and `query` are validated with Zod on every catalog route. Unknown query keys are
  rejected (`strict`).
- `language` is a literal union; unsupported languages are `VALIDATION_ERROR`.
- `page` is a positive integer; non-integers, zero, negatives, and oversized values are rejected.
- `itemId` must match `^[A-Za-z0-9_-]{8,64}$` before decoding.
- A section not declared for the media type is `VALIDATION_ERROR`.
- Provider status mapping: `404` -> `CATALOG_NOT_FOUND` for detail; `429` ->
  `CATALOG_RATE_LIMITED`; abort/timeout -> `CATALOG_TIMEOUT`; other provider/network failures ->
  `CATALOG_UNAVAILABLE`; schema failure -> `CATALOG_INVALID_RESPONSE`.
- No response may contain a TMDB token, API key, provider error body, provider field name, raw
  provider status text, or internal stack trace.

## Contract tests

Both applications must cover this contract:

- Backend route integration tests assert the envelope, status mapping, query validation, CORS
  preflight, opaque ID handling, stale metadata, and absence of secrets/payloads in responses.
- Frontend schema tests assert the same response shapes, error codes, and stale metadata; unknown
  fields are tolerated only where the schema declares them.
- Fixtures are checked into the test suites and must stay consistent with this document.
