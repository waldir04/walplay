import { describe, expect, it } from 'vitest'

import {
  availabilityDataSchema,
  availabilityEnvelopeSchema,
  availabilityMetaSchema,
  availabilityRegionsEnvelopeSchema,
} from './availability'

const availableData = {
  state: 'available',
  region: 'CO',
  groups: [
    {
      category: 'subscription',
      providers: [
        {
          name: 'HBO Max',
          logo: {
            url: 'https://image.example.test/w92/hbo.png',
            urlLarge: 'https://image.example.test/w154/hbo.png',
          },
        },
        { name: 'Movistar Play' },
      ],
    },
    { category: 'rent', providers: [{ name: 'Google Play Movies' }] },
  ],
  destination: { url: 'https://www.themoviedb.org/movie/550/watch?locale=CO' },
}

const meta = {
  stale: false,
  lastUpdatedAt: '2026-11-23T12:00:00.000Z',
  source: 'provider',
  freshness: 'current',
}

describe('availability API model', () => {
  it('accepts the available, no-information, and unsupported-region shapes', () => {
    expect(availabilityDataSchema.safeParse(availableData).success).toBe(true)
    expect(
      availabilityDataSchema.safeParse({
        state: 'no-information',
        region: 'CO',
        groups: [],
        destination: { url: 'https://www.themoviedb.org/tv/1399/watch?locale=CO' },
      }).success
    ).toBe(true)
    expect(
      availabilityDataSchema.safeParse({ state: 'unsupported-region', region: 'FR', groups: [] })
        .success
    ).toBe(true)
  })

  it('rejects inconsistent state and group combinations', () => {
    expect(
      availabilityDataSchema.safeParse({ state: 'available', region: 'CO', groups: [] }).success
    ).toBe(false)
    expect(
      availabilityDataSchema.safeParse({
        state: 'no-information',
        region: 'CO',
        groups: availableData.groups,
      }).success
    ).toBe(false)
    expect(
      availabilityDataSchema.safeParse({
        state: 'unsupported-region',
        region: 'FR',
        groups: availableData.groups,
      }).success
    ).toBe(false)
    expect(
      availabilityDataSchema.safeParse({
        state: 'available',
        region: 'CO',
        groups: [{ category: 'subscription', providers: [] }],
      }).success
    ).toBe(false)
  })

  it('rejects invalid categories', () => {
    for (const category of ['streaming', 'Subscriptions', 'ad-supported']) {
      expect(
        availabilityDataSchema.safeParse({
          state: 'available',
          region: 'CO',
          groups: [{ category, providers: [{ name: 'Example' }] }],
        }).success
      ).toBe(false)
    }
  })

  it('rejects invalid region codes', () => {
    for (const region of ['co', 'C0', 'COL', '']) {
      expect(
        availabilityDataSchema.safeParse({
          state: 'unsupported-region',
          region,
          groups: [],
        }).success
      ).toBe(false)
    }
  })

  it('requires https for logo and destination URLs', () => {
    const withHttpLogo = {
      ...availableData,
      groups: [
        {
          category: 'subscription',
          providers: [{ name: 'HBO Max', logo: { url: 'http://image.example.test/hbo.png' } }],
        },
      ],
    }
    const withHttpDestination = {
      ...availableData,
      destination: { url: 'http://www.themoviedb.org/movie/550/watch' },
    }

    expect(availabilityDataSchema.safeParse(withHttpLogo).success).toBe(false)
    expect(availabilityDataSchema.safeParse(withHttpDestination).success).toBe(false)
  })

  it('rejects provider entries without a usable name', () => {
    expect(
      availabilityDataSchema.safeParse({
        ...availableData,
        groups: [{ category: 'free', providers: [{ name: '   ' }] }],
      }).success
    ).toBe(false)
  })

  it('requires meta for available and no-information results', () => {
    expect(availabilityEnvelopeSchema.safeParse({ data: availableData }).success).toBe(false)
    expect(
      availabilityEnvelopeSchema.safeParse({
        data: {
          state: 'no-information',
          region: 'CO',
          groups: [],
        },
      }).success
    ).toBe(false)
  })

  it('forbids meta on unsupported-region results', () => {
    expect(
      availabilityEnvelopeSchema.safeParse({
        data: { state: 'unsupported-region', region: 'FR', groups: [] },
        ...meta,
      }).success
    ).toBe(false)
    expect(
      availabilityEnvelopeSchema.safeParse({
        data: { state: 'unsupported-region', region: 'FR', groups: [] },
      }).success
    ).toBe(true)
  })

  it('accepts every documented meta source and freshness combination', () => {
    for (const source of ['provider', 'cache', 'stale-cache']) {
      for (const freshness of ['current', 'stale']) {
        expect(
          availabilityMetaSchema.safeParse({
            ...meta,
            source,
            freshness,
            stale: freshness === 'stale',
          }).success
        ).toBe(true)
      }
    }
  })

  it('rejects invalid timestamps in meta', () => {
    expect(availabilityMetaSchema.safeParse({ ...meta, lastUpdatedAt: 'not-a-date' }).success).toBe(
      false
    )
    expect(
      availabilityMetaSchema.safeParse({
        ...meta,
        sourceUpdatedAt: '2026-13-45T99:00:00.000Z',
      }).success
    ).toBe(false)
  })

  it('treats unknown envelope, data, meta, group, and provider fields as contract failures', () => {
    const cases = [
      { data: availableData, meta, extra: true },
      { data: { ...availableData, provider_id: 1899 }, meta },
      { data: availableData, meta: { ...meta, region: 'CO' } },
      {
        data: {
          ...availableData,
          groups: [{ category: 'free', providers: [{ name: 'Example', provider_id: 1 }] }],
        },
        meta,
      },
    ]

    for (const value of cases) {
      expect(availabilityEnvelopeSchema.safeParse(value).success).toBe(false)
    }
  })

  it('validates the regions list', () => {
    expect(availabilityRegionsEnvelopeSchema.safeParse({ data: { regions: ['CO'] } }).success).toBe(
      true
    )
    expect(availabilityRegionsEnvelopeSchema.safeParse({ data: { regions: [] } }).success).toBe(
      false
    )
    expect(availabilityRegionsEnvelopeSchema.safeParse({ data: { regions: ['co'] } }).success).toBe(
      false
    )
    expect(
      availabilityRegionsEnvelopeSchema.safeParse({ data: { regions: ['CO'] }, meta }).success
    ).toBe(false)
  })
})
