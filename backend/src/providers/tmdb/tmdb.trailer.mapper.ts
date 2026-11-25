import type { PromotionalType, TrailerVideo } from '../../domain/trailer.js'
import {
  TRAILER_MAX_INVENTORY,
  YOUTUBE_VIDEO_ID_PATTERN,
  compareTrailerSortKeys,
} from '../../domain/trailer.js'
interface TrailerRecord {
  readonly site?: string | null
  readonly key?: string | null
  readonly name?: string | null
  readonly type?: string | null
  readonly official?: boolean | null
  readonly iso_639_1?: string | null
  readonly published_at?: string | null
}

const TYPE_BY_PROVIDER: Readonly<Record<string, PromotionalType>> = Object.freeze({
  trailer: 'trailer',
  teaser: 'teaser',
  clip: 'clip',
  featurette: 'featurette',
  'behind the scenes': 'behind-the-scenes',
  'behind-the-scenes': 'behind-the-scenes',
  bloopers: 'bloopers',
  blooper: 'bloopers',
})

const LANGUAGE_PATTERN = /^[a-z]{2}$/
const EMBED_PATH = '/embed'
const WATCH_PATH = '/watch'
const EMBED_QUERY = '?autoplay=1&playsinline=1'

let languageNames: Intl.DisplayNames | undefined

const getLanguageNames = (): Intl.DisplayNames | undefined => {
  if (typeof Intl.DisplayNames !== 'function') {
    return undefined
  }
  languageNames ??= new Intl.DisplayNames(['en'], { type: 'language' })
  return languageNames
}

const normalizeText = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > 0 ? normalized : undefined
}

const normalizeType = (value: string | null | undefined): PromotionalType | undefined => {
  const normalized = normalizeText(value)?.toLowerCase().replace(/_+/g, ' ')
  if (normalized === undefined) {
    return undefined
  }
  return TYPE_BY_PROVIDER[normalized]
}

const normalizeLanguage = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = value.trim().toLowerCase()
  if (!LANGUAGE_PATTERN.test(normalized)) {
    return undefined
  }
  try {
    const names = getLanguageNames()
    const resolved = names?.of(normalized)
    if (resolved === undefined || resolved.toLowerCase() === normalized) {
      return undefined
    }
    return normalized
  } catch {
    return undefined
  }
}

const normalizePublishedAt = (value: string | null | undefined, now: number): string | undefined => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp) || timestamp > now) {
    return undefined
  }
  return new Date(timestamp).toISOString()
}

const pickHost = (hosts: readonly string[], allowedPathHost: string): string | undefined => {
  for (const host of hosts) {
    const candidate = host.trim().toLowerCase()
    if (candidate.length === 0) {
      continue
    }
    try {
      const url = new URL(`https://${candidate}${allowedPathHost}`)
      if (url.protocol === 'https:' && url.hostname === candidate) {
        return candidate
      }
    } catch {
      continue
    }
  }
  return undefined
}

const buildEmbedUrl = (hosts: readonly string[], videoId: string): string | undefined => {
  const host = pickHost(hosts, EMBED_PATH)
  if (host === undefined) {
    return undefined
  }
  return `https://${host}${EMBED_PATH}/${videoId}${EMBED_QUERY}`
}

const buildExternalUrl = (hosts: readonly string[], videoId: string): string | undefined => {
  const host = pickHost(hosts, WATCH_PATH)
  if (host === undefined) {
    return undefined
  }
  return `https://${host}${WATCH_PATH}?v=${videoId}`
}

interface Candidate {
  readonly id: string
  readonly videoId: string
  readonly title: string
  readonly type: PromotionalType
  readonly official: boolean
  readonly language?: string
  readonly publishedAt?: string
  readonly providerIndex: number
}

export interface TmdbTrailerMappingContext {
  readonly now?: number
  readonly embedHosts: readonly string[]
  readonly externalHosts: readonly string[]
  readonly maxInventory?: number
}

export const mapTmdbTrailers = (
  raw: { readonly results?: readonly TrailerRecord[] | null | undefined },
  context: TmdbTrailerMappingContext
): readonly TrailerVideo[] => {
  const now = context.now ?? Date.now()
  const candidates: Candidate[] = []
  const records = raw.results ?? []

  records.forEach((record, index) => {
    if (normalizeText(record.site)?.toLowerCase() !== 'youtube') {
      return
    }
    const key = normalizeText(record.key)
    if (key === undefined || !YOUTUBE_VIDEO_ID_PATTERN.test(key)) {
      return
    }
    const title = normalizeText(record.name)
    if (title === undefined) {
      return
    }
    const type = normalizeType(record.type)
    if (type === undefined) {
      return
    }
    const language = normalizeLanguage(record.iso_639_1)
    const publishedAt = normalizePublishedAt(record.published_at, now)
    candidates.push({
      id: `youtube:${key}`,
      videoId: key,
      title,
      type,
      official: record.official === true,
      ...(language === undefined ? {} : { language }),
      ...(publishedAt === undefined ? {} : { publishedAt }),
      providerIndex: index,
    })
  })

  const groups = new Map<string, Candidate[]>()
  for (const candidate of candidates) {
    const group = groups.get(candidate.id)
    if (group === undefined) {
      groups.set(candidate.id, [candidate])
    } else {
      group.push(candidate)
    }
  }

  const merged: Candidate[] = []
  for (const [id, group] of groups) {
    const primary = group.find((candidate) => candidate.official) ?? group[0]
    if (primary === undefined) {
      continue
    }
    const language = primary.language ?? group.find((c) => c.language !== undefined)?.language
    const publishedAt =
      primary.publishedAt ?? group.find((c) => c.publishedAt !== undefined)?.publishedAt
    const lowestIndex = Math.min(...group.map((candidate) => candidate.providerIndex))

    merged.push({
      id,
      videoId: primary.videoId,
      title: primary.title,
      type: primary.type,
      official: group.some((candidate) => candidate.official),
      ...(language === undefined ? {} : { language }),
      ...(publishedAt === undefined ? {} : { publishedAt }),
      providerIndex: lowestIndex,
    })
  }

  const ranked = [...merged].sort(compareTrailerSortKeys)
  const limit = context.maxInventory ?? TRAILER_MAX_INVENTORY
  const videos: TrailerVideo[] = []

  for (const candidate of ranked.slice(0, limit)) {
    const embedUrl = buildEmbedUrl(context.embedHosts, candidate.videoId)
    const externalUrl = buildExternalUrl(context.externalHosts, candidate.videoId)
    if (embedUrl === undefined && externalUrl === undefined) {
      continue
    }
    videos.push({
      id: candidate.id,
      platform: 'youtube',
      platformName: 'YouTube',
      videoId: candidate.videoId,
      title: candidate.title,
      type: candidate.type,
      official: candidate.official,
      ...(candidate.language === undefined ? {} : { language: candidate.language }),
      ...(candidate.publishedAt === undefined ? {} : { publishedAt: candidate.publishedAt }),
      ...(embedUrl === undefined ? {} : { embedUrl }),
      ...(externalUrl === undefined ? {} : { externalUrl }),
    })
  }

  return videos
}
