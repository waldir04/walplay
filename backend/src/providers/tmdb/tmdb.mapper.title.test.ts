import { describe, expect, it } from 'vitest'

import { movieListItem, tvListItem } from '../../test/fixtures/tmdb/listPages.js'
import { movieWithEmptyTitle, movieWithoutAnyTitle } from '../../test/fixtures/tmdb/incomplete.js'
import { mapListItemToItem, resolveTitle } from './tmdb.mapper.js'

describe('title resolution rules', () => {
  it('uses the localized title when non-empty', () => {
    expect(resolveTitle('El club de la lucha', 'Fight Club')).toEqual({
      title: 'El club de la lucha',
      originalTitle: 'Fight Club',
    })
  })

  it('falls back to the original title when the localized title is empty', () => {
    const item = mapListItemToItem(movieWithEmptyTitle(), { mediaType: 'movie' })
    expect(item?.title).toBe('Original Only')
    expect(item?.originalTitle).toBeUndefined()
  })

  it('drops items when both titles are unusable', () => {
    expect(mapListItemToItem(movieWithoutAnyTitle(), { mediaType: 'movie' })).toBeNull()
    expect(resolveTitle('  ', null)).toBeNull()
  })

  it('omits originalTitle when it matches the title', () => {
    expect(
      mapListItemToItem(movieListItem(), { mediaType: 'movie' })?.originalTitle
    ).toBeUndefined()
  })

  it('resolves TV names with the same fallback rules', () => {
    const item = mapListItemToItem(tvListItem({ name: '', original_name: 'Original Show' }), {
      mediaType: 'tv',
    })
    expect(item?.title).toBe('Original Show')
  })
})
