# Contract: Detail Localization Resources

**Feature**: `004-entertainment-details` | **Type**: i18n resource contract

The project uses `i18next` + `react-i18next` with English as the canonical source and Spanish as the
second supported locale. All Walplay-owned detail copy is externalized. Provider-supplied titles,
overviews, names, taglines, and artwork text are never stored in translation resources, never
machine-translated, and never presented as Walplay-authored copy.

Existing shared keys are reused where they already express the behavior:

- `catalog.mediaType.movie` / `catalog.mediaType.tv`
- `catalog.actions.returnToCatalog` / `catalog.actions.returnToSearch`
- `catalog.attribution.sectionLabel` / `statement` / `logoAlt`
- `catalog.states.loading`
- `languages.*`, `a11y.navigatedTo`, `meta.title.titleDetail`

Add a `detail` namespace to both `frontend/src/shared/i18n/resources/en.json` and `es.json`.

## Resource table

| Key | English | Spanish | Notes |
|---|---|---|---|
| `meta.detailTitle` | `{{title}} · {{mediaType}}` | `{{title}} · {{mediaType}}` | Document title after identity resolves; `mediaType` is the localized `catalog.mediaType.*` label, never the raw enum |
| `detail.sections.overview` | `Overview` | `Sinopsis` | `h2` |
| `detail.sections.seasons` | `Seasons` | `Temporadas` | TV only |
| `detail.sections.episodes` | `Episodes` | `Episodios` | Selected season |
| `detail.sections.cast` | `Cast` | `Reparto` | |
| `detail.sections.crew` | `Crew` | `Equipo` | |
| `detail.sections.similar` | `Similar titles` | `Títulos similares` | Provider relationship only |
| `detail.sections.collection` | `Collection` | `Colección` | Movie only |
| `detail.sections.providerMetadata` | `Provider data` | `Datos del proveedor` | Secondary metadata area |
| `detail.sections.actions` | `Actions` | `Acciones` | Action area label |
| `detail.facts.releaseDate` | `Release date` | `Fecha de estreno` | Movie |
| `detail.facts.firstAirDate` | `First aired` | `Primera emisión` | TV |
| `detail.facts.latestAirDate` | `Latest air date` | `Última emisión` | TV |
| `detail.facts.runtime` | `Runtime` | `Duración` | Movie |
| `detail.facts.episodeRuntime` | `Episode length` | `Duración por episodio` | TV |
| `detail.facts.genres` | `Genres` | `Géneros` | List label |
| `detail.facts.originalTitle` | `Original title` | `Título original` | Shown only when different from the displayed title |
| `detail.facts.status` | `Status` | `Estado` | |
| `detail.facts.seasonsReported` | `Seasons reported by TMDB` | `Temporadas según TMDB` | Provider count |
| `detail.facts.episodesReported` | `Episodes reported by TMDB` | `Episodios según TMDB` | Provider count |
| `detail.facts.networks` | `Networks` | `Cadenas` | Provider names |
| `detail.status.released` | `Released` | `Estrenada` | |
| `detail.status.inProduction` | `In production` | `En producción` | |
| `detail.status.postProduction` | `Post-production` | `Posproducción` | |
| `detail.status.planned` | `Planned` | `Planeada` | |
| `detail.status.rumored` | `Rumored` | `Rumoreada` | |
| `detail.status.returning` | `Returning series` | `Serie en emisión` | |
| `detail.status.ended` | `Ended` | `Finalizada` | |
| `detail.status.canceled` | `Canceled` | `Cancelada` | |
| `detail.status.pilot` | `Pilot` | `Piloto` | |
| `detail.crewRole.director` | `Director` | `Dirección` | |
| `detail.crewRole.creator` | `Creator` | `Creación` | |
| `detail.crewRole.writer` | `Writer` | `Guion` | |
| `detail.duration.hoursMinutes` | `{{hours}} h {{minutes}} min` | `{{hours}} h {{minutes}} min` | `Intl` unit strings interpolated |
| `detail.duration.minutes` | `{{minutes}} min` | `{{minutes}} min` | Sub-hour runtime or episode length |
| `detail.duration.range` | `{{min}}–{{max}}` | `{{min}}–{{max}}` | Localized min/max strings |
| `detail.duration.typicalEpisode` | `About {{duration}} per episode` | `Aproximadamente {{duration}} por episodio` | Single TV value |
| `detail.rating.label` | `TMDB user rating` | `Valoración de usuarios de TMDB` | Visually associated with value |
| `detail.rating.a11y_one` | `{{value}} out of {{scale}}, from {{count}} vote` | `{{value}} de {{scale}}, con {{count}} voto` | Accessible rating text; plural |
| `detail.rating.a11y_other` | `{{value}} out of {{scale}}, from {{count}} votes` | `{{value}} de {{scale}}, con {{count}} votos` | Accessible rating text; plural |
| `detail.rating.votes_one` | `{{count}} vote` | `{{count}} voto` | Visible vote count; plural |
| `detail.rating.votes_other` | `{{count}} votes` | `{{count}} votos` | Visible vote count; plural |
| `detail.popularity.label` | `TMDB popularity` | `Popularidad en TMDB` | Secondary metadata only |
| `detail.providerValuesNote` | `Ratings and popularity are provided by TMDB and may change.` | `Las valoraciones y la popularidad las proporciona TMDB y pueden cambiar.` | Freshness/volatility note for provider values |
| `detail.overview.showMore` | `Show more` | `Mostrar más` | Expand control |
| `detail.overview.showLess` | `Show less` | `Mostrar menos` | Collapse control |
| `detail.seasons.selectLabel` | `Select season` | `Seleccionar temporada` | Group label |
| `detail.seasons.option` | `Season {{number}}` | `Temporada {{number}}` | Visible season name fallback |
| `detail.seasons.optionWithYear` | `Season {{number}} · {{year}}` | `Temporada {{number}} · {{year}}` | Year when known |
| `detail.seasons.optionWithCount_one` | `Season {{number}} · {{count}} episode` | `Temporada {{number}} · {{count}} episodio` | Provider count |
| `detail.seasons.optionWithCount_other` | `Season {{number}} · {{count}} episodes` | `Temporada {{number}} · {{count}} episodios` | Provider count |
| `detail.seasons.specials` | `Specials` | `Especiales` | Season `0` |
| `detail.seasons.selected` | `Selected` | `Seleccionada` | Visible selected text, not color alone |
| `detail.seasons.announcement` | `Season {{number}} selected` | `Temporada {{number}} seleccionada` | Polite live region |
| `detail.seasons.specialsAnnouncement` | `Specials selected` | `Especiales seleccionados` | Polite live region |
| `detail.episodes.episodeLabel` | `Episode {{number}}` | `Episodio {{number}}` | Used when name is missing |
| `detail.episodes.empty.title` | `No episodes available` | `No hay episodios disponibles` | In-area empty state |
| `detail.episodes.empty.description` | `TMDB does not list episodes for this season.` | `TMDB no muestra episodios para esta temporada.` | No fabrication |
| `detail.episodes.loading` | `Episodes are loading` | `Los episodios se están cargando` | Busy label |
| `detail.credits.character` | `as {{character}}` | `como {{character}}` | Only when known |
| `detail.credits.profileFallback` | `{{name}}` | `{{name}}` | Neutral fallback text |
| `detail.states.loading` | `Loading title details` | `Cargando los detalles del título` | Skeleton busy label |
| `detail.states.loaded` | `Details loaded for {{title}}` | `Detalles cargados de {{title}}` | Polite once |
| `detail.states.error.title` | `Title details are unavailable` | `Los detalles del título no están disponibles` | Page-level error |
| `detail.states.error.description` | `This title could not be loaded right now. Try again, or return to the catalog.` | `Este título no se pudo cargar ahora. Inténtalo de nuevo o vuelve al catálogo.` | No provider detail |
| `detail.states.retry` | `Try again` | `Reintentar` | Section or page scoped |
| `detail.states.sectionError.title` | `This section could not be loaded` | `Esta sección no se pudo cargar` | Inline |
| `detail.states.sectionError.description` | `Try again to load this section. The rest of the page is still available.` | `Reintenta cargar esta sección. El resto de la página sigue disponible.` | Inline |
| `detail.states.notFound.title` | `Title not found` | `Título no encontrado` | Distinct from error |
| `detail.states.notFound.description` | `This title is not available. It may have been removed, or the address may be mistyped.` | `Este título no está disponible. Puede que se haya eliminado o que la dirección esté mal escrita.` | No technical detail |
| `detail.states.stale.label` | `Showing cached details` | `Mostrando detalles en caché` | Core surface only |
| `detail.states.stale.lastUpdated` | `Cached data from {{date}}` | `Datos en caché del {{date}}` | Localized date/time; core or section |
| `detail.states.sectionLoading` | `Loading this section` | `Cargando esta sección` | Secondary surface busy label |
| `detail.states.sectionStale` | `Showing cached section data` | `Mostrando datos en caché de esta sección` | Secondary surface stale label |
| `detail.actions.trailer` | `Watch trailer` | `Ver tráiler` | Visible label |
| `detail.actions.trailerExternal` | `Opens YouTube in a new tab` | `Abre YouTube en una pestaña nueva` | External indication |
| `detail.a11y.seasonControl` | `Season {{number}}` | `Temporada {{number}}` | Accessible name |

## Rules

- Both locale files define every key above; the resources parity test fails on a missing key.
- Plural keys use i18next `_one`/`_other` suffixes, never string concatenation.
- `detail.states.loading` and `detail.states.stale.label` are core-surface copy. Secondary surfaces use
  `detail.states.sectionLoading` and `detail.states.sectionStale`, plus `detail.episodes.loading` for
  the episode area, so a credits/similar/collection skeleton never announces "Loading title details".
- `meta.detailTitle` receives the localized `catalog.mediaType.*` label for `mediaType`, never the raw
  `movie`/`tv` enum.
- Related-title cards render no rating, so no rating key is required for related cards.
- Numeric interpolation receives values already formatted with `Intl` for the active locale.
- Dates use `Intl.DateTimeFormat` and are never assembled from translated fragments.
- Unknown provider statuses and jobs are omitted; there is no "unknown" fallback key.
- Provider content is never passed through `t()` as a translation key.
- All new keys are exercised by at least one component or model test, no unused detail key is left
  behind, and no two keys express the same sentence or state.
- `catalog.states.detailsUnavailable` becomes unused when the placeholder detail body is replaced;
  remove it from both locale files if no other surface references it.
