import { describe, expect, it } from 'vitest'

import { flattenCatalogPages } from './catalogQueries'
import { movieItem, pageEnvelope, secondMovieItem, thirdMovieItem } from '@/test/fixtures/catalog'

describe('infinite catalog accumulation', () => {
  it('appends pages below existing items without reordering', () => {
    const pageOne = pageEnvelope({
      items: [movieItem(), secondMovieItem()],
      page: 1,
      hasMore: true,
    })
    const pageTwo = pageEnvelope({ items: [thirdMovieItem()], page: 2, hasMore: false })

    const result = flattenCatalogPages([pageOne, pageTwo])
    expect(result.items.map((item) => item.title)).toEqual(['Fight Club', 'Arrival', 'Moon'])
  })

  it('deduplicates by opaque id while preserving the first occurrence', () => {
    const pageOne = pageEnvelope({ items: [movieItem()], page: 1, hasMore: true })
    const pageTwo = pageEnvelope({ items: [movieItem(), secondMovieItem()], page: 2 })

    const result = flattenCatalogPages([pageOne, pageTwo])
    expect(result.items).toHaveLength(2)
    expect(result.duplicates).toBe(1)
  })

  it('never mutates input pages', () => {
    const pageOne = pageEnvelope({ items: [movieItem()], page: 1 })
    const snapshot = JSON.stringify(pageOne)
    flattenCatalogPages([pageOne])
    expect(JSON.stringify(pageOne)).toBe(snapshot)
  })
})
