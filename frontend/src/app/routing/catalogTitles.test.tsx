import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/app/i18n'
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

const { fetchCapabilities, fetchSectionPage, fetchItem } =
  await import('@/entities/catalog/api/catalogClient')
const { fetchCollection, fetchCredits, fetchDetail, fetchSeason, fetchSimilar } =
  await import('@/entities/catalog/api/detailClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchCapabilities)
    .mockReset()
    .mockResolvedValue({ data: { sections: CAPABILITIES } })
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockResolvedValue(pageEnvelope({ items: [movieItem()], section: 'popular', hasMore: true }))
  vi.mocked(fetchItem)
    .mockReset()
    .mockResolvedValue({
      data: movieItem(),
      meta: {
        language: 'en-US',
        stale: false,
        lastUpdatedAt: '2026-11-22T15:00:00.000Z',
        source: 'provider',
      },
    })
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope())
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
})

describe('catalog document titles', () => {
  it('resolves the landing title', async () => {
    renderApp(['/browse/movies'])
    await screen.findByRole('heading', { name: 'Browse Movies' })
    await waitFor(() => expect(document.title).toBe('Browse · Walplay'))
  })

  it('resolves the category title', async () => {
    renderApp(['/browse/movies/popular'])
    await screen.findByRole('heading', { name: 'Popular · Movies' })
    await waitFor(() => expect(document.title).toBe('Category · Walplay'))
  })

  it('resolves the detail title', async () => {
    renderApp([`/browse/movies/title/${MOVIE_ID}`])
    await screen.findByRole('heading', { name: 'Fight Club' })
    await waitFor(() => expect(document.title).toBe('Fight Club · Movies'))
  })

  it('resolves the catalog not-found title', async () => {
    renderApp(['/browse/unknown'])
    await screen.findByRole('heading', { name: 'Title not found' })
    await waitFor(() => expect(document.title).toBe('Catalog not found · Walplay'))
  })

  it('uses the Spanish titles after a language change', async () => {
    renderApp(['/browse/movies'])
    await screen.findByRole('heading', { name: 'Browse Movies' })

    await act(async () => {
      await i18n.changeLanguage('es')
    })
    await waitFor(() => expect(document.title).toBe('Explorar · Walplay'))
  })
})
