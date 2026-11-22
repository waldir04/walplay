import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery } from '@/entities/catalog'
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
  vi.mocked(fetchSearchPage)
    .mockReset()
    .mockImplementation(() => new Promise(() => undefined))
})

describe('SearchResults initial loading', () => {
  it('renders a layout-matching skeleton with a busy region and hidden decoration', async () => {
    await renderWithProviders(
      <SearchResults query={buildSearchQuery('the matrix')} language="en" />
    )

    const region = await screen.findByLabelText('Search results are loading')
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(region.querySelectorAll('li')).toHaveLength(10)
    expect(region.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(10)
    expect(screen.queryByText('Loading')).not.toBeInTheDocument()
  })

  it('does not render result cards or a count while loading', async () => {
    await renderWithProviders(
      <SearchResults query={buildSearchQuery('the matrix')} language="en" />
    )

    await screen.findByLabelText('Search results are loading')
    expect(screen.queryByText(/titles shown/)).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /Search results for/ })).not.toBeInTheDocument()
    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
  })
})
