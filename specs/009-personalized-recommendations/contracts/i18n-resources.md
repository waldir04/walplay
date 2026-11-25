# Contract: Recommendation i18n Resources

**Feature**: `009-personalized-recommendations` | **Type**: Localization contract

All Walplay-owned recommendation copy lives under the `recommendations` namespace in
`frontend/src/shared/i18n/resources/en.json` and `es.json`. Provider-supplied title names are never
translated. English is the canonical source; Spanish must have a value for every key. No raw key may
render.

## Keys

| Key | English | Spanish |
|---|---|---|
| `recommendations.area.heading` | Discover | Descubre |
| `recommendations.area.description` | Popular titles from the provider. | Títulos populares del proveedor. |
| `recommendations.explanation.summary` | How recommendations work | Cómo funcionan las recomendaciones |
| `recommendations.explanation.basis` | This section shows the provider's popular titles. It is not personalized. | Esta sección muestra los títulos populares del proveedor. No es personalizada. |
| `recommendations.explanation.savedTitles` | Walplay does not use the titles you saved to choose these suggestions. | Walplay no usa los títulos que guardaste para elegir estas sugerencias. |
| `recommendations.explanation.noAi` | Walplay does not apply AI or machine learning to your activity and does not create a separate visitor profile. | Walplay no aplica inteligencia artificial ni aprendizaje automático a tu actividad y no crea un perfil separado de visitante. |
| `recommendations.explanation.scope` | You are browsing as a guest. Personalized recommendations are not available in guest mode. | Estás en modo invitado. Las recomendaciones personalizadas no están disponibles en este modo. |
| `recommendations.explanation.retention` | Your saved lists stay in this browser and may be lost if you clear browsing data. | Tus listas guardadas permanecen en este navegador y pueden perderse si borras los datos de navegación. |
| `recommendations.explanation.controls` | You can switch between movies and TV shows and try again if something fails. Guest mode has no personalization controls. | Puedes cambiar entre películas y series y volver a intentar si algo falla. El modo invitado no tiene controles de personalización. |
| `recommendations.section.popular.heading` | Popular now | Popular ahora |
| `recommendations.section.popular.basis` | Based on provider popularity, not personalized | Según la popularidad del proveedor, no personalizado |
| `recommendations.section.mediaScope.label` | Show popular titles for | Mostrar títulos populares de |
| `recommendations.section.mediaScope.movie` | Movies | Películas |
| `recommendations.section.mediaScope.tv` | TV shows | Series |
| `recommendations.section.accessibleName` | Popular now, {mediaType} | Popular ahora, {mediaType} |
| `recommendations.section.listLabel` | Popular titles | Títulos populares |
| `recommendations.states.loading` | Recommendations are loading | Las recomendaciones se están cargando |
| `recommendations.states.empty.noProvider.title` | No suggestions are available right now | No hay sugerencias disponibles ahora |
| `recommendations.states.empty.noProvider.description` | The provider did not return any popular titles to show. Try again or browse the catalog. | El proveedor no devolvió títulos populares para mostrar. Vuelve a intentarlo o explora el catálogo. |
| `recommendations.states.empty.allExcluded.title` | No suggestions are left to show | No quedan sugerencias para mostrar |
| `recommendations.states.empty.allExcluded.description` | The available popular titles are already in your saved lists. Browse the catalog or search for another title. | Los títulos populares disponibles ya están en tus listas guardadas. Explora el catálogo o busca otro título. |
| `recommendations.states.error.title` | This area could not be loaded | No se pudo cargar esta sección |
| `recommendations.states.error.description` | Suggestions are temporarily unavailable. Try again or keep browsing. | Las sugerencias no están disponibles temporalmente. Vuelve a intentarlo o sigue explorando. |
| `recommendations.states.error.rateLimited.title` | Suggestions are temporarily limited | Las sugerencias están limitadas temporalmente |
| `recommendations.states.error.rateLimited.description` | Too many requests reached the provider. Try again in a moment. | Se alcanzó el límite de solicitudes al proveedor. Vuelve a intentarlo en un momento. |
| `recommendations.states.error.timedOut.title` | Suggestions took too long | Las sugerencias tardaron demasiado |
| `recommendations.states.error.timedOut.description` | The provider did not answer in time. Try again. | El proveedor no respondió a tiempo. Vuelve a intentarlo. |
| `recommendations.states.stale.label` | These suggestions were loaded earlier and may not be current. | Estas sugerencias se cargaron antes y pueden no estar actualizadas. |
| `recommendations.states.stale.lastUpdated` | Loaded on {date} | Datos cargados el {date} |
| `recommendations.actions.retry` | Try again | Volver a intentar |
| `recommendations.actions.retrying` | Trying again… | Intentando de nuevo… |
| `recommendations.actions.browse` | Browse the catalog | Explorar el catálogo |
| `recommendations.actions.search` | Search titles | Buscar títulos |
| `recommendations.announcements.ready` | Popular suggestions updated. | Sugerencias populares actualizadas. |
| `recommendations.announcements.empty` | No popular suggestions are available. | No hay sugerencias populares disponibles. |
| `recommendations.announcements.error` | Suggestions could not be loaded. | No se pudieron cargar las sugerencias. |
| `recommendations.announcements.stale` | Showing previously loaded suggestions. | Mostrando sugerencias cargadas anteriormente. |

## Rules

- Interpolation is only used for the media-type label and the localized date. No string concatenation
  builds a sentence.
- `recommendations.states.error.title` and `recommendations.states.error.description` are the default
  error copy, used for the `unavailable` cause. `error.rateLimited.*` and `error.timedOut.*` are
  specific overrides. No separate `unavailable` sub-key is required.
- The media scope uses `recommendations.section.mediaScope.movie` and `.tv` rather than the catalog
  labels, because the section's wording ("Popular now, Movies") differs from Browse's labels. If the
  design decides the catalog labels are sufficient, the keys may alias them, but the final values must
  still read naturally in both languages.
- Dates use `Intl.DateTimeFormat` with the active locale (`en-US` or `es-ES`) and medium date plus short
  time; no hand-built date strings.
- Numbers and counts use `Intl.NumberFormat` when introduced. The initial release displays no counts.
- No copy may use "for you", "recommended for you", "picked for you", "because you watched", "matches
  your taste", a match percentage, a quality claim, or an availability claim. Spanish copy must likewise
  avoid "para ti", "recomendado para ti", "elegido para ti", "porque viste", "coincide con tu gusto", and
  equivalent personalization claims.
- The explanation must remain truthful when the area is empty or in error: it describes the basis, not
  a promise that content is present.
- Provider title names, years, and artwork remain as supplied and are not passed through translation.
- `resources.test.ts` and the existing key-parity checks must pass; no key may exist in only one
  language.
