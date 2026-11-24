# Phase 1 Data Model: Entertainment Details

**Feature**: `004-entertainment-details` | **Date**: 2026-11-22

This feature adds no persistence. Every entity below is a runtime value derived from the address and
validated provider responses, or a contract shape crossing the Walplay API boundary. Zod schemas are
the source of truth in implementation; shapes here are illustrative. Provider field names and
provider DTOs never cross the boundary.

Display bounds and normalization limits are named constants shared by mapping, formatting, and
tests.

```text
CAST_PREVIEW_LIMIT = 10
CREW_PREVIEW_LIMIT = 6
SIMILAR_PREVIEW_LIMIT = 12
COLLECTION_PREVIEW_LIMIT = 12
OVERVIEW_PREVIEW_CODE_POINTS = 600
EPISODE_OVERVIEW_PREVIEW_CODE_POINTS = 320
MIN_PLAUSIBLE_YEAR = 1888
MAX_PLAUSIBLE_YEAR = 2100
MAX_PLAUSIBLE_MOVIE_RUNTIME_MINUTES = 900
MAX_PLAUSIBLE_EPISODE_RUNTIME_MINUTES = 600
MIN_SEASON_NUMBER = 0
MAX_SEASON_NUMBER = 999
```

`OVERVIEW_PREVIEW_CODE_POINTS` and `EPISODE_OVERVIEW_PREVIEW_CODE_POINTS` are frontend presentation
constants. The backend owns the provider/display bounds and input-validation limits above; it does
not truncate overview text.

---

## 1. Detail Identity

The address-level identity of one detail request.

| Field | Type | Rules |
|---|---|---|
| `mediaType` | `'movie' \| 'tv'` | Authoritative for lookup; never substituted |
| `itemId` | opaque string | `^[A-Za-z0-9_-]{8,64}$`; encodes media type + provider id |
| `providerId` | positive safe integer | Decoded server-side only; never returned to the client |
| `language` | `'en-US' \| 'es-ES'` | Requested provider language, derived from `en`/`es` |
| `season` | integer `0..999` or absent | TV only; `0` means specials |

**Invariants**:

- The address content type decides the lookup. A movie id and a TV id that share a numeric value
  must resolve to different titles and must never fall back to the other type.
- An identity without a supported type, a usable title, and a provider identity is a not-found
  condition, not a partial page.
- Provider ids are not part of any response body, error, log message shown to users, or DOM.
- The media type encoded in `itemId` MUST match the path media type. A mismatch is a not-found condition (`CATALOG_NOT_FOUND`), never a cross-type lookup.

---

## 2. Title Detail (core surface)

The provider-neutral primary surface. One successful response represents one loaded title.

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | opaque item id | yes | Same encoding as catalog items |
| `mediaType` | `'movie' \| 'tv'` | yes | Rendered as localized text |
| `title` | non-empty string | yes | Localized title, else original title, else not-found |
| `originalTitle` | non-empty string | no | Only when different from `title` |
| `overview` | non-empty string | no | Localized, else original-language fallback; omitted when neither is usable |
| `tagline` | non-empty string | no | Never used as the overview; omitted when empty or placeholder |
| `releaseDate` | `YYYY-MM-DD` | no | Movie release / TV first-air complete date |
| `releaseYear` | integer `1888..2100` | no | Present when only a valid year can be derived |
| `status` | `TitleStatus` | no | Known provider status mapped to internal union |
| `genres` | `Genre[]` | yes (may be empty) | Localized names only; unknown ids omitted |
| `runtime` | `{ minutes: number; kind: 'movie' }` | no | Movie only; positive, plausible |
| `episodeRuntime` | `{ minMinutes: number; maxMinutes?: number }` | no | TV only; one value = typical, several = range |
| `rating` | `TitleRating` | no | Only under the rating rules |
| `popularity` | positive finite number | no | Secondary metadata only; not a rating |
| `poster` | image reference | no | `w342` with optional `w780`; absent means fallback |
| `backdrop` | image reference | no | `w780` with optional `w1280`; supporting atmosphere only |
| `tvSummary` | `TvSummary` | no | TV only |
| `seasons` | `Season[]` | no | TV only; may be empty |
| `collection` | `{ name: string }` | no | Movie only; membership signal, display name only |

Trailer inventory is not part of this model. It is owned by `specs/008-trailers-video-content/spec.md`.

**Title resolution order**: usable localized title → usable original title → not-found. Empty,
whitespace-only, and title-placeholder values are treated as missing.

**Overview resolution order**: usable localized overview → usable original-language overview →
omit. Preserve provider line breaks. Never machine-translate, summarize, or synthesize.

**Release date rules**:

- A valid complete date produces a fully localized date and is the source of `releaseYear`.
- A usable year without a valid complete date produces a four-digit year.
- An absent, empty, malformed, out-of-range, or placeholder date produces neither.
- A date is never inferred from another field.

**Status values**: `released`, `in-production`, `post-production`, `planned`, `rumored`,
`returning`, `ended`, `canceled`, `pilot`. Unknown raw values are omitted. Each internal value maps
explicitly to a `detail.status.*` translation key; the kebab-case union is never used as a translated
string.

**Invariants**:

- A title detail without a usable `title`, `mediaType`, and `id` is not constructed.
- Adult-flagged titles, unknown/removed titles, and malformed identities produce the not-found
  state, never a title detail.
- Omitted optional fields leave no empty label, zero, dash, N/A, or placeholder in the interface.
- The content type is always present as localized text in the primary identity area.
- The service cache may retain an internal collection provider id solely to request collection
  parts; that identifier is never serialized to the API or the interface.

---

## 3. Title Rating

| Field | Type | Rules |
|---|---|---|
| `value` | finite number `> 0` and `<= 10` | Rounded to one decimal for display |
| `voteCount` | integer `> 0` | Formatted with `Intl` |
| `scale` | literal `10` | Always exposed in accessible text |
| `source` | literal `'tmdb'` | Displayed as TMDB user rating near the value |

**Invariants**:

- A zero, negative, out-of-range, non-finite, or missing average produces no rating.
- A zero, negative, non-integer, or missing vote count produces no rating.
- A rating is never inferred from popularity or another field.
- Ratings from different sources are never blended or substituted; only TMDB is approved.
- Source attribution is visually associated with the rating itself.

---

## 4. Genre

| Field | Type | Rules |
|---|---|---|
| `id` | non-empty string | Internal; never displayed |
| `name` | non-empty string | Localized provider name only |

Unknown ids, empty lists, and unusable names are omitted. Duplicate ids are removed preserving
order. Genres render as a semantic list and are also summarized in primary facts.

---

## 5. Duration

| Field | Type | Rules |
|---|---|---|
| `minutes` | positive integer | Movie runtime; within the plausibility ceiling |
| `kind` | literal `'movie'` | Distinguishes the movie duration label |
| `minMinutes` | positive integer | TV typical episode length or range minimum |
| `maxMinutes` | positive integer | TV range maximum; present only when at least two distinct valid values exist |

**Invariants**:

- Zero, negative, non-integer, missing, and implausible values produce no duration.
- A duration is never derived from episode counts or other fields.
- Formatting is locale-aware and never mixes localized units with unlocalized numerals.

---

## 6. Person and Credit

| Entity | Field | Type | Rules |
|---|---|---|---|
| Person | `name` | non-empty string | Required; credits without it are dropped |
| Person | `profile` | image reference | Optional; `w185`; fallback without layout shift |
| CastCredit | `character` | non-empty string | Optional; omitted without placeholder |
| CastCredit | `billingOrder` | integer | Provider order preserved within the preview |
| CrewCredit | `role` | `'director' \| 'creator' \| 'writer'` | Only mapped known jobs |
| CrewCredit | `department` | string | Optional internal grouping; not displayed raw |

**Invariants**:

- Cast preview: at most 10 usable credits in provider order.
- Crew preview: at most 6 usable key credits in provider order.
- Duplicate person + role pairs are removed without reordering the remaining credits.
- A credit without a usable person name is dropped.
- Unknown or unmapped crew jobs are omitted, never guessed or invented.
- A missing image shows a neutral fallback carrying the person's name; the image never duplicates
  the accessible name already carried by adjacent text.
- `billingOrder` and `department` are adapter-internal. The API serializes each preview as an ordered
  array; array order carries provider billing order, and neither field is exposed.

---

## 7. TV Summary

| Field | Type | Rules |
|---|---|---|
| `seasonsCount` | integer `>= 0` | Provider-reported; labeled as reported by TMDB |
| `episodesCount` | integer `>= 0` | Provider-reported; labeled as reported by TMDB |
| `firstAirDate` | valid date or year | Optional |
| `latestAirDate` | valid date or year | Optional |
| `networks` | non-empty string[] | Optional; usable provider names, deduplicated, bounded to 5 |

**Invariants**:

- Counts are not presented as Walplay calculations.
- Specials are not counted or described as regular seasons in the seasons list.
- Unavailable counts are omitted rather than shown as zero.

---

## 8. Season

| Field | Type | Rules |
|---|---|---|
| `number` | integer `0..999` | `0` is specials |
| `name` | non-empty string | Localized/provider name when usable |
| `airYear` | integer `1888..2100` | Optional |
| `episodeCount` | integer `>= 0` | Optional; provider-reported |
| `poster` | image reference | Optional |
| `overview` | non-empty string | Optional; not displayed in the selector |

`poster` and `overview` are provider metadata available for mapping but are not exposed by the
season endpoint or displayed in this feature; the season selector uses number, name, year, and
episode count.

**Ordering**: regular seasons (`number > 0`) ascending by number, followed by the specials season
(`number === 0`) when present. A specials season is labeled as specials and is never described or
selected as a regular season.

**Selection state**:

| Address | Provider seasons | Effective selection |
|---|---|---|
| Valid matching season | contains it | That season |
| Missing / malformed / out of range | any | First regular season, else first available |
| Valid number not supplied | any | First regular season, else first available |
| Any | no seasons | No selection; seasons section omitted |

**Invariants**:

- Selecting a season never removes the title identity, overview, entry points, credits, or related
  sections.
- Specials are never the default selection while a regular season exists; an explicit valid
  `season=0` address selects specials and never treats them as a regular season.
- The selected season is expressed in the control's visible text and accessible state.
- The season change replaces the current history entry.
- A very large season list remains fully reachable without clipping; the control wraps or scrolls
  rather than truncating seasons.

---

## 9. Episode

| Field | Type | Rules |
|---|---|---|
| `number` | integer `0..9999` | Usable number required for identification if name is missing |
| `name` | non-empty string | Optional; never invented |
| `airDate` | valid date or year | Optional |
| `runtimeMinutes` | positive integer `1..600` | Optional; implausible or missing values omitted |
| `overview` | non-empty string | Optional; preview/expand behavior |
| `still` | image reference | Optional; `w300` |
| `rating` | `TitleRating` | Optional; same rules as title rating |

**Identification rule**: a usable name is used; otherwise a usable number plus a localized
"Episode" label; if neither exists, the episode is omitted.

**Ordering**: provider order within the selected season.

**Invariant**: episode lists are not truncated; every usable episode in the selected season is
rendered in provider order. Scannability comes from list semantics and spacing, not from hiding
episodes.

**Empty state**: a season with no usable episodes shows a localized in-area empty message; the
season list and the rest of the page remain usable, and no episode is fabricated.

---

## 10. Related Title and Related Collection

| Entity | Field | Type | Rules |
|---|---|---|---|
| RelatedTitle | `item` | `CatalogItem` | Reuses the existing catalog card contract |
| RelatedTitle | `relationship` | `'similar' \| 'collection'` | One section per relationship |
| RelatedCollection | `name` | non-empty string | Optional; omitted when unusable |
| RelatedCollection | `items` | `RelatedTitle[]` | At most 12 in provider order |

`RelatedTitle` and `RelatedCollection` are provider-neutral service models. Both related endpoints
serialize each `RelatedTitle.item` as their `items[]`; the relationship is carried by the endpoint and
section label, not by each item. The frontend receives catalog items and never a provider shape.

**Exclusion and dedupe rules applied in order**:

1. Drop the current title by identity.
2. Drop adult-flagged titles.
3. Drop unsupported content types.
4. Drop items without a usable identity or title.
5. Drop duplicate identities within a section, preserving first occurrence.
6. Apply the section bound after exclusions.

**Invariants**:

- Similar and collection relationships are separate labeled sections and are never merged.
- An empty section is omitted; when all sections are empty, no related area is rendered.
- Related titles link to the matching type-specific detail destination.
- A related section failure is contained to that section and offers a section-only retry.
- Related-title cards reuse the catalog item contract but MUST NOT render a rating in this feature:
  the catalog rating shape carries no source attribution, and FR-042 requires visible TMDB
  attribution on every displayed rating.

---

## 11. Provider Attribution and Popularity

| Field | Source | Rules |
|---|---|---|
| Attribution notice | Existing `ProviderAttribution` widget and keys | Visible without interaction; wording follows current TMDB guidance; not improvised |
| Attribution link | OD-D4 | Added only in the form and placement official guidance requires |
| Popularity | Core detail `popularity` | Shown only when finite and `> 0`; in the secondary provider-metadata area; labeled TMDB popularity; no comparison or interpretation |
| Freshness note | Localized `detail.providerValuesNote` | States that ratings and popularity are provided by TMDB and may change; never implies live or guaranteed values |

Popularity never appears among primary facts and is never presented as a rating, ranking, quality
signal, recommendation, or audience approval.

`ProviderMetadata` renders popularity and `detail.providerValuesNote`, and receives the existing
`ProviderAttribution` as a page-composed slot. The page owns that cross-widget composition so
`widgets/title-detail` does not import another widget slice. Popularity stays adjacent to
attribution and no secondary field leaks into primary facts.

---

## 12. Detail Capabilities

This feature no longer defines a trailer capability. Trailer presentation, activation, player, and
external fallback are owned by `specs/008-trailers-video-content/spec.md`.

Availability and personal-list entry points have no capability or destination in this feature, so
nothing renders for them. No disabled, placeholder, or "coming soon" control is produced.

---

## 13. Surface States

Each surface has an explicit observable state. Core and secondary surfaces never share a state
machine.

### Core detail

| State | Entry condition | User-visible behavior | Assistive behavior |
|---|---|---|---|
| `loading` | Initial query, no routed item | Layout-matching skeleton | Region `aria-busy`, decorative shapes hidden |
| `loaded` | Valid response, fresh | Full hierarchy | Heading exposed; live announcement once |
| `stale` | Response marked stale/cached | Full hierarchy + cached label and last-update time | Polite announcement once |
| `error` | Failure with no cached content | Page-level localized error, retry, return link | Assertive alert once |
| `not-found` | Unknown, malformed, unsupported, adult, removed, no usable identity | Localized not-found, return link, no retry | Heading exposed; announced once |

### Secondary surface (credits, similar titles, collection parts, season episodes)

| State | Entry condition | User-visible behavior |
|---|---|---|
| `idle` | Core not yet resolved | Nothing rendered |
| `loading` | Query active | Section skeleton with reserved dimensions |
| `loaded` | Usable content | Section content |
| `empty` | Successful response with no usable content | Credits/similar/collection sections omitted; localized empty message inside the episode area |
| `stale` | Response marked stale/cached | Content + localized cached label and last-update time |
| `error` | Failure with no cached content | Inline localized error + section-only retry; other surfaces unaffected |
| `forbidden` | Movie requested a TV-only surface (season) or TV requested a movie-only surface (collection) | Surface omitted |

### Season transition

```text
unresolved ──core loaded, no seasons──▶ omitted
unresolved ──core loaded, seasons────▶ selected(initial or address season)
selected(A) ──season control─────────▶ selected(B) + replace history + episodes loading
selected(A) ──language change────────▶ selected(A) if still supplied, else selected(initial)
selected(A) ──season 404─────────────▶ selected(initial) without an error page
```

---

## 14. Response Metadata

Every detail response carries the existing catalog metadata envelope:

| Field | Type | Rules |
|---|---|---|
| `language` | `'en-US' \| 'es-ES'` | Effective provider language |
| `stale` | boolean | True when served from stale cache |
| `lastUpdatedAt` | ISO timestamp string | Last successful provider update |
| `source` | `'provider' \| 'cache' \| 'stale-cache'` | Provenance |

**Invariant**: stale or cached data is never presented as current; the interface labels it and
shows a localized last-update indication. Freshness metadata is per surface, so a stale core does
not imply stale episodes and vice versa.
