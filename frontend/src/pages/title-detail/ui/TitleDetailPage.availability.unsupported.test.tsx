import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AVAILABILITY_REGION_STORAGE_KEY } from '@/features/select-availability-region'
import { MOVIE_ID, creditsEnvelope, detailEnvelope, similarEnvelope } from '@/test/fixtures/detail'
import {
  availabilityRegionsEnvelope,
  availableData,
  availableEnvelope,
  unsupportedRegionEnvelope,
} from '@/test/fixtures/availability'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderWithProviders } from '@/test/renderWithProviders'

import { TitleDetailPage } from './TitleDetailPage'

vi.mock('@/entities/catalog/api/detailClient', () => ({
  createDetailClient: vi.fn(),
  getDetailClient: vi.fn(),
  fetchDetail: vi.fn(),
  fetchCredits: vi.fn(),
  fetchSimilar: vi.fn(),
  fetchCollection: vi.fn(),
  fetchSeason: vi.fn(),
}))

vi.mock('@/entities/catalog/api/availabilityClient', () => ({
  createAvailabilityClient: vi.fn(),
  getAvailabilityClient: vi.fn(),
  fetchAvailability: vi.fn(),
  fetchAvailabilityRegions: vi.fn(),
}))

const { fetchCollection, fetchCredits, fetchDetail, fetchSimilar } =
  await import('@/entities/catalog/api/detailClient')
const { fetchAvailability, fetchAvailabilityRegions } =
  await import('@/entities/catalog/api/availabilityClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope())
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(creditsEnvelope())
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchAvailabilityRegions)
    .mockReset()
    .mockResolvedValue(availabilityRegionsEnvelope(['CO']))
  vi.mocked(fetchAvailability)
    .mockReset()
    .mockImplementation(async ({ region }) =>
      region === 'FR'
        ? unsupportedRegionEnvelope('FR')
        : availableEnvelope(
            availableData({
              region,
              groups: [{ category: 'free', providers: [{ name: `${region} provider` }] }],
            })
          )
    )
})

describe('TitleDetailPage unsupported stored region', () => {
  it('shows the unsupported state without falling back and keeps the selector usable', async () => {
    window.localStorage.setItem(
      AVAILABILITY_REGION_STORAGE_KEY,
      JSON.stringify({ version: 1, region: 'FR' })
    )
    const user = userEvent.setup()

    await renderWithProviders(
      <TitleDetailPage
        capabilities={{ trailer: false, availability: true, personalLists: false }}
      />,
      { initialEntries: [`/browse/movies/title/${MOVIE_ID}`] }
    )

    expect(await screen.findByText('Availability in France (FR)')).toBeInTheDocument()
    expect(screen.getByText('Region not supported')).toBeInTheDocument()
    await waitFor(() =>
      expect(fetchAvailability).toHaveBeenCalledWith({
        mediaType: 'movie',
        itemId: MOVIE_ID,
        region: 'FR',
      })
    )
    expect(fetchAvailability).not.toHaveBeenCalledWith(expect.objectContaining({ region: 'CO' }))

    const selector = screen.getByLabelText('Availability region')
    expect(selector).toHaveValue('')
    await user.selectOptions(selector, 'CO')

    expect(await screen.findByText('CO provider')).toBeInTheDocument()
    expect(screen.queryByText('Region not supported')).toBeNull()

    window.localStorage.clear()
  })
})
