import type {
  CatalogItem,
  CatalogPoster,
  MediaType,
} from '../../domain/catalog.js'
import {
  CAST_PREVIEW_LIMIT,
  COLLECTION_PREVIEW_LIMIT,
  CREW_PREVIEW_LIMIT,
  MAX_EPISODE_NUMBER,
  MAX_PLAUSIBLE_EPISODE_RUNTIME_MINUTES,
  MAX_PLAUSIBLE_MOVIE_RUNTIME_MINUTES,
  MAX_PLAUSIBLE_YEAR,
  MAX_SEASON_NUMBER,
  MAX_TV_NETWORKS,
  MIN_PLAUSIBLE_YEAR,
  MIN_SEASON_NUMBER,
  SIMILAR_PREVIEW_LIMIT,
} from '../../domain/detail.js'
import type {
  CastCredit,
  CrewCredit,
  CrewRole,
  Credits,
  Episode,
  EpisodeDuration,
  Genre,
  Person,
  RelatedCollection,
  RelatedTitle,
  Season,
  SeasonEpisodes,
  TitleDetail,
  TitleRating,
  TitleStatus,
  TvSummary,
} from '../../domain/detail.js'
import { encodeItemId } from '../../lib/itemId.js'
import type { ProviderTitleDetail } from '../detail-provider.js'
import type { GenreNames } from './tmdb.genres.js'
import { mapListItemToItem } from './tmdb.mapper.js'
import type {
  AggregateCreditsDto,
  CollectionDto,
  CreditsDto,
  MovieDetailDto,
  SeasonDto,
  SimilarDto,
  TvDetailDto,
} from './tmdb.detail.schemas.js'

const TITLE_PLACEHOLDERS = new Set(['n/a', 'null', 'undefined', 'tbd'])
const DESCRIPTIVE_PLACEHOLDERS = new Set([
  'n/a',
  'na',
  'null',
  'undefined',
  'tbd',
  'unknown',
  'untitled',
  '-',
  '--',
  '—',
])

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const YEAR_PREFIX_PATTERN = /^(\d{4})(?:-|$)/

const STATUS_BY_NAME: Readonly<Record<string, TitleStatus>> = Object.freeze({
  released: 'released',
  'in production': 'in-production',
  'post production': 'post-production',
  planned: 'planned',
  rumored: 'rumored',
  'returning series': 'returning',
  ended: 'ended',
  canceled: 'canceled',
  cancelled: 'canceled',
  pilot: 'pilot',
})

const ROLE_BY_JOB: Readonly<Record<string, CrewRole>> = Object.freeze({
  director: 'director',
  creator: 'creator',
  writer: 'writer',
  screenplay: 'writer',
  story: 'writer',
  teleplay: 'writer',
})

export interface ArtworkResolvers {
  readonly poster?: (path: string | null | undefined) => CatalogPoster | undefined
  readonly backdrop?: (path: string | null | undefined) => CatalogPoster | undefined
  readonly profile?: (path: string | null | undefined) => CatalogPoster | undefined
  readonly still?: (path: string | null | undefined) => CatalogPoster | undefined
}

export interface CoreMappingContext extends ArtworkResolvers {
  readonly fallbackOverview?: string | null | undefined
  readonly fallbackTagline?: string | null | undefined
}

export interface RelatedMappingContext extends ArtworkResolvers {
  readonly mediaType: MediaType
  readonly genreNames?: GenreNames | undefined
  readonly currentProviderId: number
}

export interface SeasonMappingContext extends ArtworkResolvers {
  readonly seasonNumber: number
}

const normalizeRawText = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const isPlaceholder = (value: string, placeholders: ReadonlySet<string>): boolean =>
  placeholders.has(value.toLowerCase())

export const normalizeTitleText = (value: string | null | undefined): string | undefined => {
  const normalized = normalizeRawText(value)
  if (normalized === undefined || isPlaceholder(normalized, TITLE_PLACEHOLDERS)) {
    return undefined
  }
  return normalized
}

export const normalizeDescriptiveText = (value: string | null | undefined): string | undefined => {
  const normalized = normalizeRawText(value)
  if (normalized === undefined || isPlaceholder(normalized, DESCRIPTIVE_PLACEHOLDERS)) {
    return undefined
  }
  return normalized
}

const isPlausibleYear = (year: number): boolean =>
  Number.isInteger(year) && year >= MIN_PLAUSIBLE_YEAR && year <= MAX_PLAUSIBLE_YEAR

export const parseDetailDate = (
  value: string | null | undefined
): { readonly date: string; readonly year: number } | undefined => {
  const normalized = normalizeRawText(value)
  if (normalized === undefined) {
    return undefined
  }
  const match = DATE_PATTERN.exec(normalized)
  if (!match) {
    return undefined
  }
  const year = Number.parseInt(match[1] ?? '', 10)
  const month = Number.parseInt(match[2] ?? '', 10)
  const day = Number.parseInt(match[3] ?? '', 10)
  if (!isPlausibleYear(year) || month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined
  }
  const asDate = new Date(Date.UTC(year, month - 1, day))
  if (
    asDate.getUTCFullYear() !== year ||
    asDate.getUTCMonth() !== month - 1 ||
    asDate.getUTCDate() !== day
  ) {
    return undefined
  }
  return { date: normalized, year }
}

export const extractDetailYear = (value: string | null | undefined): number | undefined => {
  const normalized = normalizeRawText(value)
  if (normalized === undefined) {
    return undefined
  }
  const match = YEAR_PREFIX_PATTERN.exec(normalized)
  if (!match) {
    return undefined
  }
  const year = Number.parseInt(match[1] ?? '', 10)
  return isPlausibleYear(year) ? year : undefined
}

const resolveRelease = (
  value: string | null | undefined
): { readonly releaseDate?: string; readonly releaseYear?: number } => {
  const parsed = parseDetailDate(value)
  if (parsed) {
    return { releaseDate: parsed.date, releaseYear: parsed.year }
  }
  const year = extractDetailYear(value)
  return year === undefined ? {} : { releaseYear: year }
}

export const resolveTitleFields = (
  localized: string | null | undefined,
  original: string | null | undefined
): { readonly title: string; readonly originalTitle?: string } | null => {
  const localizedTitle = normalizeTitleText(localized)
  const originalTitle = normalizeTitleText(original)
  const title = localizedTitle ?? originalTitle
  if (title === undefined) {
    return null
  }
  if (originalTitle !== undefined && originalTitle !== title) {
    return { title, originalTitle }
  }
  return { title }
}

export const buildDetailRating = (
  average: number | null | undefined,
  voteCount: number | null | undefined
): TitleRating | undefined => {
  if (
    typeof average !== 'number' ||
    !Number.isFinite(average) ||
    average <= 0 ||
    average > 10 ||
    typeof voteCount !== 'number' ||
    !Number.isInteger(voteCount) ||
    voteCount <= 0
  ) {
    return undefined
  }
  return {
    value: Math.round(average * 10) / 10,
    voteCount,
    scale: 10,
    source: 'tmdb',
  }
}

export const buildPopularity = (value: number | null | undefined): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined
  }
  return value
}

export const buildMovieRuntime = (
  value: number | null | undefined
): { readonly minutes: number; readonly kind: 'movie' } | undefined => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_PLAUSIBLE_MOVIE_RUNTIME_MINUTES
  ) {
    return undefined
  }
  return { minutes: value, kind: 'movie' }
}

export const buildEpisodeRuntime = (
  values: readonly number[] | null | undefined
): EpisodeDuration | undefined => {
  if (values === null || values === undefined) {
    return undefined
  }
  const valid = [
    ...new Set(
      values.filter(
        (value) =>
          typeof value === 'number' &&
          Number.isInteger(value) &&
          value >= 1 &&
          value <= MAX_PLAUSIBLE_EPISODE_RUNTIME_MINUTES
      )
    ),
  ].sort((left, right) => left - right)

  const first = valid[0]
  if (first === undefined) {
    return undefined
  }
  const last = valid[valid.length - 1]
  if (last === undefined || last === first) {
    return { minMinutes: first }
  }
  return { minMinutes: first, maxMinutes: last }
}

export const mapTitleStatus = (value: string | null | undefined): TitleStatus | undefined => {
  const normalized = normalizeRawText(value)
  if (normalized === undefined) {
    return undefined
  }
  return STATUS_BY_NAME[normalized.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')]
}

export const mapCrewRole = (job: string | null | undefined): CrewRole | undefined => {
  const normalized = normalizeRawText(job)
  if (normalized === undefined) {
    return undefined
  }
  return ROLE_BY_JOB[normalized.toLowerCase()]
}

const mapGenres = (
  genres: readonly { readonly id: number; readonly name: string }[] | null | undefined
): readonly Genre[] => {
  if (genres === null || genres === undefined) {
    return []
  }
  const seen = new Set<number>()
  const mapped: Genre[] = []
  for (const genre of genres) {
    const name = normalizeDescriptiveText(genre.name)
    if (name === undefined || seen.has(genre.id)) {
      continue
    }
    seen.add(genre.id)
    mapped.push({ id: String(genre.id), name })
  }
  return mapped
}

const buildPerson = (
  name: string | null | undefined,
  profilePath: string | null | undefined,
  profile: ArtworkResolvers['profile']
): Person | null => {
  const normalizedName = normalizeDescriptiveText(name)
  if (normalizedName === undefined) {
    return null
  }
  const resolvedProfile = profile?.(profilePath)
  return {
    name: normalizedName,
    ...(resolvedProfile === undefined ? {} : { profile: resolvedProfile }),
  }
}

const personKey = (id: number, name: string, role: string): string =>
  `${Number.isSafeInteger(id) && id > 0 ? String(id) : name.toLowerCase()}:${role}`

export const mapMovieCredits = (
  raw: CreditsDto,
  { profile }: ArtworkResolvers = {}
): Credits => {
  const cast: CastCredit[] = []
  for (const credit of raw.cast ?? []) {
    if (cast.length >= CAST_PREVIEW_LIMIT) {
      break
    }
    const person = buildPerson(credit.name, credit.profile_path, profile)
    if (person === null) {
      continue
    }
    const character = normalizeDescriptiveText(credit.character)
    cast.push({ ...person, ...(character === undefined ? {} : { character }) })
  }

  const crew: CrewCredit[] = []
  const seen = new Set<string>()
  for (const credit of raw.crew ?? []) {
    if (crew.length >= CREW_PREVIEW_LIMIT) {
      break
    }
    const role = mapCrewRole(credit.job)
    const person = buildPerson(credit.name, credit.profile_path, profile)
    if (role === undefined || person === null) {
      continue
    }
    const key = personKey(credit.id, person.name, role)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    crew.push({ ...person, role })
  }

  return { cast, crew }
}

export const mapTvCredits = (
  raw: AggregateCreditsDto,
  { profile }: ArtworkResolvers = {}
): Credits => {
  const cast: CastCredit[] = []
  for (const credit of raw.cast ?? []) {
    if (cast.length >= CAST_PREVIEW_LIMIT) {
      break
    }
    const person = buildPerson(credit.name, credit.profile_path, profile)
    if (person === null) {
      continue
    }
    const character = (credit.roles ?? [])
      .map((role) => normalizeDescriptiveText(role.character))
      .find((value): value is string => value !== undefined)
    cast.push({ ...person, ...(character === undefined ? {} : { character }) })
  }

  const crew: CrewCredit[] = []
  const seen = new Set<string>()
  for (const credit of raw.crew ?? []) {
    if (crew.length >= CREW_PREVIEW_LIMIT) {
      break
    }
    const person = buildPerson(credit.name, credit.profile_path, profile)
    if (person === null) {
      continue
    }
    for (const entry of credit.jobs ?? []) {
      if (crew.length >= CREW_PREVIEW_LIMIT) {
        break
      }
      const role = mapCrewRole(entry.job)
      if (role === undefined) {
        continue
      }
      const key = personKey(credit.id, person.name, role)
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      crew.push({ ...person, role })
    }
  }

  return { cast, crew }
}

const buildTvSummary = (raw: TvDetailDto): TvSummary | undefined => {
  const seasonsCount =
    typeof raw.number_of_seasons === 'number' &&
    Number.isInteger(raw.number_of_seasons) &&
    raw.number_of_seasons >= 0
      ? raw.number_of_seasons
      : undefined
  const episodesCount =
    typeof raw.number_of_episodes === 'number' &&
    Number.isInteger(raw.number_of_episodes) &&
    raw.number_of_episodes >= 0
      ? raw.number_of_episodes
      : undefined
  const firstAirDate = parseDetailDate(raw.first_air_date)?.date
  const latestAirDate = parseDetailDate(raw.last_air_date)?.date

  const seen = new Set<string>()
  const networks: string[] = []
  for (const network of raw.networks ?? []) {
    if (networks.length >= MAX_TV_NETWORKS) {
      break
    }
    const name = normalizeDescriptiveText(network.name)
    if (name === undefined || seen.has(name.toLowerCase())) {
      continue
    }
    seen.add(name.toLowerCase())
    networks.push(name)
  }

  const summary: TvSummary = {
    ...(seasonsCount === undefined ? {} : { seasonsCount }),
    ...(episodesCount === undefined ? {} : { episodesCount }),
    ...(firstAirDate === undefined ? {} : { firstAirDate }),
    ...(latestAirDate === undefined ? {} : { latestAirDate }),
    ...(networks.length === 0 ? {} : { networks }),
  }

  return Object.keys(summary).length === 0 ? undefined : summary
}

interface SeasonSummaryInput {
  readonly season_number?: number | null | undefined
  readonly name?: string | null | undefined
  readonly air_date?: string | null | undefined
  readonly episode_count?: number | null | undefined
}

const mapSeasonSummary = (raw: SeasonSummaryInput): Season | null => {
  if (
    typeof raw.season_number !== 'number' ||
    !Number.isInteger(raw.season_number) ||
    raw.season_number < MIN_SEASON_NUMBER ||
    raw.season_number > MAX_SEASON_NUMBER
  ) {
    return null
  }
  const name = normalizeDescriptiveText(raw.name)
  const airYear = extractDetailYear(raw.air_date)
  const episodeCount =
    typeof raw.episode_count === 'number' &&
    Number.isInteger(raw.episode_count) &&
    raw.episode_count >= 0
      ? raw.episode_count
      : undefined
  return {
    number: raw.season_number,
    ...(name === undefined ? {} : { name }),
    ...(airYear === undefined ? {} : { airYear }),
    ...(episodeCount === undefined ? {} : { episodeCount }),
  }
}

const orderSeasons = (seasons: readonly Season[]): readonly Season[] => {
  const regular = seasons
    .filter((season) => season.number > 0)
    .sort((left, right) => left.number - right.number)
  const specials = seasons.filter((season) => season.number === 0)
  return [...regular, ...specials]
}

const mapSeasons = (
  seasons: readonly SeasonSummaryInput[] | null | undefined
): readonly Season[] | undefined => {
  if (seasons === null || seasons === undefined) {
    return undefined
  }
  const seen = new Set<number>()
  const mapped: Season[] = []
  for (const raw of seasons) {
    const season = mapSeasonSummary(raw)
    if (season === null || seen.has(season.number)) {
      continue
    }
    seen.add(season.number)
    mapped.push(season)
  }
  return mapped.length === 0 ? undefined : orderSeasons(mapped)
}

export const mapMovieDetail = (
  raw: MovieDetailDto,
  context: CoreMappingContext = {}
): ProviderTitleDetail | null => {
  if (!Number.isSafeInteger(raw.id) || raw.id <= 0 || raw.adult === true) {
    return null
  }
  const titleFields = resolveTitleFields(raw.title, raw.original_title)
  if (titleFields === null) {
    return null
  }
  const overview =
    normalizeDescriptiveText(raw.overview) ?? normalizeDescriptiveText(context.fallbackOverview)
  const tagline =
    normalizeDescriptiveText(raw.tagline) ?? normalizeDescriptiveText(context.fallbackTagline)
  const release = resolveRelease(raw.release_date)
  const rating = buildDetailRating(raw.vote_average, raw.vote_count)
  const popularity = buildPopularity(raw.popularity)
  const runtime = buildMovieRuntime(raw.runtime)
  const status = mapTitleStatus(raw.status)
  const poster = context.poster?.(raw.poster_path)
  const backdrop = context.backdrop?.(raw.backdrop_path)
  const collectionName = normalizeDescriptiveText(raw.belongs_to_collection?.name)
  const collectionProviderId =
    raw.belongs_to_collection !== null &&
    raw.belongs_to_collection !== undefined &&
    Number.isSafeInteger(raw.belongs_to_collection.id) &&
    raw.belongs_to_collection.id > 0
      ? raw.belongs_to_collection.id
      : undefined

  const detail: TitleDetail = {
    id: encodeItemId('movie', raw.id),
    mediaType: 'movie',
    title: titleFields.title,
    ...(titleFields.originalTitle === undefined
      ? {}
      : { originalTitle: titleFields.originalTitle }),
    ...(overview === undefined ? {} : { overview }),
    ...(tagline === undefined ? {} : { tagline }),
    ...release,
    ...(status === undefined ? {} : { status }),
    genres: mapGenres(raw.genres),
    ...(runtime === undefined ? {} : { runtime }),
    ...(rating === undefined ? {} : { rating }),
    ...(popularity === undefined ? {} : { popularity }),
    ...(poster === undefined ? {} : { poster }),
    ...(backdrop === undefined ? {} : { backdrop }),
    ...(collectionName === undefined ? {} : { collection: { name: collectionName } }),
  }

  return {
    detail,
    ...(collectionProviderId === undefined ? {} : { collectionProviderId }),
  }
}

export const mapTvDetail = (
  raw: TvDetailDto,
  context: CoreMappingContext = {}
): ProviderTitleDetail | null => {
  if (!Number.isSafeInteger(raw.id) || raw.id <= 0 || raw.adult === true) {
    return null
  }
  const titleFields = resolveTitleFields(raw.name, raw.original_name)
  if (titleFields === null) {
    return null
  }
  const overview =
    normalizeDescriptiveText(raw.overview) ?? normalizeDescriptiveText(context.fallbackOverview)
  const tagline =
    normalizeDescriptiveText(raw.tagline) ?? normalizeDescriptiveText(context.fallbackTagline)
  const release = resolveRelease(raw.first_air_date)
  const rating = buildDetailRating(raw.vote_average, raw.vote_count)
  const popularity = buildPopularity(raw.popularity)
  const episodeRuntime = buildEpisodeRuntime(raw.episode_run_time)
  const status = mapTitleStatus(raw.status)
  const poster = context.poster?.(raw.poster_path)
  const backdrop = context.backdrop?.(raw.backdrop_path)
  const tvSummary = buildTvSummary(raw)
  const seasons = mapSeasons(raw.seasons)

  const detail: TitleDetail = {
    id: encodeItemId('tv', raw.id),
    mediaType: 'tv',
    title: titleFields.title,
    ...(titleFields.originalTitle === undefined
      ? {}
      : { originalTitle: titleFields.originalTitle }),
    ...(overview === undefined ? {} : { overview }),
    ...(tagline === undefined ? {} : { tagline }),
    ...release,
    ...(status === undefined ? {} : { status }),
    genres: mapGenres(raw.genres),
    ...(episodeRuntime === undefined ? {} : { episodeRuntime }),
    ...(rating === undefined ? {} : { rating }),
    ...(popularity === undefined ? {} : { popularity }),
    ...(poster === undefined ? {} : { poster }),
    ...(backdrop === undefined ? {} : { backdrop }),
    ...(tvSummary === undefined ? {} : { tvSummary }),
    ...(seasons === undefined ? {} : { seasons }),
  }

  return { detail }
}

export const mapSimilarItems = (
  raw: SimilarDto,
  context: RelatedMappingContext
): readonly RelatedTitle[] => {
  const items: CatalogItem[] = []
  const seen = new Set<string>()

  for (const candidate of raw.results) {
    if (candidate.adult === true || !hasUsableRelatedTitle(candidate)) {
      continue
    }
    if (
      candidate.media_type !== null &&
      candidate.media_type !== undefined &&
      candidate.media_type !== context.mediaType
    ) {
      continue
    }
    if (candidate.id === context.currentProviderId) {
      continue
    }
    const item = mapListItemToItem(candidate, {
      mediaType: context.mediaType,
      genreNames: context.genreNames,
      poster: context.poster,
    })
    if (item === null || seen.has(item.id)) {
      continue
    }
    seen.add(item.id)
    items.push(item)
  }

  return items.slice(0, SIMILAR_PREVIEW_LIMIT).map((item) => ({ item }))
}

export const mapCollectionItems = (
  raw: CollectionDto,
  context: RelatedMappingContext
): RelatedCollection => {
  const name = normalizeDescriptiveText(raw.name)
  const items: CatalogItem[] = []
  const seen = new Set<string>()

  for (const candidate of raw.parts ?? []) {
    if (candidate.adult === true || !hasUsableRelatedTitle(candidate)) {
      continue
    }
    if (candidate.id === context.currentProviderId) {
      continue
    }
    const item = mapListItemToItem(
      candidate,
      {
        mediaType: 'movie',
        genreNames: context.genreNames,
        poster: context.poster,
      }
    )
    if (item === null || seen.has(item.id)) {
      continue
    }
    seen.add(item.id)
    items.push(item)
  }

  return {
    ...(name === undefined ? {} : { name }),
    items: items.slice(0, COLLECTION_PREVIEW_LIMIT).map((item) => ({ item })),
  }
}

const hasUsableRelatedTitle = (candidate: {
  readonly title?: string | null | undefined
  readonly name?: string | null | undefined
  readonly original_title?: string | null | undefined
  readonly original_name?: string | null | undefined
}): boolean =>
  normalizeTitleText(candidate.title) !== undefined ||
  normalizeTitleText(candidate.name) !== undefined ||
  normalizeTitleText(candidate.original_title) !== undefined ||
  normalizeTitleText(candidate.original_name) !== undefined

const mapEpisodeAirDate = (value: string | null | undefined): string | undefined => {
  const parsed = parseDetailDate(value)
  if (parsed) {
    return parsed.date
  }
  const year = extractDetailYear(value)
  return year === undefined ? undefined : String(year)
}

export const mapSeasonEpisodes = (
  raw: SeasonDto,
  context: SeasonMappingContext
): SeasonEpisodes => {
  const seasonNumber =
    typeof raw.season_number === 'number' &&
    Number.isInteger(raw.season_number) &&
    raw.season_number >= MIN_SEASON_NUMBER &&
    raw.season_number <= MAX_SEASON_NUMBER
      ? raw.season_number
      : context.seasonNumber
  const seasonName = normalizeDescriptiveText(raw.name)
  const seasonAirYear = extractDetailYear(raw.air_date)

  const episodes: Episode[] = []
  for (const candidate of raw.episodes ?? []) {
    const number =
      typeof candidate.episode_number === 'number' &&
      Number.isInteger(candidate.episode_number) &&
      candidate.episode_number >= 0 &&
      candidate.episode_number <= MAX_EPISODE_NUMBER
        ? candidate.episode_number
        : undefined
    const name = normalizeDescriptiveText(candidate.name)
    if (number === undefined && name === undefined) {
      continue
    }
    const airDate = mapEpisodeAirDate(candidate.air_date)
    const runtimeMinutes =
      typeof candidate.runtime === 'number' &&
      Number.isInteger(candidate.runtime) &&
      candidate.runtime >= 1 &&
      candidate.runtime <= MAX_PLAUSIBLE_EPISODE_RUNTIME_MINUTES
        ? candidate.runtime
        : undefined
    const overview = normalizeDescriptiveText(candidate.overview)
    const still = context.still?.(candidate.still_path)
    const rating = buildDetailRating(candidate.vote_average, candidate.vote_count)

    episodes.push({
      ...(number === undefined ? {} : { number }),
      ...(name === undefined ? {} : { name }),
      ...(airDate === undefined ? {} : { airDate }),
      ...(runtimeMinutes === undefined ? {} : { runtimeMinutes }),
      ...(overview === undefined ? {} : { overview }),
      ...(still === undefined ? {} : { still }),
      ...(rating === undefined ? {} : { rating }),
    })
  }

  const season: Season = {
    number: seasonNumber,
    ...(seasonName === undefined ? {} : { name: seasonName }),
    ...(seasonAirYear === undefined ? {} : { airYear: seasonAirYear }),
    ...(episodes.length === 0 ? {} : { episodeCount: episodes.length }),
  }

  return { season, episodes }
}
