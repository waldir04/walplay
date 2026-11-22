import { screen, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CAPABILITIES, MOVIE_ID, movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchCapabilities, fetchSectionPage, fetchItem } =
  await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchCapabilities)
    .mockReset()
    .mockResolvedValue({ data: { sections: CAPABILITIES } })
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockResolvedValue(pageEnvelope({ items: [movieItem()] }))
  vi.mocked(fetchItem).mockReset()
})

describe('TitleDetailPage from a card', () => {
  it('renders the routed item without a redundant request', async () => {
    const { router } = renderApp(['/browse/movies'])
    await screen.findAllByText('Fight Club')

    await act(async () => {
      await router.navigate(`/browse/movies/title/${MOVIE_ID}`, {
        state: { item: movieItem(), from: '/browse/movies/popular' },
      })
    })

    expect(await screen.findByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
    expect(
      screen.getByText('Complete details are not yet available for this title.')
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Provider attribution' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
      'href',
      '/browse/movies/popular'
    )
    expect(fetchItem).not.toHaveBeenCalled()
  })

  it('rejects router state whose id or type disagrees with the address', async () => {
    vi.mocked(fetchItem).mockResolvedValue({
      data: movieItem(),
      meta: {
        language: 'en-US',
        stale: false,
        lastUpdatedAt: '2026-11-22T15:00:00.000Z',
        source: 'provider',
      },
    })
    const { router } = renderApp(['/browse/movies'])
    await screen.findAllByText('Fight Club')

    await act(async () => {
      await router.navigate(`/browse/movies/title/${MOVIE_ID}`, {
        state: { item: movieItem({ id: 'd2wxOm1vdmllOjY4MA' }) },
      })
    })

    await waitFor(() => expect(fetchItem).toHaveBeenCalled())
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
