import { z } from 'zod'

export type CatalogErrorCode =
  | 'VALIDATION_ERROR'
  | 'CATALOG_NOT_FOUND'
  | 'DETAIL_SEASON_NOT_FOUND'
  | 'CATALOG_RATE_LIMITED'
  | 'CATALOG_TIMEOUT'
  | 'CATALOG_UNAVAILABLE'
  | 'CATALOG_INVALID_RESPONSE'
  | 'INTERNAL_ERROR'
  | 'ROUTE_NOT_FOUND'

const CATALOG_ERROR_CODES: readonly CatalogErrorCode[] = [
  'VALIDATION_ERROR',
  'CATALOG_NOT_FOUND',
  'DETAIL_SEASON_NOT_FOUND',
  'CATALOG_RATE_LIMITED',
  'CATALOG_TIMEOUT',
  'CATALOG_UNAVAILABLE',
  'CATALOG_INVALID_RESPONSE',
  'INTERNAL_ERROR',
  'ROUTE_NOT_FOUND',
]

export const isCatalogErrorCode = (value: unknown): value is CatalogErrorCode =>
  typeof value === 'string' && (CATALOG_ERROR_CODES as readonly string[]).includes(value)

export class CatalogApiError extends Error {
  readonly code: CatalogErrorCode
  readonly status: number | undefined
  readonly details: readonly unknown[]

  constructor(code: CatalogErrorCode, status?: number, details: readonly unknown[] = []) {
    super('Catalog request failed.')
    this.name = 'CatalogApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string().optional(),
    details: z.array(z.unknown()).optional(),
  }),
})

export const toCatalogApiError = (code: string, status?: number): CatalogApiError =>
  new CatalogApiError(isCatalogErrorCode(code) ? code : 'INTERNAL_ERROR', status)

export interface HttpClient {
  readonly get: <T>(path: string, schema: z.ZodType<T>) => Promise<{ body: T; requestId: string }>
}

export interface HttpClientOptions {
  readonly baseUrl: string
  readonly timeoutMs?: number
  readonly fetchImpl?: typeof fetch
}

const DEFAULT_TIMEOUT_MS = 10_000

const resolveUrl = (baseUrl: string, path: string): string =>
  `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`

export const createHttpClient = ({
  baseUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch.bind(globalThis),
}: HttpClientOptions): HttpClient => {
  const get = async <T>(
    path: string,
    schema: z.ZodType<T>
  ): Promise<{ body: T; requestId: string }> => {
    let response: Response
    try {
      response = await fetchImpl(resolveUrl(baseUrl, path), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError')
      ) {
        throw new CatalogApiError('CATALOG_TIMEOUT')
      }
      throw new CatalogApiError('CATALOG_UNAVAILABLE')
    }

    const requestId = response.headers.get('X-Request-Id') ?? ''

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new CatalogApiError(
        response.ok ? 'CATALOG_INVALID_RESPONSE' : 'CATALOG_UNAVAILABLE',
        response.status
      )
    }

    if (!response.ok) {
      const envelope = errorEnvelopeSchema.safeParse(payload)
      if (!envelope.success) {
        throw new CatalogApiError('CATALOG_UNAVAILABLE', response.status)
      }
      throw toCatalogApiError(envelope.data.error.code, response.status)
    }

    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      throw new CatalogApiError('CATALOG_INVALID_RESPONSE', response.status)
    }

    return { body: parsed.data, requestId }
  }

  return Object.freeze({ get })
}
