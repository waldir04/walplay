import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import {
  TV_ID,
  detailEnvelope,
  emptySeasonEnvelope,
  movieDetail,
  seasonEnvelope,
  tvDetail,
  emptyCreditsEnvelope,
  similarEnvelope,
  collectionEnvelope,
} from '@/test/fixtures/detail'
import { CAPABILITIES, pageEnvelope } from '@/test/fixtures/catalog'
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

const { fetchCredits, fetchDetail, fetchSeason, fetchSimilar, fetchCollection } =
  await import('@/entities/catalog/api/detailClient')
const { fetchCapabilities, fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

const tvPath = `/browse/tv-shows/title/${TV_ID}`

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchCapabilities)
    .mockReset()
    .mockResolvedValue({ data: { sections: CAPABILITIES } })
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockResolvedValue(pageEnvelope({ items: [] }))
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope(tvDetail()))
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
  vi.mocked(fetchSeason)
    .mockReset()
    .mockImplementation(async ({ seasonNumber }) => seasonEnvelope(seasonNumber))
})

const renderTv = (search = '') => renderApp([`${tvPath}${search}`])

describe('TitleDetailPage seasons', () => {
  it('selects the initial season and reflects it in the address with replace', async () => {
    const { router } = renderTv()
    expect(await screen.findByRole('heading', { level: 1, name: 'Dark' })).toBeInTheDocument()
    expect(await screen.findByText('Secrets')).toBeInTheDocument()

    await waitFor(() => expect(router.state.location.search).toBe('?season=1'))
    expect(fetchSeason).toHaveBeenCalledWith({
      mediaType: 'tv',
      itemId: TV_ID,
      seasonNumber: 1,
      language: 'en',
    })
    expect(screen.getByRole('button', { name: 'Season 1' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('honours a direct season address and reload', async () => {
    const { router } = renderTv('?season=2')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dark' })).toBeInTheDocument()
    await waitFor(() =>
      expect(fetchSeason).toHaveBeenCalledWith({
        mediaType: 'tv',
        itemId: TV_ID,
        seasonNumber: 2,
        language: 'en',
      })
    )
    expect(router.state.location.search).toBe('?season=2')
  })

  it.each(['?season=abc', '?season=999', '?season=-1'])(
    'falls back to the initial season for %s without an error page',
    async (search) => {
      const { router } = renderTv(search)
      expect(await screen.findByRole('heading', { level: 1, name: 'Dark' })).toBeInTheDocument()
      await waitFor(() => expect(router.state.location.search).toBe('?season=1'))
      expect(await screen.findByText('Secrets')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).toBeNull()
    }
  )

  it('falls back once when the addressed season is not supplied', async () => {
    vi.mocked(fetchSeason).mockImplementation(async ({ seasonNumber }) => {
      if (seasonNumber === 2) {
        throw new CatalogApiError('DETAIL_SEASON_NOT_FOUND', 404)
      }
      return seasonEnvelope(seasonNumber)
    })

    const { router } = renderTv('?season=2')
    await waitFor(() => expect(router.state.location.search).toBe('?season=1'))
    expect(await screen.findByText('Secrets')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Title not found' })).toBeNull()
  })

  it('keeps one history entry across several season changes', async () => {
    const { router } = renderApp(['/browse/movies'])
    await act(async () => {
      await router.navigate(tvPath, { state: { from: '/browse/movies' } })
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Dark' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Season 2' }))
    await waitFor(() => expect(router.state.location.search).toBe('?season=2'))
    await userEvent.click(screen.getByRole('button', { name: 'Season 0' }))
    await waitFor(() => expect(router.state.location.search).toBe('?season=0'))

    await act(async () => {
      await router.navigate(-1)
    })
    expect(router.state.location.pathname).toBe('/browse/movies')
  })

  it('ignores a season parameter for a movie and shows no season interface', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope(movieDetail()))
    renderApp([`/browse/movies/title/d2wxOm1vdmllOjU1MA?season=2`])

    expect(await screen.findByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Seasons' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Episodes' })).toBeNull()
    expect(fetchSeason).not.toHaveBeenCalled()
  })

  it('preserves the selected season across a language change', async () => {
    renderTv('?season=2')
    await screen.findByRole('heading', { level: 1, name: 'Dark' })
    await waitFor(() =>
      expect(fetchSeason).toHaveBeenCalledWith(
        expect.objectContaining({ seasonNumber: 2, language: 'en' })
      )
    )

    const { i18n } = await import('@/app/i18n')
    await i18n.changeLanguage('es')

    await waitFor(() =>
      expect(fetchSeason).toHaveBeenCalledWith(
        expect.objectContaining({ seasonNumber: 2, language: 'es' })
      )
    )
    await i18n.changeLanguage('en')
  })

  it('shows the localized empty state for a season without episodes', async () => {
    vi.mocked(fetchSeason).mockResolvedValue(emptySeasonEnvelope(1))
    renderTv()
    expect(await screen.findByText('No episodes available')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Seasons' })).toBeInTheDocument()
  })
})
