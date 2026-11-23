import { describe, expect, it } from 'vitest'

import {
  formatAvailabilityTimestamp,
  formatRegionLabel,
  formatRegionName,
} from './availabilityFormatting'

describe('availability formatting', () => {
  it('localizes region names in English and Spanish', () => {
    expect(formatRegionName('US', 'en')).toBe('United States')
    expect(formatRegionName('US', 'es')).toBe('Estados Unidos')
    expect(formatRegionName('CO', 'en')).toBe('Colombia')
  })

  it('always shows the ISO code with the localized name', () => {
    expect(formatRegionLabel('US', 'en')).toBe('United States (US)')
    expect(formatRegionLabel('CO', 'es')).toBe('Colombia (CO)')
  })

  it('falls back to the code when Intl.DisplayNames is unavailable or the locale is invalid', () => {
    expect(formatRegionName('US', 'en_US')).toBe('US')
    expect(formatRegionLabel('US', 'en_US')).toBe('US')
  })

  it('falls back to the input code when the code is not an ISO region code', () => {
    expect(formatRegionName('not-a-region', 'en')).toBe('not-a-region')
    expect(formatRegionLabel('not-a-region', 'en')).toBe('not-a-region')
  })

  it('formats check times with the existing localized date helper', () => {
    const english = formatAvailabilityTimestamp('2026-11-23T12:00:00.000Z', 'en')
    const spanish = formatAvailabilityTimestamp('2026-11-23T12:00:00.000Z', 'es')

    expect(english).toContain('2026')
    expect(english).not.toContain('2026-11-23T12:00:00.000Z')
    expect(spanish).toContain('2026')
    expect(spanish).not.toBe(english)
  })

  it('returns undefined for an invalid timestamp', () => {
    expect(formatAvailabilityTimestamp('not-a-date', 'en')).toBeUndefined()
  })
})
