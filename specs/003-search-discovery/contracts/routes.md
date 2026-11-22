# Contract: Search Routes and Navigation

**Feature**: `003-search-discovery` | **Type**: SPA route contract

Every search state renders inside the feature 001 shell (`AppShell`): one skip link, header, brand
link, primary navigation, single `<main>`, and no global footer. Provider attribution appears
wherever provider search data is displayed.

## Route table

| Address | Surface | Navigation current | Document title key |
|---|---|---|---|
| `/search` | Search, initial guidance | Search | `meta.title.search` |
| `/search?q=<text>` | Search, active query | Search | `meta.title.search` |
| `/browse/...` | Existing catalog surfaces | Browse | unchanged |
| `/browse/<type>/title/:itemId` | Existing minimal detail, optionally with a search origin | Browse | `meta.title.titleDetail` |
| other | Existing not-found | none | unchanged |

Rules:

- Exactly one Search entry is added to the primary navigation. Home, Browse, and Settings remain
  unchanged destinations.
- Search is current only on the search surface (exact `/search` path match). It is not a persistent
  header field and does not use a new global control.
- The detail destination keeps its catalog route and Browse current state, even when opened from
  search (FR-009).
- No search route redirects to a technical error screen; guidance, empty, stale, and failure states
  stay inside the shell and preserve the address.

## Address contract

| Aspect | Contract |
|---|---|
| Query parameter | `q`; first occurrence wins; extra/duplicated parameters are ignored |
| Decoding | Standard URL decoding; `+` becomes a space; trimmed before use; internal whitespace preserved |
| Source of truth | The address, not the input draft, determines the active query |
| Settlement | Input stops changing for 350 ms, then the trimmed draft is written with `replace` |
| Explicit submit | Submit button or Enter cancels the timer and writes immediately |
| Clearing | Remove `q` with `replace`; initial guidance returns; focus stays in the input |
| History | Every settled query replaces the current entry; no entry is added for intermediate typing or settled queries |
| Result open | A normal push to the existing detail address; Back returns to the active search |
| Background refetch | None. No interval, focus, or reconnect refetch; a request is issued only for a settled query, explicit submit, load more, explicit retry, or language change |
| Direct open / reload | The `q` value is active and submitted; the first provider page loads |
| Invalid address query | `q` is respected, no request is issued, localized guidance appears |
| Page depth | Not encoded; a direct open or reload loads page one only |

Examples:

```text
/search                     -> initial guidance, no request
/search?q=                       -> empty guidance, no request
/search?q=the%20matrix            -> active query, request issued
/search?q=t                      -> too-short guidance, no request
/search?q=the+matrix&extra=1      -> active query "the matrix"; extra ignored
/search?q=a&q=b                   -> active query "a"; second occurrence ignored
```

## Search page contract

| Element | Contract |
|---|---|
| Heading | Exactly one `h1` with `id="page-heading"` and `tabIndex={-1}`; localized "Search" |
| Search region | `role="search"` with an accessible name; one labelled single-line input |
| Input | Visible label, hint associated via `aria-describedby`; user-agent autocomplete and form history disabled; submit and clear actions have accessible names |
| Clear | Rendered only when the draft is non-empty; clears the address, cancels pending work, refocuses the input |
| Guidance | Initial, empty, too-short, and too-long guidance are localized, not errors, and offer no retry |
| Results | One semantic result collection with an accessible name that includes the active query |
| Result count | Number of valid titles currently displayed, pluralized, never a provider total |
| Media type | Every result shows its type in text |
| Result target | Exactly one interactive target per result, to the existing type-specific detail address |
| Load more | Only when `hasMore` and not fetching; busy and disabled while fetching; one request per activation |
| End | Control removed; localized end message shown and announced; focus moves to the end status if the control had focus |
| Initial loading | Layout-matching skeleton, results region `aria-busy`, decorative shapes hidden |
| No results | Only after a successful response with zero valid items and no further pages; echoes the query and offers edit/clear |
| Failure | Localized alert with retry; query remains editable; no raw provider detail |
| Query-invalid | Localized editable guidance; no retry action |
| Interim empty page | Existing results preserved; states the page had no titles; load more remains; no auto-request |
| Stale | Localized cached label and last-update time; never presented as current |
| Refresh failure with results | If the active query's refresh fails while results are displayed, keep them, label them cached with the last successful update time, and offer an inline retry; do not replace them with a page-level error |
| Attribution | Present whenever provider data is displayed, including no-results, stale, and partial pages |
| Language | All search-owned copy updates; provider metadata is re-requested in the new language; previous-language pages are discarded |

## Focus and announcements

| Event | Focus | Announcement |
|---|---|---|
| Direct open / reload | No forced move (initial route load is not announced) | none |
| Settled debounced search starts | Stays in the input | polite "searching" once |
| Results arrive | Stays in the input unless the visitor moved it | polite displayed count once |
| Explicit submit | Stays in the input | same as settled search |
| Clear | Returns to the input | none |
| Append | Stays on load more | polite newly added count once |
| Interim-empty page | Stays on load more | polite "no titles on this page" once |
| End of results | Moves to the end status if load more had focus | polite end message once |
| No results | No forced move | polite no-results message once |
| Failure | No forced move; alert is announced | assertive once |
| Refresh failure with existing results | No forced move; inline retry is reachable | polite cached label once |
| Superseded response | No effect | none |

A query change keeps the same pathname, so the shell route announcement does not move focus on
every search.

## Detail return contract

| Origin | Card `from` value | Return action | Label |
|---|---|---|---|
| Search | `/search?q=<encoded active query>` (the query whose results are shown, never the input draft) | Returns to that search address; session results are restored from the query cache, or page one is requested if absent | Search return label |
| Catalog category | Existing category pathname | Existing behavior | Existing catalog label |
| Catalog landing | Existing landing pathname | Existing behavior | Existing catalog label |
| Direct open / reload | absent | Media landing fallback | Existing catalog label |
| Malformed or foreign origin | any invalid value | Media landing fallback, no error | Existing catalog label |

Rules:

- No second detail destination or duplicated detail content is created.
- The detail address and Browse current state are unchanged.
- Browser back from a detail opened from search restores the search address and its results.
- A search origin that cannot be restored after reload falls back without fabricated search state.

## Accessibility contract

- One `h1`; results region and collection have logical names; the collection name identifies the
  query whose results are shown, which may differ from the input draft while settling.
- Input, submit, clear, load more, retry, and result links are keyboard reachable in logical order
  with the shared focus-visible indicator and no trap.
- Interactive targets are at least 24×24 CSS px; submit, clear, and load more are at least
  44×44 CSS px.
- Loading, result arrival, append, interim-empty, end, no-results, stale, and error changes are
  announced once. Failures use alert semantics; non-failure changes use polite status.
- Decorative skeleton shapes are hidden from assistive technology while the busy state is exposed.
- Reduced motion suppresses skeleton animation; no layout-affecting motion.
- No hover-only information or action.
- At 360/768/1024/1440 px and 200 % zoom there is no horizontal page scrolling, clipped text,
  overlapping control, or unreachable content.

## Out of scope

- Autocomplete, suggestions, trending/recent searches, and persisted history.
- Media-type scope controls and any discovery filters.
- Changes to Home, Browse, or Settings beyond the Search navigation entry.
- A second detail route, full detail pages, availability, watchlists, or playback.
