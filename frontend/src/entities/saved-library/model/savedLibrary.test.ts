import { describe, expect, it } from 'vitest'

import { MOVIE_ID } from '@/test/fixtures/catalog'
import { savedEnvelope, savedEntry } from '@/test/fixtures/saved'

import { emptyLibrary, migrateLibrary } from './savedLibrary'

describe('migrateLibrary', () => {
  it.each([[null], [[]], [42], ['text']])('reports corrupt input for %s', (input) => {
    expect(migrateLibrary(input)).toEqual({ kind: 'corrupt' })
  })

  it('reports corrupt when the version is not a number', () => {
    expect(migrateLibrary({ version: '1', watchlist: [], favorites: [] })).toEqual({
      kind: 'corrupt',
    })
  })

  it('reports unfilled collections as corrupt', () => {
    expect(migrateLibrary({ version: 1, watchlist: [] })).toEqual({ kind: 'corrupt' })
    expect(migrateLibrary({ version: 1, watchlist: [], favorites: 'no' })).toEqual({
      kind: 'corrupt',
    })
  })

  it.each([[0], [2], [99]])('reports unsupported version %i', (version) => {
    expect(migrateLibrary({ version, watchlist: [], favorites: [] })).toEqual({
      kind: 'unsupported-version',
      version,
    })
  })

  it('returns a normalized library and ignores unknown fields', () => {
    const result = migrateLibrary({
      version: 1,
      watchlist: [{ ...savedEntry(), accountId: 'secret' }],
      favorites: [],
      extra: true,
    })

    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.library.watchlist).toHaveLength(1)
      expect('accountId' in (result.library.watchlist[0] ?? {})).toBe(false)
    }
  })

  it('drops structurally invalid entries individually', () => {
    const result = migrateLibrary({
      version: 1,
      watchlist: [savedEntry(), { mediaType: 'movie', itemId: MOVIE_ID }],
      favorites: [],
    })

    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.library.watchlist).toHaveLength(1)
    }
  })

  it('starts from an empty version 1 envelope', () => {
    expect(emptyLibrary()).toEqual(savedEnvelope())
  })
})
