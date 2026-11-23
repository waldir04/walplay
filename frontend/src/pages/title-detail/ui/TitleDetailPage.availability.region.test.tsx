import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/app/i18n'
import { AVAILABILITY_REGION_STORAGE_KEY } from '@/features/select-availability-region'
import {
  MOVIE_ID,
  collectionEnvelope,
  creditsEnvelope,
  detailEnvelope,
  seasonEnvelope,
  similarEnvelope,
} from '@/test/fixtures/detail'
import {
  availabilityRegionsEnvelope,
  availableData,
  availableEnvelope,
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

const { fetchCollection, fetchCredits, fetchDetail, fetchSeason, fetchSimilar } =
  await import('@/entities/catalog/api/detailClient')
const { fetchAvailability, fetchAvailabilityRegions } =
  await import('@/entities/catalog/api/availabilityClient')

const providerFor = (region: string) => `${region} provider`

const envelopeFor = (region: string) =>
  availableEnvelope(
    availableData({
      region,
      groups: [{ category: 'free', providers: [{ name: providerFor(region) }] }],
    })
  )

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope())
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(creditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
  vi.mocked(fetchAvailabilityRegions)
    .mockReset()
    .mockResolvedValue(availabilityRegionsEnvelope(['CO', 'US']))
  vi.mocked(fetchAvailability)
    .mockReset()
    .mockImplementation(async ({ region }) => envelopeFor(region))
})

afterEach(() => {
  window.localStorage.clear()
})

const renderPage = () =>
  renderWithProviders(<TitleDetailPage capabilities={{ trailer: false, availability: true }} />, {
    initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
  })

describe('TitleDetailPage availability region', () => {
  it('uses the region stored on the device', async () => {
    window.localStorage.setItem(
      AVAILABILITY_REGION_STORAGE_KEY,
      JSON.stringify({ version: 1, region: 'US' })
    )
    await renderPage()

    expect(await screen.findByText('Availability in United States (US)')).toBeInTheDocument()
    await waitFor(() =>
      expect(fetchAvailability).toHaveBeenCalledWith({
        mediaType: 'movie',
        itemId: MOVIE_ID,
        region: 'US',
      })
    )
  })

  it('changes the query and replaces previous-region offers', async () => {
    const user = userEvent.setup()
    await renderPage()
    await screen.findByText('US provider')

    await user.selectOptions(screen.getByLabelText('Availability region'), 'CO')

    expect(await screen.findByText('CO provider')).toBeInTheDocument()
    expect(screen.queryByText('US provider')).toBeNull()
    await waitFor(() =>
      expect(fetchAvailability).toHaveBeenCalledWith({
        mediaType: 'movie',
        itemId: MOVIE_ID,
        region: 'CO',
      })
    )
  })

  it('keeps the region and data and does not refetch on a language change', async () => {
    await renderPage()
    await screen.findByText('CO provider')
    const callsBefore = vi.mocked(fetchAvailability).mock.calls.length

    await act(async () => {
      await i18n.changeLanguage('es')
    })
    await waitFor(() =>
      expect(screen.getByText('Disponibilidad en Colombia (CO)')).toBeInTheDocument()
    )
    expect(screen.getByText('CO provider')).toBeVisible()
    expect(vi.mocked(fetchAvailability).mock.calls.length).toBe(callsBefore)

    await act(async () => {
      await i18n.changeLanguage('en')
    })
  })
})
