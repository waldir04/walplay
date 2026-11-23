import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MOVIE_ID, movieItem } from '@/test/fixtures/catalog'
import {
  detailEnvelope,
  emptyCreditsEnvelope,
  seasonEnvelope,
  similarEnvelope,
  collectionEnvelope,
} from '@/test/fixtures/detail'
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
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope())
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
})

const detailEntry = (from?: string) => ({
  pathname: `/browse/movies/title/${MOVIE_ID}`,
  state: { item: movieItem(), ...(from === undefined ? {} : { from }) },
})

describe('TitleDetailPage search origin', () => {
  it('labels the return action for a search origin and keeps the detail address', async () => {
    await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [detailEntry('/search?q=the%20matrix')],
    })

    expect(await screen.findByRole('link', { name: 'Return to search' })).toHaveAttribute(
      'href',
      '/search?q=the%20matrix'
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
  })

  it('keeps the catalog label for catalog origins', async () => {
    await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [detailEntry('/browse/movies/popular')],
    })

    expect(await screen.findByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
      'href',
      '/browse/movies/popular'
    )
  })

  it.each([undefined, '/search', 'https://evil.example/search?q=x'])(
    'falls back to the media landing for a missing or invalid origin (%s)',
    async (from) => {
      await renderWithProviders(<TitleDetailPage />, {
        initialEntries: [detailEntry(from)],
      })

      expect(await screen.findByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
        'href',
        '/browse/movies'
      )
      expect(screen.queryByRole('link', { name: 'Return to search' })).not.toBeInTheDocument()
    }
  )
})
