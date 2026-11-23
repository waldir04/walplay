import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SEARCH_SETTLE_MS } from '@/shared/config/constants'
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

afterEach(() => {
  vi.useRealTimers()
})

const typeInSearch = (value: string) => {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value } })
}

describe('SearchPage input discipline', () => {
  it('issues no request for intermediate typing and one for the settled identity', async () => {
    await renderWithProviders(<SearchPage />, { initialEntries: ['/search'] })
    const input = screen.getByRole('searchbox')

    const user = userEvent.setup()
    await user.type(input, 'm')
    await user.type(input, 'a')
    await user.type(input, 't')
    expect(fetchSearchPage).not.toHaveBeenCalled()

    await waitFor(() => expect(fetchSearchPage).toHaveBeenCalledTimes(1))
    expect(fetchSearchPage).toHaveBeenCalledWith({ query: 'mat', language: 'en', page: 1 })
  })

  it('requests once on submit and never on an identical resubmit', async () => {
    await renderWithProviders(<SearchPage />, { initialEntries: ['/search'] })
    vi.useFakeTimers()

    typeInSearch('matrix')
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_SETTLE_MS * 2)
    })

    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_SETTLE_MS * 2)
    })

    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
  })

  it('issues zero requests for empty, one-character, and over-long input', async () => {
    vi.useFakeTimers()
    await renderWithProviders(<SearchPage />, { initialEntries: ['/search'] })

    typeInSearch('')
    typeInSearch('a')
    typeInSearch('😀'.repeat(201))
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_SETTLE_MS * 2)
    })

    expect(fetchSearchPage).not.toHaveBeenCalled()
    expect(screen.getAllByText(/Enter no more than 200 characters/).length).toBeGreaterThan(0)
  })

  it('refocuses the input after clear and issues no extra request', async () => {
    await renderWithProviders(<SearchPage />, { initialEntries: ['/search?q=the+matrix'] })
    await waitFor(() => expect(fetchSearchPage).toHaveBeenCalledTimes(1))
    vi.useFakeTimers()

    const input = screen.getByRole('searchbox')
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(document.activeElement).toBe(input)
    expect(input).toHaveValue('')
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_SETTLE_MS * 2)
    })
    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
  })
})
