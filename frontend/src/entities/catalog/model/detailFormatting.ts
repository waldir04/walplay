import type { EpisodeDuration, TitleRating } from './titleDetail'

export type TranslateFn = (key: string, options?: Record<string, unknown>) => string

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>()
const numberFormatterCache = new Map<string, Intl.NumberFormat>()
const decimalFormatterCache = new Map<string, Intl.NumberFormat>()
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>()

const dateFormatter = (locale: string): Intl.DateTimeFormat => {
  const cached = dateFormatterCache.get(locale)
  if (cached) {
    return cached
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
  dateFormatterCache.set(locale, formatter)
  return formatter
}

const numberFormatter = (locale: string): Intl.NumberFormat => {
  const cached = numberFormatterCache.get(locale)
  if (cached) {
    return cached
  }
  const formatter = new Intl.NumberFormat(locale)
  numberFormatterCache.set(locale, formatter)
  return formatter
}

const decimalFormatter = (locale: string): Intl.NumberFormat => {
  const cached = decimalFormatterCache.get(locale)
  if (cached) {
    return cached
  }
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  decimalFormatterCache.set(locale, formatter)
  return formatter
}

const dateTimeFormatter = (locale: string): Intl.DateTimeFormat => {
  const cached = dateTimeFormatterCache.get(locale)
  if (cached) {
    return cached
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  dateTimeFormatterCache.set(locale, formatter)
  return formatter
}

const parseCalendarDate = (value: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) {
    return undefined
  }
  const year = Number.parseInt(match[1] ?? '', 10)
  const month = Number.parseInt(match[2] ?? '', 10)
  const day = Number.parseInt(match[3] ?? '', 10)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined
  }
  return date
}

export const formatDetailDate = (value: string | undefined, locale: string): string | undefined => {
  if (value === undefined) {
    return undefined
  }
  const date = parseCalendarDate(value)
  return date === undefined ? undefined : dateFormatter(locale).format(date)
}

export const formatDetailDateOrYear = (
  date: string | undefined,
  year: number | undefined,
  locale: string
): string | undefined => {
  const formatted = formatDetailDate(date, locale)
  if (formatted !== undefined) {
    return formatted
  }
  return year === undefined ? undefined : String(year)
}

export const formatEpisodeAirDate = (
  value: string | undefined,
  locale: string
): string | undefined => {
  if (value === undefined) {
    return undefined
  }
  const formatted = formatDetailDate(value, locale)
  if (formatted !== undefined) {
    return formatted
  }
  return /^\d{4}$/.test(value.trim()) ? value.trim() : undefined
}

export const formatLocalizedNumber = (value: number, locale: string): string =>
  numberFormatter(locale).format(value)

export const formatRatingValue = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)

export const formatPopularity = (value: number, locale: string): string =>
  decimalFormatter(locale).format(value)

export const formatVoteCount = (value: number, locale: string): string =>
  numberFormatter(locale).format(value)

export const formatMinutes = (minutes: number, locale: string, translate: TranslateFn): string =>
  translate('detail.duration.minutes', {
    minutes: formatLocalizedNumber(minutes, locale),
  })

export const formatMovieDuration = (
  minutes: number,
  locale: string,
  translate: TranslateFn
): string => {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) {
    return formatMinutes(minutes, locale, translate)
  }
  return translate('detail.duration.hoursMinutes', {
    hours: formatLocalizedNumber(hours, locale),
    minutes: formatLocalizedNumber(remainder, locale),
  })
}

export const formatEpisodeRuntime = (
  duration: EpisodeDuration,
  locale: string,
  translate: TranslateFn
): string => {
  if (duration.maxMinutes === undefined || duration.maxMinutes === duration.minMinutes) {
    return translate('detail.duration.typicalEpisode', {
      duration: formatMinutes(duration.minMinutes, locale, translate),
    })
  }
  return translate('detail.duration.range', {
    min: formatMinutes(duration.minMinutes, locale, translate),
    max: formatMinutes(duration.maxMinutes, locale, translate),
  })
}

export const formatRatingAccessibleText = (
  rating: TitleRating,
  locale: string,
  translate: TranslateFn
): string =>
  translate('detail.rating.a11y', {
    count: rating.voteCount,
    value: formatRatingValue(rating.value, locale),
    scale: rating.scale,
  })

export const formatVoteCountText = (
  voteCount: number,
  locale: string,
  translate: TranslateFn
): string =>
  translate('detail.rating.votes', {
    count: voteCount,
    value: formatVoteCount(voteCount, locale),
  })

export const formatLastUpdated = (value: string, locale: string): string | undefined => {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return undefined
  }
  return dateTimeFormatter(locale).format(new Date(timestamp))
}
