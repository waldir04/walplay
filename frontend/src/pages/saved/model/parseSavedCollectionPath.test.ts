import { describe, expect, it } from 'vitest'

import { parseSavedCollectionPath } from './parseSavedCollectionPath'

describe('parseSavedCollectionPath', () => {
  it('returns the watchlist collection', () => {
    expect(parseSavedCollectionPath('/saved/watchlist')).toBe('watchlist')
  })

  it('returns the favorites collection', () => {
    expect(parseSavedCollectionPath('/saved/favorites')).toBe('favorites')
  })

  it('returns null for the bare prefix', () => {
    expect(parseSavedCollectionPath('/saved')).toBeNull()
  })

  it('returns null for unknown segments', () => {
    expect(parseSavedCollectionPath('/saved/later')).toBeNull()
    expect(parseSavedCollectionPath('/saved/watchlist/extra')).toBeNull()
  })

  it('returns null for a trailing slash', () => {
    expect(parseSavedCollectionPath('/saved/watchlist/')).toBeNull()
  })

  it('returns null when a query string is included', () => {
    expect(parseSavedCollectionPath('/saved/watchlist?sort=recent')).toBeNull()
  })
})
