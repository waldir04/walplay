import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { movieItem } from '@/test/fixtures/catalog'
import { searchPageEnvelope } from '@/test/fixtures/catalog/search'
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
  vi.mocked(fetchSearchPage)
    .mockReset()
    .mockImplementation(({ language }) =>
      Promise.resolve(
        searchPageEnvelope({
          items: [
            movieItem({
              id: 'd2wxOm1vdmllOjU1MA',
              title: language === 'es' ? 'Matrix en español' : 'The Matrix',
            }),
          ],
          hasMore: false,
          totalPages: 1,
        })
      )
    )
})

describe('SearchPage language change', () => {
  it('re-runs the active query in the new language and discards previous-language pages', async () => {
    const { i18n } = await import('@/app/i18n')
    await renderWithProviders(<SearchPage />, { initialEntries: ['/search?q=the+matrix'] })

    expect(await screen.findByText('The Matrix')).toBeInTheDocument()
    expect(fetchSearchPage).toHaveBeenCalledWith({ query: 'the matrix', language: 'en', page: 1 })

    await act(async () => {
      await i18n.changeLanguage('es')
    })

    await waitFor(() =>
      expect(fetchSearchPage).toHaveBeenCalledWith({
        query: 'the matrix',
        language: 'es',
        page: 1,
      })
    )

    expect(await screen.findByText('Matrix en español')).toBeInTheDocument()
    expect(screen.queryByText('The Matrix')).not.toBeInTheDocument()
    expect(screen.getAllByRole('list')).toHaveLength(1)
  })
})
