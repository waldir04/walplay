import { describe, expect, it } from 'vitest'

import { watchProvidersDto } from './tmdb.availability.schemas.js'

const provider = (overrides: Record<string, unknown> = {}) => ({
  logo_path: '/logo.png',
  provider_id: 1899,
  provider_name: 'HBO Max',
  display_priority: 2,
  ...overrides,
})

describe('tmdb watch providers dto', () => {
  it('accepts a complete multi-region response', () => {
    const parsed = watchProvidersDto.safeParse({
      id: 550,
      results: {
        CO: {
          link: 'https://www.themoviedb.org/movie/550/watch?locale=CO',
          flatrate: [provider()],
          rent: [provider({ provider_id: 3, provider_name: 'Google Play Movies' })],
        },
        US: { buy: [provider({ provider_id: 2 })] },
      },
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.results?.CO?.flatrate?.[0]?.provider_name).toBe('HBO Max')
    }
  })

  it('accepts null and absent nullable fields', () => {
    const parsed = watchProvidersDto.safeParse({
      id: 1399,
      results: {
        CO: {
          link: null,
          flatrate: [provider({ logo_path: null, provider_name: null, display_priority: null })],
          free: null,
        },
        FR: null,
      },
    })

    expect(parsed.success).toBe(true)
  })

  it('accepts a response without results', () => {
    expect(watchProvidersDto.safeParse({ id: 550 }).success).toBe(true)
    expect(watchProvidersDto.safeParse({ id: 550, results: null }).success).toBe(true)
  })

  it('ignores unknown fields in the payload and in provider records', () => {
    const parsed = watchProvidersDto.safeParse({
      id: 550,
      extra: 'ignored',
      results: {
        CO: {
          link: 'https://www.themoviedb.org/movie/550/watch?locale=CO',
          flatrate: [{ ...provider(), unknown: true }],
          unexpected: 'ignored',
        },
      },
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects a payload without the required top-level id', () => {
    expect(watchProvidersDto.safeParse({ results: {} }).success).toBe(false)
    expect(watchProvidersDto.safeParse({ id: 'not-a-number' }).success).toBe(false)
  })

  it('rejects a provider record without a numeric provider id', () => {
    const parsed = watchProvidersDto.safeParse({
      id: 550,
      results: { CO: { flatrate: [{ provider_name: 'HBO Max' }] } },
    })

    expect(parsed.success).toBe(false)
  })
})
