# Phase 1 Data Model: Trailers and Video Content

**Feature**: `008-trailers-video-content` | **Date**: 2026-11-24

This feature adds no server persistence and no browser persistence. Every entity below is a runtime
value derived from the address, a validated provider response, in-memory cache metadata, or
client-side interaction state. Zod schemas are the source of truth in implementation; shapes here are
illustrative. Provider field names, provider DTOs, provider record ids, and numeric provider ids never
cross the Walplay API boundary.

Constants and limits are named in implementation and shared by mapping, service, ranking, formatting,
and tests:

```text
YOUTUBE_VIDEO_ID_PATTERN       = /^[A-Za-z0-9_-]{11}$/
TRAILER_ELIGIBLE_TYPES         = { trailer, teaser, featurette, clip, behind-the-scenes, bloopers }
TRAILER_TYPE_ORDER             = trailer, teaser, featurette, clip, behind-the-scenes, bloopers
TRAILER_MAX_VISIBLE            = 6
TRAILER_MAX_INVENTORY          = 24
TRAILER_CACHE_FRESH_TTL_MS     = 24 h
TRAILER_LAST_KNOWN_RETENTION_MS= 7 days
TRAILER_CACHE_MAX_ENTRIES      = 500
TRAILER_PLAYER_MIN_WIDTH_PX    = 356   (16:9 at >= 200 px height)
TRAILER_PLAYER_LOAD_TIMEOUT_MS = 15000
TRAILER_EMBED_HOST             = www.youtube-nocookie.com
TRAILER_EXTERNAL_HOST          = www.youtube.com
```

The TTLs and retention are validated configuration with the defaults above. Both derive from the
existing env variables `TRAILERS_CACHE_TTL_SECONDS` and `TRAILERS_CACHE_STALE_SECONDS`; the seven-day
stale window and the last-known retention boundary are the same configured value, not two independent
settings.

---

## 1. Trailer Inventory Request Identity

The address-level identity of one inventory request. There is no language or region parameter.

| Field | Type | Rules |
|---|---|---|
| `mediaType` | `'movie' \| 'tv'` | Authoritative for lookup; never substituted |
| `itemId` | opaque string | `^[A-Za-z0-9_-]{8,64}$`; encodes media type + provider id |
| `providerId` | positive safe integer | Decoded server-side only; never returned to the client |

Invariants:

- `mediaType` must match the type encoded in `itemId`; a mismatch is `CATALOG_NOT_FOUND`.
- A malformed `itemId` is `VALIDATION_ERROR`.
- Unknown query parameters are rejected; the endpoint accepts none.
- Cache identity is `provider + mediaType + providerId`; it does not include the interface language.

---

## 2. Title Video Inventory

The unit rendered by the trailer section.

| Field | Type | Rules |
|---|---|---|
| `state` | `'available' \| 'no-videos'` | `available` requires at least one eligible video |
| `videos` | ordered `PromotionalVideo[]` | Capped at `TRAILER_MAX_INVENTORY` after ranking; empty only for `no-videos` |
| `languageContext` | `'en' \| 'es'` | Client view-model only, never an API field; used for presentation re-ranking |
| `meta` | `TrailerMeta` | Present for provider-derived data; absent only if a future unsupported state is added |

`TrailerMeta`:

| Field | Type | Rules |
|---|---|---|
| `stale` | boolean | True when the cache entry is stale or freshness exceeds the window |
| `lastUpdatedAt` | ISO timestamp | Server observation time; never in the future |
| `source` | `'provider' \| 'cache' \| 'stale-cache'` | Provenance of the served data |
| `freshness` | `'current' \| 'stale'` | Derived from the freshness window |

The API response contains `state`, `videos`, and `meta`. `languageContext` is derived on the client from
the active interface language and is not serialized.

Invariants:

- An empty provider result maps to `no-videos`, not an error.
- Data older than the retention boundary maps to `CATALOG_UNAVAILABLE`, not to `no-videos`.
- Stale data is always labeled `last checked` and never presented as current.
- A response for a previous title, or one superseded by navigation or a newer request, never alters
  the visible section or its announcements. Inventory identity is the title, never a request id.
- The response never contains a stream URL, media file, provider record id, `size`, country, rating,
  or download reference.

---

## 3. Promotional Video

One eligible third-party video.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable opaque identity for the list, `youtube:<key>`; safe to render |
| `platform` | `'youtube'` | Internal platform key |
| `platformName` | `'YouTube'` | Factual platform name; never a Walplay brand |
| `videoId` | string | Canonical platform identifier; not a URL |
| `title` | string | Provider-supplied, non-empty, whitespace-normalized, never translated |
| `type` | `'trailer' \| 'teaser' \| 'clip' \| 'featurette' \| 'behind-the-scenes' \| 'bloopers'` | Mapped from provider vocabulary; raw values never exposed |
| `official` | `boolean` | `true` only when the provider explicitly marks that record official |
| `language` | string (ISO 639-1) | Optional; shown only when usable |
| `publishedAt` | ISO timestamp | Optional; shown only when valid and not future-dated |
| `embedUrl` | HTTPS URL | Optional; documented embed shape on the authorized host |
| `externalUrl` | HTTPS URL | Optional; canonical watch destination for the same identifier |

Invariants:

- At least one of `embedUrl` and `externalUrl` must exist; otherwise the record is dropped.
- `official` is tri-state at the provider boundary (`true`, `false`, absent) and collapses to a single
  boolean for display. It controls labeling and priority only, never rights claims.
- `language` is kept only when it matches `^[a-z]{2}$` and the active `Intl.DisplayNames` resolves it to
  a name; otherwise it is omitted and no language is guessed or shown.
- `publishedAt` is kept only when parseable and not later than the server observation time; otherwise
  it is omitted and no date is corrected.
- `title` is trimmed and whitespace-collapsed, never translated, rewritten, or invented.
- `size`, country, rating, provider record id, and provider order are discarded or used only for
  internal ranking; they never reach the interface.
- Duplicate records with the same `platform + videoId` are merged, not repeated.
- The video has no stream, download, proxy, mirror, or copy reference of any kind.

### Merge rule for duplicates

1. Choose the primary record: the first with `official === true`; otherwise the lowest provider index.
2. Take the primary's usable `title`, `language`, and `publishedAt` first.
3. Fill any missing `language` or `publishedAt` from the next usable records in provider order.
4. `official` is `true` if any collapsed record explicitly says `true`.
5. Keep the lowest provider index for ranking.

---

## 4. Promotional Type

| Value | Meaning | Initial eligibility | Display label source |
|---|---|---|---|
| `trailer` | Official or unofficial trailer | Yes | Walplay `detail.trailers.types.trailer` |
| `teaser` | Short teaser | Yes | Walplay `detail.trailers.types.teaser` |
| `clip` | Scene or clip | Yes | Walplay `detail.trailers.types.clip` |
| `featurette` | Promotional featurette | Yes | Walplay `detail.trailers.types.featurette` |
| `behind-the-scenes` | Behind-the-scenes video | Yes | Walplay `detail.trailers.types.behindTheScenes` |
| `bloopers` | Bloopers or outtakes | Yes | Walplay `detail.trailers.types.bloopers` |

Other provider values (full titles, opening credits, recaps, live content, unknown or unmapped values)
are not eligible and are dropped. Display labels are localized; ranking uses the internal value.

---

## 5. Ranking

The backend returns the list already ordered. The comparator is total and stable:

1. `TRAILER_TYPE_ORDER` index ascending.
2. `official === true` before `false`.
3. Provider order index ascending.
4. `id` ascending (only if all prior keys tie, which should not occur for distinct identifiers).

After sorting, the service returns at most `TRAILER_MAX_INVENTORY` (24) videos. The section shows at
most `TRAILER_MAX_VISIBLE` (6) before expansion and never requests a larger inventory.

The client applies one presentation-only refinement without changing the response:
a video whose `language` equals the active interface language (`en` or `es`) before one that does not,
preserving the server order within each step. The effective client comparator is therefore
`(type rank, official, language match, server index)`; the refinement never overrides type or official
precedence. It runs on render and on language change and never filters, removes, or fetches. It does
not reselect the current video.

The interface never states or implies that order reflects quality, popularity, freshness, editorial
judgment, or a recommendation.

---

## 6. Playback Mode

Derived on the client from the video and the measured player area. It is always stated in text.

| Mode | Condition | UI behavior |
|---|---|---|
| `embedded` | `embedUrl` exists and measured width ≥ `TRAILER_PLAYER_MIN_WIDTH_PX` | Cover with activation control; activation loads one iframe |
| `external` | `embedUrl` missing, or measured width below the threshold | Explanation plus canonical external option; no undersized frame |
| `unavailable` (transient) | Activation attempted but the frame did not load within the timeout | Localized unavailable explanation plus external option |

The mode is never inferred from provider metadata. The owner's embedding setting, privacy, age, region,
and network restrictions are outcomes, not predictions. The external option remains adjacent to the
player area in `embedded`, `ready`, and `unavailable` states.

---

## 7. Playback Session

The visitor's explicit activation of one video.

| Field | Type | Rules |
|---|---|---|
| `selectedVideoId` | string | Highest-ranked item on first render; changes only on explicit choice |
| `activeVideoId` | string or `null` | Video whose frame is mounted or whose outcome is shown |
| `status` | `'idle' \| 'loading' \| 'ready' \| 'unavailable' \| 'external-only'` | Single state at a time |
| `startedAt` | number (monotonic) | Used only for the load timeout |
| `reason` | union or `null` | `player-timeout`, `width-too-small`, or `null` |

Lifecycle:

```text
idle --activate(video)--> loading --load event--> ready
                              |
                              +-- timeout--> unavailable (frame unmounted)
idle --activate(video, width < threshold)--> external-only (no frame)
any --activate(other video)--> loading (previous frame unmounted first)
any --navigate away / unmount--> frame unmounted
any --language change--> status and selection unchanged; list labels/order re-render only
```

Invariants:

- At most one frame exists at any time.
- No frame exists in `idle`, `external-only`, or `unavailable`.
- Rapid successive choices: only the newest `activatingVideoId` may produce a frame; stale
  activations are ignored.
- The default selection never triggers `loading` or playback.
- Navigating away unmounts the frame so no audio or network activity continues.
- The visitor's selection and an active player survive an interface-language change.

---

## 8. Player Availability State

The normalized outcome of a playback attempt.

| State | Observable evidence | UI meaning |
|---|---|---|
| `ready` | Frame `load` event fired | The player loaded; playback readiness is platform-controlled |
| `unavailable` | No `load` event within the timeout | The player could not be loaded; cause may be owner-disabled embedding, private/deleted video, age/sign-in restriction, region restriction, or a network/extension block |
| `external-only` | Measured width below the 16:9 floor | A compliant player cannot be presented here; use the canonical destination |

Because the frame is cross-origin and no player SDK is used, Walplay cannot distinguish the causes in
the `unavailable` state. The copy enumerates the possible causes and asserts none. The platform's own
in-frame notice remains visible when it provides one. Walplay never retries automatically, never probes
the frame, never inspects player internals, and never claims a cause the platform did not state.

---

## 9. Authorized External Destination

| Field | Type | Rules |
|---|---|---|
| `url` | HTTPS URL | `https://www.youtube.com/watch?v=<key>` only |
| `host` | string | Must be in `TRAILERS_EXTERNAL_HOSTS` |
| `videoId` | string | Must equal the video's canonical identifier |

Invariants:

- The destination is constructed server-side from the validated identifier; the client never edits it.
- It is never a search result, redirector, shortener, affiliate link, download page, mirror, or another
  video.
- Every rendered destination has a localized label, a leaving-Walplay notice, the destination platform
  name, and that warning inside its accessible name.
- Activation opens it without navigating the detail page away from its current state.
- The destination is never preloaded, prefetched, or previewed.
- Copy never promises the destination is available in the visitor's region or free of restriction.

---

## 10. Validation and Error Mapping

| Situation | Result |
|---|---|
| Malformed `itemId` | `400 VALIDATION_ERROR` |
| `mediaType` does not match `itemId` | `404 CATALOG_NOT_FOUND` |
| Unknown query parameter | `400 VALIDATION_ERROR` |
| Provider reports title not found | `404 CATALOG_NOT_FOUND` |
| Provider returns malformed or invalid shape | `502 CATALOG_INVALID_RESPONSE` |
| Provider timeout | `504 CATALOG_TIMEOUT` |
| Provider rate limit | `429 CATALOG_RATE_LIMITED` |
| Provider unavailable / 5xx after retries | `502 CATALOG_UNAVAILABLE` |
| Inventory older than retention | `502 CATALOG_UNAVAILABLE` |
| Capability disabled | Route not mounted; existing route behavior applies |

The interface localizes stable codes and never renders raw provider errors, status codes, response
bodies, field names, provider ids, or player error codes. A failed inventory request never blocks the
detail page or any other section.
