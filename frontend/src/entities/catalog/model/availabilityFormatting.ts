import { formatLastUpdated } from './detailFormatting'

const REGION_CODE_PATTERN = /^[A-Z]{2}$/

const normalizeRegion = (code: string): string => code.trim().toUpperCase()

export const formatRegionName = (code: string, locale: string): string => {
  const normalized = normalizeRegion(code)
  if (!REGION_CODE_PATTERN.test(normalized)) {
    return code
  }

  try {
    if (typeof Intl.DisplayNames !== 'function') {
      return normalized
    }
    const displayNames = new Intl.DisplayNames(locale, { type: 'region' })
    const name = displayNames.of(normalized)
    if (typeof name !== 'string' || name.trim().length === 0) {
      return normalized
    }
    return name
  } catch {
    return normalized
  }
}

export const formatRegionLabel = (code: string, locale: string): string => {
  const normalized = normalizeRegion(code)
  if (!REGION_CODE_PATTERN.test(normalized)) {
    return code
  }
  const name = formatRegionName(normalized, locale)
  if (name === normalized) {
    return normalized
  }
  return `${name} (${normalized})`
}

export const formatAvailabilityTimestamp = (value: string, locale: string): string | undefined =>
  formatLastUpdated(value, locale)
