# Phase 1 Data Model: Entertainment Catalog

**Feature**: `002-entertainment-catalog` | **Date**: 2026-11-22

There is no database in this feature. This document defines the provider-neutral domain entities from
the specification, their runtime TypeScript shapes, the validation rules that create them at the
provider boundary, and the observable state machines for catalog surfaces. It is the source of truth
for `contracts/catalog-api.md`, `contracts/provider-boundary.md`, and the frontend Zod schemas.

Shapes are illustrative TypeScript. In implementation, contract types are inferred from Zod schemas so
validation and static types have one source of truth (Principle II).

---

## 1. Media Type

Walplay's classification of a catalog title.

| Attribute | Type | Rules |
|---|---|---|
| `mediaType` | `'movie' \| 'tv'` | Literal union; stored as `movie` in API paths and `movies`/`tv-shows` in browser addresses |
| `labelKey` | translation key | `catalog.mediaType.movie` or `catalog.mediaType.tv`; always rendered as text |

**Invariants**:

- Every section, category address, item, page slice, and detail destination is scoped to exactly one
  media type.
- A media switch never mixes items from the other type. Final address wins.
- Media type is never communicated by color, position, or icon alone.

**Mapping**:

| Domain | Address slug | Provider path segment | Localized label |
|---|---|---|---|
| `movie` | `movies` | `movie` | Movies / Películas |
| `tv` | `tv-shows` | `tv` | TV Shows / Series |

---

## 2. Section

A provider-supported grouping scoped to one media type.

| Attribute | Type | Rules |
|---|---|---|
| `id` | `'trending' \| 'popular' \| 'top-rated'` | Stable internal ID; not a provider endpoint name |
| `order` | `1 \| 2 \| 3` | Fixed: trending, popular, top rated |
| `mediaTypes` | `readonly MediaType[]` | Sections the active provider supports |
| `paginated` | `boolean` | True only when the provider documents a page request parameter |
| `labelKey` | translation key | `catalog.sections.trending`, etc. |

**Capability declaration for TMDB**:

| ID | Order | Media types | Paginated | Landing action |
|---|---|---|---|---|
| `trending` | 1 | movie, tv | `false` | Bounded preview only; no See all |
| `popular` | 2 | movie, tv | `true` | Preview + See all |
| `top-rated` | 3 | movie, tv | `true` | Preview + See all |

**Invariants**:

- Unsupported sections are omitted entirely; they are never rendered as empty, failed, or
  "coming soon".
- Section order is the declared order. Walplay never re-ranks, re-sorts, or invents a popularity
  explanation.
- A preview is drawn from the provider's first page and never exceeds one provider page.
- `trending` uses the weekly window. It is preview-only because page is not a documented request
  parameter.

**Runtime shape**:

```ts
type MediaType = 'movie' | 'tv';
type SectionId = 'trending' | 'popular' | 'top-rated';

interface CatalogSectionCapability {
  readonly id: SectionId;
  readonly order: number;
  readonly mediaTypes: readonly MediaType[];
  readonly paginated: boolean;
}
```

---

## 3. Catalog Item

A provider-neutral title summary used by cards and the minimal detail destination.

| Attribute | Type | Required | Rules |
|---|---|---|---|
| `id` | opaque string | yes | Base64url of `wl1:<mediaType>:<providerId>`; validated by pattern; never a raw provider ID |
| `mediaType` | `MediaType` | yes | Must match the requested section or address |
| `title` | string | yes | Localized title when non-empty; otherwise original title; item excluded if both unusable |
| `originalTitle` | string | no | Present only when it differs from `title` and is usable |
| `releaseYear` | integer | no | Four-digit year extracted from a valid release/first-air date; absent for empty, malformed, or unusable dates |
| `rating` | `{ value: number; voteCount: number; scale: 10 }` | no | Present only for a finite `0..10` average and `voteCount > 0`; never zero-as-missing |
| `genres` | `readonly { id: string; name: string }[]` | no | Localized names only; unknown IDs, empty lists, and unavailable names are omitted; empty array serialized as absent/empty consistently |
| `poster` | `{ url: string; urlLarge?: string }` | no | Absolute URLs composed at the boundary from an approved size and a returned path; absent when path/configuration unavailable |
| `attribution` | `'tmdb'` | yes | Internal marker; the visible attribution is rendered by the surface widget |

**Exclusion rules** (item is dropped, not rendered):

- Missing or empty usable title after localized/original fallback.
- Missing or invalid opaque identity.
- Invalid or missing media type.
- `adult === true`.
- Top-level record fails the per-item schema.

**Presentation rules**:

- A card always shows title, textual media type, and either poster or a fallback containing title and
  media type.
- Optional values are omitted cleanly: no blank label, dash, zero, or invented value.
- The rating is formatted with `Intl.NumberFormat` for the locale and exposed as "8.1 out of 10" (or
  localized equivalent) to assistive technology.
- The full title remains available to assistive technology when visible text is truncated.
- The card has exactly one interactive target; artwork and fallback decoration do not add an
  accessible name.

**Runtime shape**:

```ts
interface CatalogRating {
  readonly value: number;
  readonly voteCount: number;
  readonly scale: 10;
}

interface CatalogGenre {
  readonly id: string;
  readonly name: string;
}

interface CatalogPoster {
  readonly url: string;
  readonly urlLarge?: string;
}

interface CatalogItem {
  readonly id: string;
  readonly mediaType: MediaType;
  readonly title: string;
  readonly originalTitle?: string;
  readonly releaseYear?: number;
  readonly rating?: CatalogRating;
  readonly genres: readonly CatalogGenre[];
  readonly poster?: CatalogPoster;
}
```

**Internal-only provider reference** (never serialized to the client):

```ts
interface ProviderReference {
  readonly provider: 'tmdb';
  readonly providerId: number;
  readonly mediaType: MediaType;
}
```

The opaque ID codec maps `CatalogItem.id` to `ProviderReference` inside the backend. Decoding
validates the `wl1` prefix, the media type, and a positive numeric provider ID. A mismatch between the
decoded media type and the route's media type is rejected as not found.

---

## 4. Catalog Page Slice

One requested page within a section or category list.

| Attribute | Type | Rules |
|---|---|---|
| `mediaType` | `MediaType` | Echoes the request |
| `section` | `SectionId` | Echoes the request |
| `page` | positive integer | Echoes the request; `trending` only allows `1` |
| `items` | `readonly CatalogItem[]` | Valid, non-adult items in provider order; may be empty |
| `totalPages` | positive integer | Omitted when the provider does not report it |
| `totalResults` | non-negative integer | Omitted when the provider does not report it |
| `hasMore` | boolean | Server-computed; true only when a next page exists and pagination is supported |

**End conditions** (any one ends the list):

- `hasMore === false`.
- The provider reports the current page as the last page.
- The next page returns no valid items.
- The next page number would exceed the reported total.
- A direct category address loads page 1 only; previously loaded pages are not restored.

**Invariants**:

- Provider order is preserved; no re-sorting or client-side ranking.
- Page size is the provider's; Walplay does not invent one.
- Appending preserves all existing items and their order, and deduplicates by opaque ID.
- The appended count is announced once.

**Runtime shape**:

```ts
interface CatalogPage {
  readonly mediaType: MediaType;
  readonly section: SectionId;
  readonly page: number;
  readonly items: readonly CatalogItem[];
  readonly totalPages?: number;
  readonly totalResults?: number;
  readonly hasMore: boolean;
}
```

---

## 5. Response Metadata and Freshness

Every catalog data response carries metadata that tells the interface whether the data is current.

| Attribute | Type | Rules |
|---|---|---|
| `language` | `'en-US' \| 'es-ES'` | Provider language actually requested |
| `stale` | boolean | True when last-known-good data is served after a provider failure |
| `lastUpdatedAt` | ISO-8601 string | When the served data was fetched from the provider |
| `source` | `'provider' \| 'cache' \| 'stale-cache'` | Diagnostic; the interface uses `stale` for display |

**Invariants**:

- Stale data is always labeled as cached/stale with a localized last-update indication.
- Data is never presented as current when `stale` is true.
- When no usable cached entry exists, the response is a stable error envelope instead of empty data.

---

## 6. Catalog Load State

The observable state of a section, category list, detail lookup, or page-level composition.

| State | Trigger | Interface output | Assistive behavior |
|---|---|---|---|
| `idle` | Not yet requested | Nothing or a reserved skeleton region | None |
| `loading` | Initial request or user retry pending | Layout-matching skeleton | `aria-busy="true"`; skeleton shapes `aria-hidden` |
| `success` | Valid response with items | Cards in provider order | Polite status only when appending or state changes |
| `empty` | Valid response with zero valid items | Localized empty state with retry and, where meaningful, media switch | Announced politely once |
| `stale` | Valid last-known-good response after failure | Cards plus localized stale notice and last-update time | Announced politely once |
| `unavailable` | Provider/network/5xx/invalid response with no stale data | Localized inline error with retry | Announced as an alert once |
| `rate-limited` | Provider `429` with no stale data | Localized "temporarily limited" state with retry | Announced as an alert once |
| `timed-out` | Provider timeout with no stale data | Localized unavailable state with retry | Announced as an alert once |
| `not-found` | Detail lookup for unknown/invalid/adult item | Localized not-found state with return action | Announced as an alert once |

**Mapping from stable error codes**:

| Internal code | HTTP status | Interface state |
|---|---|---|
| `VALIDATION_ERROR` | 400 | `unavailable` (generic localized message) |
| `CATALOG_NOT_FOUND` | 404 | `not-found` |
| `CATALOG_RATE_LIMITED` | 429 | `rate-limited` |
| `CATALOG_TIMEOUT` | 504 | `timed-out` |
| `CATALOG_UNAVAILABLE` | 502 | `unavailable` |
| `CATALOG_INVALID_RESPONSE` | 502 | `unavailable` |
| `INTERNAL_ERROR` | 500 | `unavailable` |

Raw provider status codes, messages, payloads, field names, and identifiers never appear in the
interface.

---

## 7. Runtime Model: Landing Page Composition

The landing page composes independent section queries.

| Input | Output |
|---|---|
| Capabilities success, N supported sections | One section region per supported section, in declared order |
| One section `success` | Preview grid with at most one provider page of items |
| One section `empty` | Localized empty state inside that section region |
| One section `unavailable`/`rate-limited`/`timed-out` | Inline error with retry inside that section region; other sections remain usable |
| All supported sections fail | One localized page-level error with retry; navigation and media switch remain usable |
| Capabilities fail | Page-level unavailable state; no invented section list |

**Invariants**:

- Exactly one page-level `h1`.
- Unsupported sections never render a placeholder.
- Retrying a section affects only that section.
- The provider attribution region remains present whenever provider data is shown, including
  partial-failure states.

---

## 8. Runtime Model: Category List

| State | Behavior |
|---|---|
| Initial load | First provider page; skeleton; one `h1` and one category heading structure |
| Success with more | Items appended in provider order; "Load more" available when not fetching |
| Load more pending | "Load more" busy and disabled; existing items remain visible and usable; no duplicate request |
| Append success | New valid items appended, existing items unchanged, duplicates removed, count announced once |
| Final page | "Load more" removed; localized end-of-list status shown and announced; focus moves to the status if the control was focused |
| Load-more failure | Existing items remain; inline localized error with retry for the failed page; no page-level collapse |
| Direct address | First page loads; no prior pages restored |
| Media switch | Corresponding category for the other type when supported, otherwise that type's landing |
| Language change | List restarts at page one in the new language; old pages discarded; no mixed-language final state |
| Empty first page | Localized empty state with retry and, where meaningful, media switch |

**Pagination state machine**:

```text
idle -> loading(first page) -> success(hasMore) -> loading(next page) -> success(hasMore)
                              |                        |
                              |                        +-> error(next page) -> retry -> loading(next page)
                              +-> empty
                              +-> error(first page) -> retry -> loading(first page)
success(hasMore=false) -> ended
```

Only one request per activation is permitted. A new activation is ignored while a load is pending.

---

## 9. Runtime Model: Minimal Detail

| Entry path | Data source | Behavior |
|---|---|---|
| From a card | Router state item, validated | Render title, media type, available card metadata, localized "complete details not yet available" statement, attribution, return action |
| Direct address | Backend minimal lookup | Loading skeleton, then the same presentation or a localized not-found/unavailable state |
| Unknown/invalid/adult ID | Backend `CATALOG_NOT_FOUND` | Not-found state inside the shell with a working catalog return; no fabricated metadata |
| Lookup failure | Error envelope | Localized unavailable state with return; no technical detail |

**Invariants**:

- No cast, seasons, episodes, availability, recommendations, trailers, user actions, or playback.
- The return action goes to the originating media type or category when known and valid; otherwise to
  the media type landing.
- The address's media type is authoritative; a state item of another type is rejected and the page
  falls back to a direct lookup or not-found.

---

## 10. Provider Capability

The active provider's declared support used by the catalog to decide what to render.

| Attribute | Type | Rules |
|---|---|---|
| `provider` | `'tmdb'` | Adapter identity, internal only |
| `sections` | `readonly CatalogSectionCapability[]` | Declared order and capabilities |
| `supportsPagination` | per section | From documentation; not inferred from response fields |
| `language` | `'en-US' \| 'es-ES'` | Requested provider language |
| `imageSizes` | `{ posterGrid: 'w342'; posterLarge: 'w780' }` | Approved sizes resolved from provider configuration |

**Invariants**:

- The frontend renders only capabilities returned by the active adapter.
- The frontend never assumes a section is supported because a previous visit supported it.
- Trending pagination is not offered even if response metadata includes a page value.

---

## 11. Catalog Navigation State

The state the address must keep in agreement.

| Attribute | Type | Rules |
|---|---|---|
| `mediaType` | `MediaType` | Always present in a catalog address; `/browse` redirects to movies |
| `section` | `SectionId` or none | Present on landing sections; category addresses only use paginated sections |
| `category` | `'popular' \| 'top-rated'` or none | Type-specific category address |
| `itemId` | opaque string or none | Type-specific detail address |
| `origin` | catalog address or none | Validated return target supplied by card navigation |

**Invariants**:

- Back/forward restore the matching media type and content with no stale items from the other type.
- Rapid switches settle on the final selection only.
- A detail address is unique per title and type.

---

## 12. Configuration Inventory

**Backend** (validated with Zod at startup; secrets never logged or serialized):

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development`, `test`, `production` |
| `PORT` | no | `4000` | HTTP listen port |
| `CORS_ALLOWED_ORIGINS` | yes in production | `http://localhost:5173` in development | Comma-separated exact origins; no wildcard |
| `TMDB_ACCESS_TOKEN` | yes | — | Bearer token; secret |
| `TMDB_BASE_URL` | no | `https://api.themoviedb.org/3` | Provider API base |
| `TMDB_TIMEOUT_MS` | no | `5000` | Per-request timeout |
| `TMDB_MAX_RETRIES` | no | `2` | Bounded idempotent retries |
| `TMDB_CACHE_TTL_SECONDS` | no | `300` | Freshness period |
| `TMDB_CACHE_STALE_SECONDS` | no | `86400` | Maximum age for labeled stale serving |
| `TMDB_CACHE_MAX_ENTRIES` | no | `500` | Bounded cache size |
| `TMDB_IMAGE_CONFIG_TTL_SECONDS` | no | `86400` | Image configuration cache |
| `LOG_LEVEL` | no | `info` | Field-only structured logs |

**Frontend** (public values only):

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_APP_ENV` | yes | — | Existing environment name |
| `VITE_APP_VERSION` | no | `0.0.0` | Existing version |
| `VITE_API_BASE_URL` | yes in non-test builds | `http://localhost:4000` locally | Internal catalog API origin |

No provider credential, base URL, timeout, or TTL is exposed through a `VITE_*` variable.

---

## 13. State-Machine Invariants Summary

- A surface never shows content from a previous media type, category, language, or item.
- A failed section never takes down sibling sections or the shell.
- A page-level error appears only when all primary catalog content has failed or is unavailable.
- Loading always has a layout-matching skeleton and a busy state.
- Empty, stale, rate-limited, timed-out, unavailable, and not-found states are distinct, localized,
  and actionable where retry is meaningful.
- Every retry is user-initiated, single-flight per surface, and genuinely re-attempts the request.
- Provider order is preserved; optional metadata is never fabricated; adult titles never appear.
