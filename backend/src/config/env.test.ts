import { describe, expect, it } from 'vitest'

import { ConfigError, loadConfig } from '../config/env.js'

const baseEnv = { TMDB_ACCESS_TOKEN: 'test-token' }

describe('loadConfig', () => {
  it('applies documented defaults in development', () => {
    const config = loadConfig(baseEnv)

    expect(config.nodeEnv).toBe('development')
    expect(config.port).toBe(4000)
    expect(config.corsAllowedOrigins).toEqual(['http://localhost:5173'])
    expect(config.tmdbBaseUrl).toBe('https://api.themoviedb.org/3')
    expect(config.tmdbTimeoutMs).toBe(5000)
    expect(config.tmdbMaxRetries).toBe(2)
    expect(config.tmdbCacheTtlMs).toBe(300_000)
    expect(config.tmdbCacheStaleMs).toBe(86_400_000)
    expect(config.tmdbCacheMaxEntries).toBe(500)
    expect(config.logLevel).toBe('info')
    expect(Object.isFrozen(config)).toBe(true)
  })

  it('requires the provider token and reports only the field name', () => {
    try {
      loadConfig({})
      expect.fail('expected a configuration error')
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError)
      const configError = error as ConfigError
      expect(configError.fields).toContain('TMDB_ACCESS_TOKEN')
      expect(configError.message).not.toContain('test-token')
    }
  })

  it('requires CORS origins in production', () => {
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production' })).toThrow(ConfigError)
    try {
      loadConfig({ ...baseEnv, NODE_ENV: 'production' })
    } catch (error) {
      expect((error as ConfigError).fields).toEqual(['CORS_ALLOWED_ORIGINS'])
    }
  })

  it('accepts a comma-separated exact origin allowlist', () => {
    const config = loadConfig({
      ...baseEnv,
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: 'https://walplay.example, https://admin.walplay.example',
    })

    expect(config.corsAllowedOrigins).toEqual([
      'https://walplay.example',
      'https://admin.walplay.example',
    ])
  })

  it('rejects wildcard, path-bearing, and malformed origins without leaking values', () => {
    for (const origin of ['*', 'https://walplay.example/path', 'not-a-url']) {
      try {
        loadConfig({ ...baseEnv, CORS_ALLOWED_ORIGINS: origin })
        expect.fail('expected a configuration error')
      } catch (error) {
        expect((error as ConfigError).fields).toEqual(['CORS_ALLOWED_ORIGINS'])
        expect((error as ConfigError).message).not.toContain(origin)
      }
    }
  })

  it('rejects invalid numeric values', () => {
    expect(() => loadConfig({ ...baseEnv, PORT: '0' })).toThrow(ConfigError)
    expect(() => loadConfig({ ...baseEnv, TMDB_TIMEOUT_MS: 'abc' })).toThrow(ConfigError)
    expect(() => loadConfig({ ...baseEnv, LOG_LEVEL: 'verbose' })).toThrow(ConfigError)
  })

  it('never includes the secret in error messages', () => {
    try {
      loadConfig({ TMDB_ACCESS_TOKEN: '', NODE_ENV: 'production' })
    } catch (error) {
      expect((error as Error).message).not.toContain('secret')
    }
  })
})
