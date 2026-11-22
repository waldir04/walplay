import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { CAPABILITIES, MOVIE_ID, movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'
import { runAxe } from '@/test/axe'

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
    .mockResolvedValue(pageEnvelope({ items: [movieItem()], section: 'popular', hasMore: false }))
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
})

describe('catalog accessibility across surfaces', () => {
  it('landing has no critical or serious violations', async () => {
    const { container } = renderApp(['/browse/movies'])
    await screen.findByText('Fight Club')
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('category has no critical or serious violations', async () => {
    const { container } = renderApp(['/browse/movies/popular'])
    await screen.findByText('Fight Club')
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('detail error state has no critical or serious violations', async () => {
    vi.mocked(fetchItem).mockRejectedValue(new CatalogApiError('CATALOG_NOT_FOUND', 404))
    const { container } = renderApp([`/browse/movies/title/${MOVIE_ID}`])
    await screen.findByRole('alert')
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })
})
