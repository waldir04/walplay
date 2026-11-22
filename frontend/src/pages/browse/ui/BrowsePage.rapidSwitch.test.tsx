import { screen } from '@testing-library/react'
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
  vi.mocked(fetchSectionPage).mockReset()
})

describe('Browse rapid switching', () => {
  it('shows only the final selection when an older response resolves later', async () => {
    let releaseMovie: () => void = () => undefined
    vi.mocked(fetchSectionPage).mockImplementation(async ({ mediaType, section }) => {
      if (mediaType === 'movie') {
        await new Promise<void>((resolve) => {
          releaseMovie = resolve
        })
        return pageEnvelope({ items: [movieItem()], section })
      }
      return pageEnvelope({ items: [tvItem()], section })
    })

    const { router } = renderApp(['/browse/movies'])
    await screen.findByRole('heading', { name: 'Browse Movies' })

    await act(async () => {
      await router.navigate('/browse/tv-shows')
    })
    await screen.findAllByText('Example Show')

    await act(async () => {
      releaseMovie()
      await Promise.resolve()
    })

    expect(await screen.findByRole('heading', { name: 'Browse TV Shows' })).toBeInTheDocument()
    expect(screen.queryByText('Fight Club')).not.toBeInTheDocument()
  })
})
