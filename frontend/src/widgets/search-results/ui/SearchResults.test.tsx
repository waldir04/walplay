import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery } from '@/entities/catalog'
import { firstSearchPage } from '@/test/fixtures/catalog/search'
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
  vi.mocked(fetchSearchPage).mockReset().mockResolvedValue(firstSearchPage())
})

const renderResults = () =>
  renderWithProviders(
    <SearchResults
      query={buildSearchQuery('the matrix')}
      language="en"
      attribution={<p>Provider attribution slot</p>}
    />
  )

describe('SearchResults success surface', () => {
  it('renders the unified collection in provider order with a textual media type', async () => {
    await renderResults()

    await screen.findByRole('heading', { name: 'Results for “the matrix”' })
    const collection = screen.getByRole('list', { name: 'Search results for the matrix' })
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(collection).toContainElement(links[0] as HTMLElement)
    expect(links[0]).toHaveAccessibleName(/The Matrix, Movies/)
    expect(links[1]).toHaveAccessibleName(/The Matrix Show, TV Shows/)
    expect(screen.getByText('Movies')).toBeInTheDocument()
    expect(screen.getAllByText('TV Shows').length).toBeGreaterThan(0)
  })

  it('shows the displayed valid-title count, never a provider total', async () => {
    await renderResults()

    expect(await screen.findByText('2 titles shown')).toBeInTheDocument()
    expect(screen.queryByText(/total/i)).not.toBeInTheDocument()
  })

  it('renders provider attribution as a slot', async () => {
    await renderResults()

    expect(await screen.findByText('Provider attribution slot')).toBeInTheDocument()
  })

  it('keeps the collection accessible name on the active query', async () => {
    await renderResults()

    expect(
      await screen.findByRole('list', { name: 'Search results for the matrix' })
    ).toBeInTheDocument()
    expect(fetchSearchPage).toHaveBeenCalledWith({
      query: 'the matrix',
      language: 'en',
      page: 1,
    })
    await waitFor(() => expect(screen.queryByRole('list', { name: /draft/i })).toBeNull())
  })
})
