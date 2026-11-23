import { describe, expect, it } from 'vitest'

import {
  CREW_ROLE_LABEL_KEYS,
  TITLE_STATUS_LABEL_KEYS,
  collectionEnvelopeSchema,
  creditsEnvelopeSchema,
  detailEnvelopeSchema,
  episodeSchema,
  seasonEnvelopeSchema,
  titleDetailSchema,
} from './titleDetail'
import {
  collectionEnvelope,
  creditsEnvelope,
  detailEnvelope,
  movieDetail,
  omittedMovieDetail,
  seasonEnvelope,
  tvDetail,
} from '@/test/fixtures/detail'

describe('title detail model', () => {
  it('parses a complete movie detail', () => {
    const parsed = titleDetailSchema.parse(movieDetail())
    expect(parsed.title).toBe('Fight Club')
    expect(parsed.rating?.source).toBe('tmdb')
    expect(parsed.collection).toEqual({ name: 'Fight Club Collection' })
  })

  it('parses a complete tv detail with ordered seasons', () => {
    const parsed = titleDetailSchema.parse(tvDetail())
    expect(parsed.mediaType).toBe('tv')
    expect(parsed.seasons?.map((season) => season.number)).toEqual([1, 2, 0])
    expect(parsed.tvSummary?.episodesCount).toBe(21)
  })

  it('parses an omitted-field detail without inventing values', () => {
    const parsed = titleDetailSchema.parse(omittedMovieDetail())
    expect(parsed.overview).toBeUndefined()
    expect(parsed.rating).toBeUndefined()
    expect(parsed.runtime).toBeUndefined()
    expect(parsed.genres).toEqual([])
  })

  it('rejects an un-attributed or out-of-range rating', () => {
    expect(
      titleDetailSchema.safeParse({
        ...movieDetail(),
        rating: { value: 0, voteCount: 1, scale: 10, source: 'tmdb' },
      }).success
    ).toBe(false)
    expect(
      titleDetailSchema.safeParse({
        ...movieDetail(),
        rating: { value: 8, voteCount: 1, scale: 10, source: 'other' },
      }).success
    ).toBe(false)
    expect(
      titleDetailSchema.safeParse({
        ...movieDetail(),
        rating: { value: 8, voteCount: 0, scale: 10, source: 'tmdb' },
      }).success
    ).toBe(false)
  })

  it('requires an episode to have a number or a name', () => {
    expect(episodeSchema.safeParse({}).success).toBe(false)
    expect(episodeSchema.safeParse({ number: 1 }).success).toBe(true)
    expect(episodeSchema.safeParse({ name: 'Pilot' }).success).toBe(true)
  })

  it('parses every response envelope', () => {
    expect(detailEnvelopeSchema.parse(detailEnvelope()).meta.source).toBe('provider')
    expect(creditsEnvelopeSchema.parse(creditsEnvelope()).data.cast).toHaveLength(2)
    expect(collectionEnvelopeSchema.parse(collectionEnvelope()).data.items.length).toBeGreaterThan(
      0
    )
    expect(seasonEnvelopeSchema.parse(seasonEnvelope()).data.episodes).toHaveLength(2)
  })

  it('maps every internal status and crew role to a translation key', () => {
    expect(Object.keys(TITLE_STATUS_LABEL_KEYS)).toEqual([
      'released',
      'in-production',
      'post-production',
      'planned',
      'rumored',
      'returning',
      'ended',
      'canceled',
      'pilot',
    ])
    expect(TITLE_STATUS_LABEL_KEYS['in-production']).toBe('detail.status.inProduction')
    expect(CREW_ROLE_LABEL_KEYS.director).toBe('detail.crewRole.director')
  })
})
