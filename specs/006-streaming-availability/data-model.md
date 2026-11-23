# Phase 1 Data Model: Streaming Availability

**Feature**: `006-streaming-availability` | **Date**: 2026-11-23

This feature adds no server persistence. Every entity below is a runtime value derived from the
address, validated provider responses, in-memory cache metadata, or a versioned browser preference.
Zod schemas are the source of truth in implementation; shapes here are illustrative. Provider field
names, provider DTOs, and source provider ids never cross the Walplay API boundary.

Constants and limits are named in implementation and shared by mapping, service, formatting, and
tests:

```text
AVAILABILITY_DEFAULT_REGION = 'CO'
AVAILABILITY_REGION_PATTERN = /^[A-Z]{2}$/
AVAILABILITY_FRESHNESS_WINDOW_MS = 24 h
AVAILABILITY_LAST_KNOWN_RETENTION_MS = 7 days
AVAILABILITY_CACHE_FRESH_TTL_MS = 6 h
AVAILABILITY_CACHE_STALE_TTL_MS = 7 days
AVAILABILITY_CACHE_MAX_ENTRIES = 500
AVAILABILITY_CATEGORY_ORDER = subscription, free, ads, rent, buy
AVAILABILITY_REGION_STORAGE_KEY = 'walplay.availability-region.v1'
AVAILABILITY_REGION_STORAGE_VERSION = 1
```

The TTL values and the freshness window are validated configuration with the above documented
defaults. `AVAILABILITY_LAST_KNOWN_RETENTION_MS` and `AVAILABILITY_CACHE_STALE_TTL_MS` describe the
same seven-day boundary and must remain aligned.

---

## 1. Availability Request Identity

The address-level identity of one availability request.

| Field | Type | Rules |
|---|---|---|
| `mediaType` | `'movie' \| 'tv'` | Authoritative for lookup; never substituted |
| `itemId` | opaque string | `^[A-Za-z0-9_-]{8,64}$`; encodes media type + provider id |
| `providerId` | positive safe integer | Decoded server-side only; never returned to the client |
| `region` | ISO 3166-1 alpha-2 | Optional query, normalized uppercase; defaults to `CO`; must be in the validated allowlist to receive data |

**Invariants**:

- The media type encoded in `itemId` must match the path media type. A mismatch is
  `CATALOG_NOT_FOUND`, never a cross-type lookup.
- A malformed item id or region syntax is `VALIDATION_ERROR`, never a provider call.
- A region outside the allowlist returns the successful `unsupported-region` state, not an error and
  not another region's data.
- The provider id is used only for the provider call and the cache key. It is absent from every
  response, log message intended for users, DOM, and test fixture exposed to the browser.
- Language is not part of this identity. Availability data is language-independent; interface text
  is localized client-side.

---

## 2. Availability Result

The complete provider-neutral outcome for one title, type, and region.

| Field | Type | Required | Rules |
|---|---|---|---|
| `state` | `'available' \| 'no-information' \| 'unsupported-region'` | yes | Discriminator |
| `region` | ISO code | yes | Uppercase; always the requested region |
| `groups` | `AvailabilityGroup[]` | yes | Empty for `no-information` and `unsupported-region`; at least one for `available` |
| `destination` | `{ url: string }` | no | Only an aggregate, source-supplied, validated destination; absent for `unsupported-region` |

`meta` (present for `available` and `no-information`, absent for `unsupported-region`):

| Field | Type | Rules |
|---|---|---|
| `stale` | boolean | True when cache was served stale or freshness is stale; authoritative UI signal for last-known |
| `lastUpdatedAt` | ISO timestamp | When Walplay last successfully observed the data |
| `source` | `'provider' \| 'cache' \| 'stale-cache'` | Cache provenance |
| `freshness` | `'current' \| 'stale'` | Based on the applicable timestamp and 24-hour window |
| `sourceUpdatedAt` | ISO timestamp | Optional; only when the source supplies a valid timestamp; absent for TMDB |

**State meanings**:

- `available`: at least one usable provider offer in at least one category.
- `no-information`: the source responded successfully but supplied no usable offers for the region.
  This is not proof that the title is unavailable.
- `unsupported-region`: the region is not in Walplay's validated allowlist. No provider call is made
  and no freshness or destination is returned.

**Invariants**:

- `available` never contains a group with zero providers.
- `no-information` never contains a fabricated provider or category.
- `unsupported-region` is not presented as an error and not presented as title unavailability.
- A current successful response with no offers supersedes any older cached offers for the same
  title, type, and region.
- The result never contains a provider id, source DTO field name, raw source error, stream URL,
  player, price, plan, quality tier, or per-provider link.
- The result is scoped to exactly one region; it never mixes regions.

---

## 3. Availability Group

One availability category and its usable providers.

| Field | Type | Rules |
|---|---|---|
| `category` | `'subscription' \| 'free' \| 'ads' \| 'rent' \| 'buy'` | Closed union; unknown source groups are omitted |
| `providers` | `AvailabilityProvider[]` | At least one; deduplicated; source order preserved |

**Ordering**: Groups appear in the fixed category order `subscription`, `free`, `ads`, `rent`,
`buy`. The API and UI must not re-sort groups by provider count, popularity, or any Walplay-authored
ranking. Empty groups are omitted.

**Invariants**:

- A provider that appears in multiple categories appears in each category the source supplies; it is
  never moved or inferred across categories.
- The same provider is not duplicated within one category.
- The group never carries a price, plan, quality, or promotional claim.
- The group label is localized in the frontend; the API carries the stable category code only.

---

## 4. Availability Provider

One streaming, rental, purchase, free, or ad-supported service in one category.

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | non-empty string | yes | Trimmed source name; provider names are not translated |
| `logo` | `{ url: string; urlLarge?: string }` | no | Present only when logo display is enabled and the source supplies a usable path; HTTPS image URL; optional larger density |

**Invariants**:

- A provider without a usable name is dropped. An empty, whitespace-only, `n/a`, `null`,
  `undefined`, or `tbd` name is not rendered.
- A missing, malformed, or unauthorized logo does not hide the name and does not leave a broken
  image. The name is always visible.
- A logo is decorative when adjacent text carries the provider name; otherwise it exposes the name
  as its accessible name. It is never the sole identifier.
- Logos are not recolored, cropped, distorted, animated, combined with Walplay marks, or used as
  Walplay branding.
- Provider ids are mapper-internal for deduplication and ordering. They are not part of this public
  entity and never cross the API.
- Provider rows are not links. There is no per-provider URL in the initial release.

---

## 5. Region

The country used for availability results.

| Field | Type | Rules |
|---|---|---|
| `code` | ISO 3166-1 alpha-2 | Uppercase; validated; allowlisted for data |
| `supported` | boolean | True when the code is in the backend allowlist |
| `isDefault` | boolean | True only for `CO` in the initial release |

**Allowlist rules**:

- The backend configuration owns the allowlist. The initial value is `CO`.
- The configuration parser requires `CO` to be present; removing the initial market is a
  configuration error.
- The frontend fetches the allowlist from `/api/catalog/availability/regions`; it does not maintain a
  duplicate list.
- A valid stored code outside the allowlist is preserved and shown as `unsupported-region`, not
  silently replaced.
- The selector lists only supported codes. When the active code is unsupported, the selector uses a
  disabled placeholder and the region line plus unsupported message name the active code.
- Adding a region is a configuration and validation change, not a UI rewrite. It does not assert
  complete provider coverage.

---

## 6. Freshness Record

The time basis for one result set.

| Field | Type | Rules |
|---|---|---|
| `lastUpdatedAt` | ISO timestamp | Walplay observation time; always valid; derived from the cache entry or current provider fetch |
| `sourceUpdatedAt` | ISO timestamp | Optional; valid source timestamp only; ignored when invalid or future; absent for TMDB |
| `applicableTimestamp` | ISO timestamp | Earlier of a valid `sourceUpdatedAt` and `lastUpdatedAt` |
| `freshness` | `'current' \| 'stale'` | `stale` when `now - applicableTimestamp > 24 h` |
| `stale` | boolean | `true` when cache provenance is `stale-cache` or `freshness` is `stale` |
| `source` | `'provider' \| 'cache' \| 'stale-cache'` | Cache provenance |

**Invariants**:

- A source timestamp is never fabricated. When absent, the interface shows a clearly labeled Walplay
  check time.
- An invalid or future source timestamp is ignored; it never makes data look fresher.
- `lastUpdatedAt` is always the observation time, never the source update time.
- When the applicable timestamp is older than seven days, offers are not returned; the endpoint
  produces the source-error state.
- A stale result is never presented as current, verified, or guaranteed.
- The frontend formats the timestamp; it does not compute freshness or retention from its own clock.

---

## 7. Authorized Destination

The optional external availability page supplied by the source.

| Field | Type | Rules |
|---|---|---|
| `url` | HTTPS URL | Source-supplied only; no construction |
| `host` | string | Must be in the configured destination-host allowlist |
| `regionMatch` | boolean | When a `locale` query parameter exists, it must match the active region |

**Invariants**:

- Only one aggregate destination is allowed per result set.
- The URL must be HTTPS, must not contain credentials, and must not be an open redirect.
- The URL is used exactly as supplied; path, query, and locale are not constructed or rewritten.
- Provider entries are never linked. A provider name or logo is not made clickable through a
  Walplay-authored URL.
- The frontend opens the destination in a new browsing context with `noopener noreferrer`, states
  that the visitor is leaving Walplay, and shows the destination host.
- The destination is not a stream, player, download, subscription, rental, purchase, or payment
  action.

---

## 8. Availability Capability and Configuration

Validated configuration controls whether the capability exists and what it may display.

| Setting | Default | Rules |
|---|---|---|
| `AVAILABILITY_ENABLED` | `false` | Backend route is not mounted when false |
| `AVAILABILITY_LOGOS_ENABLED` | `false` | API omits provider logo references when false; names remain |
| `VITE_AVAILABILITY_ENABLED` | `false` | Frontend section and queries are absent when false |
| `AVAILABILITY_SUPPORTED_REGIONS` | `CO` | Comma-separated ISO codes; uppercase; unique; must include `CO` |
| `AVAILABILITY_CACHE_TTL_SECONDS` | `21600` | Fresh cache TTL; 6 h default |
| `AVAILABILITY_CACHE_STALE_SECONDS` | `604800` | Stale/retention TTL; 7 days default; must be at least the fresh TTL |
| `AVAILABILITY_CACHE_MAX_ENTRIES` | `500` | Bounded process-local cache |
| `AVAILABILITY_FRESHNESS_WINDOW_SECONDS` | `86400` | 24 h default; must be no greater than the retention TTL |
| `AVAILABILITY_DESTINATION_HOSTS` | official TMDB hosts | Comma-separated hostnames; lowercase; no scheme or path |

**Invariants**:

- Missing or invalid values fail fast on the backend; the frontend flag defaults false on invalid
  input and emits a warning without exposing the value.
- The backend route is mounted only when `AVAILABILITY_ENABLED` is true. When it is false, the router
  is not mounted: the title-availability path falls through to `404 ROUTE_NOT_FOUND`, while
  `/api/catalog/availability/regions` is matched by the existing `/:mediaType/:section` route and
  receives its `400 VALIDATION_ERROR`. No provider call is possible in either case.
- The frontend does not render the section or issue availability/region queries when its flag is
  false, even if the backend is enabled.
- No secret is introduced. TMDB credentials remain backend-only.

---

## 9. Frontend Region Preference

The versioned local preference that drives the active region.

Stored value:

```json
{ "version": 1, "region": "CO" }
```

| Field | Type | Rules |
|---|---|---|
| `version` | literal `1` | Wrong versions are rejected and removed safely |
| `region` | ISO 3166-1 alpha-2 | Uppercase; validated on read |

**Lifecycle**:

1. Read `walplay.availability-region.v1` from `localStorage`.
2. If missing, malformed, unparseable, or the wrong version, use `CO` and remove the invalid entry
   without throwing.
3. If the value is valid, use it even when the current allowlist does not support it.
4. On a visitor change, validate the new code, write the new versioned value, update in-memory state,
   and let the availability query key change.
5. If storage is unavailable, use `CO` for the current session and no-op writes.

**Invariants**:

- The preference is global across titles until changed.
- The preference is not synchronized across devices.
- The region is not part of TanStack Query data and is not stored in server state.
- The invalid-entry cleanup never throws and never logs the stored value.
- A language change does not alter the stored region.

---

## 10. State Transitions

### Availability endpoint

| Starting condition | Event | Result |
|---|---|---|
| Region outside allowlist | Request | `200 unsupported-region`, no provider call, no meta |
| Supported region, valid title | Provider success with usable offers | `200 available`, meta current/stale |
| Supported region, valid title | Provider success with country entry but no usable offers | `200 no-information`, destination if valid |
| Supported region, valid title | Provider success without the country entry | `200 no-information`, no destination |
| Supported region, valid title | Provider 404 | `404 CATALOG_NOT_FOUND` |
| Supported region, valid title | Provider failure, fresh cache exists | `200` cached result, `source=cache` |
| Supported region, valid title | Provider failure, stale cache within 7 days | `200` cached result, `source=stale-cache`, `meta.stale=true` |
| Supported region, valid title | Provider failure, no usable cache | Stable provider error (`429`, `504`, `502`, or `500`) |
| Supported region, valid title | Cached/source timestamp older than 7 days | Source-error state, no offers |
| Invalid item id, media mismatch, or malformed region | Request | `400 VALIDATION_ERROR` or `404 CATALOG_NOT_FOUND` as appropriate |
| Backend capability disabled | Request | Router not mounted; title path `404 ROUTE_NOT_FOUND`, regions path `400 VALIDATION_ERROR` from the existing `/:mediaType/:section` route |

### Frontend section

| Query state | Render |
|---|---|
| Capability disabled or core detail absent | No section |
| Regions or availability query pending | Skeleton with region context, `aria-busy` |
| Regions or availability query error | Inline error with retry, region line, and `role="alert"`; the selector renders only when the regions list loaded (otherwise the region line plus retry replace it) |
| `data.state=available` | Region line, selector, category groups, freshness, destination if any, disclaimer, attribution |
| `data.state=no-information` | Region line, selector, no-information explanation, destination if any, freshness, disclaimer, attribution |
| `data.state=unsupported-region` | Region line, selector, unsupported explanation, disclaimer; no freshness/destination/provider attribution |
| `meta.stale=true` on available/no-information | Last-known banner with localized date/time, caution, and retry |

---

## 11. Serialization and Security Invariants

- The API response is a provider-neutral envelope: `{ data, meta }` for available/no-information;
  `{ data }` for unsupported-region; the existing `{ error: { code, message?, details? } }` for
  failures.
- Provider ids, TMDB field names (`provider_id`, `provider_name`, `logo_path`,
  `display_priority`, `flatrate`, `results`, `link`), bearer tokens, and raw provider errors never
  appear in the response.
- Provider names and logo URLs are the only source-supplied display values in the response.
- The destination URL is source-supplied and validated; no Walplay redirect or URL construction.
- Data from the browser is untrusted: the region preference is validated; the region query is
  validated; no other client input is accepted.
- No stream URL, player URL, DRM data, authentication token, or provider account data exists in this
  model.
- Logs must not include the region preference, destination URL query string, or provider payloads.

---

## 12. Bounds and Defensive Limits

- At most five categories per result (`subscription`, `free`, `ads`, `rent`, `buy`).
- No arbitrary cap on usable providers per category is introduced. All usable providers are
  rendered; the UI wraps or stacks them rather than hiding options.
- The API maps only the requested region from the full provider response; other regions are
  discarded.
- Only one aggregate destination is allowed.
- One availability result per title, type, and region is cached; the entry is bounded by the cache's
  entry cap and TTLs.
- The frontend performs one availability request per title/type/region key and one region-list
  request per session cache window.
- Empty or invalid groups are dropped before serialization, so the client cannot receive a group
  with zero providers.

---

## 13. Validation Summary

| Boundary | Validation |
|---|---|
| HTTP params | Media type enum; item id pattern; media type must match the encoded type |
| HTTP query | Region optional, two ASCII letters, normalized uppercase; unknown query params rejected |
| TMDB response | Zod DTO for id, results map, region entry, category arrays, provider fields, display priority, logo path, link |
| Provider names | Trim; drop empty/whitespace/placeholders; no translation |
| Provider logos | Optional; only when logos enabled; valid source path; HTTPS image URL; absent on failure |
| Destination | HTTPS; host allowlist; no credentials; locale/region match when present; no construction |
| Freshness | Valid ISO timestamps; ignore invalid/future source timestamps; observation time is authoritative |
| API response (frontend) | Discriminated union for state; category enum; provider name/logo; destination HTTPS; meta requirements |
| Regions response | Non-empty array of uppercase ISO codes; no duplicates |
| Stored region | Versioned JSON; literal version 1; uppercase ISO code; safe fallback and cleanup |
| Configuration | Boolean flags; region allowlist including `CO`; TTL ordering; host format; fail-fast backend; fail-closed frontend flag |

---

## 14. Explicitly Out-of-Model

The following data must not be introduced into this feature's entities:

- Stream URLs, playback tokens, DRM keys, captions, or media manifests.
- Provider prices, plans, subscriptions, payment methods, or account state.
- Per-provider deep links or constructed provider search links.
- Live TV channels, linear schedules, or sports listings.
- Episode-level or season-level availability.
- Availability alerts, notifications, or change history.
- Visitor identity, IP geolocation, precise location, or account linkage.
- Recommendations or personalization based on availability.
- Scraped provider data or undocumented source fields.
