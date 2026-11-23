import { screen, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CAPABILITIES, MOVIE_ID, movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import {
  detailEnvelope,
  emptyCreditsEnvelope,
  seasonEnvelope,
  similarEnvelope,
  collectionEnvelope,
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

const { fetchCapabilities, fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')
const { fetchCredits, fetchDetail, fetchSeason, fetchSimilar, fetchCollection } =
  await import('@/entities/catalog/api/detailClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchCapabilities)
    .mockReset()
    .mockResolvedValue({ data: { sections: CAPABILITIES } })
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockResolvedValue(pageEnvelope({ items: [movieItem()] }))
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope())
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
})

describe('TitleDetailPage from a card', () => {
  it('opens from a card, always runs the core query, and keeps the origin return', async () => {
    const { router } = renderApp(['/browse/movies'])
    await screen.findAllByText('Fight Club')

    await act(async () => {
      await router.navigate(`/browse/movies/title/${MOVIE_ID}`, {
        state: { item: movieItem(), from: '/browse/movies/popular' },
      })
    })

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
    )
    expect(fetchDetail).toHaveBeenCalledWith({
      mediaType: 'movie',
      itemId: MOVIE_ID,
      language: 'en',
    })
    expect(screen.getByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
      'href',
      '/browse/movies/popular'
    )
  })

  it('ignores router state whose id or type disagrees with the address', async () => {
    const { router } = renderApp(['/browse/movies'])
    await screen.findAllByText('Fight Club')

    await act(async () => {
      await router.navigate(`/browse/movies/title/${MOVIE_ID}`, {
        state: { item: movieItem({ id: 'd2wxOm1vdmllOjY4MA' }) },
      })
    })

    await waitFor(() => expect(fetchDetail).toHaveBeenCalled())
    expect(await screen.findByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
  })

  it('falls back to the landing for an invalid return origin', async () => {
    const { router } = renderApp(['/browse/movies'])
    await screen.findAllByText('Fight Club')

    await act(async () => {
      await router.navigate(`/browse/movies/title/${MOVIE_ID}`, {
        state: { item: movieItem(), from: 'https://evil.example' },
      })
    })

    expect(await screen.findByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
      'href',
      '/browse/movies'
    )
  })
})
