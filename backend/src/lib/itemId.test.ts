import { describe, expect, it } from 'vitest'

import { decodeItemId, encodeItemId } from './itemId.js'

describe('itemId', () => {
  it('round-trips media type and provider id as an opaque base64url token', () => {
    const token = encodeItemId('movie', 550)

    expect(token).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
    expect(token).not.toContain('550')
    expect(decodeItemId(token)).toEqual({ provider: 'tmdb', mediaType: 'movie', providerId: 550 })
  })

  it('round-trips TV identities', () => {
    const token = encodeItemId('tv', 1399)
    expect(decodeItemId(token).mediaType).toBe('tv')
  })

  it('rejects malformed tokens', () => {
    for (const token of ['', 'short', 'not base64!', 'a'.repeat(65), 'd2wx']) {
      expect(() => decodeItemId(token)).toThrow()
    }
  })

  it('rejects wrong prefixes and type segments', () => {
    const wrongPrefix = Buffer.from('wl2:movie:550').toString('base64url')
    const wrongType = Buffer.from('wl1:film:550').toString('base64url')
    const noType = Buffer.from('wl1::550').toString('base64url')

    expect(() => decodeItemId(wrongPrefix)).toThrow()
    expect(() => decodeItemId(wrongType)).toThrow()
    expect(() => decodeItemId(noType)).toThrow()
  })

  it('rejects non-positive, non-numeric, and oversized provider ids', () => {
    for (const encoded of [
      'wl1:movie:0',
      'wl1:movie:-2',
      'wl1:movie:abc',
      'wl1:movie:1234567890123',
    ]) {
      const token = Buffer.from(encoded).toString('base64url')
      expect(() => decodeItemId(token)).toThrow()
    }
  })

  it('rejects extra segments', () => {
    const token = Buffer.from('wl1:movie:550:extra').toString('base64url')
    expect(() => decodeItemId(token)).toThrow()
  })

  it('refuses to encode invalid provider ids', () => {
    expect(() => encodeItemId('movie', 0)).toThrow()
    expect(() => encodeItemId('movie', -1)).toThrow()
    expect(() => encodeItemId('movie', 1.5)).toThrow()
  })
})
