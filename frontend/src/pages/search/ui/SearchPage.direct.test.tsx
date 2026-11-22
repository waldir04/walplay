import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { firstSearchPage } from '@/test/fixtures/catalog/search'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SearchPage } from './SearchPage'

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

describe('SearchPage direct addresses', () => {
  it('shows initial guidance and loads nothing without a q parameter', async () => {
    await renderWithProviders(<SearchPage />, { initialEntries: ['/search'] })

    expect(screen.getByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Find something to watch' })).toBeInTheDocument()
    expect(fetchSearchPage).not.toHaveBeenCalled()
  })

  it('activates a valid direct address and submits its query', async () => {
    await renderWithProviders(<SearchPage />, { initialEntries: ['/search?q=the+matrix'] })

    expect(screen.getByRole('searchbox')).toHaveValue('the matrix')
    expect(
      await screen.findByRole('heading', { name: 'Results for “the matrix”' })
    ).toBeInTheDocument()
    expect(fetchSearchPage).toHaveBeenCalledWith({
      query: 'the matrix',
      language: 'en',
      page: 1,
    })
  })

  it.each([
    ['/search?q=', 'Find something to watch'],
    ['/search?q=a', 'Find something to watch'],
  ])('shows guidance for %s with zero requests', async (entry, heading) => {
    await renderWithProviders(<SearchPage />, { initialEntries: [entry] })

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    expect(fetchSearchPage).not.toHaveBeenCalled()
  })

  it('shows too-short guidance with zero requests', async () => {
    await renderWithProviders(<SearchPage />, { initialEntries: ['/search?q=a'] })

    expect(await screen.findByText('Enter at least 2 characters to search.')).toBeInTheDocument()
    await waitFor(() => expect(fetchSearchPage).not.toHaveBeenCalled())
  })

  it('shows too-long guidance for a 201-code-point address with zero requests', async () => {
    await renderWithProviders(<SearchPage />, {
      initialEntries: [`/search?q=${encodeURIComponent('😀'.repeat(201))}`],
    })

    expect(await screen.findByText(/Enter no more than 200 characters/)).toBeInTheDocument()
    expect(fetchSearchPage).not.toHaveBeenCalled()
  })
})
