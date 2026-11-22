import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import {
  emptyButMorePage,
  emptyFinalPage,
  firstSearchPage,
  searchPageEnvelope,
} from '@/test/fixtures/catalog/search'
import { renderWithProviders } from '@/test/renderWithProviders'
import { runAxe } from '@/test/axe'

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
  vi.mocked(fetchSearchPage).mockReset()
})

const expectNoViolations = async (container: HTMLElement): Promise<void> => {
  const results = await runAxe(container)
  expect(results.violations).toHaveLength(0)
}

describe('SearchPage accessibility across states', () => {
  it.each(['/search', '/search?q=', '/search?q=a'])(
    'has no violations for the guidance state at %s',
    async (entry) => {
      const { container } = await renderWithProviders(<SearchPage />, { initialEntries: [entry] })
      await expectNoViolations(container)
    }
  )

  it('has no violations for too-long guidance', async () => {
    const { container } = await renderWithProviders(<SearchPage />, {
      initialEntries: [`/search?q=${encodeURIComponent('😀'.repeat(201))}`],
    })
    await expectNoViolations(container)
  })

  it('has no violations while loading', async () => {
    vi.mocked(fetchSearchPage).mockImplementation(() => new Promise(() => undefined))
    const { container } = await renderWithProviders(<SearchPage />, {
      initialEntries: ['/search?q=the+matrix'],
    })
    await screen.findByLabelText('Search results are loading')
    await expectNoViolations(container)
  })

  it('has no violations for successful results', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(firstSearchPage())
    const { container } = await renderWithProviders(<SearchPage />, {
      initialEntries: ['/search?q=the+matrix'],
    })
    await screen.findByRole('list', { name: 'Search results for the matrix' })
    await expectNoViolations(container)
  })

  it('has no violations for the no-results state', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(emptyFinalPage())
    const { container } = await renderWithProviders(<SearchPage />, {
      initialEntries: ['/search?q=the+matrix'],
    })
    await screen.findByRole('heading', { name: 'No titles matched “the matrix”' })
    await expectNoViolations(container)
  })

  it('has no violations for the failure state', async () => {
    vi.mocked(fetchSearchPage).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE'))
    const { container } = await renderWithProviders(<SearchPage />, {
      initialEntries: ['/search?q=the+matrix'],
    })
    await screen.findByRole('heading', { name: 'Search is temporarily unavailable' })
    await expectNoViolations(container)
  })

  it('has no violations for stale results', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(
      searchPageEnvelope({
        items: firstSearchPage().data.items,
        hasMore: false,
        totalPages: 1,
        stale: true,
      })
    )
    const { container } = await renderWithProviders(<SearchPage />, {
      initialEntries: ['/search?q=the+matrix'],
    })
    await screen.findByText(/Cached results from/)
    await expectNoViolations(container)
  })

  it('has no violations for an interim-empty page', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(emptyButMorePage())
    const { container } = await renderWithProviders(<SearchPage />, {
      initialEntries: ['/search?q=the+matrix'],
    })
    await screen.findAllByText('This page had no titles. Load more to keep looking.')
    await expectNoViolations(container)
  })

  it('has no violations for the end-of-results state', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(
      searchPageEnvelope({
        items: firstSearchPage().data.items,
        hasMore: false,
        totalPages: 1,
      })
    )
    const { container } = await renderWithProviders(<SearchPage />, {
      initialEntries: ['/search?q=the+matrix'],
    })
    await screen.findByText('End of results for the matrix')
    await expectNoViolations(container)
  })
})
