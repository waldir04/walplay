import { describe, expect, it } from 'vitest'

import { mapMovieDetail } from './tmdb.detail.mapper.js'
import {
  adultMovieDetail,
  completeMovieDetail,
  minimalMovieDetail,
  zeroNumericMovieDetail,
} from '../../test/fixtures/tmdb/detail.js'

const OMITTED_KEYS = [
  'overview',
  'tagline',
  'releaseDate',
  'releaseYear',
  'status',
  'runtime',
  'rating',
  'popularity',
  'poster',
  'backdrop',
  'collection',
]

describe('detail omission rules', () => {
  it('never surfaces zero, negative, or out-of-range numeric values', () => {
    const detail = mapMovieDetail(zeroNumericMovieDetail())?.detail
    for (const key of ['runtime', 'rating', 'popularity', 'releaseDate', 'releaseYear']) {
      expect(detail).not.toHaveProperty(key)
    }
    expect(detail?.genres).toEqual([])
  })

  it('omits every optional field for a minimal identity', () => {
    const detail = mapMovieDetail(minimalMovieDetail())?.detail
    for (const key of OMITTED_KEYS) {
      expect(detail).not.toHaveProperty(key)
    }
  })

  it('never emits placeholder or malformed text', () => {
    const values = [
      'N/A',
      'na',
      'tbd',
      'unknown',
      'untitled',
      '-',
      '--',
      '—',
      '   ',
      '',
    ]
    for (const value of values) {
      const detail = mapMovieDetail(
        completeMovieDetail({
          overview: value,
          tagline: value,
          status: value,
          genres: [{ id: 1, name: value }],
        })
      )?.detail
      expect(detail?.overview).toBeUndefined()
      expect(detail?.tagline).toBeUndefined()
      expect(detail?.status).toBeUndefined()
      expect(detail?.genres).toEqual([])
      expect(JSON.stringify(detail)).not.toContain(`"${value}"`)
    }
  })

  it('only drops the whole title when no usable identity remains', () => {
    expect(mapMovieDetail(completeMovieDetail({ title: 'Unknown', original_title: 'x' }))?.detail.title).toBe(
      'Unknown'
    )
    expect(mapMovieDetail(completeMovieDetail({ title: '   ', original_title: 'Original' }))?.detail.title).toBe(
      'Original'
    )
    expect(mapMovieDetail(completeMovieDetail({ title: '   ', original_title: '   ' }))).toBeNull()
  })

  it('treats adult-flagged titles as unavailable', () => {
    expect(mapMovieDetail(adultMovieDetail())).toBeNull()
  })
})
