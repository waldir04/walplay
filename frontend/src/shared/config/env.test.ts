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
    const result = parseConfig({ VITE_APP_ENV: 'local', VITE_APP_VERSION: '1.2.3' })

    expect(result.status).toBe('valid')
    if (result.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(result.config.environmentName).toBe('local')
    expect(result.config.applicationVersion).toBe('1.2.3')
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

  it('applies the default version when the optional value is absent', () => {
    const result = parseConfig({ VITE_APP_ENV: 'production' })

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
    const result = parseConfig({ VITE_APP_ENV: 'staging', VITE_APP_VERSION: '' })

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
    const result = parseConfig({ VITE_APP_ENV: 'development', VITE_APP_VERSION: 'not-a-version' })

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
    const result = parseConfig({ VITE_APP_ENV: 'local', VITE_APP_VERSION: '0.1.0' })

    if (result.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(Object.isFrozen(result.config)).toBe(true)
    expect(Object.isFrozen(result.warnings)).toBe(true)
  })
})
