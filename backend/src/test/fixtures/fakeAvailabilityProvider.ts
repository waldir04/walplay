import { vi } from 'vitest'

import type { AvailabilityGroup } from '../../domain/availability.js'
import type {
  AvailabilityProvider,
  AvailabilityProviderRequest,
  ProviderAvailability,
} from '../../providers/availability-provider.js'
import { AvailabilityService } from '../../services/availability.service.js'
import { CatalogCache } from '../../services/catalog-cache.js'

export const sampleAvailabilityGroups = (): readonly AvailabilityGroup[] => [
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

export const sampleDestination = {
  url: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=CO',
}

export const sampleProviderAvailability = (): ProviderAvailability => ({
  groups: sampleAvailabilityGroups(),
  destination: sampleDestination,
})

export const emptyProviderAvailability = (): ProviderAvailability => ({
  groups: [],
  destination: sampleDestination,
})

export const staleProviderAvailability = (): ProviderAvailability => ({
  groups: sampleAvailabilityGroups(),
  destination: sampleDestination,
  sourceUpdatedAt: '2026-11-01T00:00:00.000Z',
})

export type FakeAvailabilityResult =
  | ProviderAvailability
  | null
  | Error
  | ((input: AvailabilityProviderRequest) => Promise<ProviderAvailability | null>)

export interface FakeAvailabilityProvider extends AvailabilityProvider {
  readonly fetchAvailability: ReturnType<typeof vi.fn<AvailabilityProvider['fetchAvailability']>>
  readonly calls: AvailabilityProviderRequest[]
}

export const createFakeAvailabilityProvider = (
  result: FakeAvailabilityResult = sampleProviderAvailability()
): FakeAvailabilityProvider => {
  const calls: AvailabilityProviderRequest[] = []
  const fetchAvailability = vi.fn<AvailabilityProvider['fetchAvailability']>(
    async (input) => {
      calls.push(input)
      if (typeof result === 'function') {
        return result(input)
      }
      if (result instanceof Error) {
        throw result
      }
      return result
    }
  )

  return Object.freeze({
    id: 'tmdb' as const,
    fetchAvailability,
    calls,
  })
}

export const createTestAvailabilityService = (
  provider: AvailabilityProvider = createFakeAvailabilityProvider(),
  options: {
    readonly now?: () => number
    readonly regions?: readonly string[]
    readonly freshnessWindowMs?: number
    readonly retentionMs?: number
  } = {}
): AvailabilityService =>
  new AvailabilityService({
    provider,
    cache: new CatalogCache({
      freshTtlMs: 1000,
      staleTtlMs: 10_000,
      maxEntries: 20,
      ...(options.now === undefined ? {} : { now: options.now }),
    }),
    supportedRegions: options.regions ?? ['CO'],
    freshnessWindowMs: options.freshnessWindowMs ?? 86_400_000,
    retentionMs: options.retentionMs ?? 604_800_000,
    ...(options.now === undefined ? {} : { now: options.now }),
  })
