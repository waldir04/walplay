import { describe, expect, it } from 'vitest'

import { malformedListItem, movieListItem, tvListItem } from '../../test/fixtures/tmdb/listPages.js'
import { mapListItemToItem } from './tmdb.mapper.js'

describe('invalid item handling', () => {
  it('drops only the invalid individual items', () => {
    const rawItems = [movieListItem(), { ...movieListItem({ id: 0 }) }, malformedListItem]

    const mapped = rawItems
      .map((raw) => mapListItemToItem(raw as { readonly id: number }, { mediaType: 'movie' }))
      .filter((item) => item !== null)

    expect(mapped).toHaveLength(1)
    expect(mapped[0]?.title).toBe('Fight Club')
  })

  it('turns an all-invalid page into an empty successful page', () => {
    const mapped = [malformedListItem, tvListItem({ id: 0 })].map((raw) =>
      mapListItemToItem(raw as { readonly id: number }, { mediaType: 'tv' })
    )
    expect(mapped.filter((item) => item !== null)).toEqual([])
    expect(mapped).toHaveLength(2)
  })
})
