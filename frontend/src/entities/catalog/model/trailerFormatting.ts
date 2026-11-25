import type { PromotionalType } from './trailer'

export const TRAILER_TYPE_LABEL_KEYS: Readonly<Record<PromotionalType, string>> = Object.freeze({
  trailer: 'detail.trailers.types.trailer',
  teaser: 'detail.trailers.types.teaser',
  featurette: 'detail.trailers.types.featurette',
  clip: 'detail.trailers.types.clip',
  'behind-the-scenes': 'detail.trailers.types.behindTheScenes',
  bloopers: 'detail.trailers.types.bloopers',
})

export const trailerTypeLabelKey = (type: PromotionalType): string => TRAILER_TYPE_LABEL_KEYS[type]

let displayNamesByLocale = new Map<string, Intl.DisplayNames>()

const getDisplayNames = (locale: string): Intl.DisplayNames | undefined => {
  if (typeof Intl.DisplayNames !== 'function') {
    return undefined
  }
  const cached = displayNamesByLocale.get(locale)
  if (cached !== undefined) {
    return cached
  }
  const names = new Intl.DisplayNames([locale], { type: 'language' })
  displayNamesByLocale.set(locale, names)
  return names
}

export const resetTrailerFormattingCaches = (): void => {
  displayNamesByLocale = new Map<string, Intl.DisplayNames>()
}

export const formatTrailerLanguage = (
  code: string | undefined,
  locale: string
): string | undefined => {
  if (code === undefined || !/^[a-z]{2}$/.test(code)) {
    return undefined
  }
  try {
    const names = getDisplayNames(locale)
    const resolved = names?.of(code)
    if (resolved === undefined || resolved.toLowerCase() === code) {
      return undefined
    }
    return resolved
  } catch {
    return undefined
  }
}

export const formatTrailerPublishedAt = (
  value: string | undefined,
  locale: string,
  now: number = Date.now()
): string | undefined => {
  if (value === undefined) {
    return undefined
  }
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp) || timestamp > now) {
    return undefined
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(timestamp)
}
