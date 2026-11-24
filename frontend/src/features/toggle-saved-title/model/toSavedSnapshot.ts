import type { CatalogItem, TitleDetail } from '@/entities/catalog'
import type { SavedSnapshotInput } from '@/entities/saved-library'

type SavableTitle = Pick<
  CatalogItem | TitleDetail,
  'id' | 'mediaType' | 'title' | 'originalTitle' | 'releaseYear' | 'poster'
>

export const toSavedSnapshot = (title: SavableTitle): SavedSnapshotInput => ({
  mediaType: title.mediaType,
  itemId: title.id,
  title: title.title,
  ...(title.originalTitle === undefined ? {} : { originalTitle: title.originalTitle }),
  ...(title.releaseYear === undefined ? {} : { releaseYear: title.releaseYear }),
  ...(title.poster === undefined
    ? {}
    : {
        poster: {
          url: title.poster.url,
          ...(title.poster.urlLarge === undefined ? {} : { urlLarge: title.poster.urlLarge }),
        },
      }),
})
