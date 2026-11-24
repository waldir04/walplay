import type { CollectionId } from './constants'

export const SAVED_TITLE_KEY: Readonly<Record<CollectionId, string>> = Object.freeze({
  watchlist: 'saved.title.watchlist',
  favorites: 'saved.title.favorites',
})

export const SAVED_DESCRIPTION_KEY: Readonly<Record<CollectionId, string>> = Object.freeze({
  watchlist: 'saved.description.watchlist',
  favorites: 'saved.description.favorites',
})

export const SAVED_COUNT_KEY = 'saved.count'

export const SAVED_LIST_LABEL_KEY: Readonly<Record<CollectionId, string>> = Object.freeze({
  watchlist: 'saved.a11y.list.watchlist',
  favorites: 'saved.a11y.list.favorites',
})

export const SAVED_EMPTY_TITLE_KEY: Readonly<Record<CollectionId, string>> = Object.freeze({
  watchlist: 'saved.empty.watchlist.title',
  favorites: 'saved.empty.favorites.title',
})

export const SAVED_EMPTY_DESCRIPTION_KEY: Readonly<Record<CollectionId, string>> = Object.freeze({
  watchlist: 'saved.empty.watchlist.description',
  favorites: 'saved.empty.favorites.description',
})

export const SAVED_IN_OTHER_KEY: Readonly<Record<CollectionId, string>> = Object.freeze({
  watchlist: 'saved.entry.inOther.watchlist',
  favorites: 'saved.entry.inOther.favorites',
})

export interface SavedActionCopyKeys {
  readonly add: string
  readonly remove: string
  readonly a11yAdd: string
  readonly a11yRemove: string
}

export const SAVED_ACTION_KEYS: Readonly<Record<CollectionId, SavedActionCopyKeys>> = Object.freeze(
  {
    watchlist: Object.freeze({
      add: 'saved.actions.addToWatchlist',
      remove: 'saved.actions.removeFromWatchlist',
      a11yAdd: 'saved.actions.a11y.addToWatchlist',
      a11yRemove: 'saved.actions.a11y.removeFromWatchlist',
    }),
    favorites: Object.freeze({
      add: 'saved.actions.addToFavorites',
      remove: 'saved.actions.removeFromFavorites',
      a11yAdd: 'saved.actions.a11y.addToFavorites',
      a11yRemove: 'saved.actions.a11y.removeFromFavorites',
    }),
  }
)

export const SAVED_FEEDBACK_KEYS = Object.freeze({
  added: {
    watchlist: 'saved.feedback.addedToWatchlist',
    favorites: 'saved.feedback.addedToFavorites',
  } as Readonly<Record<CollectionId, string>>,
  removed: {
    watchlist: 'saved.feedback.removedFromWatchlist',
    favorites: 'saved.feedback.removedFromFavorites',
  } as Readonly<Record<CollectionId, string>>,
  already: {
    watchlist: 'saved.feedback.alreadyInWatchlist',
    favorites: 'saved.feedback.alreadyInFavorites',
  } as Readonly<Record<CollectionId, string>>,
  absent: {
    watchlist: 'saved.feedback.notInWatchlist',
    favorites: 'saved.feedback.notInFavorites',
  } as Readonly<Record<CollectionId, string>>,
  cleared: {
    watchlist: 'saved.feedback.watchlistCleared',
    favorites: 'saved.feedback.favoritesCleared',
  } as Readonly<Record<CollectionId, string>>,
})

export const SAVED_MANAGE_DELETE_KEY: Readonly<Record<CollectionId, string>> = Object.freeze({
  watchlist: 'saved.manage.deleteWatchlist',
  favorites: 'saved.manage.deleteFavorites',
})

export const SAVED_MANAGE_CONFIRM_KEY: Readonly<Record<CollectionId, string>> = Object.freeze({
  watchlist: 'saved.manage.confirmDeleteWatchlist',
  favorites: 'saved.manage.confirmDeleteFavorites',
})
