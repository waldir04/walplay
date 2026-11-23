# Contract: Availability Routes, Queries, and UI Integration

**Feature**: `006-streaming-availability` | **Type**: Frontend route and interaction contract

No new route is introduced. The availability experience is a secondary section inside the existing
movie and TV detail destinations:

- `/browse/movies/title/:itemId`
- `/browse/tv-shows/title/:itemId`

The detail page remains the route/data orchestrator. The section is not a page, modal, drawer, or
top-level navigation destination.

## Component composition

```text
pages/title-detail/ui/TitleDetailPage.tsx
├── useDetailQuery (existing core gate)
├── useAvailabilityRegionsQuery (new)
├── useAvailabilityRegion (new feature hook)
├── useAvailabilityQuery (new)
├── useCreditsQuery / useSimilarQuery / useCollectionQuery / useSeasonQuery (existing)
└── widgets/title-detail/TitleDetailView
    ├── DetailHero / DetailFacts / DetailOverview (existing)
    ├── DetailActions (existing)
    ├── AvailabilitySection (new)
    │   └── features/select-availability-region/AvailabilityRegionSelector
    ├── SeasonEpisodesSection (existing)
    ├── CreditsSection (existing)
    ├── RelatedSection (existing)
    └── ProviderMetadata (existing; TMDB attribution remains)
```

`TitleDetailPage` composes `AvailabilitySection` and passes the `AvailabilityAttribution` node into
its `attribution` slot, then passes the composed section into `TitleDetailView` as its `availability`
`ReactNode`, matching the existing attribution composition pattern. `AvailabilitySection` does not
import another widget or feature UI module; the page passes the region selector in as a node.

## Placement

The section appears after `DetailActions` and before the TV season/episode section and the
cast/crew/related sections. It does not reorder existing sections. When the capability is disabled,
nothing is rendered: no heading, disabled control, placeholder, teaser, or "coming soon" copy.

## Capability and configuration

- `DETAIL_CAPABILITIES` gains `availability: boolean`, default `false`.
- `resolveDetailCapabilities(getAppConfig())` returns the configured value from
  `VITE_AVAILABILITY_ENABLED`.
- `TitleDetailPage` uses an explicit `capabilities` prop when provided (tests), otherwise resolves
  the configured capability.
- When `availability` is false:
  - no section is rendered;
  - no regions request is issued;
  - no availability request is issued.
- When the backend `AVAILABILITY_ENABLED` is false, the availability routes are not mounted. The
  release process must enable both flags together.

## Query keys and timing

Extend the existing `catalogKeys` factory:

```ts
availability: (mediaType, itemId, region) =>
  [...catalogKeys.all, 'availability', mediaType, itemId, region] as const

availabilityRegions: () => [...catalogKeys.all, 'availabilityRegions'] as const
```

| Query | Key | `staleTime` | `gcTime` | Retry | Enabled |
|---|---|---|---|---|---|
| Availability | title/type/region | 10 min | 30 min | `false` | capability on, detail resolved, valid detail route |
| Regions | static list | 24 h | 24 h | `false` | capability on, detail resolved |

Rules:

- The availability key includes `mediaType`, `itemId`, and `region`.
- The availability key excludes language. A language change must not refetch or discard results.
- The regions key is language-independent.
- The regions `gcTime` is never shorter than its `staleTime`, so the list is fetched at most once per
  session; a shorter `gcTime` would silently refetch it on remount.
- The availability query does not wait for the regions query. The two requests run in parallel after
  the core detail resolves; an unsupported stored code is a valid `200 unsupported-region` response
  and causes no backend provider call.
- No prefetch for other regions; no polling; no interval refetch.
- A region change changes the key. The old key's data is not shown while the new key loads.
- Retry is explicit through the section action, not automatic background retry.
- Queries start only after the core detail resolves; a not-found or failed core detail does not
  trigger availability requests.

## Page state mapping

```text
if capability off or core detail absent -> no section
else if regions or availability pending -> loading
else if regions or availability error -> error
else -> ready with data.state = available | no-information | unsupported-region
```

`stale` is `meta.stale` for ready states and is rendered as a last-known banner above the result.

The region line is always rendered from the active region code, even when the regions list failed.
The selector is rendered only when the regions list is available; when it is not, the error state
shows the region line and a retry that refetches both queries instead of an empty select. When the
regions list is available but the availability request failed, the selector remains usable so the
visitor can change region.

The page keeps a single availability announcement string for region changes:

```text
region change -> "Availability region changed to {localized region name} ({code})"
```

The section renders a `LiveRegion` with that message. The existing detail-loaded live region remains
separate.

## Region preference

Feature: `features/select-availability-region`.

- Key: `walplay.availability-region.v1`.
- Value: `{ "version": 1, "region": "CO" }`.
- Read on initialization; validate with Zod.
- Missing, malformed, wrong-version, or invalid code -> `CO`; remove the invalid entry safely.
- Valid but unsupported code -> preserve and show `unsupported-region`; do not silently substitute.
- Change writes the new versioned value and updates in-memory state immediately.
- Storage unavailable -> use `CO` for the session; writes are no-ops.
- The preference is global across titles and retained on the same device. No cross-device sync.
- The region is not stored in TanStack Query data, the URL, or server state.
- A language change does not alter the stored region.

## Region selector

- A labelled native single-select is preferred for simplicity and accessibility.
- Options come from the regions endpoint. Initial list: `CO`.
- Option label: localized country name plus code, e.g. `Colombia (CO)`.
- The selector is keyboard operable with a visible focus indicator and a minimum 44 px target.
- When the active region is unsupported:
  - the region line still names the active region and code;
  - the unsupported explanation is visible;
  - the select uses a disabled placeholder ("Choose a supported region") and lists only supported
    codes;
  - selecting a supported code triggers the normal change.
- The selector remains available in loaded, no-information, unsupported, and error states. It is not
  converted to hidden text.

## Availability section states

### Loading

- `aria-busy="true"` and a localized loading label.
- Skeleton heading, region line, selector placeholder, and 1–2 group/row skeletons matching the final
  layout.
- Decorative skeletons are hidden from assistive technology.
- No spinner or bare "Loading" text.

### Available

- Region line "Availability in {country} ({code})", also exposed through the section's accessible
  name or description so the region is not only visible text.
- Region selector.
- Category groups in fixed order: subscription, free, free with ads, rent, buy.
- Each group has a category heading and a semantic list of provider rows.
- Provider row: optional logo (decorative when adjacent), provider name always visible.
- Provider rows are not links.
- Freshness line: source-updated time when `meta.sourceUpdatedAt` exists; otherwise a labeled
  Walplay check time from `meta.lastUpdatedAt`.
- Informational notice: region-specific, may change, not a guarantee, Walplay does not host or stream
  content.
- Aggregate external destination when supplied.
- JustWatch attribution; existing TMDB attribution remains visible on the page.

### No information

- Region line and selector remain.
- Status message: availability information could not be found for this region.
- Explicit explanation: this does not prove the title is unavailable; the title may still be
  available.
- No categories, providers, or placeholder rows.
- Freshness line and informational notice remain.
- Aggregate external destination, if supplied, is labeled as a source page, not a provider offer.
- Attribution remains.

### Unsupported region

- Region line names the active region and code.
- Status message: the region is not supported yet; choose another region.
- No categories, providers, freshness, destination, or attribution of provider data.
- The informational notice (region-specific, may change, not a guarantee) remains visible.
- Region selector remains available.
- Not presented as an error or as title unavailability.

### Stale / last known

- A visible last-known banner with a localized date/time and a caution that availability may have
  changed, plus a retry action (FR-051).
- The data is not described as current or guaranteed.
- The stale banner uses text, not color alone.
- The banner is shown for both available and no-information results when `meta.stale` is true.

### Error

- `role="alert"` with a localized availability-specific title and description.
- A retry button refetches both the availability and regions queries and announces the outcome once.
- The region line remains visible. The selector remains visible only when the regions list loaded;
  when the regions list also failed, the region line plus retry replace the empty selector.
- The rest of the detail page remains usable.
- No raw error, provider id, or technical detail is shown.
- Distinct from the no-information state. The informational notice is not required here because no
  availability claim is presented; the error copy carries the limitation instead.

## Freshness formatting

- Use the existing `formatLastUpdated` helper (localized date/time) with the current interface
  locale.
- Check time is always the backend's `meta.lastUpdatedAt`.
- Source time is shown only when `meta.sourceUpdatedAt` exists.
- Never compute freshness in the browser.
- Never display a source timestamp when absent.
- Never mix localized words with unlocalized dates.

## External destination

- Render only when the API returns a validated destination.
- Link label is generic enough for the aggregate source page; the notice names the destination host.
- `target="_blank"` and `rel="noopener noreferrer"`.
- The accessible name or description states that the visitor is leaving Walplay.
- Activating the link does not navigate the detail page away.
- Returning preserves the title, region, and availability state.
- Provider names and logos are never anchors.
- No playback, download, subscription, rental, purchase, or account action is offered.

## Accessibility and announcements

- One `h2` for the section, `h3` for category groups, semantic lists for providers.
- The region selector has a visible label and `aria-describedby` when the region is unsupported.
- Region changes are announced once through a polite live region.
- Loading completion, no-information, stale, error, and retry outcomes use their defined roles and
  are not duplicated by the region-change message.
- Category, provider, region, freshness, stale, empty, error, and selected-region meaning is conveyed
  in text, not color, icon, or hover alone.
- Provider logos are decorative when adjacent text identifies the provider; otherwise they expose the
  provider name.
- Logos reserve a fixed box and fall back to the name on failure without layout shift.
- The section is fully keyboard operable with visible focus and no trap.
- The section passes 360/768/1024/1440 px and 200 % zoom checks without horizontal page scrolling.

## Language behavior

- All Walplay-owned availability labels, category names, state messages, notices, dates, and
  announcements exist in English and Spanish.
- Provider names remain as supplied and are not machine-translated.
- Region names are localized with `Intl.DisplayNames`; the code is always shown.
- A language change updates labels and country names without changing the region, refetching
  availability, or discarding results.

## Failure isolation

- Availability and region-list failures are scoped to the section.
- Core detail, seasons, cast, crew, related titles, personal-list actions, and existing entry points
  remain usable.
- Changing region, title, or language cannot let an older availability response overwrite the current
  section.
- Retry is explicit and does not reload the detail page.

## Disabled behavior

When the frontend capability is false:

- no section or placeholder is rendered;
- no requests are issued;
- existing detail tests and behavior are unchanged;
- the detail page's existing TMDB attribution remains.

When the backend capability is false:

- the availability routes are not mounted;
- direct requests receive the existing routing behavior: the title-availability path has no match
  and returns `404 ROUTE_NOT_FOUND`, while `/api/catalog/availability/regions` is matched by the
  existing `/:mediaType/:section` route and receives its `400 VALIDATION_ERROR`;
- no provider call is possible.
