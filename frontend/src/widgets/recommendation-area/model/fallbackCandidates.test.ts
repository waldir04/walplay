import { describe, expect, it } from 'vitest'

import type { CatalogItem } from '@/entities/catalog'
import { movieItem, secondMovieItem, thirdMovieItem } from '@/test/fixtures/catalog'

import { RECOMMENDATION_SECTION_BASIS } from './constants'
import { EMPTY_EXCLUSION_INPUT, selectFallbackCandidates } from './fallbackCandidates'

const IDS = [
  'd2wxOm1vdmllOjEwMDE',
  'd2wxOm1vdmllOjEwMDI',
  'd2wxOm1vdmllOjEwMDM',
  'd2wxOm1vdmllOjEwMDQ',
  'd2wxOm1vdmllOjEwMDU',
  'd2wxOm1vdmllOjEwMDY',
  'd2wxOm1vdmllOjEwMDc',
  'd2wxOm1vdmllOjEwMDg',
  'd2wxOm1vdmllOjEwMDk',
  'd2wxOm1vdmllOjEwMT',
  'd2wxOm1vdmllOjEwMTE',
  'd2wxOm1vdmllOjEwMTI',
  'd2wxOm1vdmllOjEwMTM',
  'd2wxOm1vdmllOjEwMTQ',
  'd2wxOm1vdmllOjEwMTU',
]

const uniqueItems = (count: number): CatalogItem[] =>
  IDS.slice(0, count).map((id, index) =>
    movieItem({ id, title: `Title ${index + 1}`, releaseYear: 2000 + index })
  )

const exclusion = (
  options: {
    readonly saved?: readonly string[]
    readonly dismissed?: readonly string[]
  } = {}
) => ({
  savedIdentities: new Set(options.saved ?? []),
  dismissedIdentities: new Set(options.dismissed ?? []),
})

describe('selectFallbackCandidates', () => {
  it('preserves provider order and marks the provider-popularity basis', () => {
    const result = selectFallbackCandidates(
      [movieItem(), secondMovieItem(), thirdMovieItem()],
      EMPTY_EXCLUSION_INPUT,
      12
    )

    expect(result.map((view) => view.item.title)).toEqual(['Fight Club', 'Arrival', 'Moon'])
    expect(result.every((view) => view.basis === RECOMMENDATION_SECTION_BASIS)).toBe(true)
  })

  it('excludes saved identities by media type and item id', () => {
    const savedMovie = movieItem()
    const result = selectFallbackCandidates(
      [savedMovie, secondMovieItem()],
      exclusion({ saved: [`movie:${savedMovie.id}`] }),
      12
    )

    expect(result.map((view) => view.item.title)).toEqual(['Arrival'])
  })

  it('excludes dismissed identities', () => {
    const dismissed = secondMovieItem()
    const result = selectFallbackCandidates(
      [movieItem(), dismissed],
      exclusion({ dismissed: [`movie:${dismissed.id}`] }),
      12
    )

    expect(result.map((view) => view.item.title)).toEqual(['Fight Club'])
  })

  it('drops a duplicate identity once and keeps the first provider occurrence', () => {
    const first = movieItem({ title: 'First occurrence' })
    const duplicate = movieItem({ title: 'Second occurrence' })
    const result = selectFallbackCandidates([first, duplicate, secondMovieItem()], exclusion(), 12)

    expect(result.map((view) => view.item.title)).toEqual(['First occurrence', 'Arrival'])
  })

  it('stops at the cap without backfilling or padding', () => {
    const result = selectFallbackCandidates(uniqueItems(15), exclusion(), 12)
    const small = selectFallbackCandidates(uniqueItems(3), exclusion(), 12)

    expect(result).toHaveLength(12)
    expect(result.at(-1)?.item.title).toBe('Title 12')
    expect(small).toHaveLength(3)
  })

  it('declares no fallback items when the provider page is empty', () => {
    expect(selectFallbackCandidates([], exclusion(), 12)).toEqual([])
  })

  it('declares no fallback items when every candidate is excluded', () => {
    const items = uniqueItems(3)
    const result = selectFallbackCandidates(
      items,
      exclusion({ saved: items.map((item) => `movie:${item.id}`) }),
      12
    )

    expect(result).toEqual([])
  })

  it('defensively drops unsupported, adult, unnamed, and unidentifiable candidates', () => {
    const unsupported = {
      ...movieItem({ title: 'Person' }),
      mediaType: 'person',
    } as unknown as CatalogItem
    const adult = { ...movieItem({ title: 'Adult' }), adult: true } as CatalogItem
    const unnamed = movieItem({ title: '   ' })
    const shortIdentity = movieItem({ id: 'abc', title: 'Short id' })

    const result = selectFallbackCandidates(
      [unsupported, adult, unnamed, shortIdentity, secondMovieItem()],
      exclusion(),
      12
    )

    expect(result.map((view) => view.item.title)).toEqual(['Arrival'])
  })

  it('is deterministic for identical inputs', () => {
    const items = uniqueItems(5)
    const input = exclusion({ saved: [`movie:${items[1]?.id ?? ''}`] })

    const first = selectFallbackCandidates(items, input, 12)
    const second = selectFallbackCandidates(items, input, 12)

    expect(second).toEqual(first)
  })
})
