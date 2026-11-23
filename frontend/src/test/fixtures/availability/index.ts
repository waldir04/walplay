import type {
  AvailabilityData,
  AvailabilityEnvelope,
  AvailabilityGroup,
  AvailabilityMeta,
  AvailabilityRegionsEnvelope,
  AvailableData,
  NoInformationData,
  UnsupportedRegionData,
} from '@/entities/catalog'

export const availabilityMeta = (overrides: Partial<AvailabilityMeta> = {}): AvailabilityMeta => ({
  stale: false,
  lastUpdatedAt: '2026-11-23T12:00:00.000Z',
  source: 'provider',
  freshness: 'current',
  ...overrides,
})

export const availabilityGroups = (): readonly AvailabilityGroup[] => [
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
  {
    category: 'rent',
    providers: [{ name: 'Google Play Movies' }],
  },
]

export const availabilityDestinationUrl =
  'https://www.themoviedb.org/movie/550-fight-club/watch?locale=CO'

export const availableData = (overrides: Partial<AvailableData> = {}): AvailableData => ({
  state: 'available',
  region: 'CO',
  groups: availabilityGroups(),
  destination: { url: availabilityDestinationUrl },
  ...overrides,
})

export const noInformationData = (
  overrides: Partial<NoInformationData> = {}
): NoInformationData => ({
  state: 'no-information',
  region: 'CO',
  groups: [],
  destination: { url: availabilityDestinationUrl },
  ...overrides,
})

export const unsupportedRegionData = (region = 'FR'): UnsupportedRegionData => ({
  state: 'unsupported-region',
  region,
  groups: [],
})

export const envelopeFor = (
  data: AvailabilityData,
  meta: AvailabilityMeta = availabilityMeta()
): AvailabilityEnvelope => {
  switch (data.state) {
    case 'available':
      return { data, meta }
    case 'no-information':
      return { data, meta }
    case 'unsupported-region':
      return { data }
  }
}

export const availableEnvelope = (
  data: AvailableData = availableData(),
  meta: AvailabilityMeta = availabilityMeta()
): AvailabilityEnvelope => ({ data, meta })

export const noInformationEnvelope = (
  meta: AvailabilityMeta = availabilityMeta()
): AvailabilityEnvelope => ({ data: noInformationData(), meta })

export const unsupportedRegionEnvelope = (region = 'FR'): AvailabilityEnvelope => ({
  data: unsupportedRegionData(region),
})

export const staleCacheEnvelope = (): AvailabilityEnvelope => ({
  data: availableData(),
  meta: availabilityMeta({
    stale: true,
    source: 'stale-cache',
    freshness: 'stale',
    lastUpdatedAt: '2026-11-20T09:30:00.000Z',
  }),
})

export const sourceUpdatedEnvelope = (): AvailabilityEnvelope => ({
  data: availableData(),
  meta: availabilityMeta({ sourceUpdatedAt: '2026-11-23T06:00:00.000Z' }),
})

export const availabilityRegionsEnvelope = (
  regions: readonly string[] = ['CO']
): AvailabilityRegionsEnvelope => ({ data: { regions } })

export const AVAILABILITY_ERROR_CODE = 'CATALOG_UNAVAILABLE'
