import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

const { fetchCollection, fetchCredits, fetchDetail, fetchSeason, fetchSimilar } =
  await import('@/entities/catalog/api/detailClient')

const moviePath = `/browse/movies/title/${MOVIE_ID}`
const tvPath = `/browse/tv-shows/title/${TV_ID}`

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope(movieDetail()))
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
})

describe('TitleDetailPage responsive contracts', () => {
  it('keeps the identity before artwork in the reading order', async () => {
    const { container } = await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [moviePath],
    })
    const heading = await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    const poster = container.querySelector('img[src*="fight-club.jpg"]')
    expect(poster).not.toBeNull()
    expect(
      heading.compareDocumentPosition(poster as Node) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('stacks on narrow widths and places artwork beside the facts on desktop', async () => {
    const { container } = await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [moviePath],
    })
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    const header = container.querySelector('header')
    expect(header?.querySelector('div')?.className).toContain('flex-col')
    expect(header?.querySelector('div')?.className).toContain('md:flex-row')
    expect(container.querySelector('.aspect-\\[2\\/3\\]')).not.toBeNull()
  })

  it('keeps a very large season list reachable without clipping', async () => {
    const seasons = Array.from({ length: 40 }, (_, index) => ({
      number: index + 1,
      name: `Season ${index + 1}`,
      episodeCount: 10,
    }))
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope(tvDetail({ seasons })))
    const { container } = await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [tvPath],
    })
    await screen.findByRole('heading', { level: 1, name: 'Dark' })
    expect(screen.getAllByRole('button', { name: /^Season \d+$/ })).toHaveLength(40)
    const seasonList = screen.getByRole('list', { name: 'Select season' })
    expect(seasonList.className).toContain('flex-wrap')
    expect(seasonList.className).not.toContain('overflow-hidden')
    void container
  })

  it('keeps a very large episode list present in provider order', async () => {
    const largeEpisodes = Array.from({ length: 60 }, (_, index) => ({
      number: index + 1,
      name: `Episode ${index + 1}`,
    }))
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope(tvDetail()))
    vi.mocked(fetchSeason).mockResolvedValue({
      data: {
        season: { number: 1, name: 'Season 1', episodeCount: 60 },
        episodes: largeEpisodes,
      },
      meta: detailEnvelope().meta,
    })
    const { container } = await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [tvPath],
    })
    await screen.findByRole('heading', { level: 1, name: 'Dark' })
    await screen.findByText('Episode 60')
    expect(container.querySelectorAll('ol > li')).toHaveLength(60)
  })

  it('does not introduce horizontal scrolling in the test viewport', async () => {
    renderApp([moviePath])
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth
    )
  })

  it.each([320, 360, 768, 1024, 1440])(
    'keeps the structural contract at %ipx and at 200 %% zoom',
    async (width) => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: width,
      })
      const { container } = await renderWithProviders(<TitleDetailPage />, {
        initialEntries: [moviePath],
      })
      await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
      expect(container.querySelectorAll('h1')).toHaveLength(1)
      expect(container.querySelector('header div.flex-col')).not.toBeNull()
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth
      )

      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: Math.max(320, Math.round(width / 2)),
      })
      expect(container.querySelector('.overflow-hidden')).not.toBeNull()
      expect(container.querySelectorAll('h1')).toHaveLength(1)
    }
  )
})
