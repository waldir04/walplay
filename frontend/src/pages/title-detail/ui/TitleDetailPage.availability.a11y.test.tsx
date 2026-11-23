import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { MOVIE_ID, creditsEnvelope, detailEnvelope, similarEnvelope } from '@/test/fixtures/detail'
import {
  availabilityRegionsEnvelope,
  availableEnvelope,
  noInformationEnvelope,
  staleCacheEnvelope,
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
    .mockResolvedValue(availabilityRegionsEnvelope(['CO', 'US']))
  vi.mocked(fetchAvailability).mockReset().mockResolvedValue(availableEnvelope())
})

const renderPage = () =>
  renderWithProviders(<TitleDetailPage capabilities={{ trailer: false, availability: true }} />, {
    initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
  })

describe('TitleDetailPage availability announcements', () => {
  it('produces exactly one region-change announcement', async () => {
    const user = userEvent.setup()
    await renderPage()
    await screen.findByText('HBO Max')

    await user.selectOptions(screen.getByLabelText('Availability region'), 'US')

    const announcements = await screen.findAllByText(
      'Availability region changed to United States (US)'
    )
    expect(announcements).toHaveLength(1)
  })

  it('does not announce a region change on initial load', async () => {
    await renderPage()
    await screen.findByText('HBO Max')

    expect(screen.queryByText(/Availability region changed to/)).toBeNull()
  })

  it.each([['no-information', noInformationEnvelope(), 'Availability information not found']])(
    'does not duplicate the %s state announcement',
    async (_label, envelope, copy) => {
      vi.mocked(fetchAvailability).mockResolvedValue(envelope)
      await renderPage()

      expect(await screen.findByText(copy)).toBeInTheDocument()
      expect(screen.getAllByText(copy)).toHaveLength(1)
      expect(screen.queryByText(/Availability region changed to/)).toBeNull()
    }
  )

  it('does not duplicate the stale state announcement', async () => {
    vi.mocked(fetchAvailability).mockResolvedValue(staleCacheEnvelope())
    await renderPage()

    expect(await screen.findByText('Last known availability')).toBeInTheDocument()
    expect(screen.getAllByText('Last known availability')).toHaveLength(1)
    expect(screen.queryByText(/Availability region changed to/)).toBeNull()
  })

  it('does not duplicate the error announcement', async () => {
    vi.mocked(fetchAvailability).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
    await renderPage()

    expect(await screen.findAllByRole('alert')).toHaveLength(1)
    expect(screen.queryByText(/Availability region changed to/)).toBeNull()
  })
})
