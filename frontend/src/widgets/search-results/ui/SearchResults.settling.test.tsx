import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
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

const Harness = () => {
  const [switched, setSwitched] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setSwitched(true)}>
        switch query
      </button>
      <SearchResults
        query={buildSearchQuery(switched ? 'arrival' : 'the matrix')}
        language="en"
        isSettling={!switched}
        attribution={<p>Provider attribution slot</p>}
      />
    </div>
  )
}

beforeEach(() => {
  vi.mocked(fetchSearchPage)
    .mockReset()
    .mockResolvedValueOnce(firstSearchPage())
    .mockImplementationOnce(() => new Promise(() => undefined))
})

describe('SearchResults settling', () => {
  it('keeps the previous results for the active query while the draft differs', async () => {
    await renderWithProviders(<Harness />)

    expect(
      await screen.findByRole('heading', { name: 'Results for “the matrix”' })
    ).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Search results for the matrix' })).toBeInTheDocument()
    expect(screen.getByText('2 titles shown')).toBeInTheDocument()
    expect(screen.queryByLabelText('Search results are loading')).not.toBeInTheDocument()
    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
  })

  it('transitions to the new query loading state without showing the previous query as current', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<Harness />)
    await screen.findByRole('heading', { name: 'Results for “the matrix”' })

    await user.click(screen.getByRole('button', { name: 'switch query' }))

    expect(await screen.findByLabelText('Search results are loading')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Results for “the matrix”' })
    ).not.toBeInTheDocument()
    expect(screen.queryByText('2 titles shown')).not.toBeInTheDocument()
    expect(fetchSearchPage).toHaveBeenCalledTimes(2)
  })
})
