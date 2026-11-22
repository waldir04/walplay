# Contract: Search i18n Resources

**Feature**: `003-search-discovery` | **Type**: Translation resource contract

Search-owned text lives in a new `search` namespace in
`frontend/src/shared/i18n/resources/{en,es}.json`, plus one navigation label, one document title,
and one detail-return label added to existing namespaces. English is canonical; Spanish must expose
the identical leaf-key set. Counts use i18next pluralization; dates and numbers use `Intl`.

## Keys added outside the `search` namespace

| Key | English | Spanish | Notes |
|---|---|---|---|
| `navigation.search` | Search | Buscar | Primary navigation label |
| `meta.title.search` | Search · Walplay | Buscar · Walplay | Document title |
| `catalog.actions.returnToSearch` | Return to search | Volver a la búsqueda | Detail return action when the origin is search; detail page owns the label |

## `search` namespace

### Form and guidance

| Key | English | Notes |
|---|---|---|
| `search.form.regionLabel` | Search movies and TV shows | Accessible name of the `role="search"` region |
| `search.form.label` | Search movies and TV shows | Visible input label |
| `search.form.hint` | Enter at least {{min}} characters and no more than {{max}}. | Associated via `aria-describedby`; `min`/`max` are constants |
| `search.form.submit` | Search | Submit action |
| `search.form.clear` | Clear search | Clear action; rendered only when a draft exists |
| `search.guidance.initial.title` | Find something to watch | Initial state heading |
| `search.guidance.initial.description` | Search by title to see movies and TV shows together. | Initial state body |
| `search.guidance.tooShort` | Enter at least {{min}} characters to search. | Guidance, not an error |
| `search.guidance.tooLong` | Enter no more than {{max}} characters to search. | Guidance, not an error |
| `search.guidance.queryInvalid.title` | This search cannot be completed | Provider query-rejection guidance |
| `search.guidance.queryInvalid.description` | Check the title and try a different search. | Editable guidance; no retry |

### Results

| Key | English | Notes |
|---|---|---|
| `search.results.heading` | Results for “{{query}}” | Visible context for the active query |
| `search.results.collectionLabel` | Search results for {{query}} | Accessible name of the result collection; identifies the active query, not the input draft |
| `search.results.count_one` | {{count}} title shown | Displayed valid-title count, singular |
| `search.results.count_other` | {{count}} titles shown | Displayed valid-title count, plural |
| `search.results.loadingLabel` | Search results are loading | Accessible name of the busy results region during skeleton |

### States and announcements

| Key | English | Notes |
|---|---|---|
| `search.states.searching` | Searching for {{query}} | Polite announcement when a current search starts |
| `search.states.found_one` | {{count}} title found for {{query}} | Polite announcement when results arrive |
| `search.states.found_other` | {{count}} titles found for {{query}} | Polite announcement when results arrive |
| `search.states.noResults.title` | No titles matched “{{query}}” | Successful empty result; distinct from failure |
| `search.states.noResults.description` | Check the spelling or try a different title. You can edit or clear the search above. | Offers edit/clear; no retry |
| `search.states.unavailable.title` | Search is temporarily unavailable | Failure with no usable results |
| `search.states.unavailable.description` | Search could not be completed right now. Try again, or use the rest of the application. | Retry offered by the component |
| `search.states.rateLimited.title` | Search is temporarily limited | Rate-limited failure |
| `search.states.rateLimited.description` | Too many requests reached the provider. Try again in a moment. | No raw provider detail |
| `search.states.timedOut.title` | Search took too long | Timeout failure |
| `search.states.timedOut.description` | The provider did not answer in time. Try again. | No raw provider detail |
| `search.states.stale.lastUpdated` | Cached results from {{date}} | Cached/stale label; date via `Intl.DateTimeFormat` |
| `search.states.interimEmpty` | This page had no titles. Load more to keep looking. | Empty page with more pages; no auto-request |
| `search.states.endOfResults` | End of results for {{query}} | Announced once; focus target when load more is removed |
| `search.states.appended_one` | {{count}} more title added | One announcement per append |
| `search.states.appended_other` | {{count}} more titles added | One announcement per append |
| `search.states.pageError.title` | More results could not be loaded | Inline later-page failure |
| `search.states.pageError.description` | Your current results are still available. Try loading this page again. | Keeps loaded results usable |

### Actions

| Key | English | Notes |
|---|---|---|
| `search.actions.retry` | Try again | Failure retry only |
| `search.actions.loadMore` | Load more | Incremental loading |
| `search.actions.editQuery` | Edit search | No-results action; focuses the input |
| `search.actions.clearQuery` | Clear search | No-results action; clears the address |

## Spanish values

| Key | Spanish |
|---|---|
| `navigation.search` | Buscar |
| `meta.title.search` | Buscar · Walplay |
| `catalog.actions.returnToSearch` | Volver a la búsqueda |
| `search.form.regionLabel` | Buscar películas y series |
| `search.form.label` | Buscar películas y series |
| `search.form.hint` | Introduce al menos {{min}} caracteres y no más de {{max}}. |
| `search.form.submit` | Buscar |
| `search.form.clear` | Borrar la búsqueda |
| `search.guidance.initial.title` | Encuentra algo que ver |
| `search.guidance.initial.description` | Busca por título para ver películas y series juntas. |
| `search.guidance.tooShort` | Introduce al menos {{min}} caracteres para buscar. |
| `search.guidance.tooLong` | Introduce como máximo {{max}} caracteres para buscar. |
| `search.guidance.queryInvalid.title` | Esta búsqueda no se puede completar |
| `search.guidance.queryInvalid.description` | Revisa el título e intenta otra búsqueda. |
| `search.results.heading` | Resultados de «{{query}}» |
| `search.results.collectionLabel` | Resultados de búsqueda de {{query}} |
| `search.results.count_one` | {{count}} título mostrado |
| `search.results.count_other` | {{count}} títulos mostrados |
| `search.results.loadingLabel` | Los resultados de búsqueda se están cargando |
| `search.states.searching` | Buscando {{query}} |
| `search.states.found_one` | Se encontró {{count}} título para {{query}} |
| `search.states.found_other` | Se encontraron {{count}} títulos para {{query}} |
| `search.states.noResults.title` | Ningún título coincide con «{{query}}» |
| `search.states.noResults.description` | Revisa la ortografía o prueba otro título. Puedes editar o borrar la búsqueda arriba. |
| `search.states.unavailable.title` | La búsqueda no está disponible temporalmente |
| `search.states.unavailable.description` | La búsqueda no se pudo completar ahora mismo. Inténtalo de nuevo o usa el resto de la aplicación. |
| `search.states.rateLimited.title` | La búsqueda está limitada temporalmente |
| `search.states.rateLimited.description` | Se enviaron demasiadas solicitudes al proveedor. Inténtalo de nuevo en un momento. |
| `search.states.timedOut.title` | La búsqueda tardó demasiado |
| `search.states.timedOut.description` | El proveedor no respondió a tiempo. Inténtalo de nuevo. |
| `search.states.stale.lastUpdated` | Resultados en caché de {{date}} |
| `search.states.interimEmpty` | Esta página no tenía títulos. Carga más para seguir buscando. |
| `search.states.endOfResults` | Final de los resultados de {{query}} |
| `search.states.appended_one` | Se añadió {{count}} título más |
| `search.states.appended_other` | Se añadieron {{count}} títulos más |
| `search.states.pageError.title` | No se pudieron cargar más resultados |
| `search.states.pageError.description` | Tus resultados actuales siguen disponibles. Intenta cargar esta página de nuevo. |
| `search.actions.retry` | Intentar de nuevo |
| `search.actions.loadMore` | Cargar más |
| `search.actions.editQuery` | Editar la búsqueda |
| `search.actions.clearQuery` | Borrar la búsqueda |

## Rules

- Both locales MUST expose the identical leaf-key set; empty strings are prohibited.
- Search MUST reuse, not duplicate: `catalog.mediaType.*` (media type labels),
  `catalog.card.ratingLabel`, `catalog.card.ratingA11y`, `catalog.card.fallback`,
  `catalog.attribution.*`, and `a11y.currentPage` / `a11y.navigatedTo`.
- Counts, years, ratings, and dates MUST use i18next pluralization/interpolation and `Intl`, not
  string concatenation.
- The visitor's query MUST be interpolated as plain text (React escapes it); it is never translated
  or interpreted as markup.
- No user-facing string may be hardcoded in a component; the existing resource test enforces key
  parity and referenced-key existence.
- Provider metadata is requested in the selected language via the existing `en-US`/`es-ES` mapping;
  unsupported translations fall back to the original title inside the boundary.
- A language change re-requests the active query in the new language and discards previous-language
  pages; no intermediate mixed-language result set is rendered.
