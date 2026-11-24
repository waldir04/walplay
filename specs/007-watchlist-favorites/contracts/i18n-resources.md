# Contract: Saved Localization Resources

**Feature**: `007-watchlist-favorites` | **Type**: i18n resource contract

All Walplay-owned saved-title copy is externalized under a new `saved` namespace, plus one navigation key and one document-title key. Titles come from the catalog and are never translated. Counts use i18next `_one`/`_other` pairs. Dates use `Intl.DateTimeFormat` through the active interface language.

Placement rules:

- `navigation.saved` and `meta.title.saved` live in their existing objects in `en.json` and `es.json`.
- `saved.*` lives as a new top-level object after `detail`.
- No copy is duplicated between the watchlist and favorites when a parameterized key can name the collection and title.

## Navigation and document title

| Key | English | Spanish |
|---|---|---|
| `navigation.saved` | Saved | Guardados |
| `meta.title.saved` | Saved · Walplay | Guardados · Walplay |

## Collection identity

| Key | English | Spanish |
|---|---|---|
| `saved.title.watchlist` | Watchlist | Lista para ver |
| `saved.title.favorites` | Favorites | Favoritos |
| `saved.description.watchlist` | Titles you plan to watch. | Títulos que planeas ver. |
| `saved.description.favorites` | Titles you love. | Títulos que te encantan. |
| `saved.nav.label` | Saved collections | Colecciones guardadas |
| `saved.count_one` | {{count}} title | {{count}} título |
| `saved.count_other` | {{count}} titles | {{count}} títulos |
| `saved.a11y.list.watchlist` | Watchlist titles | Títulos de la lista para ver |
| `saved.a11y.list.favorites` | Favorite titles | Títulos favoritos |

## Section states

| Key | English | Spanish |
|---|---|---|
| `saved.loading.label` | Saved titles are loading | Los títulos guardados se están cargando |
| `saved.empty.watchlist.title` | Your watchlist is empty | Tu lista para ver está vacía |
| `saved.empty.watchlist.description` | Save a movie or TV show from its details to plan what to watch next. | Guarda una película o serie desde sus detalles para planear qué ver después. |
| `saved.empty.favorites.title` | No favorites yet | Aún no tienes favoritos |
| `saved.empty.favorites.description` | Mark a movie or TV show as a favorite from its details to find it here. | Marca una película o serie como favorita desde sus detalles para encontrarla aquí. |
| `saved.empty.action` | Browse titles | Explorar títulos |
| `saved.showMore` | Show more | Mostrar más |
| `saved.showMoreAnnouncement` | Showing {{from}}–{{to}} of {{total}} | Mostrando {{from}}–{{to}} de {{total}} |
| `saved.error.title` | Saved titles are unavailable | Los títulos guardados no están disponibles |
| `saved.error.description` | Saved titles could not be loaded right now. Try again. | No se pudieron cargar los títulos guardados en este momento. Inténtalo de nuevo. |
| `saved.error.retry` | Try again | Inténtalo de nuevo |

## Entry copy

| Key | English | Spanish |
|---|---|---|
| `saved.entry.savedOn` | Saved {{date}} | Guardado el {{date}} |
| `saved.entry.inOther.watchlist` | Also in your watchlist | También está en tu lista para ver |
| `saved.entry.inOther.favorites` | Also in favorites | También está en favoritos |
| `saved.entry.refreshing` | Refreshing details | Actualizando detalles |
| `saved.entry.temporarilyUnavailable` | Details are temporarily unavailable. | Los detalles no están disponibles temporalmente. |
| `saved.entry.retryDetails` | Retry details | Reintentar detalles |
| `saved.entry.notInCatalog` | No longer available in the catalog. | Ya no está disponible en el catálogo. |
| `saved.entry.unreadable` | This saved title can't be read. | Este título guardado no se puede leer. |

## Controls

| Key | English | Spanish |
|---|---|---|
| `saved.actions.addToWatchlist` | Add to watchlist | Añadir a la lista para ver |
| `saved.actions.removeFromWatchlist` | Remove from watchlist | Quitar de la lista para ver |
| `saved.actions.addToFavorites` | Add to favorites | Añadir a favoritos |
| `saved.actions.removeFromFavorites` | Remove from favorites | Quitar de favoritos |
| `saved.actions.remove` | Remove | Quitar |
| `saved.actions.a11y.addToWatchlist` | Add {{title}} to watchlist | Añadir {{title}} a la lista para ver |
| `saved.actions.a11y.removeFromWatchlist` | Remove {{title}} from watchlist | Quitar {{title}} de la lista para ver |
| `saved.actions.a11y.addToFavorites` | Add {{title}} to favorites | Añadir {{title}} a favoritos |
| `saved.actions.a11y.removeFromFavorites` | Remove {{title}} from favorites | Quitar {{title}} de favoritos |
| `saved.actions.a11y.remove` | Remove {{title}} | Quitar {{title}} |

Visible labels use the `saved.actions.*` keys; accessible names use the matching `saved.actions.a11y.*` keys so the title and collection are always exposed.

## Feedback and announcements

| Key | English | Spanish |
|---|---|---|
| `saved.feedback.addedToWatchlist` | {{title}} added to your watchlist. | {{title}} se añadió a tu lista para ver. |
| `saved.feedback.removedFromWatchlist` | {{title}} removed from your watchlist. | {{title}} se quitó de tu lista para ver. |
| `saved.feedback.addedToFavorites` | {{title}} added to favorites. | {{title}} se añadió a favoritos. |
| `saved.feedback.removedFromFavorites` | {{title}} removed from favorites. | {{title}} se quitó de favoritos. |
| `saved.feedback.alreadyInWatchlist` | {{title}} is already in your watchlist. | {{title}} ya está en tu lista para ver. |
| `saved.feedback.alreadyInFavorites` | {{title}} is already in favorites. | {{title}} ya está en favoritos. |
| `saved.feedback.notInWatchlist` | {{title}} is not in your watchlist. | {{title}} no está en tu lista para ver. |
| `saved.feedback.notInFavorites` | {{title}} is not in favorites. | {{title}} no está en favoritos. |
| `saved.feedback.saveFailed` | {{title}} could not be saved on this device. Try again. | No se pudo guardar {{title}} en este dispositivo. Inténtalo de nuevo. |
| `saved.feedback.removeFailed` | {{title}} could not be removed. Try again. | No se pudo quitar {{title}}. Inténtalo de nuevo. |
| `saved.feedback.sessionOnly` | This change applies only to this session because this browser cannot store saved titles. | Este cambio solo se aplica a esta sesión porque este navegador no puede guardar títulos. |
| `saved.feedback.watchlistCleared` | Your watchlist was deleted from this device. | Tu lista para ver se eliminó de este dispositivo. |
| `saved.feedback.favoritesCleared` | Your favorites were deleted from this device. | Tus favoritos se eliminaron de este dispositivo. |
| `saved.feedback.allCleared` | All saved titles were deleted from this device. | Todos los títulos guardados se eliminaron de este dispositivo. |
| `saved.feedback.dataReset` | Saved titles were reset on this device. | Los títulos guardados se restablecieron en este dispositivo. |

## Device-only disclosure

| Key | English | Spanish |
|---|---|---|
| `saved.storageNotice.title` | Saved on this device only | Guardado solo en este dispositivo |
| `saved.storageNotice.description` | Saved titles stay in this browser on this device. They can be lost if you clear browsing data, use private browsing, or change browser or device. They are not synchronized across devices. | Los títulos guardados permanecen en este navegador y en este dispositivo. Pueden perderse si borras los datos de navegación, usas navegación privada o cambias de navegador o dispositivo. No se sincronizan entre dispositivos. |
| `saved.storageNotice.hint` | Saved titles stay on this device only. | Los títulos guardados permanecen solo en este dispositivo. |

`hint` is rendered visibly under the detail save controls, satisfying the first-save disclosure requirement without an extra persisted flag. The full notice is rendered in both saved sections.

## Manage and recovery

| Key | English | Spanish |
|---|---|---|
| `saved.manage.title` | Manage saved titles on this device | Gestionar títulos guardados en este dispositivo |
| `saved.manage.description` | Deleting removes these titles from this browser. This cannot be undone. | Eliminar quita estos títulos de este navegador. Esta acción no se puede deshacer. |
| `saved.manage.deleteWatchlist` | Delete watchlist | Eliminar lista para ver |
| `saved.manage.deleteFavorites` | Delete favorites | Eliminar favoritos |
| `saved.manage.deleteAll` | Delete all saved titles | Eliminar todos los títulos guardados |
| `saved.manage.confirmDeleteWatchlist` | Confirm delete watchlist | Confirmar eliminar lista para ver |
| `saved.manage.confirmDeleteFavorites` | Confirm delete favorites | Confirmar eliminar favoritos |
| `saved.manage.confirmDeleteAll` | Confirm delete all saved titles | Confirmar eliminar todos los títulos guardados |
| `saved.manage.cancel` | Cancel | Cancelar |
| `saved.recovery.title` | Saved titles could not be read | No se pudieron leer los títulos guardados |
| `saved.recovery.description` | The saved data on this device is damaged or comes from a newer version of Walplay. Reload the page, or reset the saved data to start again. | Los datos guardados en este dispositivo están dañados o provienen de una versión más reciente de Walplay. Recarga la página o restablece los datos guardados para empezar de nuevo. |
| `saved.recovery.reload` | Reload page | Recargar página |
| `saved.recovery.reset` | Reset saved titles | Restablecer títulos guardados |
| `saved.recovery.confirmReset` | Confirm reset saved titles | Confirmar restablecer títulos guardados |

## Test obligations

- `resources.test.ts` must keep identical leaf-key sets in both locales, no empty strings, and every referenced `t('...')` key must exist.
- Add a `savedResources.test.ts` mirroring `detailResources.test.ts`: parity, complete `_one`/`_other` pairs, every `saved.*` key referenced by application source, unique collection titles, and distinct empty-state copy for watchlist and favorites.
- Component tests assert the visible label and the accessible name separately for both collections, and assert that no Spanish screen displays a raw key.
