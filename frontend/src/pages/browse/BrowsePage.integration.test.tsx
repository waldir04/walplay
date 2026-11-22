import { screen, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CAPABILITIES, movieItem, pageEnvelope, tvItem } from '@/test/fixtures/catalog'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchCapabilities, fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchCapabilities)
    .mockReset()
    .mockResolvedValue({ data: { sections: CAPABILITIES } })
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockImplementation(async ({ mediaType, section }) =>
      pageEnvelope({ items: [mediaType === 'movie' ? movieItem() : tvItem()], section })
    )
})

describe('Browse media switching integration', () => {
  it('defaults to Movies and replaces content when switching to TV Shows', async () => {
    const { router } = renderApp(['/browse/movies'])

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Browse Movies' })
    ).toBeInTheDocument()
    expect((await screen.findAllByText('Fight Club')).length).toBeGreaterThan(0)

    await act(async () => {
      await router.navigate('/browse/tv-shows')
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Browse TV Shows' })
    ).toBeInTheDocument()
    expect(await screen.findAllByText('Example Show')).not.toHaveLength(0)
    await waitFor(() => expect(screen.queryByText('Fight Club')).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'TV Shows' })).toHaveAttribute('aria-current', 'page')
  })

  it('restores the matching type and content with back and forward', async () => {
    const { router } = renderApp(['/browse/movies'])
    await screen.findByRole('heading', { name: 'Browse Movies' })

    await act(async () => {
      await router.navigate('/browse/tv-shows')
    })
    await screen.findByRole('heading', { name: 'Browse TV Shows' })

    await act(async () => {
      await router.navigate(-1)
    })
    expect(await screen.findByRole('heading', { name: 'Browse Movies' })).toBeInTheDocument()

    await act(async () => {
      await router.navigate(1)
    })
    expect(await screen.findByRole('heading', { name: 'Browse TV Shows' })).toBeInTheDocument()
  })

  it('opens both media type addresses directly', async () => {
    renderApp(['/browse/tv-shows'])
    expect(await screen.findByRole('heading', { name: 'Browse TV Shows' })).toBeInTheDocument()
    expect(await screen.findAllByText('Example Show')).not.toHaveLength(0)
  })

  it('never mixes items from the other media type', async () => {
    renderApp(['/browse/tv-shows'])
    await screen.findAllByText('Example Show')
    expect(screen.queryByText('Fight Club')).not.toBeInTheDocument()
  })
})
