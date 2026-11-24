# Contract: Detail Routes and Navigation

**Feature**: `004-entertainment-details` | **Type**: SPA route and address contract

The detail page completes the existing catalog detail destination. It renders inside the feature 001
shell (one skip link, header, brand link, primary navigation, single `<main>`) and reuses the
existing route objects, lazy loading, error containment, return resolver, and provider attribution.

## Route table

| Address | Surface | Navigation current | Document title |
|---|---|---|---|
| `/browse/movies/title/:itemId` | Movie detail | Browse | Localized `title · movie type` after load |
| `/browse/tv-shows/title/:itemId` | TV detail | Browse | Localized `title · TV type` after load |
| `/browse/tv-shows/title/:itemId?season=N` | TV detail, season N selected | Browse | Same as TV detail |
| `/browse/movies/title/:itemId?season=N` | Movie detail; season parameter ignored | Browse | Same as movie detail |
| malformed detail path | Localized not-found, inside the shell | Browse | `meta.title.titleDetail` |
| other `/browse/*` | Existing catalog not-found | none | unchanged |

Rules:

- No second detail destination, route object, or navigation entry is created (FR-001).
- The pathname is authoritative for content type. A title never resolves from the other type that
  shares a numeric provider identifier (FR-003).
- `itemId` must match `^[A-Za-z0-9_-]{8,64}$`. A malformed segment produces the localized not-found
  state; the page must not render blank and must not issue a detail request.
- An unknown content-type slug under `/browse/*` continues to use the existing catalog not-found
  route.
- The route remains a lazy chunk; no new top-level route is added.

## Address contract

| Aspect | Contract |
|---|---|
| Detail identity | Path `mediaType` + `itemId` |
| Season parameter | `season`, first occurrence wins; integer string `0..999`; `0` means specials; repeated or unknown parameters ignored |
| Season normalization | Leading zeros parse to the same integer; non-integer, negative, out-of-range, or absent values are treated as absent |
| Season source of truth | The address, resolved against the provider-supplied season list |
| Season change | `navigate` or `setSearchParams` with `{ replace: true }`; no new history entry; the current location state (origin context) is preserved |
| Initial season write | Once the core season list resolves and a season is effective, the address is updated with `replace` to reflect the selected season, preserving origin state; a TV show with no seasons keeps the address unchanged |
| Direct open / reload | Core detail and the addressed season resolve without prior navigation (FR-004) |
| Movie season parameter | Ignored; no season UI; the address may retain the parameter without effect |
| Language | Not encoded; the interface preference is the source (existing behavior) |
| Return context | Existing `state.from` carried by catalog cards and search results |

Examples:

```text
/browse/movies/title/<id>                     -> movie detail
/browse/tv-shows/title/<id>                   -> TV detail, initial season
/browse/tv-shows/title/<id>?season=2          -> TV detail, season 2 if supplied
/browse/tv-shows/title/<id>?season=0          -> TV detail, specials if supplied
/browse/tv-shows/title/<id>?season=01         -> season 1
/browse/tv-shows/title/<id>?season=abc        -> initial season, no error
/browse/tv-shows/title/<id>?season=999        -> initial season, no error
/browse/tv-shows/title/<id>?season=2&season=3 -> season 2
/browse/movies/title/<id>?season=2            -> movie detail; parameter ignored
```

## History behavior

| Event | History effect | Back result |
|---|---|---|
| Open detail from catalog card | Push | Origin catalog context |
| Open detail from search result | Push | Active search address and results |
| Open detail directly / reload | No prior entry | App-defined fallback; return action visible |
| Change season | Replace current entry | Origin catalog/search context |
| Change season several times | Replace each time | Origin catalog/search context |
| Change language | No history entry | Detail address preserved; season preserved when still valid |
| Return action | Navigates to the resolved origin | Existing feature behavior |

Rules:

- Return navigation is available in every detail state: loading, loaded, stale, error, and
  not-found.
- A direct open or reload with no origin uses the media landing fallback; malformed or foreign
  origins fall back without an error.
- Browser back after a season change must not step through previously selected seasons (FR-034,
  Edge Cases).

## Information hierarchy

The DOM order is the reading and assistive-technology order:

1. Primary heading: title identity, content type, and return action
2. Primary facts: release/first-air date, genres, movie runtime or TV episode duration, rating,
   TV summary
3. Overview and optional tagline
4. Entry-point action area (only supported actions)
5. Seasons and episodes (TV only)
6. Cast and crew
7. Similar titles
8. Collection membership (movies)
9. Provider metadata: TMDB popularity and attribution

Sections without usable information are omitted without leaving an empty gap. On desktop widths the
poster sits alongside the identity and facts; on narrow widths the identity and facts precede the
artwork in the accessibility tree, and the layout stacks without horizontal scrolling (FR-013).
Related-title cards render title, content type, year, genres, and artwork only; they render no rating
in this feature (FR-042). Episode lists are not truncated: every usable episode in the selected
season is present in provider order, and a very large season list remains fully reachable without
clipping.

## Surface behavior

| Surface | Loading | Empty | Error | Stale |
|---|---|---|---|---|
| Core | Layout-matching skeleton, `aria-busy`, decorative shapes hidden | Not applicable; unusable identity is not-found | Page-level localized alert, retry, return action | Full content plus cached label and last-update time |
| Seasons list | Part of core skeleton | Section omitted when no seasons | Contained in core page state; TV with no seasons is not an error | Core stale label applies |
| Episodes | In-section skeleton with reserved space | Localized empty message inside the episode area | Inline alert and section-only retry; season control remains usable | In-section cached label |
| Cast / crew | In-section skeletons | Section omitted when no usable credits | Inline alert and section-only retry | In-section cached label |
| Similar | In-section skeleton | Section omitted | Inline alert and section-only retry | In-section cached label |
| Collection | In-section skeleton when membership exists | Section omitted | Inline alert and section-only retry | In-section cached label |
| Entry points | None; omitted until capability and data exist | Omitted | Omitted; never a dead control | Not applicable |
| Provider metadata | Appears with core | Popularity omitted; attribution always visible | Attribution remains visible | Last-update label applies |

Rules:

- Core failure never replaces a loaded secondary surface with an error, and a secondary failure
  never replaces the core page (FR-070 to FR-072).
- Secondary retry affects only its surface, prevents concurrent duplicate retries, and is
  user-initiated (FR-076).
- A season request failure after the core season list exists falls back to the initial season once;
  the address is replaced with that season and repeated failure shows the in-section error.
- A `DETAIL_SEASON_NOT_FOUND` response is a fallback signal, not a page-level error.
- Loading skeletons reserve the final dimensions so content does not jump.
- Secondary surfaces announce `detail.states.sectionLoading`/`detail.states.sectionStale` (or
  `detail.episodes.loading` for the episode area), never the core "Loading title details" copy.

## Not-found contract

The localized not-found state is used for:

- unknown, removed, or adult-flagged titles
- a malformed or missing `itemId`
- an unsupported content type
- a title lacking the minimum usable identity
- a numeric provider id that belongs to the other content type

The state:

- identifies itself as not-found, not as a temporary error
- offers a working return to the catalog
- exposes no technical detail, status code, provider message, or identifier
- keeps primary navigation and language switching usable
- is visually and semantically distinct from the recoverable error state

## Focus and announcements

| Event | Focus | Announcement |
|---|---|---|
| Navigate to detail from card/search | Primary heading (`h1#page-heading`) | Existing route announcement once |
| Direct open / reload | No forced move | none |
| Core load completes | Stays | Polite loaded announcement once |
| Core failure | No forced move; page alert announced | Assertive once |
| Not-found | Primary heading exposed | Polite/one announcement |
| Season change | Stays on the activated season control | Polite "Season N selected" once; episode region busy |
| Episodes load | Stays | No duplicate announcement |
| Episodes empty | Stays | Polite empty message once |
| Secondary failure | No forced move; inline alert | Assertive once if focused/announced by the alert |
| Language change | Existing language-switch behavior | Existing announcement; detail content refreshes |
| Superseded rapid navigation | Ignored | none |

Rules:

- Exactly one `h1` exists in every state.
- Section headings are `h2`; list semantics are used for genres, cast, crew, seasons, episodes, and
  related titles.
- A season change does not change the pathname, so the route announcement does not fire; the season
  live region is the only announcement.
- The page sets the document title to `{{title}} · {{mediaType}}` once the identity resolves;
  `{{mediaType}}` is the localized `catalog.mediaType.*` label, never the raw enum. During loading,
  error, and not-found the static route title is used.

## Entry-point contract

`DETAIL_CAPABILITIES` no longer includes a trailer flag. Trailer presentation, activation, player, and external fallback are owned by `specs/008-trailers-video-content/spec.md` and are gated by that feature's capability flags.

| Capability | Data condition | Rendered state |
|---|---|---|
| Availability | No approved provider or destination | Omitted; no placeholder, teaser, or "coming soon" |
| Personal list | No implemented capability or persistence | Omitted; no favorites variant |

Rules:

- Every rendered action has a visible localized text label, is keyboard and touch operable, meets
  the design-system target size, and shows a visible focus indicator.
- No disabled, non-functional, placeholder, or "coming soon" control is produced.
- Returning from an external destination preserves the detail address and selected season.

## Responsive and accessibility contract

| Aspect | Contract |
|---|---|
| Widths | Verified at 320, 360, 768, 1024, and 1440 px; no horizontal page scrolling |
| Zoom | 200 % browser zoom; no clipped text or controls, no overlap, no lost content |
| Reading order | Title and type before artwork in the accessibility tree |
| Artwork | Reserved aspect ratio; alternative text or decorative treatment; fallback on failure |
| Controls | Season controls, expand/collapse, and retries reachable in logical keyboard order; trailer controls are owned by feature 008 |
| State communication | Selected season, rating source, availability labels, and entry-point states are text, not color alone |
| Motion | Reduced-motion preference honored; no information depends on animation |
| Language | All Walplay copy in English and Spanish; provider metadata follows the selected provider language |
| Document language | Updated by the existing language infrastructure |
