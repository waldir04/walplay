import { describe, expect, it } from 'vitest'

import {
  CATALOG_ERROR_STATUS,
  CatalogError,
  detailSeasonNotFoundError,
  isCatalogError,
} from './errors.js'

describe('detail season error', () => {
  it('exposes a stable 404 code', () => {
    const error = detailSeasonNotFoundError()
    expect(error).toBeInstanceOf(CatalogError)
    expect(error.code).toBe('DETAIL_SEASON_NOT_FOUND')
    expect(error.status).toBe(404)
    expect(CATALOG_ERROR_STATUS.DETAIL_SEASON_NOT_FOUND).toBe(404)
  })

  it('is recognized by the catalog error guard', () => {
    expect(isCatalogError(detailSeasonNotFoundError())).toBe(true)
    expect(isCatalogError(new Error('other'))).toBe(false)
  })

  it('uses a message that never includes provider detail', () => {
    expect(detailSeasonNotFoundError().message).toBe('The requested season was not found.')
  })
})
