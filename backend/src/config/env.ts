import { z } from 'zod'

export type NodeEnv = 'development' | 'test' | 'production'
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface BackendConfig {
  readonly nodeEnv: NodeEnv
  readonly port: number
  readonly corsAllowedOrigins: readonly string[]
  readonly tmdbAccessToken: string
  readonly tmdbBaseUrl: string
  readonly tmdbTimeoutMs: number
  readonly tmdbMaxRetries: number
  readonly tmdbCacheTtlMs: number
  readonly tmdbCacheStaleMs: number
  readonly tmdbCacheMaxEntries: number
  readonly tmdbImageConfigTtlMs: number
  readonly logLevel: LogLevel
  readonly availabilityEnabled: boolean
  readonly availabilityLogosEnabled: boolean
  readonly availabilitySupportedRegions: readonly string[]
  readonly availabilityCacheTtlMs: number
  readonly availabilityCacheStaleMs: number
  readonly availabilityCacheMaxEntries: number
  readonly availabilityFreshnessWindowMs: number
  readonly availabilityDestinationHosts: readonly string[]
}

export type EnvSource = Readonly<Record<string, string | undefined>>

export class ConfigError extends Error {
  public readonly fields: readonly string[]

  public constructor(fields: readonly string[]) {
    super(`Invalid backend configuration. Check: ${fields.join(', ')}`)
    this.name = 'ConfigError'
    this.fields = fields
  }
}

const DEFAULT_CORS_ORIGIN = 'http://localhost:5173'
const DEFAULT_AVAILABILITY_REGIONS = 'CO'
const DEFAULT_AVAILABILITY_DESTINATION_HOSTS = 'www.themoviedb.org,themoviedb.org'
const AVAILABILITY_REGION_PATTERN = /^[A-Z]{2}$/
const HOSTNAME_PATTERN = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/
const AVAILABILITY_REQUIRED_REGION = 'CO'

const originSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => value !== '*', 'wildcard origins are not allowed')
  .refine((value) => {
    try {
      const url = new URL(value)
      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        url.origin === value &&
        url.pathname === '/'
      )
    } catch {
      return false
    }
  }, 'must be an exact http(s) origin')

const secondsToMilliseconds = (seconds: number): number => seconds * 1000

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  TMDB_ACCESS_TOKEN: z.string().trim().min(1),
  TMDB_BASE_URL: z.url().default('https://api.themoviedb.org/3'),
  TMDB_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(5000),
  TMDB_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  TMDB_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(300),
  TMDB_CACHE_STALE_SECONDS: z.coerce.number().int().min(0).default(86_400),
  TMDB_CACHE_MAX_ENTRIES: z.coerce.number().int().min(1).default(500),
  TMDB_IMAGE_CONFIG_TTL_SECONDS: z.coerce.number().int().min(0).default(86_400),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  AVAILABILITY_ENABLED: z.string().optional(),
  AVAILABILITY_LOGOS_ENABLED: z.string().optional(),
  AVAILABILITY_SUPPORTED_REGIONS: z.string().optional(),
  AVAILABILITY_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(21_600),
  AVAILABILITY_CACHE_STALE_SECONDS: z.coerce.number().int().min(0).default(604_800),
  AVAILABILITY_CACHE_MAX_ENTRIES: z.coerce.number().int().min(1).default(500),
  AVAILABILITY_FRESHNESS_WINDOW_SECONDS: z.coerce.number().int().min(0).default(86_400),
  AVAILABILITY_DESTINATION_HOSTS: z.string().optional(),
})

const parseOrigins = (value: string | undefined, nodeEnv: NodeEnv): readonly string[] => {
  if (value === undefined || value.trim() === '') {
    if (nodeEnv === 'production') {
      throw new ConfigError(['CORS_ALLOWED_ORIGINS'])
    }
    return [DEFAULT_CORS_ORIGIN]
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)

  if (origins.length === 0) {
    throw new ConfigError(['CORS_ALLOWED_ORIGINS'])
  }

  const invalid = origins.filter((origin) => !originSchema.safeParse(origin).success)
  if (invalid.length > 0) {
    throw new ConfigError(['CORS_ALLOWED_ORIGINS'])
  }

  return [...new Set(origins)]
}

const parseBoolean = (value: string | undefined, field: string): boolean => {
  if (value === undefined || value.trim() === '') {
    return false
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') {
    return true
  }
  if (normalized === 'false') {
    return false
  }
  throw new ConfigError([field])
}

const parseSupportedRegions = (value: string | undefined): readonly string[] => {
  const source = value === undefined || value.trim() === '' ? DEFAULT_AVAILABILITY_REGIONS : value
  const regions = [...new Set(source.split(',').map((region) => region.trim().toUpperCase()))]
    .filter((region) => region.length > 0)

  if (regions.length === 0 || regions.some((region) => !AVAILABILITY_REGION_PATTERN.test(region))) {
    throw new ConfigError(['AVAILABILITY_SUPPORTED_REGIONS'])
  }

  if (!regions.includes(AVAILABILITY_REQUIRED_REGION)) {
    throw new ConfigError(['AVAILABILITY_SUPPORTED_REGIONS'])
  }

  return Object.freeze([...regions].sort())
}

const parseDestinationHosts = (value: string | undefined): readonly string[] => {
  const source =
    value === undefined || value.trim() === '' ? DEFAULT_AVAILABILITY_DESTINATION_HOSTS : value
  const hosts = [...new Set(source.split(',').map((host) => host.trim().toLowerCase()))].filter(
    (host) => host.length > 0
  )

  if (hosts.length === 0 || hosts.some((host) => !HOSTNAME_PATTERN.test(host))) {
    throw new ConfigError(['AVAILABILITY_DESTINATION_HOSTS'])
  }

  return Object.freeze([...hosts])
}

export const loadConfig = (source: EnvSource = process.env): BackendConfig => {
  const result = envSchema.safeParse(source)

  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'env')))]
    throw new ConfigError(fields.sort())
  }

  const parsed = result.data
  const corsAllowedOrigins = parseOrigins(parsed.CORS_ALLOWED_ORIGINS, parsed.NODE_ENV)

  const availabilityEnabled = parseBoolean(
    parsed.AVAILABILITY_ENABLED,
    'AVAILABILITY_ENABLED'
  )
  const availabilityLogosEnabled = parseBoolean(
    parsed.AVAILABILITY_LOGOS_ENABLED,
    'AVAILABILITY_LOGOS_ENABLED'
  )
  const availabilitySupportedRegions = parseSupportedRegions(
    parsed.AVAILABILITY_SUPPORTED_REGIONS
  )
  const availabilityDestinationHosts = parseDestinationHosts(
    parsed.AVAILABILITY_DESTINATION_HOSTS
  )
  const availabilityCacheTtlMs = secondsToMilliseconds(parsed.AVAILABILITY_CACHE_TTL_SECONDS)
  const availabilityCacheStaleMs = secondsToMilliseconds(
    parsed.AVAILABILITY_CACHE_STALE_SECONDS
  )
  const availabilityFreshnessWindowMs = secondsToMilliseconds(
    parsed.AVAILABILITY_FRESHNESS_WINDOW_SECONDS
  )

  if (availabilityCacheTtlMs > availabilityCacheStaleMs) {
    throw new ConfigError(['AVAILABILITY_CACHE_TTL_SECONDS', 'AVAILABILITY_CACHE_STALE_SECONDS'])
  }
  if (availabilityFreshnessWindowMs > availabilityCacheStaleMs) {
    throw new ConfigError([
      'AVAILABILITY_FRESHNESS_WINDOW_SECONDS',
      'AVAILABILITY_CACHE_STALE_SECONDS',
    ])
  }

  return Object.freeze({
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    corsAllowedOrigins,
    tmdbAccessToken: parsed.TMDB_ACCESS_TOKEN,
    tmdbBaseUrl: parsed.TMDB_BASE_URL.replace(/\/+$/, ''),
    tmdbTimeoutMs: parsed.TMDB_TIMEOUT_MS,
    tmdbMaxRetries: parsed.TMDB_MAX_RETRIES,
    tmdbCacheTtlMs: secondsToMilliseconds(parsed.TMDB_CACHE_TTL_SECONDS),
    tmdbCacheStaleMs: secondsToMilliseconds(parsed.TMDB_CACHE_STALE_SECONDS),
    tmdbCacheMaxEntries: parsed.TMDB_CACHE_MAX_ENTRIES,
    tmdbImageConfigTtlMs: secondsToMilliseconds(parsed.TMDB_IMAGE_CONFIG_TTL_SECONDS),
    logLevel: parsed.LOG_LEVEL,
    availabilityEnabled,
    availabilityLogosEnabled,
    availabilitySupportedRegions,
    availabilityCacheTtlMs,
    availabilityCacheStaleMs,
    availabilityCacheMaxEntries: parsed.AVAILABILITY_CACHE_MAX_ENTRIES,
    availabilityFreshnessWindowMs,
    availabilityDestinationHosts,
  })
}
