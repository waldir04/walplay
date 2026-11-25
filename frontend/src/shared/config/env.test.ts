import { afterEach, describe, expect, it, vi } from 'vitest'

import { parseConfig } from './env'

const clearExpectedWarnings = (): void => {
  vi.mocked(console.warn).mockClear()
}

afterEach(() => {
  vi.mocked(console.warn).mockClear()
})

describe('parseConfig', () => {
  it('accepts a valid required environment and version', () => {
    const result = parseConfig({
      VITE_APP_ENV: 'local',
      VITE_APP_VERSION: '1.2.3',
      VITE_API_BASE_URL: 'http://localhost:4000',
    })

    expect(result.status).toBe('valid')
    if (result.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(result.config.environmentName).toBe('local')
    expect(result.config.applicationVersion).toBe('1.2.3')
    expect(result.config.apiBaseUrl).toBe('http://localhost:4000')
    expect(result.warnings).toHaveLength(0)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('fails when the required environment is missing', () => {
    const result = parseConfig({})

    expect(result.status).toBe('invalid-required')
    expect(result.warnings.join(' ')).toContain('VITE_APP_ENV')
    expect(console.warn).toHaveBeenCalledTimes(1)
    clearExpectedWarnings()
  })

  it('fails when the required environment is outside the enum', () => {
    const result = parseConfig({ VITE_APP_ENV: 'invalid-value-xyz' })

    expect(result.status).toBe('invalid-required')
    expect(result.warnings.join(' ')).toContain('VITE_APP_ENV')
    expect(result.warnings.join(' ')).not.toContain('invalid-value-xyz')
    clearExpectedWarnings()
  })

  it('applies the local API default when the URL is absent outside production', () => {
    const result = parseConfig({ VITE_APP_ENV: 'local', VITE_APP_VERSION: '1.0.0' })

    expect(result.status).toBe('valid')
    if (result.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(result.config.apiBaseUrl).toBe('http://localhost:4000')
    expect(result.warnings.join(' ')).toContain('VITE_API_BASE_URL')
    clearExpectedWarnings()
  })

  it('requires the API URL in production', () => {
    const result = parseConfig({ VITE_APP_ENV: 'production', VITE_APP_VERSION: '1.0.0' })

    expect(result.status).toBe('invalid-required')
    expect(result.warnings.join(' ')).toContain('VITE_API_BASE_URL')
    expect(console.warn).toHaveBeenCalled()
    clearExpectedWarnings()
  })

  it('rejects an invalid API URL without leaking it', () => {
    const result = parseConfig({
      VITE_APP_ENV: 'local',
      VITE_APP_VERSION: '1.0.0',
      VITE_API_BASE_URL: 'not-a-url',
    })

    expect(result.status).toBe('invalid-required')
    expect(result.warnings.join(' ')).toContain('VITE_API_BASE_URL')
    expect(result.warnings.join(' ')).not.toContain('not-a-url')
    clearExpectedWarnings()
  })

  it('applies the default version when the optional value is absent', () => {
    const result = parseConfig({
      VITE_APP_ENV: 'production',
      VITE_API_BASE_URL: 'https://api.walplay.example',
    })

    expect(result.status).toBe('valid')
    if (result.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(result.config.applicationVersion).toBe('0.0.0')
    expect(result.warnings.join(' ')).toContain('VITE_APP_VERSION')
    expect(console.warn).toHaveBeenCalledTimes(1)
    clearExpectedWarnings()
  })

  it('applies the default version for an empty optional value with a field-only warning', () => {
    const result = parseConfig({
      VITE_APP_ENV: 'staging',
      VITE_APP_VERSION: '',
      VITE_API_BASE_URL: 'http://localhost:4000',
    })

    expect(result.status).toBe('valid')
    if (result.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(result.config.applicationVersion).toBe('0.0.0')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('VITE_APP_VERSION')
    clearExpectedWarnings()
  })

  it('applies the default version for an invalid optional value without leaking it', () => {
    const result = parseConfig({
      VITE_APP_ENV: 'development',
      VITE_APP_VERSION: 'not-a-version',
      VITE_API_BASE_URL: 'http://localhost:4000',
    })

    expect(result.status).toBe('valid')
    if (result.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(result.config.applicationVersion).toBe('0.0.0')
    expect(result.warnings.join(' ')).toContain('VITE_APP_VERSION')
    expect(result.warnings.join(' ')).not.toContain('not-a-version')
    clearExpectedWarnings()
  })

  it('freezes the parsed configuration and warnings', () => {
    const result = parseConfig({
      VITE_APP_ENV: 'local',
      VITE_APP_VERSION: '0.1.0',
      VITE_API_BASE_URL: 'http://localhost:4000',
    })

    if (result.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(Object.isFrozen(result.config)).toBe(true)
    expect(Object.isFrozen(result.warnings)).toBe(true)
  })
})

describe('application config access', () => {
  it('exposes the validated configuration and API base URL', async () => {
    vi.stubEnv('VITE_APP_ENV', 'local')
    vi.stubEnv('VITE_APP_VERSION', '1.0.0')
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:4000')

    // The module caches the parsed configuration. Import a fresh instance so the
    // assertion cannot depend on a cache populated by an earlier test in this file.
    vi.resetModules()
    const { getApiBaseUrl: readApiBaseUrl, getAppConfig: readAppConfig } = await import('./env')

    expect(readAppConfig()).toMatchObject({
      environmentName: 'local',
      applicationVersion: '1.0.0',
    })
    expect(readApiBaseUrl()).toBe('http://localhost:4000')
    vi.unstubAllEnvs()
    clearExpectedWarnings()
  })
})

describe('availability capability flag', () => {
  const base = {
    VITE_APP_ENV: 'local',
    VITE_APP_VERSION: '1.0.0',
    VITE_API_BASE_URL: 'http://localhost:4000',
  }

  it('defaults availability to disabled when the flag is absent', () => {
    const result = parseConfig(base)

    expect(result.status).toBe('valid')
    if (result.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(result.config.availabilityEnabled).toBe(false)
    clearExpectedWarnings()
  })

  it('enables availability only for a true value', () => {
    const enabled = parseConfig({ ...base, VITE_AVAILABILITY_ENABLED: 'true' })
    const disabled = parseConfig({ ...base, VITE_AVAILABILITY_ENABLED: 'false' })

    if (enabled.status !== 'valid' || disabled.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(enabled.config.availabilityEnabled).toBe(true)
    expect(disabled.config.availabilityEnabled).toBe(false)
    clearExpectedWarnings()
  })

  it('fails closed with a value-free warning for invalid input', () => {
    const result = parseConfig({ ...base, VITE_AVAILABILITY_ENABLED: 'enabled-maybe' })

    expect(result.status).toBe('valid')
    if (result.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(result.config.availabilityEnabled).toBe(false)
    expect(result.warnings.join(' ')).toContain('VITE_AVAILABILITY_ENABLED')
    expect(result.warnings.join(' ')).not.toContain('enabled-maybe')
    clearExpectedWarnings()
  })
})

describe('trailers capability flag', () => {
  const base = {
    VITE_APP_ENV: 'local',
    VITE_APP_VERSION: '1.0.0',
    VITE_API_BASE_URL: 'http://localhost:4000',
  }

  it('defaults trailers to disabled when the flag is absent', () => {
    const result = parseConfig(base)

    if (result.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(result.config.trailersEnabled).toBe(false)
    clearExpectedWarnings()
  })

  it('enables trailers only for a true value', () => {
    const enabled = parseConfig({ ...base, VITE_TRAILERS_ENABLED: ' true ' })
    const disabled = parseConfig({ ...base, VITE_TRAILERS_ENABLED: 'false' })

    if (enabled.status !== 'valid' || disabled.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(enabled.config.trailersEnabled).toBe(true)
    expect(disabled.config.trailersEnabled).toBe(false)
    clearExpectedWarnings()
  })

  it('warns without leaking the value and stays disabled for invalid input', () => {
    const result = parseConfig({ ...base, VITE_TRAILERS_ENABLED: 'sometimes' })

    if (result.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(result.config.trailersEnabled).toBe(false)
    expect(result.warnings.join(' ')).toContain('VITE_TRAILERS_ENABLED')
    expect(result.warnings.join(' ')).not.toContain('sometimes')
    clearExpectedWarnings()
  })
})
