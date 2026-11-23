import { describe, expect, it } from 'vitest'

import {
  availabilityEnvelopeSchema,
  availabilityRegionsEnvelopeSchema,
} from '../domain/availability.schemas.js'

const availableExample = {
  data: {
    state: 'available',
    region: 'CO',
    groups: [
      {
        category: 'subscription',
        providers: [
          {
            name: 'HBO Max',
            logo: {
              url: 'https://image.tmdb.org/t/p/w92/example-hbo.png',
              urlLarge: 'https://image.tmdb.org/t/p/w154/example-hbo.png',
            },
          },
          { name: 'Movistar Play' },
        ],
      },
      {
        category: 'rent',
        providers: [{ name: 'Google Play Movies' }],
      },
    ],
    destination: {
      url: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=CO',
    },
  },
  meta: {
    stale: false,
    lastUpdatedAt: '2026-11-23T12:00:00.000Z',
    source: 'provider',
    freshness: 'current',
  },
}

const noInformationExample = {
  data: {
    state: 'no-information',
    region: 'CO',
    groups: [],
    destination: {
      url: 'https://www.themoviedb.org/tv/1399-game-of-thrones/watch?locale=CO',
    },
  },
  meta: {
    stale: false,
    lastUpdatedAt: '2026-11-23T12:05:00.000Z',
    source: 'provider',
    freshness: 'current',
  },
}

const unsupportedExample = {
  data: { state: 'unsupported-region', region: 'FR', groups: [] },
}

const staleExample = {
  data: {
    state: 'available',
    region: 'CO',
    groups: [{ category: 'free', providers: [{ name: 'Example Free Service' }] }],
  },
  meta: {
    stale: true,
    lastUpdatedAt: '2026-11-20T09:30:00.000Z',
    source: 'stale-cache',
    freshness: 'stale',
  },
}

const sourceTimestampExample = {
  data: {
    state: 'available',
    region: 'CO',
    groups: [{ category: 'buy', providers: [{ name: 'Example Store' }] }],
  },
  meta: {
    stale: false,
    lastUpdatedAt: '2026-11-23T12:00:00.000Z',
    source: 'provider',
    freshness: 'current',
    sourceUpdatedAt: '2026-11-23T06:00:00.000Z',
  },
}

describe('availability API contract examples', () => {
  it('accepts every documented success example', () => {
    for (const example of [
      availableExample,
      noInformationExample,
      unsupportedExample,
      staleExample,
      sourceTimestampExample,
    ]) {
      const parsed = availabilityEnvelopeSchema.safeParse(example)
      expect(parsed.success, JSON.stringify(parsed)).toBe(true)
    }
  })

  it('accepts the documented regions example', () => {
    expect(
      availabilityRegionsEnvelopeSchema.safeParse({ data: { regions: ['CO'] } }).success
    ).toBe(true)
  })

  it('rejects documented provider-neutrality violations', () => {
    const cases: unknown[] = [
      {
        ...availableExample,
        data: {
          ...availableExample.data,
          groups: [
            {
              category: 'subscription',
              providers: [{ name: 'HBO Max', provider_id: 1899 }],
            },
          ],
        },
      },
      {
        ...availableExample,
        data: { ...availableExample.data, results: { CO: { flatrate: [] } } },
      },
      {
        ...availableExample,
        data: {
          ...availableExample.data,
          groups: [{ category: 'subscription', providers: [] }],
        },
      },
      { data: unsupportedExample.data, meta: availableExample.meta },
      { ...availableExample, extra: true },
      {
        ...availableExample,
        data: { ...availableExample.data, destination: { url: 'http://example.test/watch' } },
      },
    ]

    for (const value of cases) {
      expect(availabilityEnvelopeSchema.safeParse(value).success).toBe(false)
    }
  })
})
