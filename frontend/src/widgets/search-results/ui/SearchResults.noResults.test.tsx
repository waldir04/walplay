import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery } from '@/entities/catalog'
import { emptyFinalPage } from '@/test/fixtures/catalog/search'
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
  vi.mocked(fetchSearchPage).mockReset().mockResolvedValue(emptyFinalPage())
})

describe('SearchResults no-results state', () => {
  it('shows a successful no-results state that echoes the query with edit and clear actions', async () => {
    const onEditQuery = vi.fn()
    const onClearQuery = vi.fn()
    const user = userEvent.setup()
    await renderWithProviders(
      <SearchResults
        query={buildSearchQuery('the matrix')}
        language="en"
        onEditQuery={onEditQuery}
        onClearQuery={onClearQuery}
        attribution={<p>Provider attribution slot</p>}
      />
    )

    expect(
      await screen.findByRole('heading', { name: 'No titles matched “the matrix”' })
    ).toBeInTheDocument()
    expect(screen.getByText(/Check the spelling or try a different title/)).toBeInTheDocument()
    expect(screen.getByText('Provider attribution slot')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(screen.queryByText('Search is temporarily unavailable')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit search' }))
    expect(onEditQuery).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(onClearQuery).toHaveBeenCalledTimes(1)
    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
  })

  it('announces the no-results outcome once', async () => {
    await renderWithProviders(
      <SearchResults query={buildSearchQuery('the matrix')} language="en" />
    )

    await screen.findByRole('heading', { name: 'No titles matched “the matrix”' })
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('No titles matched “the matrix”')
    )
  })
})
