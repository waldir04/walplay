import { describe, expect, it, vi } from 'vitest'

import type { AvailabilityProviderLogo } from '../../domain/availability.js'
import type { WatchProviderRegionDto } from './tmdb.availability.schemas.js'
import { mapTmdbRegionAvailability, validateDestination } from './tmdb.availability.mapper.js'

const provider = (
  providerId: number,
  providerName: string | null,
  displayPriority: number | null = null,
  logoPath: string | null = null
) => ({
  provider_id: providerId,
  provider_name: providerName,
  display_priority: displayPriority,
  logo_path: logoPath,
})

const logoResolver = vi.fn<(path: string | null | undefined) => AvailabilityProviderLogo | undefined>(
  (path) => (path ? { url: `https://image.example.test/w92${path}` } : undefined)
)

const map = (
  entry: WatchProviderRegionDto,
  options: { logosEnabled?: boolean; hosts?: readonly string[] } = {}
) =>
  mapTmdbRegionAvailability({
    entry,
    region: 'CO',
    logosEnabled: options.logosEnabled ?? false,
    resolveLogo: logoResolver,
    allowedDestinationHosts: options.hosts ?? ['www.themoviedb.org', 'themoviedb.org'],
  })

describe('tmdb availability mapper', () => {
  it('maps source categories in the fixed category order', () => {
    const result = map({
      buy: [provider(3, 'Example Store')],
      rent: [provider(2, 'Example Rental')],
      ads: [provider(4, 'Example Ads')],
      free: [provider(5, 'Example Free')],
      flatrate: [provider(1, 'Example Subscription')],
    })

    expect(result.groups.map((group) => group.category)).toEqual([
      'subscription',
      'free',
      'ads',
      'rent',
      'buy',
    ])
    expect(result.groups.flatMap((group) => group.providers.map((item) => item.name))).toEqual([
      'Example Subscription',
      'Example Free',
      'Example Ads',
      'Example Rental',
      'Example Store',
    ])
  })

  it('omits empty and unknown categories', () => {
    const result = map({ flatrate: [], free: null, rent: undefined })

    expect(result.groups).toEqual([])
  })

  it('trims names and drops placeholder or missing names', () => {
    const result = map({
      flatrate: [
        provider(1, '  HBO Max  '),
        provider(2, '   '),
        provider(3, 'n/a'),
        provider(4, 'NULL'),
        provider(5, 'tbd'),
        provider(6, null),
      ],
    })

    expect(result.groups[0]?.providers).toEqual([{ name: 'HBO Max' }])
  })

  it('deduplicates by source provider id inside a category keeping the first record', () => {
    const result = map({
      flatrate: [
        provider(1, 'First usable', 10),
        provider(1, 'Later duplicate', 1),
        provider(2, 'Second provider', 5),
      ],
    })

    expect(result.groups[0]?.providers.map((item) => item.name)).toEqual([
      'Second provider',
      'First usable',
    ])
  })

  it('orders providers by display priority with a sentinel and stable ties', () => {
    const result = map({
      flatrate: [
        provider(1, 'No priority A', null),
        provider(2, 'Priority 5', 5),
        provider(3, 'Priority 1', 1),
        provider(4, 'Priority 5 tie', 5),
        provider(5, 'No priority B', null),
      ],
    })

    expect(result.groups[0]?.providers.map((item) => item.name)).toEqual([
      'Priority 1',
      'Priority 5',
      'Priority 5 tie',
      'No priority A',
      'No priority B',
    ])
  })

  it('resolves logos only when logo display is enabled', () => {
    logoResolver.mockClear()
    const withoutLogos = map({
      flatrate: [provider(1, 'HBO Max', 1, '/hbo.png')],
    })

    expect(withoutLogos.groups[0]?.providers[0]?.logo).toBeUndefined()
    expect(logoResolver).not.toHaveBeenCalled()

    const withLogos = map(
      { flatrate: [provider(1, 'HBO Max', 1, '/hbo.png')] },
      { logosEnabled: true }
    )

    expect(withLogos.groups[0]?.providers[0]?.logo).toEqual({
      url: 'https://image.example.test/w92/hbo.png',
    })
  })

  it('keeps the provider name when a logo cannot be resolved', () => {
    const result = map(
      { flatrate: [provider(1, 'HBO Max', 1, null)] },
      { logosEnabled: true }
    )

    expect(result.groups[0]?.providers[0]).toEqual({ name: 'HBO Max' })
  })

  it('keeps a provider that appears in multiple categories in each category', () => {
    const result = map({
      flatrate: [provider(1, 'HBO Max')],
      buy: [provider(1, 'HBO Max')],
    })

    expect(result.groups.map((group) => group.category)).toEqual(['subscription', 'buy'])
  })

  it('retains only a valid aggregate destination', () => {
    const result = map({
      link: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=CO',
      flatrate: [provider(1, 'HBO Max')],
    })

    expect(result.destination).toEqual({
      url: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=CO',
    })
  })

  it('never serializes source field names or provider ids', () => {
    const result = map({
      link: 'https://www.themoviedb.org/movie/550/watch?locale=CO',
      flatrate: [provider(1899, 'HBO Max', 1, '/hbo.png')],
    })
    const serialized = JSON.stringify(result)

    for (const forbidden of [
      'provider_id',
      'provider_name',
      'logo_path',
      'display_priority',
      'flatrate',
      'results',
      'link',
      '1899',
    ]) {
      expect(serialized).not.toContain(forbidden)
    }
  })
})

describe('destination validation', () => {
  const hosts = ['www.themoviedb.org', 'themoviedb.org']

  it('accepts an https source URL on an allowed host', () => {
    expect(
      validateDestination('https://www.themoviedb.org/movie/550/watch?locale=CO', 'CO', hosts)
    ).toEqual({ url: 'https://www.themoviedb.org/movie/550/watch?locale=CO' })
  })

  it('accepts an absent or mismatched language subtag when the region matches', () => {
    expect(
      validateDestination('https://www.themoviedb.org/movie/550/watch?locale=es-CO', 'CO', hosts)
    ).toBeDefined()
    expect(
      validateDestination('https://www.themoviedb.org/movie/550/watch', 'CO', hosts)
    ).toBeDefined()
  })

  it('rejects non-https, unlisted hosts, credentials, and mismatched locales', () => {
    const invalid = [
      'http://www.themoviedb.org/movie/550/watch?locale=CO',
      'https://evil.example.test/movie/550/watch?locale=CO',
      'https://user:pass@www.themoviedb.org/movie/550/watch?locale=CO',
      'https://www.themoviedb.org/movie/550/watch?locale=US',
      'https://www.themoviedb.org/movie/550/watch?locale=',
      'not-a-url',
    ]

    for (const value of invalid) {
      expect(validateDestination(value, 'CO', hosts)).toBeUndefined()
    }
  })

  it('rejects empty and non-string links', () => {
    expect(validateDestination(null, 'CO', hosts)).toBeUndefined()
    expect(validateDestination(undefined, 'CO', hosts)).toBeUndefined()
    expect(validateDestination('   ', 'CO', hosts)).toBeUndefined()
  })
})
