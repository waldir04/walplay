import { describe, expect, it } from 'vitest'

import { movieItem, secondMovieItem, providerMeta } from '@/test/fixtures/catalog'

import { RECOMMENDATION_SECTION_BASIS } from './constants'
import { deriveRecommendationAreaView } from './recommendationView'

const readyQuery = {
  status: 'success' as const,
  rawItemCount: 2,
  error: null,
}

describe('deriveRecommendationAreaView', () => {
  it('composes a guest view with provider-popularity evidence flags', () => {
    const view = deriveRecommendationAreaView({
      enabled: true,
      mediaScope: 'movie',
      savedIdentities: new Set<string>(),
      queryState: readyQuery,
      items: [movieItem(), secondMovieItem()],
      meta: providerMeta(),
    })

    expect(view.enabled).toBe(true)
    expect(view.scope).toBe('guest')
    expect(view.mediaScope).toBe('movie')
    expect(view.explanation).toEqual({
      basis: RECOMMENDATION_SECTION_BASIS,
      savedTitlesUsedToChoose: false,
      usesAiOrMl: false,
      createsProfile: false,
    })
    expect(view.section.kind).toBe('ready')
  })

  it('applies saved exclusions before deriving the section state', () => {
    const saved = movieItem()
    const view = deriveRecommendationAreaView({
      enabled: true,
      mediaScope: 'movie',
      savedIdentities: new Set([`movie:${saved.id}`]),
      queryState: readyQuery,
      items: [saved, secondMovieItem()],
    })

    expect(view.section.kind).toBe('ready')
    if (view.section.kind !== 'ready') {
      throw new Error('expected ready state')
    }
    expect(view.section.items.map((item) => item.item.title)).toEqual(['Arrival'])
  })

  it('reports all-excluded when exclusions remove the only candidates', () => {
    const saved = movieItem()
    const view = deriveRecommendationAreaView({
      enabled: true,
      mediaScope: 'movie',
      savedIdentities: new Set([`movie:${saved.id}`]),
      queryState: { status: 'success', rawItemCount: 1, error: null },
      items: [saved],
    })

    expect(view.section).toEqual({ kind: 'empty', cause: 'all-excluded' })
  })
})
