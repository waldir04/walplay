export type CatalogErrorCode =
  | 'VALIDATION_ERROR'
  | 'CATALOG_NOT_FOUND'
  | 'CATALOG_RATE_LIMITED'
  | 'CATALOG_TIMEOUT'
  | 'CATALOG_UNAVAILABLE'
  | 'CATALOG_INVALID_RESPONSE'
  | 'INTERNAL_ERROR'
  | 'ROUTE_NOT_FOUND'

export const CATALOG_ERROR_STATUS: Readonly<Record<CatalogErrorCode, number>> = Object.freeze({
  VALIDATION_ERROR: 400,
  CATALOG_NOT_FOUND: 404,
  CATALOG_RATE_LIMITED: 429,
  CATALOG_TIMEOUT: 504,
  CATALOG_UNAVAILABLE: 502,
  CATALOG_INVALID_RESPONSE: 502,
  INTERNAL_ERROR: 500,
  ROUTE_NOT_FOUND: 404,
})

const DEFAULT_MESSAGES: Readonly<Record<CatalogErrorCode, string>> = Object.freeze({
  VALIDATION_ERROR: 'The request could not be validated.',
  CATALOG_NOT_FOUND: 'The requested catalog item was not found.',
  CATALOG_RATE_LIMITED: 'Catalog data is temporarily rate limited.',
  CATALOG_TIMEOUT: 'Catalog data took too long to load.',
  CATALOG_UNAVAILABLE: 'Catalog data is temporarily unavailable.',
  CATALOG_INVALID_RESPONSE: 'The catalog provider returned an unusable response.',
  INTERNAL_ERROR: 'An unexpected error occurred.',
  ROUTE_NOT_FOUND: 'The requested route does not exist.',
})

export class CatalogError extends Error {
  public readonly code: CatalogErrorCode
  public readonly status: number
  public readonly details: readonly unknown[] | undefined

  public constructor(
    code: CatalogErrorCode,
    message: string = DEFAULT_MESSAGES[code],
    details?: readonly unknown[]
  ) {
    super(message)
    this.name = 'CatalogError'
    this.code = code
    this.status = CATALOG_ERROR_STATUS[code]
    this.details = details
  }
}

export const validationError = (details?: readonly unknown[]): CatalogError =>
  new CatalogError('VALIDATION_ERROR', DEFAULT_MESSAGES.VALIDATION_ERROR, details)

export const notFoundError = (): CatalogError => new CatalogError('CATALOG_NOT_FOUND')

export const isCatalogError = (value: unknown): value is CatalogError =>
  value instanceof CatalogError
