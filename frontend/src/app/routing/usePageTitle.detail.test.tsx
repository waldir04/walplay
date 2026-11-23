import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MOVIE_ID,
  detailEnvelope,
  emptyCreditsEnvelope,
  seasonEnvelope,
  similarEnvelope,
  collectionEnvelope,
} from '@/test/fixtures/detail'
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

const { fetchCredits, fetchDetail, fetchSeason, fetchSimilar, fetchCollection } =
  await import('@/entities/catalog/api/detailClient')
const { i18n } = await import('@/app/i18n')

beforeEach(() => {
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope())
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
})

describe('detail document title override', () => {
  it('uses the localized title and media type once the identity resolves', async () => {
    renderApp([`/browse/movies/title/${MOVIE_ID}`])
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    await waitFor(() => expect(document.title).toBe('Fight Club · Movies'))
  })

  it('localizes the media type on a language change', async () => {
    renderApp([`/browse/movies/title/${MOVIE_ID}`])
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    await i18n.changeLanguage('es')
    await waitFor(() => expect(document.title).toBe('Fight Club · Películas'))
    await i18n.changeLanguage('en')
  })

  it('restores the route title when the detail page unmounts', async () => {
    const { router } = renderApp([`/browse/movies/title/${MOVIE_ID}`])
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    await waitFor(() => expect(document.title).toBe('Fight Club · Movies'))

    await act(async () => {
      await router.navigate('/settings')
    })
    await waitFor(() => expect(document.title).toBe('Settings · Walplay'))
  })
})
