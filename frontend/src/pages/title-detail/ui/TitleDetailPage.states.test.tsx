import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import {
  MOVIE_ID,
  detailEnvelope,
  staleDetailEnvelope,
  emptyCreditsEnvelope,
  seasonEnvelope,
  similarEnvelope,
  collectionEnvelope,
} from '@/test/fixtures/detail'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'
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

const { fetchCredits, fetchDetail, fetchSeason, fetchSimilar, fetchCollection } =
  await import('@/entities/catalog/api/detailClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchDetail).mockReset()
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
})

const renderAt = (path = `/browse/movies/title/${MOVIE_ID}`) =>
  renderWithProviders(<TitleDetailPage />, { initialEntries: [path] })

describe('TitleDetailPage states', () => {
  it('labels stale cached data with a localized last-update time', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(staleDetailEnvelope())
    await renderAt()

    expect(await screen.findByText(/Showing cached details/)).toBeInTheDocument()
    expect(screen.getByText(/Cached data from/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
  })

  it('does not label fresh provider data as stale', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope())
    await renderAt()
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    expect(screen.queryByText(/Showing cached details/)).toBeNull()
  })

  it.each([
    ['adult or removed', 'CATALOG_NOT_FOUND'],
    ['unusable identity', 'CATALOG_NOT_FOUND'],
  ] as const)('maps %s titles to the not-found state', async (_label, code) => {
    vi.mocked(fetchDetail).mockRejectedValue(new CatalogApiError(code, 404))
    await renderAt()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Title not found' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  })

  it('keeps error and not-found semantics distinct', async () => {
    vi.mocked(fetchDetail).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
    const { unmount } = await renderAt()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Title details are unavailable')
    expect(alert).toHaveTextContent('This title could not be loaded right now.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    unmount()

    vi.mocked(fetchDetail).mockRejectedValue(new CatalogApiError('CATALOG_NOT_FOUND', 404))
    await renderAt()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Title not found' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps primary navigation in the stale state', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(staleDetailEnvelope())
    renderApp([`/browse/movies/title/${MOVIE_ID}`])
    await screen.findByText(/Showing cached details/)
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
  })

  it('keeps primary navigation in the not-found state', async () => {
    vi.mocked(fetchDetail).mockRejectedValue(new CatalogApiError('CATALOG_NOT_FOUND', 404))
    renderApp([`/browse/movies/title/${MOVIE_ID}`])
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Title not found' })).toBeInTheDocument()
    )
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
  })
})
