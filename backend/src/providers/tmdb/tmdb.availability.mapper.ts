import type {
  AvailabilityCategory,
  AvailabilityDestination,
  AvailabilityGroup,
  AvailabilityProviderEntry,
  AvailabilityProviderLogo,
} from '../../domain/availability.js'
import type { ProviderAvailability } from '../availability-provider.js'
import type { WatchProviderDto, WatchProviderRegionDto } from './tmdb.availability.schemas.js'

const MISSING_PRIORITY = Number.MAX_SAFE_INTEGER
const PLACEHOLDER_NAMES = new Set(['n/a', 'null', 'undefined', 'tbd'])

type CategorySourceKey = 'flatrate' | 'free' | 'ads' | 'rent' | 'buy'

const SOURCE_CATEGORIES: readonly (readonly [CategorySourceKey, AvailabilityCategory])[] =
  Object.freeze([
  ['flatrate', 'subscription'],
  ['free', 'free'],
  ['ads', 'ads'],
  ['rent', 'rent'],
  ['buy', 'buy'],
])

const usableName = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  if (trimmed.length === 0 || PLACEHOLDER_NAMES.has(trimmed.toLowerCase())) {
    return undefined
  }
  return trimmed
}

const usableProviderId = (value: number): number | undefined =>
  Number.isSafeInteger(value) && value > 0 ? value : undefined

const mapCategory = (
  records: readonly WatchProviderDto[] | null | undefined,
  category: AvailabilityCategory,
  resolveLogo: (path: string | null | undefined) => AvailabilityProviderLogo | undefined,
  logosEnabled: boolean
): AvailabilityGroup | undefined => {
  if (!Array.isArray(records) || records.length === 0) {
    return undefined
  }

  const seen = new Set<number>()
  const candidates: {
    readonly name: string
    readonly priority: number
    readonly index: number
    readonly logoPath: string | null | undefined
  }[] = []

  records.forEach((record: WatchProviderDto, index: number) => {
    const providerId = usableProviderId(record.provider_id)
    const name = usableName(record.provider_name)
    if (providerId === undefined || name === undefined || seen.has(providerId)) {
      return
    }
    seen.add(providerId)
    candidates.push({
      name,
      priority:
        typeof record.display_priority === 'number' ? record.display_priority : MISSING_PRIORITY,
      index,
      logoPath: record.logo_path,
    })
  })

  const providers = candidates
    .slice()
    .sort((left, right) =>
      left.priority === right.priority ? left.index - right.index : left.priority - right.priority
    )
    .map((candidate): AvailabilityProviderEntry => {
      if (!logosEnabled) {
        return { name: candidate.name }
      }
      const logo = resolveLogo(candidate.logoPath)
      return logo === undefined ? { name: candidate.name } : { name: candidate.name, logo }
    })

  if (providers.length === 0) {
    return undefined
  }

  return { category, providers }
}

export const validateDestination = (
  link: string | null | undefined,
  region: string,
  allowedHosts: readonly string[]
): AvailabilityDestination | undefined => {
  if (typeof link !== 'string') {
    return undefined
  }
  const trimmed = link.trim()
  if (trimmed.length === 0) {
    return undefined
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return undefined
  }

  if (url.protocol !== 'https:') {
    return undefined
  }
  if (url.username.length > 0 || url.password.length > 0) {
    return undefined
  }
  if (!allowedHosts.includes(url.hostname.toLowerCase())) {
    return undefined
  }

  const locale = url.searchParams.get('locale')
  if (locale !== null) {
    const normalized = locale.trim().toLowerCase()
    const regionSubtag = normalized.includes('-')
      ? normalized.slice(normalized.lastIndexOf('-') + 1)
      : normalized
    if (regionSubtag !== region.toLowerCase()) {
      return undefined
    }
  }

  return { url: trimmed }
}

export interface MapRegionAvailabilityInput {
  readonly entry: WatchProviderRegionDto
  readonly region: string
  readonly logosEnabled: boolean
  readonly resolveLogo: (path: string | null | undefined) => AvailabilityProviderLogo | undefined
  readonly allowedDestinationHosts: readonly string[]
}

export const mapTmdbRegionAvailability = ({
  entry,
  region,
  logosEnabled,
  resolveLogo,
  allowedDestinationHosts,
}: MapRegionAvailabilityInput): ProviderAvailability => {
  const groups: AvailabilityGroup[] = []

  for (const [sourceKey, category] of SOURCE_CATEGORIES) {
    const records: readonly WatchProviderDto[] | null | undefined = entry[sourceKey]
    const group = mapCategory(records, category, resolveLogo, logosEnabled)
    if (group !== undefined) {
      groups.push(group)
    }
  }

  const destination = validateDestination(entry.link, region, allowedDestinationHosts)

  return {
    groups,
    ...(destination === undefined ? {} : { destination }),
  }
}
