# Data Model: Personalized Recommendations

**Feature**: `009-personalized-recommendations` | **Date**: 2026-11-25

The initial release has **no server-side model and no recommendation persistence**. It derives a view
model from two existing sources: the catalog popular-list response and the device-local saved library.
The account-scope model is documented in the final section as deferred design; it is not implemented.

## Initial guest model (implemented)

### Constants

| Name | Value | Purpose |
|---|---|---|
| `RECOMMENDATION_MAX_ITEMS` | `12` | Maximum items rendered in one section (FR-045) |
| `RECOMMENDATION_DEFAULT_MEDIA_TYPE` | `'movie'` | Initial media scope on a fresh Home load |
| `RECOMMENDATION_MEDIA_TYPES` | `['movie', 'tv']` (frozen) | Supported fallback scopes; one at a time |
| `RECOMMENDATION_FALLBACK_SECTION` | `'popular'` | Existing catalog section id used as the fallback |
| `RECOMMENDATION_FALLBACK_PAGE` | `1` | Only the first provider page is shown; no pagination |
| `RECOMMENDATION_STATE_COPY_KEYS` | frozen map | Localized copy for each state |
| `RECOMMENDATION_SECTION_BASIS` | `'provider-popularity'` | The only basis in the initial release |

The item cap is a display rule, not a provider request parameter. The request is the existing catalog
popular page; the UI selects up to 12 eligible items from it.

### RecommendationMediaScope

```ts
type RecommendationMediaScope = 'movie' | 'tv'
```

Rules:

- One scope is active at a time. The two provider lists are never merged or interleaved.
- The default is `movie`.
- The scope is component state, not persisted.
- Changing the scope is visitor-initiated and produces a new query key; it does not mutate saved data.
- Product/design confirmation of the in-place scope is RV-17; the behavior is fixed by FR-153/FR-154.

### RecommendationCandidate

The catalog response item, used unchanged:

```ts
interface RecommendationCandidate {
  readonly id: string                 // opaque catalog item id, existing pattern
  readonly mediaType: 'movie' | 'tv'
  readonly title: string              // provider-supplied; never translated by Walplay
  readonly originalTitle?: string
  readonly releaseYear?: number
  readonly genres: readonly { id: string; name: string }[]
  readonly poster?: { url: string; urlLarge?: string }
  readonly rating?: { value: number; voteCount: number; scale: 10 }
}
```

Validation is already performed by the catalog client's Zod schema. The widget never re-parses raw
provider data.

### ExclusionInput

```ts
interface RecommendationExclusionInput {
  readonly savedIdentities: ReadonlySet<string>   // `${mediaType}:${itemId}`
  readonly dismissedIdentities: ReadonlySet<string> // empty in guest scope
}
```

Rules:

- `savedIdentities` is built from the read-only `useSavedLibrary()` snapshot (watchlist + favorites).
- This local read is permitted by FR-028/FR-077: it is read-only, never transmitted, and used only to
  exclude already-saved titles. It is not a personalization basis.
- `dismissedIdentities` is always empty in guest scope; the field exists so the pure selector has one
  signature when account-scope dismissal is added later. It is not persisted.
- No identity from either set is transmitted or logged.

### Exclusion and ordering algorithm

`selectFallbackCandidates(items, input, cap)` is a pure function:

1. Iterate the provider page in provider order.
2. Drop an item when its identity is the seed itself (not applicable in guest scope), saved, dismissed,
   duplicated earlier in this pass, adult-flagged, of an unsupported content type, or missing a usable
   identity/displayable name. The catalog contract already excludes adult and unsupported entities; the
   function still defends against duplicates and identity collisions.
3. Stop when `cap` eligible items are collected.
4. Return the eligible items in their original provider order.

Invariants:

- Order is never re-sorted by rating, popularity, release date, quality, or inferred fit (FR-044).
- No backfill from page 2, no padding, no fabricated items (FR-053).
- A title appears at most once (FR-042).
- Adding a saved title removes it on the next render; removing it may make it eligible again (FR-050).
- The function is deterministic and has no time, randomness, or provider-timing input (FR-035, FR-046).

### RecommendationItemView

```ts
interface RecommendationItemView {
  readonly item: RecommendationCandidate
  readonly basis: 'provider-popularity'
}
```

There is no per-item personalized reason in the initial release. The section carries the truthful
provider-popularity basis; the card carries title, type, year, artwork, and the shared catalog rating
presentation. No match score, percentage, "for you", "because you watched", or availability claim is
added.

### RecommendationSectionState

```ts
type RecommendationSectionState =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready'
      readonly basis: 'provider-popularity'
      readonly mediaScope: RecommendationMediaScope
      readonly items: readonly RecommendationItemView[]
      readonly stale: boolean
      readonly lastUpdatedAt?: string
    }
  | { readonly kind: 'empty'; readonly cause: 'no-provider-items' | 'all-excluded' }
  | { readonly kind: 'error'; readonly cause: 'rate-limited' | 'timed-out' | 'unavailable' }
```

State rules:

- `loading`: initial fetch or a new media scope fetch. Render the layout-matching skeleton, set
  `aria-busy`, hide decorative skeletons from assistive technology.
- `ready`: at least one eligible item. Render the section heading, sub-label, grid, attribution, and
  stale label when `stale` is true.
- `empty`: the provider succeeded with no items, or exclusions removed every item. Render an
  explanation with Browse and Search actions. It is not an error and not a loading state.
- `error`: the request failed or returned an unusable response. Render a localized error with a retry
  action. It is not an empty state. No raw code, identifier, or provider detail is shown.
- `stale`: a modifier on `ready`, not a separate kind. Present only when the existing catalog meta says
  `stale: true`; show the last-updated time using `Intl.DateTimeFormat` and a localized label.
- A previous `ready` result is never presented as current after a failed refresh unless it carries the
  stale label (FR-027).

### RecommendationAreaView

```ts
interface RecommendationAreaView {
  readonly enabled: boolean
  readonly scope: 'guest'
  readonly mediaScope: RecommendationMediaScope
  readonly section: RecommendationSectionState
  readonly explanation: {
    readonly basis: 'provider-popularity'
    readonly savedTitlesUsedToChoose: false
    readonly usesAiOrMl: false
    readonly createsProfile: false
  }
}
```

The area view is derived, never stored. `scope` is always `'guest'` in the initial release; there is no
account-state branch, no sign-in prompt, and no personalization toggle.

### State transition table

| From | Event | To | Notes |
|---|---|---|---|
| — | Area mounts with flag enabled | `loading` | One popular request for the default scope |
| `loading` | Query succeeds with eligible items | `ready` | Announce once; show stale label if meta is stale |
| `loading` | Query succeeds with zero raw items | `empty` (`no-provider-items`) | Announce once; Browse/Search actions |
| `loading` | Query succeeds with items, all excluded | `empty` (`all-excluded`) | Same actions; copy states no titles are available |
| `loading` | Query fails (timeout, rate limit, unavailable, invalid) | `error` | Announce once; retry available |
| `error` | Retry activated | `loading` (retry pending) | Button disabled while pending; no duplicate request |
| `error` | Retry succeeds | `ready` or `empty` | Announce result once |
| `error` | Retry fails | `error` | Retry remains available |
| `ready`/`empty`/`error` | Media scope changed | `loading` for the new scope | Previous items are not shown as the new scope |
| `ready`/`empty` | Saved library changes | Recompute exclusions | No request; may become `empty` or `ready` |
| any | Interface language changed | `loading` for the same scope | Query key includes language; no duplicate request |
| `ready` | Query refetch returns stale data | `ready` with `stale: true` | Labeled as previously loaded |
| `ready` | Query refetch fails | `error` | No silently retained current-looking content |

### Privacy and scope invariants (initial release)

- No recommendation preference key, envelope, version, or migration exists.
- The only read is the existing saved-library envelope; the only write is none.
- The only outbound request is the existing catalog popular request; it carries media type, language,
  and page, and no saved title, saved identity, dismissal, or rotation position.
- Guest scope has no dismissal, rotation, reset, personalization toggle, or account prompt.
- No account identifier, email, token, session, or profile field exists in the model.

## Deferred account-scope model (documented, not implemented)

This section records the shapes the specification requires once an approved account model, provider
terms, and privacy approval exist. No storage schema, migration, or API is created by this plan.

### RecommendationSeed

```ts
interface RecommendationSeed {
  readonly identity: string           // `${mediaType}:${itemId}`
  readonly mediaType: 'movie' | 'tv'
  readonly itemId: string
  readonly title: string
  readonly collections: readonly ('watchlist' | 'favorites')[]
  readonly mostRecentMembershipAt: string // ISO 8601 UTC
}
```

Rules (from FR-029–FR-036):

- Eligible only with usable internal identity, supported type, displayable name, no adult flag, and
  resolvability in the account's saved data.
- Watchlist and favorites are equally eligible; a title in both is one seed.
- Order by `mostRecentMembershipAt` descending, then identity ascending for determinism.
- The first two eligible seeds produce at most two sections.
- Seeds are read-only; recommendation generation never mutates saved collections.

### DeferredRecommendationSection

```ts
interface DeferredRecommendationSection {
  readonly basis: 'saved-title'
  readonly seed: RecommendationSeed
  readonly candidateSource: 'recommendations' | 'similar'
  readonly items: readonly RecommendationItemView[]
  readonly rotationPage: number
  readonly state: 'loading' | 'ready' | 'empty' | 'error' | 'exhausted'
}
```

Rules (from FR-033, FR-041–FR-048):

- One section is bound to one seed and one selected provider list.
- Recommendation list first; similar list only when a successful recommendation response yields no
  provider-usable candidate; never merged.
- The more recent seed claims a colliding title first; the later section omits it.
- The section cap is 12 items; rotation replaces the visible set with the next usable page from the
  same list and never switches lists.
- A section with no items is omitted; the area then shows the truthful state that applies.

### RecommendationPreference (account scope only)

```ts
interface RecommendationPreference {
  readonly personalizationEnabled: boolean
  readonly dismissedIdentities: readonly string[]
  readonly rotationBySeed: Readonly<Record<string, number>>
  readonly version: number
  readonly updatedAt: string
}
```

Rules (from FR-121–FR-130, FR-133):

- Stored through the approved account persistence, never in guest scope.
- Default personalization is on for an account with no stored off choice; a stored off choice is
  honored.
- Dismissals are exclusions only; rotation is a visitor-controlled position only. Neither is used to
  infer taste or build a profile.
- The reset control clears dismissals and rotation positions but not the on/off choice or saved titles.
- Retention, deletion, maximum size, and expiry are account/privacy decisions (RV-06, RV-13) and are not
  assumed here.
- Account and guest scopes are never combined; sign-out hides account-derived recommendations.

### Deferred candidate page contract

```ts
interface RecommendationCandidatePage {
  readonly mediaType: 'movie' | 'tv'
  readonly source: 'recommendations' | 'similar'
  readonly page: number
  readonly items: readonly RecommendationCandidate[]
  readonly hasMore: boolean
}
```

The client/model for this page belongs in `entities/catalog` when implemented, beside the trailer and
availability clients, because it shares the provider boundary and the `CatalogItem` shape. The
orchestration of seeds, exclusions, rotation, and preferences belongs in the recommendation widget,
which is the only layer allowed to compose catalog and saved-library entities.
