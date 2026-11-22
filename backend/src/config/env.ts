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

export const loadConfig = (source: EnvSource = process.env): BackendConfig => {
  const result = envSchema.safeParse(source)

  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'env')))]
    throw new ConfigError(fields.sort())
  }

  const parsed = result.data
  const corsAllowedOrigins = parseOrigins(parsed.CORS_ALLOWED_ORIGINS, parsed.NODE_ENV)

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
  })
}
