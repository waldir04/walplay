# Contract: Streaming Availability HTTP API

**Feature**: `006-streaming-availability` | **Type**: Internal JSON API contract

The SPA is the only consumer. The API mediates all provider access; no provider credential, DTO, field
name, provider id, or raw provider error crosses this boundary. Shapes are illustrative; Zod schemas
are the source of truth in implementation. API versioning remains deferred; all paths extend the
existing `/api/catalog` prefix.

## Base and transport

| Aspect | Contract |
|---|---|
| Base URL | `VITE_API_BASE_URL` (frontend), independently deployed backend |
| Methods | `GET` and `OPTIONS` only |
| Content type | `application/json; charset=utf-8` |
| CORS | Exact-origin allowlist from `CORS_ALLOWED_ORIGINS`; no wildcard; no credentials |
| Credentials | None between browser and Walplay API; the TMDB token is backend-only |
| API cache headers | `Cache-Control: no-store` on every availability route |
| Request correlation | Server-generated request ID returned as `X-Request-Id` |
| Body size | GET-only; no request body accepted |
| Timeouts | Backend provider timeout default 5 s; frontend request timeout 10 s |
| Language | No language parameter; availability data is language-independent |
| Feature gate | Routes are mounted only when `AVAILABILITY_ENABLED=true` |

## Endpoints

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `GET /api/catalog/:mediaType/titles/:itemId/availability?region=CO` | One title's availability in one region |
| 2 | `GET /api/catalog/availability/regions` | The validated region allowlist |

### Common parameters

| Name | In | Type | Rules |
|---|---|---|---|
| `mediaType` | path | `movie \| tv` | Required; authoritative for lookup |
| `itemId` | path | string | Required; matches `ITEM_ID_PATTERN` (`^[A-Za-z0-9_-]{8,64}$`); decoded with the existing `decodeItemId` helper to a positive provider id |
| `region` | query | string | Optional; two ASCII letters; normalized uppercase; defaults to `CO`; must be in the validated allowlist to receive data |

Every endpoint validates params and query with Zod. Unknown query parameters are rejected as
`VALIDATION_ERROR`. `mediaType` must match the type encoded in `itemId`; a mismatch is
`CATALOG_NOT_FOUND`, never a cross-type lookup. A malformed item id or region syntax is
`VALIDATION_ERROR`. Language is deliberately absent: provider names are supplied as-is and all
interface copy is localized client-side.

### 1. `GET /api/catalog/:mediaType/titles/:itemId/availability`

Response `200` — available:

```json
{
  "data": {
    "state": "available",
    "region": "CO",
    "groups": [
      {
        "category": "subscription",
        "providers": [
          {
            "name": "HBO Max",
            "logo": {
              "url": "https://image.tmdb.org/t/p/w92/example-hbo.png",
              "urlLarge": "https://image.tmdb.org/t/p/w154/example-hbo.png"
            }
          },
          { "name": "Movistar Play" }
        ]
      },
      {
        "category": "rent",
        "providers": [{ "name": "Google Play Movies" }]
      }
    ],
    "destination": {
      "url": "https://www.themoviedb.org/movie/550-fight-club/watch?locale=CO"
    }
  },
  "meta": {
    "stale": false,
    "lastUpdatedAt": "2026-11-23T12:00:00.000Z",
    "source": "provider",
    "freshness": "current"
  }
}
```

Response `200` — no information found:

```json
{
  "data": {
    "state": "no-information",
    "region": "CO",
    "groups": [],
    "destination": {
      "url": "https://www.themoviedb.org/tv/1399-game-of-thrones/watch?locale=CO"
    }
  },
  "meta": {
    "stale": false,
    "lastUpdatedAt": "2026-11-23T12:05:00.000Z",
    "source": "provider",
    "freshness": "current"
  }
}
```

Response `200` — unsupported region (no provider call, no meta):

```json
{
  "data": {
    "state": "unsupported-region",
    "region": "FR",
    "groups": []
  }
}
```

Response `200` — stale last-known data:

```json
{
  "data": {
    "state": "available",
    "region": "CO",
    "groups": [
      { "category": "free", "providers": [{ "name": "Example Free Service" }] }
    ]
  },
  "meta": {
    "stale": true,
    "lastUpdatedAt": "2026-11-20T09:30:00.000Z",
    "source": "stale-cache",
    "freshness": "stale"
  }
}
```

Response `200` — source-supplied timestamp (future provider; TMDB does not supply this field):

```json
{
  "data": {
    "state": "available",
    "region": "CO",
    "groups": [{ "category": "buy", "providers": [{ "name": "Example Store" }] }]
  },
  "meta": {
    "stale": false,
    "lastUpdatedAt": "2026-11-23T12:00:00.000Z",
    "source": "provider",
    "freshness": "current",
    "sourceUpdatedAt": "2026-11-23T06:00:00.000Z"
  }
}
```

Rules:

- `state=available` requires at least one group with at least one usable provider. Empty groups are
  omitted.
- `state=no-information` means the source responded successfully but supplied no usable offers. It
  is not proof that the title is unavailable. The frontend must state that distinction. A successful
  source response with no entry for the active country (the adapter's `null`) is also
  `no-information`, not an error.
- `state=unsupported-region` is a successful, expected selector outcome. It is not a title error and
  must not be presented as unavailability. No `meta` is returned.
- `destination` is optional and only one aggregate source-supplied URL is allowed. Provider entries
  are never individually linked. A destination that fails validation is omitted, never replaced.
- `meta` is mandatory for `available` and `no-information`; absent for `unsupported-region`.
- `meta.lastUpdatedAt` is always the Walplay observation time. `meta.sourceUpdatedAt` is present only
  when the source supplied a valid timestamp. The frontend must not label the observation time as
  source freshness.
- `meta.stale` is the authoritative UI signal for showing the last-known banner. It is true when the
  cache provenance is `stale-cache` or `freshness` is `stale`.
- Provider ids, source field names, raw source errors, prices, plans, quality labels, stream URLs,
  and per-provider URLs are never present.
- A current successful response with no offers supersedes older cached offers for the same key.

Error responses use the existing envelope:

```json
{
  "error": {
    "code": "CATALOG_TIMEOUT",
    "message": "Catalog data took too long to load."
  }
}
```

| Condition | Status | Code |
|---|---|---|
| Malformed item id, region syntax, unknown query parameter | 400 | `VALIDATION_ERROR` |
| Media type mismatch or provider title not found | 404 | `CATALOG_NOT_FOUND` |
| Provider rate limit | 429 | `CATALOG_RATE_LIMITED` |
| Provider timeout | 504 | `CATALOG_TIMEOUT` |
| Provider unavailable or network failure | 502 | `CATALOG_UNAVAILABLE` |
| Provider response failed validation | 502 | `CATALOG_INVALID_RESPONSE` |
| Unexpected server failure | 500 | `INTERNAL_ERROR` |
| Feature disabled (title-availability path, router not mounted) | 404 | `ROUTE_NOT_FOUND` |
| Feature disabled (regions path, router not mounted) | 400 | `VALIDATION_ERROR` (existing `/:mediaType/:section` route) |

### 2. `GET /api/catalog/availability/regions`

Response `200`:

```json
{
  "data": {
    "regions": ["CO"]
  }
}
```

Rules:

- Codes are uppercase ISO 3166-1 alpha-2, unique, sorted.
- The query string is validated as an empty strict schema; unknown query parameters are rejected as
  `VALIDATION_ERROR`.
- The list is the backend allowlist; `CO` is always present.
- The endpoint returns codes only. The frontend localizes country names with
  `Intl.DisplayNames`.
- No provider call is made.
- The endpoint is configuration-driven; adding a validated region does not require a frontend
  rebuild.
- The endpoint uses `Cache-Control: no-store` for consistency with the availability route.

## Response data union

The frontend contract is a discriminated union:

```text
{ data: { state: 'available',     region, groups: non-empty, destination? }, meta: required }
{ data: { state: 'no-information', region, groups: [],        destination? }, meta: required }
{ data: { state: 'unsupported-region', region, groups: [] } }
```

Any other shape is a contract failure and is handled as `CATALOG_INVALID_RESPONSE` on the client.
The frontend envelope, `data`, and `meta` schemas are strict, so an unexpected field is also a
contract failure rather than silently ignored.

## Provider-neutrality checklist

The response must not contain:

- `provider_id`, `provider_name`, `logo_path`, `display_priority`, `flatrate`, `results`, or `link`
  as source field names.
- The TMDB bearer token, request URLs, or raw source error bodies.
- A provider id of any kind.
- A stream URL, player URL, DRM data, or download link.
- A per-provider link or a constructed provider search URL.
- A price, plan, quality tier, or promotional claim.
- A claim that the title is unavailable when the source supplied no offers.
