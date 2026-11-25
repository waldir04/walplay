# Contract: Recommendation Area (Guest Baseline)

**Feature**: `009-personalized-recommendations` | **Type**: UI, state, accessibility, and flag contract

The area is one labelled region on the Home destination. This contract defines observable behavior for
the initial guest baseline. Account-scope sections and controls are not part of this contract.

## Composition

```text
HomePage
├── existing page heading (h1) and tagline
├── existing "Start browsing" section (h2)
└── RecommendationArea (only when VITE_RECOMMENDATIONS_ENABLED=true)
    ├── area heading (h2) + "How recommendations work" details
    ├── media-scope control (above the section it controls)
    ├── RecommendationSection
    │   ├── section heading (h3) + basis sub-label
    │   ├── skeleton | card grid | empty panel | error panel
    │   └── stale label when applicable
    └── ProviderAttribution (reused)
```

Rules:

- The area MUST NOT replace, hide, or reorder the existing Home purpose, heading, Browse entry, or a
  future saved-summary region. It is appended after the existing content.
- The area MUST NOT add a route, navigation entry, Settings content, or section on another surface.
- The media-scope control belongs to the area, is placed above the section it controls, and is component
  state only. It is not a route, a stored preference, or a new destination (FR-153/FR-154, RV-17).
- The Home page keeps exactly one page-level `h1`. The area uses `h2`; the section uses `h3`.
- The area is rendered only when the validated `recommendationsEnabled` flag is true. When false, it
  renders nothing and makes no request.

## Area accessibility contract

- The region is a `<section>` with an accessible name from its `h2` heading
  (`aria-labelledby`).
- The area exposes `aria-busy="true"` while its section is loading or retrying.
- The skeleton is decorative: `aria-hidden="true"` on the skeleton grid, with the busy state announced
  by the region and a localized accessible label.
- Each section is a `<section>` with an `h3` heading and a localized accessible name that includes the
  media scope, e.g. "Popular now, Movies".
- Items are a semantic list (`CatalogGrid` renders `<ul>` with an accessible label).
- Each card exposes the shared catalog accessible name (title, type, year, rating when present). The
  card's link opens the existing type-specific detail route. No second detail surface is used.
- The explanation is a native `<details>`/`<summary>`; it is keyboard-operable, has a visible focus
  indicator, no focus trap, and no hover-only access.
- The media-scope control is a labelled group of two buttons with `aria-pressed`; it is reachable by
  keyboard and touch and names the media type it selects.
- Empty and empty-after-exclusions use `role="status"` and explanatory text. Errors use `role="alert"`.
  No state relies on color or icon alone.
- Retry is a button with a localized label. It is disabled while the retry is pending to prevent
  duplicate submissions. The result is announced once through a polite live region.
- Initial page load does not steal focus. Focus stays on the activated control after a media-scope
  change or retry.
- All interactive targets meet the 24×24 CSS px minimum; primary controls meet 44×44 CSS px.
- Motion is minimal and respects `prefers-reduced-motion`. There is no autoplay, auto-rotation,
  carousel, infinite scroll, or automatic page load.

## Content and truthfulness contract

- Area heading and section heading are neutral; neither uses "for you", "recommended for you",
  "picked for you", "because you watched", or an equivalent personalization claim.
- The section heading is "Popular now" (localized) and its sub-label states provider popularity, e.g.
  "Based on provider popularity, not personalized".
- The provider attribution treatment (official mark + non-endorsement statement) is visible in the area
  wherever provider data appears.
- Every card is a provider-supplied movie or TV title with a displayable name. No episode, person,
  collection, or other entity is shown.
- No item displays a match score, percentage, quality claim, availability claim, "watch now", "play",
  or an outbound provider destination.
- Already-saved titles MAY be hidden locally, read-only, without transmission (FR-028/FR-077). The copy
  states that saved titles are not used to choose suggestions and never implies that guest saved titles
  enable personalization.
- The explanation copy states:
  - the active scope is guest and the basis is provider popularity;
  - guest saved titles are not used to choose suggestions;
  - Walplay does not apply AI or machine learning and does not create a separate visitor profile;
  - personalized recommendations are not available in guest mode;
  - saved lists are stored in this browser and may be lost when browsing data is cleared;
  - the controls that exist (media scope, explanation, retry, Browse, Search) and the absence of
    personalization controls in guest scope.
- Provider-supplied title names remain as supplied and are never translated.

## State contract

| State | Visual | Accessible structure | Actions |
|---|---|---|---|
| `loading` | Skeleton that matches the section + card grid; reserved height | Region `aria-busy`; skeleton `aria-hidden`; localized loading label | None |
| `ready` | Section heading, scope control, basis sub-label, up to 12 cards, attribution | Semantic section + list + card names | Cards navigate; scope switches; explanation; retry not shown |
| `ready` + `stale` | Ready plus a "loaded earlier" label and last-updated time | Stale text is visible and in the accessible name/description | Same as ready |
| `empty` | Calm panel explaining no titles are available; no fabricated cards | `role="status"`; heading/text distinct from error | Browse, Search |
| `empty` (`all-excluded`) | Calm panel explaining nothing available after hiding already-saved titles | `role="status"`; copy states the actual cause without implying an error | Browse, Search |
| `error` | Contained error panel; no raw code, identifier, or provider detail | `role="alert"`; localized title/description; unavailable uses the default `error.title`/`error.description` copy, rate-limited and timed-out use their specific keys | Retry; Browse |
| Retry pending | Retry button disabled with pending state; content area stays reserved | Region `aria-busy`; button `disabled` | No duplicate submission |

Empty and error MUST be visually and semantically distinct. A stale `ready` MUST NOT appear as current
without the stale label. A failed request MUST NOT be rendered as empty, and an empty result MUST NOT be
rendered as an error.

## Media scope contract

- Exactly one section is shown at a time.
- The scope control selects `movie` or `tv`; the selected scope requests that provider popular list.
- Lists are never merged, interleaved, or re-ranked. Provider order is preserved after exclusions.
- The default is `movie`.
- The scope is component state; it is not persisted and creates no recommendation preference.
- The in-place scope is confirmed by product/design as RV-17; the behavior is fixed by FR-153/FR-154.
- Changing the scope starts a new loading state for that scope. Previously displayed items from the
  other scope are not shown as if they were the new scope.
- Switching language refetches the active scope with the new language; it does not switch media scope.

## Flag contract

| Configuration | Behavior |
|---|---|
| `VITE_RECOMMENDATIONS_ENABLED` absent, empty, or `false` | Area renders nothing; no provider request; no attribution; no explanation |
| `VITE_RECOMMENDATIONS_ENABLED=true` | Area renders per this contract |
| Invalid value | Validated config emits the established warning and treats the capability as disabled |

The flag defaults to false in `.env.example`, in the hermetic Vitest env, and in the validated config.
Enabling it requires the product and documentation release gates recorded in the plan.

## Out of scope for this contract

- Personalized sections, seed reasons, first-use disclosure, personalization toggle, dismissal, reset,
  rotation, "Show different titles", account prompts, sign-in, sync, and account-scope preferences.
- Recommendation sections on Browse, Search, Saved, detail, or any surface other than Home.
- Recommendation persistence of any kind.
