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

describe('availability configuration', () => {
  it('applies documented availability defaults', () => {
    const config = loadConfig(baseEnv)

    expect(config.availabilityEnabled).toBe(false)
    expect(config.availabilityLogosEnabled).toBe(false)
    expect(config.availabilitySupportedRegions).toEqual(['CO'])
    expect(config.availabilityCacheTtlMs).toBe(21_600_000)
    expect(config.availabilityCacheStaleMs).toBe(604_800_000)
    expect(config.availabilityCacheMaxEntries).toBe(500)
    expect(config.availabilityFreshnessWindowMs).toBe(86_400_000)
    expect(config.availabilityDestinationHosts).toEqual([
      'www.themoviedb.org',
      'themoviedb.org',
    ])
  })

  it('parses boolean availability flags case-insensitively', () => {
    const config = loadConfig({
      ...baseEnv,
      AVAILABILITY_ENABLED: ' TRUE ',
      AVAILABILITY_LOGOS_ENABLED: 'False',
    })

    expect(config.availabilityEnabled).toBe(true)
    expect(config.availabilityLogosEnabled).toBe(false)
  })

  it('rejects an invalid boolean flag by field name only', () => {
    try {
      loadConfig({ ...baseEnv, AVAILABILITY_ENABLED: 'yes-please' })
      expect.fail('expected a configuration error')
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError)
      expect((error as ConfigError).fields).toEqual(['AVAILABILITY_ENABLED'])
      expect((error as ConfigError).message).not.toContain('yes-please')
      expect((error as ConfigError).message).not.toContain('test-token')
    }
  })

  it('normalizes, deduplicates, and sorts the supported regions', () => {
    const config = loadConfig({ ...baseEnv, AVAILABILITY_SUPPORTED_REGIONS: ' us, co ,US ' })

    expect(config.availabilitySupportedRegions).toEqual(['CO', 'US'])
  })

  it('requires CO and valid region codes', () => {
    for (const value of ['US,MX', 'CO,USA', 'C0']) {
      try {
        loadConfig({ ...baseEnv, AVAILABILITY_SUPPORTED_REGIONS: value })
        expect.fail('expected a configuration error')
      } catch (error) {
        expect((error as ConfigError).fields).toEqual(['AVAILABILITY_SUPPORTED_REGIONS'])
        expect((error as ConfigError).message).not.toContain(value)
      }
    }
  })

  it('enforces cache and freshness ordering', () => {
    try {
      loadConfig({ ...baseEnv, AVAILABILITY_CACHE_TTL_SECONDS: '700000' })
      expect.fail('expected a configuration error')
    } catch (error) {
      expect((error as ConfigError).fields).toContain('AVAILABILITY_CACHE_TTL_SECONDS')
    }

    try {
      loadConfig({ ...baseEnv, AVAILABILITY_FRESHNESS_WINDOW_SECONDS: '700000' })
      expect.fail('expected a configuration error')
    } catch (error) {
      expect((error as ConfigError).fields).toContain('AVAILABILITY_FRESHNESS_WINDOW_SECONDS')
    }
  })

  it('validates and normalizes destination hosts', () => {
    const config = loadConfig({
      ...baseEnv,
      AVAILABILITY_DESTINATION_HOSTS: ' WWW.TheMovieDB.org ,themoviedb.org, www.themoviedb.org ',
    })

    expect(config.availabilityDestinationHosts).toEqual([
      'www.themoviedb.org',
      'themoviedb.org',
    ])

    for (const value of [
      'https://www.themoviedb.org',
      'www.themoviedb.org/path',
      ' , , ',
    ]) {
      try {
        loadConfig({ ...baseEnv, AVAILABILITY_DESTINATION_HOSTS: value })
        expect.fail('expected a configuration error')
      } catch (error) {
        expect((error as ConfigError).fields).toEqual(['AVAILABILITY_DESTINATION_HOSTS'])
      }
    }
  })
})
