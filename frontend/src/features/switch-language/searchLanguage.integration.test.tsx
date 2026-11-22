import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { firstSearchPage } from '@/test/fixtures/catalog/search'
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

describe('search language integration', () => {
  it('updates every search-owned copy without translating or reinterpreting the query', async () => {
    const { i18n } = await import('@/app/i18n')
    const query = '<b>matrix</b> & co'
    renderApp([`/search?q=${encodeURIComponent(query)}`])

    expect(
      await screen.findByRole('heading', { name: `Results for “${query}”` })
    ).toBeInTheDocument()

    await act(async () => {
      await i18n.changeLanguage('es')
    })

    const heading = await screen.findByRole('heading', { name: `Resultados de «${query}»` })
    expect(heading.querySelector('b')).toBeNull()
    expect(screen.getByRole('search', { name: 'Buscar películas y series' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Borrar la búsqueda' })).toBeInTheDocument()
    expect(screen.getByText('2 títulos mostrados')).toBeInTheDocument()

    await act(async () => {
      await i18n.changeLanguage('en')
    })
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Results for “<b>matrix</b> & co”' })
      ).toBeInTheDocument()
    )
    expect(screen.getByText('2 titles shown')).toBeInTheDocument()
    expect(fetchSearchPage).toHaveBeenCalledWith({
      query,
      language: 'es',
      page: 1,
    })
  })
})
