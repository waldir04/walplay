import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery } from '@/entities/catalog'
import { firstSearchPage, secondSearchPage } from '@/test/fixtures/catalog/search'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

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
  installMatchMediaMock(true)
  vi.mocked(fetchSearchPage).mockReset().mockResolvedValue(firstSearchPage())
})

describe('search keyboard journey', () => {
  it('follows a logical tab order from the search input without trapping focus', async () => {
    const user = userEvent.setup()
    renderApp(['/search?q=the+matrix'])
    await screen.findByRole('list', { name: 'Search results for the matrix' })

    const input = screen.getByRole('searchbox')
    input.focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Search' }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Clear search' }))
    await user.tab()
    expect(screen.getByRole('list', { name: 'Search results for the matrix' })).toContainElement(
      document.activeElement as HTMLElement
    )
  })

  it('keeps visible focus indicators on the input and primary controls', async () => {
    renderApp(['/search?q=the+matrix'])
    await screen.findByRole('list', { name: 'Search results for the matrix' })

    for (const control of [
      screen.getByRole('searchbox'),
      screen.getByRole('button', { name: 'Search' }),
      screen.getByRole('button', { name: 'Clear search' }),
      screen.getByRole('button', { name: 'Load more' }),
    ]) {
      expect(control.className).toContain('focus-visible:outline-2')
      expect(control.className).toContain('focus-visible:outline-offset-2')
    }
  })

  it('keeps focus in the input after a debounced search and an Enter submit', async () => {
    const user = userEvent.setup()
    renderApp(['/search'])
    const input = await screen.findByRole('searchbox')
    input.focus()

    await user.type(input, 'the matrix')
    await waitFor(() => expect(fetchSearchPage).toHaveBeenCalledTimes(1))
    expect(document.activeElement).toBe(input)

    await user.keyboard('{Enter}')
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(document.activeElement).toBe(input)
  })

  it('keeps focus on load more when results are appended and exposes 44px targets', async () => {
    vi.mocked(fetchSearchPage)
      .mockReset()
      .mockResolvedValueOnce(firstSearchPage())
      .mockResolvedValueOnce(secondSearchPage())
    const user = userEvent.setup()
    renderApp(['/search?q=the+matrix'])
    await screen.findByRole('list', { name: 'Search results for the matrix' })

    const loadMore = screen.getByRole('button', { name: 'Load more' })
    expect(loadMore.className).toContain('min-h-11')
    expect(screen.getByRole('button', { name: 'Search' }).className).toContain('min-h-11')
    expect(screen.getByRole('button', { name: 'Clear search' }).className).toContain('min-h-11')

    await user.click(loadMore)
    await screen.findByText('The Matrix Reloaded')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Load more' }))
  })

  it('provides every result and action without requiring hover', async () => {
    renderApp(['/search?q=the+matrix'])
    const collection = await screen.findByRole('list', { name: 'Search results for the matrix' })

    expect(collection.querySelectorAll('a').length).toBe(2)
    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument()
    expect(buildSearchQuery('the matrix').validity).toBe('valid')
  })
})
