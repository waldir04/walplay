import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { CAPABILITIES, MOVIE_ID, movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import {
  collectionEnvelope,
  detailEnvelope,
  emptyCreditsEnvelope,
  seasonEnvelope,
  similarEnvelope,
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

const { fetchCapabilities, fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')
const { fetchCollection, fetchCredits, fetchDetail, fetchSeason, fetchSimilar } =
  await import('@/entities/catalog/api/detailClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchCapabilities)
    .mockReset()
    .mockResolvedValue({ data: { sections: CAPABILITIES } })
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockResolvedValue(pageEnvelope({ items: [movieItem()], section: 'popular', hasMore: false }))
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope())
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
})

describe('catalog accessibility across surfaces', () => {
  it('landing has no critical or serious violations', async () => {
    const { container } = renderApp(['/browse/movies'])
    await screen.findAllByText('Fight Club')
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('category has no critical or serious violations', async () => {
    const { container } = renderApp(['/browse/movies/popular'])
    await screen.findAllByText('Fight Club')
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('detail error state has no critical or serious violations', async () => {
    vi.mocked(fetchDetail).mockRejectedValue(new CatalogApiError('CATALOG_NOT_FOUND', 404))
    const { container } = renderApp([`/browse/movies/title/${MOVIE_ID}`])
    await screen.findByRole('heading', { level: 1, name: 'Title not found' })
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })
})
