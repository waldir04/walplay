import { screen } from '@testing-library/react'
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
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'
import { runAxe } from '@/test/axe'

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

const applyDefaults = () => {
  installMatchMediaMock(true)
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope(movieDetail()))
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
}

beforeEach(applyDefaults)

describe('detail accessibility with every surface', () => {
  it('has no violations for a tv page with seasons and episodes', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope(tvDetail()))
    const { container } = renderApp([tvPath])
    await screen.findByRole('heading', { level: 1, name: 'Dark' })
    await screen.findByText('Secrets')
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('has no violations when related titles and credits are present', async () => {
    const { container } = renderApp([moviePath])
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('has no violations for a contained section error', async () => {
    vi.mocked(fetchSimilar).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
    const { container } = renderApp([moviePath])
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    await screen.findAllByText('This section could not be loaded')
    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('matches the document language for the active locale', async () => {
    const { i18n } = await import('@/app/i18n')
    await i18n.changeLanguage('es')
    renderApp([moviePath])
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    expect(document.documentElement.lang).toBe('es')
    await i18n.changeLanguage('en')
  })
})
