import type { z } from 'zod'

import {
  ProviderHttpError,
  ProviderNetworkError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderValidationError,
} from './tmdb.errors.js'

const BACKOFF_BASE_MS = 200
const BACKOFF_CAP_MS = 2000
const MAX_RETRY_AFTER_SECONDS = 2
const USER_AGENT = 'WalplayCatalog/1.0'

export type QueryValue = string | number | undefined

export interface TmdbClient {
  readonly request: <T>(
    path: string,
    params: Readonly<Record<string, QueryValue>>,
    schema: z.ZodType<T>
  ) => Promise<T>
}

export interface TmdbClientOptions {
  readonly baseUrl: string
  readonly accessToken: string
  readonly timeoutMs: number
  readonly maxRetries: number
  readonly fetchImpl?: typeof fetch
  readonly sleep?: (milliseconds: number) => Promise<void>
  readonly random?: () => number
  readonly signalFactory?: (milliseconds: number) => AbortSignal
}

const defaultSleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const fullJitterDelay = (attempt: number, random: () => number): number => {
  const ceiling = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt)
  return Math.floor(random() * ceiling)
}

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')

const parseRetryAfter = (value: string | null): number | null => {
  if (value === null) {
    return null
  }
  const seconds = Number.parseInt(value, 10)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null
}

const buildUrl = (
  baseUrl: string,
  path: string,
  params: Readonly<Record<string, QueryValue>>
): URL => {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }
  return url
}

export const createTmdbClient = (options: TmdbClientOptions): TmdbClient => {
  const fetchImpl = options.fetchImpl ?? fetch
  const sleep = options.sleep ?? defaultSleep
  const random = options.random ?? Math.random
  const signalFactory =
    options.signalFactory ?? ((milliseconds: number) => AbortSignal.timeout(milliseconds))

  const request = async <T>(
    path: string,
    params: Readonly<Record<string, QueryValue>>,
    schema: z.ZodType<T>
  ): Promise<T> => {
    const url = buildUrl(options.baseUrl, path, params)

    for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
      let response: Response
      try {
        response = await fetchImpl(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${options.accessToken}`,
            Accept: 'application/json',
            'User-Agent': USER_AGENT,
          },
          signal: signalFactory(options.timeoutMs),
        })
      } catch (error) {
        if (isAbortError(error)) {
          throw new ProviderTimeoutError()
        }
        if (attempt < options.maxRetries) {
          await sleep(fullJitterDelay(attempt, random))
          continue
        }
        throw new ProviderNetworkError()
      }

      if (response.status === 429) {
        const retryAfter = parseRetryAfter(response.headers.get('Retry-After'))
        if (
          attempt < options.maxRetries &&
          retryAfter !== null &&
          retryAfter <= MAX_RETRY_AFTER_SECONDS
        ) {
          await sleep(Math.max(fullJitterDelay(attempt, random), retryAfter * 1000))
          continue
        }
        throw new ProviderRateLimitError()
      }

      if (response.status >= 500) {
        if (attempt < options.maxRetries) {
          await sleep(fullJitterDelay(attempt, random))
          continue
        }
        throw new ProviderHttpError(response.status)
      }

      if (!response.ok) {
        throw new ProviderHttpError(response.status)
      }

      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        throw new ProviderValidationError()
      }

      const parsed = schema.safeParse(payload)
      if (!parsed.success) {
        throw new ProviderValidationError()
      }
      return parsed.data
    }

    throw new ProviderNetworkError()
  }

  return Object.freeze({ request })
}
