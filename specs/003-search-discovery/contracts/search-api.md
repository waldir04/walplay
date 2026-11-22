# Contract: Search HTTP API

**Feature**: `003-search-discovery` | **Type**: Internal JSON API contract

The SPA is the only consumer. The API mediates all TMDB access; no provider credential, DTO,
provider field name, popularity value, or raw provider error crosses this boundary. Shapes are
illustrative; Zod schemas are the source of truth in implementation. API versioning remains
deferred; the path prefix is `/api/search`.

## Base and transport

| Aspect | Contract |
|---|---|
| Base URL | `VITE_API_BASE_URL` (frontend), independently deployed backend |
| Methods | `GET` and `OPTIONS` only |
| Content type | `application/json; charset=utf-8` |
| CORS | Exact-origin allowlist from `CORS_ALLOWED_ORIGINS`; no wildcard; no credentials; `Vary: Origin` |
| Credentials | None between browser and Walplay API; TMDB bearer token is backend-only |
| API cache headers | `Cache-Control: no-store` on every search response and error |
| Request correlation | Existing server-generated `X-Request-Id`; logs use it, responses do not expose internals |
| Body size | GET only; no request body accepted |
| Timeouts | Backend provider timeout default 5 s; frontend request timeout 10 s with `AbortSignal` |
| Compression | Enabled by deployment where supported |

## Endpoint

### `GET /api/search`

Parameters:

| Name | In | Type | Rules |
|---|---|---|---|
| `query` | query | string | Required. Trimmed; at least 2 non-whitespace Unicode code points; at most 200 code points. Internal whitespace preserved. Never transformed for the provider beyond trimming. |
| `language` | query | `en \| es` | Required; mapped to provider `en-US` / `es-ES` |
| `page` | query | positive integer | Optional, default `1`; maximum `SEARCH_MAX_REQUEST_PAGE` (1000), a defensive request-safety limit and not a claim about provider pagination |

Validation rules:

- `body`, `params`, and `query` are validated with Zod; unknown query keys are rejected (`strict`).
- Query length is counted in Unicode code points, not UTF-16 units; a 200-code-point query that
  contains astral-plane characters is accepted, and a 201-code-point query is rejected.
- A page above the named defensive maximum is rejected as invalid input without a provider call.
- A duplicated `query` key (array) is not accepted; the browser address rule guaranteeing the first
  occurrence is a frontend concern (see `contracts/routes.md`).
- Empty, whitespace-only, too-short, and too-long queries return `VALIDATION_ERROR` and never reach
  the provider.
- Adult exclusion is enforced server-side with `include_adult=false`; the client cannot override it.
- No filters, region, year, genre, sort, or media-type parameters are accepted (FR-075).

Response `200`:

```json
{
  "data": {
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
      },
      {
        "id": "d2wxMTp0djoyMDA",
        "mediaType": "tv",
        "title": "Example Show",
        "releaseYear": 2019,
        "genres": [],
        "poster": { "url": "https://image.tmdb.org/t/p/w342/example-show.jpg" }
      }
    ],
    "totalPages": 200,
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

- `items` contain only valid, non-adult, `movie` and `tv` results, deduplicated within the page by
  opaque ID with first occurrence winning, in provider order (FR-004, FR-031, FR-032, FR-035).
- Invalid individual items are dropped. A response where every item is invalid is a successful
  empty page, not an error.
- `page` echoes the requested page; provider page metadata is used only to derive `totalPages` and
  `hasMore`.
- `totalPages` is omitted when the provider does not report it.
- `totalResults` is intentionally **not** returned. The provider total includes excluded types and
  MUST NOT be presented as the number of movie/TV matches (FR-028).
- `hasMore` is `totalPages > page`. It is `true` for an empty page when the provider reports more
  pages (FR-029), and `false` when `totalPages` is absent.
- `meta.stale` is `true` only when last-known-good data was served after a provider failure.
- `meta.source` is `provider`, `cache`, or `stale-cache`.
- The response never echoes the query text.

## Error envelope

Every non-2xx response uses the constitutional envelope:

```json
{
  "error": {
    "code": "CATALOG_UNAVAILABLE",
    "message": "Search is temporarily unavailable.",
    "details": []
  }
}
```

- `message` is a stable English developer message, never shown directly to users.
- `details` is optional, contains only safe field names or validation paths, and never contains
  provider payloads, status text, credentials, tokens, query text, or stack traces.
- The frontend localizes by `code`; it does not display `message`.

| Code | HTTP | Meaning for search |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid/empty/short/long query, language, page, or unknown key (Walplay request-shape validation), or a provider 400/422 attributable to the query. Query-attributable rejections render editable guidance without retry; request-shape failures are not reachable from the shipped client. |
| `CATALOG_RATE_LIMITED` | 429 | Provider rate limit with no usable stale entry |
| `CATALOG_TIMEOUT` | 504 | Provider timeout with no usable stale entry |
| `CATALOG_UNAVAILABLE` | 502 | Network, authorization, 5xx, or provider outage with no usable stale entry |
| `CATALOG_INVALID_RESPONSE` | 502 | Provider response failed boundary validation and no stale entry exists |
| `INTERNAL_ERROR` | 500 | Unexpected server failure |
| `ROUTE_NOT_FOUND` | 404 | Unknown API path |
| `CATALOG_NOT_FOUND` | 404 | Not produced by this endpoint; reserved for shared envelope compatibility |

Provider status mapping:

| Provider outcome | Internal code |
|---|---|
| `400` / `422` (query attributable) | `VALIDATION_ERROR` |
| `429` with no stale entry | `CATALOG_RATE_LIMITED` |
| Abort/timeout with no stale entry | `CATALOG_TIMEOUT` |
| Other network/5xx/auth failure with no stale entry | `CATALOG_UNAVAILABLE` |
| JSON/schema failure | `CATALOG_INVALID_RESPONSE` |

## Privacy and logging

- The query text MUST NOT appear in logs, error responses, analytics, storage, or the response body.
- Logs may contain only existing safe fields: request ID, route, language, page, provider, outcome,
  status class, and duration. No query field is added.
- Provider payloads and credentials MUST NOT be logged.
- The address is the only place the query is retained, and it is under the visitor's control.

## Contract tests

Both applications must cover this contract:

- **Backend** route integration: envelope, status mapping, required/invalid/short/long query
  (including astral-plane code-point counting), language/page validation including the named page
  maximum, unknown and duplicated keys, `Cache-Control: no-store`, CORS preflight, empty-but-more
  pagination, absence of `totalResults`, absence of query/provider data in errors.
- **Backend** service/mapper: exclusion rules, order preservation, within-page first-occurrence
  dedupe, `hasMore` derivation, requested-page echoing, cache hit/stale/single-flight,
  normalized-query cache reuse, and the search-local provider 400/422 mapping without changing the
  shared catalog error mapper.
- **Frontend** schema tests: the same response shapes, optional fields, error codes, and stale
  metadata; fixtures stay consistent with this document.
- Shared fixture values (query, languages, page metadata) must match on both sides without sharing
  code.
