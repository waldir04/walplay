import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    const user = userEvent.setup()
    await renderWithProviders(<SearchPage />, { initialEntries: ['/search'] })

    await user.type(screen.getByRole('searchbox'), 'matrix')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(fetchSearchPage).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
  })

  it('issues zero requests for empty, one-character, and over-long input', async () => {
    await renderWithProviders(<SearchPage />, { initialEntries: ['/search'] })

    typeInSearch('')
    typeInSearch('a')
    typeInSearch('😀'.repeat(201))
    await new Promise((resolve) => setTimeout(resolve, 450))

    expect(fetchSearchPage).not.toHaveBeenCalled()
    expect(screen.getAllByText(/Enter no more than 200 characters/).length).toBeGreaterThan(0)
  })

  it('refocuses the input after clear and issues no extra request', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<SearchPage />, { initialEntries: ['/search?q=the+matrix'] })
    await waitFor(() => expect(fetchSearchPage).toHaveBeenCalledTimes(1))

    const input = screen.getByRole('searchbox')
    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(document.activeElement).toBe(input)
    expect(input).toHaveValue('')
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
  })
})
