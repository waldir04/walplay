import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/test/catalogTestUtils'
import { MOVIE_ID } from '@/test/fixtures/catalog'
import { availabilityRegionsEnvelope, availableEnvelope } from '@/test/fixtures/availability'

import { catalogKeys } from './catalogKeys'
import {
  AVAILABILITY_GC_TIME_MS,
  AVAILABILITY_REGIONS_GC_TIME_MS,
  AVAILABILITY_REGIONS_STALE_TIME_MS,
  AVAILABILITY_STALE_TIME_MS,
  useAvailabilityQuery,
  useAvailabilityRegionsQuery,
} from './availabilityQueries'

vi.mock('./availabilityClient', () => ({
  fetchAvailability: vi.fn(),
  fetchAvailabilityRegions: vi.fn(),
}))

const { fetchAvailability, fetchAvailabilityRegions } = await import('./availabilityClient')

const createWrapper = () => {
  const client = createTestQueryClient()
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  }
}

beforeEach(() => {
  vi.mocked(fetchAvailability).mockReset()
  vi.mocked(fetchAvailabilityRegions).mockReset()
})

describe('availability queries', () => {
  it('loads availability under a region-aware, language-independent key', async () => {
    vi.mocked(fetchAvailability).mockResolvedValue(availableEnvelope())
    const { wrapper, client } = createWrapper()
    const { result } = renderHook(() => useAvailabilityQuery('movie', MOVIE_ID, 'CO'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchAvailability).toHaveBeenCalledWith({
      mediaType: 'movie',
      itemId: MOVIE_ID,
      region: 'CO',
    })
    expect(catalogKeys.availability('movie', MOVIE_ID, 'CO')).not.toContain('en')
    expect(client.getQueryData(catalogKeys.availability('movie', MOVIE_ID, 'CO'))).toBeDefined()
  })

  it('keeps separate caches per region', async () => {
    vi.mocked(fetchAvailability).mockResolvedValue(availableEnvelope())
    const { wrapper, client } = createWrapper()

    const first = renderHook(() => useAvailabilityQuery('movie', MOVIE_ID, 'CO'), { wrapper })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    const second = renderHook(() => useAvailabilityQuery('movie', MOVIE_ID, 'US'), {
      wrapper,
    })
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))

    expect(fetchAvailability).toHaveBeenCalledTimes(2)
    expect(client.getQueryData(catalogKeys.availability('movie', MOVIE_ID, 'CO'))).toBeDefined()
    expect(client.getQueryData(catalogKeys.availability('movie', MOVIE_ID, 'US'))).toBeDefined()
  })

  it('does not request availability when disabled', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(
      () => useAvailabilityQuery('movie', MOVIE_ID, 'CO', { enabled: false }),
      { wrapper }
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchAvailability).not.toHaveBeenCalled()
  })

  it('loads the region list once and caches it for at least its stale time', async () => {
    vi.mocked(fetchAvailabilityRegions).mockResolvedValue(availabilityRegionsEnvelope())
    const { wrapper, client } = createWrapper()
    const { result } = renderHook(() => useAvailabilityRegionsQuery(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchAvailabilityRegions).toHaveBeenCalledTimes(1)
    expect(client.getQueryData(catalogKeys.availabilityRegions())).toBeDefined()
    expect(AVAILABILITY_REGIONS_GC_TIME_MS).toBeGreaterThanOrEqual(
      AVAILABILITY_REGIONS_STALE_TIME_MS
    )
    expect(AVAILABILITY_GC_TIME_MS).toBeGreaterThanOrEqual(AVAILABILITY_STALE_TIME_MS)
  })

  it('does not request the region list when disabled', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useAvailabilityRegionsQuery({ enabled: false }), {
      wrapper,
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchAvailabilityRegions).not.toHaveBeenCalled()
  })

  it('never retries automatically', async () => {
    vi.mocked(fetchAvailabilityRegions).mockRejectedValue(new Error('failure'))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useAvailabilityRegionsQuery(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(fetchAvailabilityRegions).toHaveBeenCalledTimes(1)
  })
})
