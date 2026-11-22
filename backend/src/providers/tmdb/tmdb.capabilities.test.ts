import { describe, expect, it } from 'vitest'

import { TMDB_CAPABILITIES } from './tmdb.capabilities.js'

describe('TMDB capabilities', () => {
  it('declares the three sections in order for both media types', () => {
    expect(TMDB_CAPABILITIES.map((section) => section.id)).toEqual([
      'trending',
      'popular',
      'top-rated',
    ])
    expect(TMDB_CAPABILITIES.map((section) => section.order)).toEqual([1, 2, 3])
    for (const section of TMDB_CAPABILITIES) {
      expect(section.mediaTypes).toEqual(['movie', 'tv'])
    }
  })

  it('offers pagination only where the provider documents it', () => {
    const paginated = Object.fromEntries(
      TMDB_CAPABILITIES.map((section) => [section.id, section.paginated])
    )
    expect(paginated).toEqual({ trending: false, popular: true, 'top-rated': true })
  })
})
