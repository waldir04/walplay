import { describe, expect, it } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { movieItem, providerMeta } from '@/test/fixtures/catalog'

import type { RecommendationItemView } from './constants'
import { RECOMMENDATION_SECTION_BASIS } from './constants'
import { deriveRecommendationSectionState, recommendationErrorCause } from './recommendationState'

const candidates = (): RecommendationItemView[] => [
  { item: movieItem(), basis: RECOMMENDATION_SECTION_BASIS },
]

const pending = { status: 'pending' as const, rawItemCount: 0, error: null }
const success = (rawItemCount: number) => ({
  status: 'success' as const,
  rawItemCount,
  error: null,
})
const failure = (error: unknown) => ({ status: 'error' as const, rawItemCount: 0, error })

describe('deriveRecommendationSectionState', () => {
  it('maps a pending query to the loading state', () => {
    const state = deriveRecommendationSectionState({
      mediaScope: 'movie',
      snapshot: pending,
      eligibleItems: [],
    })

    expect(state).toEqual({ kind: 'loading' })
  })

  it('maps a successful eligible result to a ready state', () => {
    const items = candidates()
    const state = deriveRecommendationSectionState({
      mediaScope: 'tv',
      snapshot: success(2),
      eligibleItems: items,
      meta: providerMeta(),
    })

    expect(state).toEqual({
      kind: 'ready',
      basis: RECOMMENDATION_SECTION_BASIS,
      mediaScope: 'tv',
      items,
      stale: false,
      lastUpdatedAt: providerMeta().lastUpdatedAt,
    })
  })

  it('distinguishes an empty provider page from an all-excluded result', () => {
    const noProvider = deriveRecommendationSectionState({
      mediaScope: 'movie',
      snapshot: success(0),
      eligibleItems: [],
    })
    const allExcluded = deriveRecommendationSectionState({
      mediaScope: 'movie',
      snapshot: success(4),
      eligibleItems: [],
    })

    expect(noProvider).toEqual({ kind: 'empty', cause: 'no-provider-items' })
    expect(allExcluded).toEqual({ kind: 'empty', cause: 'all-excluded' })
  })

  it('maps rate-limited, timed-out, and other failures truthfully', () => {
    const causeFor = (error: unknown) => recommendationErrorCause(error)

    expect(causeFor(new CatalogApiError('CATALOG_RATE_LIMITED', 429))).toBe('rate-limited')
    expect(causeFor(new CatalogApiError('CATALOG_TIMEOUT', 504))).toBe('timed-out')
    expect(causeFor(new CatalogApiError('CATALOG_UNAVAILABLE', 502))).toBe('unavailable')
    expect(causeFor(new CatalogApiError('CATALOG_INVALID_RESPONSE', 500))).toBe('unavailable')
    expect(causeFor(new CatalogApiError('INTERNAL_ERROR', 500))).toBe('unavailable')
    expect(causeFor(new CatalogApiError('CATALOG_NOT_FOUND', 404))).toBe('unavailable')
    expect(causeFor(new Error('boom'))).toBe('unavailable')

    expect(
      deriveRecommendationSectionState({
        mediaScope: 'movie',
        snapshot: failure(new CatalogApiError('CATALOG_RATE_LIMITED', 429)),
        eligibleItems: [],
      })
    ).toEqual({ kind: 'error', cause: 'rate-limited' })
  })

  it('carries stale metadata only on a ready state', () => {
    const meta = providerMeta({ stale: true, source: 'stale-cache' })
    const ready = deriveRecommendationSectionState({
      mediaScope: 'movie',
      snapshot: success(1),
      eligibleItems: candidates(),
      meta,
    })

    expect(ready.kind).toBe('ready')
    if (ready.kind !== 'ready') {
      throw new Error('expected ready state')
    }
    expect(ready.stale).toBe(true)
    expect(ready.lastUpdatedAt).toBe(meta.lastUpdatedAt)

    const loading = deriveRecommendationSectionState({
      mediaScope: 'movie',
      snapshot: pending,
      eligibleItems: [],
      meta,
    })
    expect(loading).not.toHaveProperty('stale')
    expect(loading).not.toHaveProperty('lastUpdatedAt')
  })
})
