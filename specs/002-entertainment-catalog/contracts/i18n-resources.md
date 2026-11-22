# Contract: Catalog Internationalization

**Feature**: `002-entertainment-catalog` | **Type**: Translation and formatting contract

The catalog follows Principle XV: `i18next`/`react-i18next`, externalized English and Spanish text,
English fallback, no hardcoded user-facing strings, and `Intl` formatting.

## Provider language mapping

| Interface locale | Provider language | Notes |
|---|---|---|
| `en` | `en-US` | Initial English locale |
| `es` | `es-ES` | Fixed by the specification clarification |

- The mapping lives in one shared backend constant and one frontend constant; it is not repeated in
  components.
- Section pages, detail lookups, and genre lists all request the mapped language.
- Provider metadata is displayed as provider text with attribution; Walplay does not machine-translate
  it and does not claim editorial ownership.
- When localized metadata is missing, the provider/original title is shown; no blank field or raw key
  appears.

## Required translation keys

Both `frontend/src/shared/i18n/resources/en.json` and `es.json` must contain the same key set.
English is authoritative for key names.

### Navigation and document titles

| Key | Use |
|---|---|
| `navigation.browse` | Primary navigation label |
| `meta.title.browse` | Landing document title |
| `meta.title.catalogCategory` | Category document title |
| `meta.title.titleDetail` | Minimal detail document title |
| `meta.title.catalogNotFound` | Catalog not-found document title |

### Media type and sections

| Key | Use |
|---|---|
| `catalog.mediaType.label` | Accessible label for the media switch |
| `catalog.mediaType.movie` | Visible and accessible movie label |
| `catalog.mediaType.tv` | Visible and accessible TV show label |
| `catalog.sections.trending` | Trending section heading |
| `catalog.sections.popular` | Popular section heading |
| `catalog.sections.topRated` | Top rated section heading |
| `catalog.category.popular` | Popular category heading |
| `catalog.category.topRated` | Top rated category heading |

### Actions

| Key | Use |
|---|---|
| `catalog.actions.seeAll` | Section "See all" accessible name; interpolates the section label |
| `catalog.actions.loadMore` | Load-more control label |
| `catalog.actions.retry` | Retry action |
| `catalog.actions.returnToCatalog` | Detail return action |
| `catalog.actions.switchMediaType` | Empty-state media switch action |

### Cards

| Key | Use |
|---|---|
| `catalog.card.mediaType` | Card media-type line (may reuse `catalog.mediaType.*`) |
| `catalog.card.ratingLabel` | Visible rating context, e.g. "8.1 / 10" |
| `catalog.card.ratingA11y` | Accessible rating phrasing, interpolates value and scale |
| `catalog.card.yearA11y` | Optional year context if the visible year alone is ambiguous |
| `catalog.card.fallback` | Poster fallback accessible text; includes title and media type |

### States and announcements

| Key | Use |
|---|---|
| `catalog.states.loading` | Busy/loading announcement |
| `catalog.states.sectionLoading` | Optional per-section loading label |
| `catalog.states.empty.title` | Empty surface heading |
| `catalog.states.empty.description` | Empty explanation, including no titles available right now |
| `catalog.states.error.title` | Inline error heading |
| `catalog.states.error.description` | Inline error explanation |
| `catalog.states.pageError.title` | Page-level error heading |
| `catalog.states.pageError.description` | Page-level error explanation |
| `catalog.states.rateLimited.title` | Temporarily limited heading |
| `catalog.states.rateLimited.description` | Temporarily limited explanation |
| `catalog.states.stale.label` | Cached/stale label |
| `catalog.states.stale.lastUpdated` | Last update phrasing; interpolates a locale-formatted date/time |
| `catalog.states.endOfList` | End-of-list message |
| `catalog.states.appended_one` | Singular appended-count announcement |
| `catalog.states.appended_other` | Plural appended-count announcement |
| `catalog.states.detailsUnavailable` | "Complete details are not yet available" statement |
| `catalog.states.notFound.title` | Unknown title heading |
| `catalog.states.notFound.description` | Unknown title explanation |
| `catalog.states.unavailable.title` | Detail unavailable heading |
| `catalog.states.unavailable.description` | Detail unavailable explanation |

### Attribution

| Key | Use |
|---|---|
| `catalog.attribution.statement` | Localized surrounding attribution text and non-endorsement statement |
| `catalog.attribution.logoAlt` | Provider mark alternative text, or empty when the statement already names the provider |

The official provider mark and exact required statement are confirmed at implementation/legal
review; the localized surrounding text is Walplay-owned, while the mark and required wording are not
altered.

## Formatting

- Ratings use `Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })`
  and carry an accessible "out of 10" context.
- Years are four-digit values derived at the boundary, not dates formatted in the browser.
- Stale timestamps use `Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })`.
- Counts use `Intl.NumberFormat(locale)`.
- Numeric values that align vertically use `tabular-nums`.
- Pluralization uses i18next plural keys; no string concatenation.
- Interpolation uses i18next interpolation; no manual replacement.

## Language change behavior

- All catalog-owned text updates when the locale changes, without a full page reload.
- TanStack Query keys include the interface locale, so cached provider data per language is distinct.
- A category list with loaded pages restarts at page one; old pages are discarded.
- While new-language data loads, the surface shows its loading/transition state and never settles
  with mixed-language card content.
- The existing language announcement remains the single announcement source for the language change;
  the catalog does not duplicate it.
- `<html lang>` continues to reflect the active locale.

## Tests

- Resource parity: identical key sets in `en.json` and `es.json`; no missing catalog keys.
- No catalog-owned literal UI text in components (lint/manual review).
- Language switch resets category pages and clears old-language items.
- `Intl` formatting tests for rating and stale timestamp in both locales.
- Provider language mapping tests for `en -> en-US`, `es -> es-ES`.
- No raw provider genre names or untranslated keys appear in rendered output.
