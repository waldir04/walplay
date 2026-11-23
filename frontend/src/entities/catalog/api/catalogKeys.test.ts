import { describe, expect, it } from 'vitest'

import { catalogKeys } from './catalogKeys'

describe('catalog key factory', () => {
  it('produces stable, language-aware keys', () => {
    expect(catalogKeys.capabilities()).toEqual(['catalog', 'capabilities'])
    expect(catalogKeys.section('movie', 'popular', 'en', 1)).toEqual([
      'catalog',
      'section',
      'movie',
      'popular',
      'en',
      1,
    ])
    expect(catalogKeys.category('tv', 'top-rated', 'es')).toEqual([
      'catalog',
      'category',
      'tv',
      'top-rated',
      'es',
    ])
    expect(catalogKeys.item('movie', 'abc12345', 'es')).toEqual([
      'catalog',
      'item',
      'movie',
      'abc12345',
      'es',
    ])
  })

  it('isolates every result-affecting parameter', () => {
    const keys = new Set([
      JSON.stringify(catalogKeys.section('movie', 'popular', 'en', 1)),
      JSON.stringify(catalogKeys.section('movie', 'popular', 'es', 1)),
      JSON.stringify(catalogKeys.section('movie', 'popular', 'en', 2)),
      JSON.stringify(catalogKeys.section('tv', 'popular', 'en', 1)),
      JSON.stringify(catalogKeys.section('movie', 'top-rated', 'en', 1)),
    ])
    expect(keys.size).toBe(5)
  })

  it('keeps all catalog keys under a common prefix', () => {
    expect(catalogKeys.capabilities()[0]).toBe('catalog')
    expect(catalogKeys.category('movie', 'popular', 'en')[0]).toBe('catalog')
  })

  it('builds a search key from identity and language only', () => {
    expect(catalogKeys.search('the matrix', 'en')).toEqual([
      'catalog',
      'search',
      'the matrix',
      'en',
    ])
  })

  it('isolates search identity and language', () => {
    const keys = new Set([
      JSON.stringify(catalogKeys.search('the matrix', 'en')),
      JSON.stringify(catalogKeys.search('the matrix', 'es')),
      JSON.stringify(catalogKeys.search('arrival', 'en')),
    ])
    expect(keys.size).toBe(3)
  })
})

describe('detail key factory', () => {
  it('includes media type, item id, and language for every core and secondary surface', () => {
    expect(catalogKeys.detail('movie', 'abc12345', 'en')).toEqual([
      'catalog',
      'detail',
      'movie',
      'abc12345',
      'en',
    ])
    expect(catalogKeys.credits('tv', 'abc12345', 'es')).toEqual([
      'catalog',
      'credits',
      'tv',
      'abc12345',
      'es',
    ])
    expect(catalogKeys.similar('movie', 'abc12345', 'en')).toEqual([
      'catalog',
      'similar',
      'movie',
      'abc12345',
      'en',
    ])
    expect(catalogKeys.collection('movie', 'abc12345', 'en')).toEqual([
      'catalog',
      'collection',
      'movie',
      'abc12345',
      'en',
    ])
    expect(catalogKeys.season('tv', 'abc12345', 2, 'en')).toEqual([
      'catalog',
      'season',
      'tv',
      'abc12345',
      2,
      'en',
    ])
  })

  it('isolates the selected season and language', () => {
    const keys = new Set([
      JSON.stringify(catalogKeys.season('tv', 'abc12345', 1, 'en')),
      JSON.stringify(catalogKeys.season('tv', 'abc12345', 2, 'en')),
      JSON.stringify(catalogKeys.season('tv', 'abc12345', 2, 'es')),
    ])
    expect(keys.size).toBe(3)
  })
})
