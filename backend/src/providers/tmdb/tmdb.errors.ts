export class ProviderTimeoutError extends Error {
  public constructor() {
    super('Provider request timed out.')
    this.name = 'ProviderTimeoutError'
  }
}

export class ProviderNetworkError extends Error {
  public constructor() {
    super('Provider network request failed.')
    this.name = 'ProviderNetworkError'
  }
}

export class ProviderRateLimitError extends Error {
  public constructor() {
    super('Provider rate limit reached.')
    this.name = 'ProviderRateLimitError'
  }
}

export class ProviderHttpError extends Error {
  public readonly status: number

  public constructor(status: number) {
    super(`Provider responded with status ${status}.`)
    this.name = 'ProviderHttpError'
    this.status = status
  }
}

export class ProviderValidationError extends Error {
  public constructor() {
    super('Provider response validation failed.')
    this.name = 'ProviderValidationError'
  }
}
