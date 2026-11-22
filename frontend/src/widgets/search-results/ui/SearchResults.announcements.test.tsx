import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery } from '@/entities/catalog'
import { firstSearchPage, searchPageEnvelope } from '@/test/fixtures/catalog/search'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SearchResults } from './SearchResults'
import { movieItem } from '@/test/fixtures/catalog'

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

describe('SearchResults announcements', () => {
  it('announces the search start politely and the arrival once', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(firstSearchPage())
    await renderWithProviders(
      <SearchResults query={buildSearchQuery('the matrix')} language="en" />
    )

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('2 titles found for the matrix')
    )
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('uses assertive alert semantics for failures and no polite count', async () => {
    vi.mocked(fetchSearchPage).mockRejectedValue(new Error('offline'))
    await renderWithProviders(
      <SearchResults query={buildSearchQuery('the matrix')} language="en" />
    )

    await screen.findByRole('heading', { name: 'Search is temporarily unavailable' })
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('alert')
          .some((alert) => alert.textContent === 'Search is temporarily unavailable')
      ).toBe(true)
    )
    expect(screen.getByRole('status').textContent).not.toContain('found')
  })

  it('announces stale results politely with the cached label', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(
      searchPageEnvelope({
        items: [movieItem()],
        hasMore: false,
        totalPages: 1,
        stale: true,
      })
    )
    await renderWithProviders(
      <SearchResults query={buildSearchQuery('the matrix')} language="en" />
    )

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toMatch(/^Cached results from /)
    )
  })

  it('announces a later-page failure assertively', async () => {
    vi.mocked(fetchSearchPage)
      .mockResolvedValueOnce(firstSearchPage())
      .mockRejectedValueOnce(new Error('page failed'))
    await renderWithProviders(
      <SearchResults query={buildSearchQuery('the matrix')} language="en" />
    )
    await screen.findByRole('list', { name: 'Search results for the matrix' })

    const loadMore = screen.getByRole('button', { name: 'Load more' })
    fireEvent.click(loadMore)

    await waitFor(() =>
      expect(
        screen
          .getAllByRole('alert')
          .some((alert) => alert.textContent === 'More results could not be loaded')
      ).toBe(true)
    )
  })
})
