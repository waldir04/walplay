# Contract: Catalog Routes and Navigation

**Feature**: `002-entertainment-catalog` | **Type**: SPA route contract

Every catalog route renders inside the feature 001 shell (`AppShell`): one skip link, header, brand
link, primary navigation, single `<main>`, and no global footer. Catalog pages add the provider
attribution region required by TMDB terms.

## Route table

| Address | Surface | Media type | Paginated | Navigation | Document title key |
|---|---|---|---|---|---|
| `/browse` | Redirect | Movies | n/a | Yes (Browse) | n/a |
| `/browse/movies` | Movies landing | `movie` | No | via Browse | `meta.title.browse` |
| `/browse/tv-shows` | TV landing | `tv` | No | via Browse | `meta.title.browse` |
| `/browse/movies/popular` | Movies popular category | `movie` | Yes | via Browse | `meta.title.catalogCategory` |
| `/browse/movies/top-rated` | Movies top-rated category | `movie` | Yes | via Browse | `meta.title.catalogCategory` |
| `/browse/tv-shows/popular` | TV popular category | `tv` | Yes | via Browse | `meta.title.catalogCategory` |
| `/browse/tv-shows/top-rated` | TV top-rated category | `tv` | Yes | via Browse | `meta.title.catalogCategory` |
| `/browse/movies/title/:itemId` | Movie minimal detail | `movie` | No | via Browse | `meta.title.titleDetail` |
| `/browse/tv-shows/title/:itemId` | TV minimal detail | `tv` | No | via Browse | `meta.title.titleDetail` |
| `/browse/*` (unmatched) | Catalog not-found | n/a | n/a | no | `meta.title.catalogNotFound` |
| `*` (other) | Foundation not-found | n/a | n/a | no | `meta.title.notFound` |

Home is not a new destination; it keeps its route and shell placement. Its outdated "nothing to
browse" placeholder is replaced with a working entry point to Browse, and it gains no other
catalog functionality. Settings remains unchanged.

Rules:

- `/browse` redirects with `replace` to `/browse/movies`; Movies is the default type and the selected
  type is always present in the address.
- Exactly one Browse entry is added to the primary navigation. Settings and Home remain unchanged as
  destinations.
- Browse navigation active state matches `/browse` and every nested catalog path. The existing
  exact-path match is extended with a prefix rule for this item only.
- `trending` has no category address because the provider documents no page parameter for it.
- An unknown category slug, unknown media-type slug, malformed item ID, or nested catalog path shows
  a localized catalog not-found state inside the shell, with a working return to the type landing.
- No catalog route redirects to a technical error screen; failures stay inside the shell and preserve
  the address.

## Landing page contract

| Element | Contract |
|---|---|
| Heading | Exactly one `h1` with `id="page-heading"` and `tabIndex={-1}`; localized type label |
| Media switch | Movies / TV Shows control; current type exposed with `aria-pressed` or an equivalent selected state plus text; targets the other type landing |
| Sections | One region per supported capability, in declared order, each labelled by an `h2` |
| Preview | First provider page only, max one page of items, provider order preserved |
| See all | Rendered only for `paginated` sections; targets the category address |
| Loading | Layout-matching section/card skeleton; region `aria-busy="true"`; decorative shapes hidden |
| Section failure | Inline localized error with retry inside that region; other sections, switch, navigation, and attribution remain usable |
| All sections failed | One page-level localized error with retry inside the shell; no duplicate section errors |
| Empty section | Localized empty explanation with retry and, where meaningful, a media switch; no fabricated items |
| Stale | Localized cached/stale label plus last-update time; never presented as current |
| Attribution | Present whenever provider data is displayed, including partial-failure states |

## Category page contract

| Element | Contract |
|---|---|
| Heading | Exactly one `h1` naming the localized category and media type |
| Media switch | Same category for the other type when supported; otherwise that type's landing |
| Initial data | Provider page 1 only; page size is the provider's; no prior pages restored on direct open |
| Ordering | Provider order preserved; no re-sort, re-rank, or invented explanation |
| Load more | Available only when `hasMore` and no request is pending; busy and disabled while pending; one request per activation |
| Append | Existing items and order preserved; duplicates removed by opaque ID; count announced once |
| End | Control removed; localized end-of-list message shown and announced; focus moves to the end status if the control was focused |
| Load-more failure | Existing items remain usable; inline localized error with retry for the failed page; no page-level collapse |
| Direct address | Correct type and category only; wrong-type or unknown content never appears |
| Language change | Restart at page 1 in the new language; discard old pages; no mixed-language final state |
| Attribution | Present whenever provider data is displayed |

## Minimal detail contract

| Aspect | Contract |
|---|---|
| Route uniqueness | One address per title and media type; `itemId` is opaque |
| From a card | Uses the validated card item passed by navigation; no redundant request; ID and type must match the address |
| Direct open | Calls the minimal backend lookup; shows a skeleton, then content or a localized not-found/unavailable state |
| Content | Title, media type in text, available year/rating/genres/poster or fallback, localized "complete details are not yet available" statement, attribution |
| Prohibited | Full details, cast, seasons, episodes, availability, recommendations, trailers, user actions, playback |
| Return action | Returns to the validated originating category or media landing; otherwise the media landing; always a working in-app link |
| Unknown title | Localized not-found inside the shell; no raw technical detail; working return |
| Lookup failure | Localized unavailable inside the shell; working return; no fabricated metadata |

## Navigation and history behavior

| Event | Required behavior |
|---|---|
| Open `/browse` | Replace with `/browse/movies`; no duplicate history entry |
| Direct open of any type address | Correct type selected and content shown; no focus move on initial load |
| Switch media type on a landing | Address and selected state update; other landing renders; no stale items |
| Switch media type on a category | Matching category for the other type when supported; otherwise that type's landing; no stale items |
| Activate a card | Address updates to the type-specific detail; destination identifies the selected title |
| Browser back / forward | Matching route, media type, category/detail, and content restored; no items from the other view |
| Rapid media/category switches | Final address wins; older responses never overwrite newer selections; no duplicate headings or announcements |
| Activate brand link | Foundation Home renders |
| Language change | All catalog labels and provider metadata update in the new language; category restarts at page one |

## Accessibility contract

- One `h1` per surface; sections use `h2`; heading hierarchy is logical.
- The card collection is a semantic list with an accessible name.
- Each card has exactly one interactive target. Its accessible name includes the title, media type,
  and optional year/rating; artwork and fallback decoration are hidden from the accessible name.
- Keyboard order follows visual order; all controls have the shared focus-visible indicator; no
  keyboard trap.
- Interactive targets are at least 24×24 CSS px; primary controls, media-switch destinations, and
  "Load more" are at least 44×44 CSS px.
- Loading, append, end, empty, stale, and error changes are announced once. Errors use alert
  semantics; non-error changes use polite status.
- Reduced motion suppresses skeleton animation; no layout-affecting motion shifts content.
- No hover-only information or action.
- At 360/768/1024/1440 px and 200% zoom there is no horizontal page scrolling, clipped text,
  overlapping control, or unreachable content.

## Out of scope

- Advanced search, filters, personal lists, availability, playback, full detail pages.
- Changing the Settings destination or the shell beyond the Browse navigation entry and its
  prefix-aware active state.
- Adding a global footer or legal-link region.
