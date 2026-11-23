import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import {
  MOVIE_ID,
  TV_ID,
  detailEnvelope,
  staleDetailEnvelope,
  tvDetail,
  emptyCreditsEnvelope,
  seasonEnvelope,
  similarEnvelope,
  collectionEnvelope,
} from '@/test/fixtures/detail'
import { renderWithProviders } from '@/test/renderWithProviders'
import { runAxe } from '@/test/axe'

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
  vi.mocked(fetchDetail).mockReset()
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
})

const renderMovie = () =>
  renderWithProviders(<TitleDetailPage />, {
    initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
  })

const renderTv = () =>
  renderWithProviders(<TitleDetailPage />, {
    initialEntries: [`/browse/tv-shows/title/${TV_ID}`],
  })

describe('TitleDetailPage accessibility', () => {
  it('has no violations when a movie is loaded', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope())
    const { container } = await renderMovie()
    await screen.findByRole('heading', { name: 'Fight Club' })
    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('has no violations when a tv show with seasons is loaded', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope(tvDetail()))
    const { container } = await renderTv()
    await screen.findByRole('heading', { name: 'Dark' })
    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('has no violations while loading', async () => {
    vi.mocked(fetchDetail).mockReturnValue(new Promise(() => undefined))
    const { container } = await renderMovie()
    expect(screen.getByLabelText('Loading title details')).toHaveAttribute('aria-busy', 'true')
    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('has no violations for the not-found state', async () => {
    vi.mocked(fetchDetail).mockRejectedValue(new CatalogApiError('CATALOG_NOT_FOUND', 404))
    const { container } = await renderMovie()
    await screen.findByRole('heading', { level: 1, name: 'Title not found' })
    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('has no violations for the recoverable error state', async () => {
    vi.mocked(fetchDetail).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
    const { container } = await renderMovie()
    await screen.findByRole('alert')
    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('has no violations for the stale state', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(staleDetailEnvelope())
    const { container } = await renderMovie()
    expect(await screen.findByText(/Showing cached details/)).toBeInTheDocument()
    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('matches the document language to the active locale', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope())
    const { container } = await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
      locale: 'es',
    })
    await screen.findByRole('heading', { name: 'Fight Club' })
    expect(document.documentElement.lang).toBe('es')
    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('has no violations for a contained section error', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope())
    vi.mocked(fetchCredits).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
    const { container } = await renderMovie()
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    await screen.findAllByText('This section could not be loaded')
    expect(await runAxe(container)).toHaveNoViolations()
  })
})
