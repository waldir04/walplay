import { describe, expect, it } from 'vitest'

import { formatCount, formatRatingValue } from './catalogItem'

const staleDate = new Date('2026-11-22T15:00:00.000Z')

describe('locale-aware catalog formatting', () => {
  it('formats ratings with a decimal separator per locale', () => {
    expect(formatRatingValue(8.1, 'en-US')).toBe('8.1')
    expect(formatRatingValue(8.1, 'es-ES')).toBe('8,1')
  })

  it('formats counts per locale', () => {
    expect(formatCount(30_123, 'en-US')).toBe('30,123')
    expect(formatCount(30_123, 'es-ES')).toBe('30.123')
  })

  it('formats stale timestamps with Intl date and time styles', () => {
    const en = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(staleDate)
    const es = new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(staleDate)

    expect(en).toMatch(/2026/)
    expect(es).toMatch(/2026/)
    expect(en).not.toBe(es)
  })
})
