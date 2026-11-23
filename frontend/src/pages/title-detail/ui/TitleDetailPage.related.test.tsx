import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import {
  MOVIE_ID,
  TV_ID,
  collectionEnvelope,
  detailEnvelope,
  emptyCreditsEnvelope,
  movieDetail,
  seasonEnvelope,
  similarEnvelope,
  tvDetail,
} from '@/test/fixtures/detail'
import { secondMovieItem, thirdMovieItem } from '@/test/fixtures/catalog'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

vi.mock('@/entities/catalog/api/detailClient', () => ({
  createDetailClient: vi.fn(),
  getDetailClient: vi.fn(),
  fetchDetail: vi.fn(),
  fetchCredits: vi.fn(),
  fetchSimilar: vi.fn(),
  fetchCollection: vi.fn(),
  fetchSeason: vi.fn(),
}))

const { fetchCollection, fetchCredits, fetchDetail, fetchSeason, fetchSimilar } =
  await import('@/entities/catalog/api/detailClient')

const moviePath = `/browse/movies/title/${MOVIE_ID}`
const tvPath = `/browse/tv-shows/title/${TV_ID}`

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope(movieDetail()))
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar)
    .mockReset()
    .mockResolvedValue(similarEnvelope([secondMovieItem()]))
  vi.mocked(fetchCollection)
    .mockReset()
    .mockResolvedValue(collectionEnvelope([thirdMovieItem()]))
})

describe('TitleDetailPage related titles', () => {
  it('renders similar and collection as two separate labelled sections', async () => {
    renderApp([moviePath])
    expect(await screen.findByRole('heading', { level: 2, name: 'Similar titles' })).toBeVisible()
    expect(await screen.findByRole('heading', { level: 2, name: 'Collection' })).toBeVisible()
    expect(screen.getByText('Arrival')).toBeInTheDocument()
    expect(screen.getByText('Moon')).toBeInTheDocument()
  })

  it('renders no related sections when both providers return empty lists', async () => {
    vi.mocked(fetchSimilar).mockResolvedValue(similarEnvelope([]))
    vi.mocked(fetchCollection).mockResolvedValue(collectionEnvelope([]))
    renderApp([moviePath])
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    expect(screen.queryByRole('heading', { name: 'Similar titles' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Collection' })).toBeNull()
  })

  it('shows similar titles only for tv and never requests a collection', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope(tvDetail()))
    renderApp([tvPath])
    await screen.findByRole('heading', { level: 1, name: 'Dark' })
    expect(await screen.findByRole('heading', { name: 'Similar titles' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Collection' })).toBeNull()
    expect(fetchCollection).not.toHaveBeenCalled()
  })

  it('contains a related failure to its own section and retries only it', async () => {
    const error = new CatalogApiError('CATALOG_UNAVAILABLE', 502)
    vi.mocked(fetchSimilar)
      .mockRejectedValueOnce(error)
      .mockResolvedValue(similarEnvelope([secondMovieItem()]))
    renderApp([moviePath])

    expect(await screen.findByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Collection' })).toBeInTheDocument()
    const alerts = await screen.findAllByRole('alert')
    expect(
      alerts.some((alert) => alert.textContent?.includes('This section could not be loaded'))
    ).toBe(true)

    const retry = screen.getAllByRole('button', { name: 'Try again' }).at(-1)
    expect(retry).toBeDefined()
    const detailCalls = vi.mocked(fetchDetail).mock.calls.length
    await userEvent.click(retry as HTMLElement)
    expect(vi.mocked(fetchDetail).mock.calls.length).toBe(detailCalls)
    expect(await screen.findByText('Arrival')).toBeInTheDocument()
  })

  it('does not render a rating on any related card', async () => {
    renderApp([moviePath])
    await screen.findByRole('heading', { name: 'Similar titles' })
    const similarSection = screen
      .getByRole('heading', { name: 'Similar titles' })
      .closest('section')
    expect(similarSection?.textContent).not.toContain('/ 10')
  })
})
