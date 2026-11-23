import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    .mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular', hasMore: true, totalPages: 2 })
    )
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

describe('catalog keyboard journey', () => {
  it('reaches the media switch, See all, cards, and Load more in logical order', async () => {
    const user = userEvent.setup()
    renderApp(['/browse/movies'])
    await screen.findByText('Fight Club')

    const reached: string[] = []
    for (let index = 0; index < 40; index += 1) {
      await user.tab()
      const active = document.activeElement
      if (active instanceof HTMLAnchorElement || active instanceof HTMLButtonElement) {
        reached.push((active.textContent ?? '').trim())
      }
      if (reached.some((label) => label.includes('Load more'))) {
        break
      }
    }

    expect(reached).toContain('Movies')
    expect(reached).toContain('TV Shows')
    expect(reached.some((label) => label.includes('See all Popular'))).toBe(true)
    expect(reached.some((label) => label.includes('Fight Club'))).toBe(true)
    expect(reached.some((label) => label.includes('Load more'))).toBe(false)
  })

  it('activates a card by keyboard and moves to a unique detail address', async () => {
    const user = userEvent.setup()
    const { router } = renderApp(['/browse/movies'])
    await screen.findByText('Fight Club')

    const card = screen.getAllByRole('link', { name: /Fight Club/ })[0] as HTMLElement
    card.focus()
    expect(card).toHaveFocus()
    await user.keyboard('{Enter}')

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/browse/movies/title/${MOVIE_ID}`)
    )
    expect(await screen.findByRole('heading', { name: 'Fight Club' })).toBeInTheDocument()
  })

  it('keeps the focus indicator contract on catalog controls', async () => {
    renderApp(['/browse/movies'])
    await screen.findByText('Fight Club')
    const main = screen.getByRole('main')
    for (const link of main.querySelectorAll('a')) {
      expect(link.className).toContain('focus-visible:outline-2')
    }
  })
})
