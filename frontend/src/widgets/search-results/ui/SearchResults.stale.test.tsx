import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery } from '@/entities/catalog'
import { firstSearchPage, searchPageEnvelope } from '@/test/fixtures/catalog/search'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SearchResults } from './SearchResults'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
  fetchSearchPage: vi.fn(),
}))

const { fetchSearchPage } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  vi.mocked(fetchSearchPage).mockReset()
})

describe('SearchResults stale state', () => {
  it('labels cached results with the last update time and never presents them as current', async () => {
    const lastUpdatedAt = '2026-11-22T15:00:00.000Z'
    vi.mocked(fetchSearchPage).mockResolvedValue(
      searchPageEnvelope({
        items: firstSearchPage().data.items,
        hasMore: false,
        totalPages: 1,
        stale: true,
        lastUpdatedAt,
      })
    )
    await renderWithProviders(
      <SearchResults
        query={buildSearchQuery('the matrix')}
        language="en"
        attribution={<p>Provider attribution slot</p>}
      />
    )

    const expectedDate = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(lastUpdatedAt))

    expect(await screen.findByText(`Cached results from ${expectedDate}`)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Search results for the matrix' })).toBeInTheDocument()
    expect(screen.getByText('Provider attribution slot')).toBeInTheDocument()
    expect(screen.getByText('2 titles shown')).toBeInTheDocument()
  })

  it('formats the cached date with the selected locale', async () => {
    const lastUpdatedAt = '2026-11-22T15:00:00.000Z'
    vi.mocked(fetchSearchPage).mockResolvedValue(
      searchPageEnvelope({
        items: firstSearchPage().data.items,
        hasMore: false,
        totalPages: 1,
        stale: true,
        lastUpdatedAt,
      })
    )
    await renderWithProviders(
      <SearchResults query={buildSearchQuery('the matrix')} language="es" />,
      { locale: 'es' }
    )

    const expectedDate = new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(lastUpdatedAt))

    expect(await screen.findByText(`Resultados en caché de ${expectedDate}`)).toBeInTheDocument()
  })
})
