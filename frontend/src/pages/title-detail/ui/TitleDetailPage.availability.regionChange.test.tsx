import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNavigate } from 'react-router'

import {
  MOVIE_ID,
  collectionEnvelope,
  creditsEnvelope,
  detailEnvelope,
  seasonEnvelope,
  similarEnvelope,
} from '@/test/fixtures/detail'
import { movieDetail } from '@/test/fixtures/detail'
import { SECOND_MOVIE_ID } from '@/test/fixtures/catalog'
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

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

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

const renderPage = () =>
  renderWithProviders(<TitleDetailPage capabilities={{ trailer: false, availability: true }} />, {
    initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
  })

const ensureRegion = async (user: ReturnType<typeof userEvent.setup>, region: 'CO' | 'US') => {
  const select = await screen.findByLabelText('Availability region')
  if ((select as HTMLSelectElement).value !== region) {
    await user.selectOptions(select, region)
  }
}

describe('TitleDetailPage availability region change', () => {
  it('announces a region change exactly once', async () => {
    const user = userEvent.setup()
    await renderPage()
    await ensureRegion(user, 'CO')
    await screen.findByText('CO provider')

    await user.selectOptions(screen.getByLabelText('Availability region'), 'US')

    const announcements = await screen.findAllByText(
      'Availability region changed to United States (US)'
    )
    expect(announcements).toHaveLength(1)
    expect(announcements[0]).toHaveClass('sr-only')
  })

  it('never lets an older pending region response replace the newest region', async () => {
    const user = userEvent.setup()
    const pendingUS = deferred<Awaited<ReturnType<typeof fetchAvailability>>>()
    vi.mocked(fetchAvailability).mockImplementation(async ({ region }) =>
      region === 'US' ? pendingUS.promise : envelopeFor(region)
    )
    await renderPage()
    await ensureRegion(user, 'CO')
    await screen.findByText('CO provider')

    await user.selectOptions(screen.getByLabelText('Availability region'), 'US')
    await user.selectOptions(screen.getByLabelText('Availability region'), 'CO')

    pendingUS.resolve(envelopeFor('US'))
    await waitFor(() => expect(screen.getByText('CO provider')).toBeInTheDocument())
    expect(screen.queryByText('US provider')).toBeNull()
  })

  it('never lets a superseded title response replace the newest title', async () => {
    const user = userEvent.setup()
    const pendingB = deferred<Awaited<ReturnType<typeof fetchAvailability>>>()
    vi.mocked(fetchDetail).mockImplementation(async ({ itemId }) =>
      detailEnvelope(
        itemId === SECOND_MOVIE_ID
          ? movieDetail({ id: SECOND_MOVIE_ID, title: 'Arrival' })
          : movieDetail()
      )
    )
    vi.mocked(fetchAvailability).mockImplementation(async ({ itemId, region }) =>
      itemId === SECOND_MOVIE_ID ? pendingB.promise : envelopeFor(region)
    )

    const Harness = () => {
      const navigate = useNavigate()
      return (
        <div>
          <button type="button" onClick={() => navigate(`/browse/movies/title/${MOVIE_ID}`)}>
            to A
          </button>
          <button type="button" onClick={() => navigate(`/browse/movies/title/${SECOND_MOVIE_ID}`)}>
            to B
          </button>
          <TitleDetailPage capabilities={{ trailer: false, availability: true }} />
        </div>
      )
    }

    await renderWithProviders(<Harness />, {
      initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
    })
    await ensureRegion(user, 'CO')
    await screen.findByText('CO provider')

    await user.click(screen.getByRole('button', { name: 'to B' }))
    await waitFor(() =>
      expect(fetchDetail).toHaveBeenCalledWith(expect.objectContaining({ itemId: SECOND_MOVIE_ID }))
    )
    await screen.findByRole('heading', { level: 1, name: 'Arrival' })
    await user.click(screen.getByRole('button', { name: 'to A' }))

    await screen.findByText('CO provider')
    pendingB.resolve(envelopeFor('CO'))
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
    )
    expect(screen.queryByText('Arrival')).toBeNull()
  })

  it('keeps the section state when returning from the external destination', async () => {
    const user = userEvent.setup()
    await renderPage()
    await ensureRegion(user, 'CO')
    await screen.findByText('CO provider')

    const destination = screen.getByRole('link', { name: /View availability details/ })
    expect(destination).toHaveAttribute('target', '_blank')
    expect(destination).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
    expect(screen.getByText('Availability in Colombia (CO)')).toBeInTheDocument()
    expect(screen.getByText('CO provider')).toBeInTheDocument()
  })
})
