import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import {
  MOVIE_ID,
  TV_ID,
  collectionEnvelope,
  creditsEnvelope,
  detailEnvelope,
  emptyCreditsEnvelope,
  movieDetail,
  seasonEnvelope,
  similarEnvelope,
  tvDetail,
} from '@/test/fixtures/detail'
import { pageEnvelope, secondMovieItem } from '@/test/fixtures/catalog'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'
import { renderWithProviders } from '@/test/renderWithProviders'

import { TitleDetailPage } from './TitleDetailPage'

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

const moviePath = `/browse/movies/title/${MOVIE_ID}`
const tvPath = `/browse/tv-shows/title/${TV_ID}`
const longOverview = 'A long provider overview sentence. '.repeat(60)

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchCapabilities)
    .mockReset()
    .mockResolvedValue({ data: { sections: [] } })
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockResolvedValue(pageEnvelope({ items: [] }))
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope(movieDetail()))
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar)
    .mockReset()
    .mockResolvedValue(similarEnvelope([secondMovieItem()]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
})

describe('TitleDetailPage keyboard and announcements', () => {
  it('exposes exactly one h1 and every interactive control in the page', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope(tvDetail({ overview: longOverview })))
    vi.mocked(fetchCredits).mockResolvedValue(creditsEnvelope())
    renderWithProviders(<TitleDetailPage />, { initialEntries: [tvPath] })

    await screen.findByRole('heading', { level: 1, name: 'Dark' })
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Return to the catalog' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Season 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Season 2' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Arrival/ })).toBeInTheDocument()

    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    )
    const labels = interactive.map(
      (element) => element.getAttribute('aria-label') ?? element.textContent?.trim() ?? ''
    )
    const returnIndex = labels.findIndex((label) => label.includes('Return to the catalog'))
    const expandIndex = labels.findIndex((label) => label === 'Show more')
    const seasonIndex = labels.findIndex((label) => label === 'Season 1')
    const relatedIndex = labels.findIndex((label) => label.startsWith('Arrival'))
    expect(returnIndex).toBeGreaterThanOrEqual(0)
    expect(returnIndex).toBeLessThan(expandIndex)
    expect(expandIndex).toBeLessThan(seasonIndex)
    expect(seasonIndex).toBeLessThan(relatedIndex)
  })

  it('expands the overview from the keyboard', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(
      detailEnvelope(movieDetail({ overview: longOverview }))
    )
    renderWithProviders(<TitleDetailPage />, { initialEntries: [moviePath] })
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })

    const expand = screen.getByRole('button', { name: 'Show more' })
    expand.focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
  })

  it('keeps focus on the activated season control and announces the change once', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope(tvDetail()))
    renderWithProviders(<TitleDetailPage />, { initialEntries: [tvPath] })
    await screen.findByRole('heading', { level: 1, name: 'Dark' })

    const seasonTwo = screen.getByRole('button', { name: 'Season 2' })
    seasonTwo.focus()
    await userEvent.click(seasonTwo)

    expect(document.activeElement).toBe(seasonTwo)
    expect(await screen.findByText('Season 2 selected')).toBeInTheDocument()
    expect(screen.getAllByText('Season 2 selected')).toHaveLength(1)
  })

  it('renders an enabled trailer as a keyboard-reachable external link', async () => {
    renderWithProviders(<TitleDetailPage capabilities={{ trailer: true }} />, {
      initialEntries: [moviePath],
    })
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    const trailer = screen.getByRole('link', { name: /Watch trailer/ })
    trailer.focus()
    expect(document.activeElement).toBe(trailer)
    expect(trailer).toHaveAttribute('target', '_blank')
  })

  it('moves focus to the primary heading on navigation from a catalog card', async () => {
    const { router } = renderApp(['/browse/movies'])
    await waitFor(() => expect(router.state.location.pathname).toBe('/browse/movies'))

    await act(async () => {
      await router.navigate(moviePath)
    })
    const heading = await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    await waitFor(() => expect(heading).toHaveFocus(), { timeout: 8000 })
    await waitFor(
      () => {
        expect(screen.getAllByText(/Navigated to/)).toHaveLength(1)
      },
      { timeout: 8000 }
    )
  }, 15000)

  it('restores focus when the primary heading is replaced after the detail resolves', async () => {
    let releaseDetail: ((value: ReturnType<typeof detailEnvelope>) => void) | undefined
    vi.mocked(fetchDetail).mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseDetail = resolve
        })
    )

    const { router } = renderApp(['/browse/movies'])
    await waitFor(() => expect(router.state.location.pathname).toBe('/browse/movies'))

    await act(async () => {
      await router.navigate(moviePath)
    })

    const loadingHeading = await screen.findByRole('heading', { level: 1 })
    await waitFor(() => expect(loadingHeading).toHaveFocus())

    await act(async () => {
      releaseDetail?.(detailEnvelope())
    })

    const loadedHeading = await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    await waitFor(() => expect(loadedHeading).toHaveFocus(), { timeout: 8000 })
    expect(screen.getAllByText(/Navigated to/)).toHaveLength(1)
  })

  it('marks the episode region busy during a season change without duplicate announcements', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope(tvDetail()))
    let release: ((value: Awaited<ReturnType<typeof fetchSeason>>) => void) | undefined
    vi.mocked(fetchSeason).mockImplementationOnce(async ({ seasonNumber }) =>
      seasonEnvelope(seasonNumber)
    )
    vi.mocked(fetchSeason).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve
        })
    )

    renderWithProviders(<TitleDetailPage />, { initialEntries: [tvPath] })
    await screen.findByRole('heading', { level: 1, name: 'Dark' })
    await screen.findByText('Secrets')

    await userEvent.click(screen.getByRole('button', { name: 'Season 2' }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Episodes' }).closest('section')).toHaveAttribute(
        'aria-busy',
        'true'
      )
    )
    expect(screen.getByText('Episodes are loading')).toBeInTheDocument()
    expect(screen.getAllByText('Season 2 selected')).toHaveLength(1)

    release?.(seasonEnvelope(2))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Episodes' }).closest('section')).toHaveAttribute(
        'aria-busy',
        'false'
      )
    )
  })

  it('retries only the failing section without re-requesting the core detail', async () => {
    vi.mocked(fetchCredits)
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
      .mockResolvedValue(creditsEnvelope())
    renderWithProviders(<TitleDetailPage />, { initialEntries: [moviePath] })
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })

    const retry = await screen.findByRole('button', { name: 'Try again' })
    const detailCalls = vi.mocked(fetchDetail).mock.calls.length
    await userEvent.click(retry)

    await waitFor(() => expect(screen.getByText('Edward Norton')).toBeInTheDocument())
    expect(vi.mocked(fetchDetail).mock.calls.length).toBe(detailCalls)
  })
})
