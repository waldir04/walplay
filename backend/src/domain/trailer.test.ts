import { describe, expect, it } from 'vitest'

import type { TrailerSortKey } from './trailer.js'
import {
  TRAILER_MAX_INVENTORY,
  TRAILER_TYPE_ORDER,
  compareTrailerSortKeys,
  sortTrailerSortKeys,
} from './trailer.js'

const key = (overrides: Partial<TrailerSortKey> = {}): TrailerSortKey => ({
  type: 'trailer',
  official: false,
  providerIndex: 0,
  id: 'youtube:dQw4w9WgXcQ',
  ...overrides,
})

describe('trailer constants', () => {
  it('defines the documented type order and inventory cap', () => {
    expect(TRAILER_TYPE_ORDER).toEqual([
      'trailer',
      'teaser',
      'featurette',
      'clip',
      'behind-the-scenes',
      'bloopers',
    ])
    expect(TRAILER_MAX_INVENTORY).toBe(24)
  })
})

describe('trailer comparator', () => {
  it('orders by type rank before any other key', () => {
    expect(
      compareTrailerSortKeys(key({ type: 'trailer' }), key({ type: 'teaser', official: true }))
    ).toBeLessThan(0)
    expect(
      compareTrailerSortKeys(
        key({ type: 'bloopers', official: true }),
        key({ type: 'behind-the-scenes', official: false })
      )
    ).toBeGreaterThan(0)
  })

  it('orders official before unofficial within a type', () => {
    expect(
      compareTrailerSortKeys(key({ official: true, providerIndex: 5 }), key({ official: false }))
    ).toBeLessThan(0)
  })

  it('keeps provider order for stable ties', () => {
    expect(
      compareTrailerSortKeys(
        key({ providerIndex: 1, id: 'youtube:aaaaaaaaaaa' }),
        key({ providerIndex: 2, id: 'youtube:bbbbbbbbbbb' })
      )
    ).toBeLessThan(0)
  })

  it('uses the identifier only for a complete tie', () => {
    expect(
      compareTrailerSortKeys(
        key({ id: 'youtube:aaaaaaaaaaa' }),
        key({ id: 'youtube:bbbbbbbbbbb' })
      )
    ).toBeLessThan(0)
    expect(compareTrailerSortKeys(key(), key())).toBe(0)
  })

  it('sorts deterministically without mutating the input', () => {
    const input = [
      key({ type: 'clip', providerIndex: 0, id: 'youtube:ccccccccccc' }),
      key({ type: 'trailer', official: false, providerIndex: 1, id: 'youtube:bbbbbbbbbbb' }),
      key({ type: 'trailer', official: true, providerIndex: 2, id: 'youtube:aaaaaaaaaaa' }),
    ]

    const sorted = sortTrailerSortKeys(input)

    expect(sorted.map((entry) => entry.id)).toEqual([
      'youtube:aaaaaaaaaaa',
      'youtube:bbbbbbbbbbb',
      'youtube:ccccccccccc',
    ])
    expect(input.map((entry) => entry.id)).toEqual([
      'youtube:ccccccccccc',
      'youtube:bbbbbbbbbbb',
      'youtube:aaaaaaaaaaa',
    ])
  })
})
