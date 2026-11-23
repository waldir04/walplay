import { describe, expect, it } from 'vitest'

import { decodeItemId } from '../../lib/itemId.js'
import {
  mapCollectionItems,
  mapSimilarItems,
} from './tmdb.detail.mapper.js'
import {
  completeCollection,
  completeSimilar,
  largeSimilar,
} from '../../test/fixtures/tmdb/detail.js'

const genreNames = new Map<number, string>([[80, 'Crime']])
const artwork = {
  poster: (path: string | null | undefined) =>
    typeof path === 'string' && path.trim() !== ''
      ? { url: `https://image.example.test/w342${path}` }
      : undefined,
}

describe('similar titles mapping', () => {
  it('keeps only usable items of the requested type in provider order', () => {
    const items = mapSimilarItems(completeSimilar(), {
      mediaType: 'movie',
      genreNames,
      poster: artwork.poster,
      currentProviderId: 550,
    })
    expect(items).toHaveLength(1)
    expect(items[0]?.item.title).toBe('Se7en')
    expect(items[0]?.item.genres).toEqual([{ id: '80', name: 'Crime' }])
    expect(items[0]?.item.rating).toBeDefined()
  })

  it('bounds the preview to twelve after exclusions and deduplication', () => {
    const items = mapSimilarItems(largeSimilar(), {
      mediaType: 'movie',
      genreNames,
      poster: artwork.poster,
      currentProviderId: 550,
    })
    expect(items).toHaveLength(12)
    expect(items[0]?.item.title).toBe('Similar 1')
    expect(items[11]?.item.title).toBe('Similar 12')
    expect(new Set(items.map((item) => item.item.id)).size).toBe(12)
  })

  it('encodes the correct media type for every item', () => {
    const items = mapSimilarItems(completeSimilar(), {
      mediaType: 'movie',
      genreNames,
      poster: artwork.poster,
      currentProviderId: 550,
    })
    expect(decodeItemId(items[0]!.item.id).mediaType).toBe('movie')
  })
})

describe('collection mapping', () => {
  it('keeps the display name and excludes the current title', () => {
    const collection = mapCollectionItems(completeCollection(), {
      mediaType: 'movie',
      genreNames,
      poster: artwork.poster,
      currentProviderId: 603,
    })
    expect(collection.name).toBe('The Matrix Collection')
    expect(collection.items.map((item) => item.item.title)).toEqual(['The Matrix Reloaded'])
  })

  it('omits an unusable name and handles missing parts', () => {
    const collection = mapCollectionItems(
      { id: 1, name: 'N/A', parts: null },
      {
        mediaType: 'movie',
        genreNames,
        poster: artwork.poster,
        currentProviderId: 1,
      }
    )
    expect(collection).toEqual({ items: [] })
  })
})

describe('collection de-duplication and exclusion', () => {
  it('drops adult, duplicate, and unusable parts while preserving order', () => {
    const collection = mapCollectionItems(
      {
        id: 1,
        name: 'Collection',
        parts: [
          {
            id: 10,
            title: 'First',
            original_title: 'First',
            release_date: '1999-01-01',
            poster_path: '/first.jpg',
            adult: false,
            vote_average: 8,
            vote_count: 10,
            genre_ids: [80],
          },
          {
            id: 10,
            title: 'Duplicate First',
            original_title: 'Duplicate First',
            release_date: '1999-01-01',
            poster_path: '/first.jpg',
            adult: false,
            vote_average: 8,
            vote_count: 10,
            genre_ids: [80],
          },
          {
            id: 11,
            title: 'Adult',
            original_title: 'Adult',
            release_date: '1999-01-01',
            poster_path: '/adult.jpg',
            adult: true,
            vote_average: 8,
            vote_count: 10,
            genre_ids: [80],
          },
          {
            id: 12,
            title: 'N/A',
            original_title: 'N/A',
            release_date: '1999-01-01',
            poster_path: '/bad.jpg',
            adult: false,
            vote_average: 8,
            vote_count: 10,
            genre_ids: [80],
          },
          {
            id: 13,
            title: 'Last',
            original_title: 'Last',
            release_date: '2000-01-01',
            poster_path: '/last.jpg',
            adult: false,
            vote_average: 8,
            vote_count: 10,
            genre_ids: [80],
          },
        ],
      },
      { mediaType: 'movie', genreNames, poster: artwork.poster, currentProviderId: 999 }
    )
    expect(collection.items.map((entry) => entry.item.title)).toEqual(['First', 'Last'])
  })
})

