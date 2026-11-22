import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { movieItem, tvItem } from '@/test/fixtures/catalog'
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
  vi.mocked(fetchSearchPage).mockReset()
})

const renderSpanish = (entry: string) =>
  renderWithProviders(<SearchPage />, { initialEntries: [entry], locale: 'es' })

describe('SearchPage Spanish resources', () => {
  it('resolves form and guidance copy in Spanish', async () => {
    await renderSpanish('/search')

    expect(screen.getByRole('heading', { level: 1, name: 'Buscar' })).toBeInTheDocument()
    expect(screen.getByRole('search', { name: 'Buscar películas y series' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveAccessibleName('Buscar películas y series')
    expect(screen.getByText(/Introduce al menos 2 caracteres/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Encuentra algo que ver' })).toBeInTheDocument()
  })

  it('uses i18next pluralization for singular and plural counts', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(
      searchPageEnvelope({ items: [movieItem()], hasMore: false, totalPages: 1 })
    )
    const singular = await renderSpanish('/search?q=matrix')
    expect(await screen.findByText('1 título mostrado')).toBeInTheDocument()
    singular.unmount()

    vi.mocked(fetchSearchPage).mockResolvedValue(
      searchPageEnvelope({ items: [movieItem(), tvItem()], hasMore: false, totalPages: 1 })
    )
    await renderSpanish('/search?q=matrix')
    expect(await screen.findByText('2 títulos mostrados')).toBeInTheDocument()
  })

  it('formats years and ratings with locale-aware Intl and tabular numerals', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(
      searchPageEnvelope({ items: [movieItem()], hasMore: false, totalPages: 1 })
    )
    await renderSpanish('/search?q=matrix')

    expect(await screen.findByText('8,4 / 10')).toBeInTheDocument()
    expect(screen.getByText('1999')).toHaveClass('tabular-nums')
    expect(screen.getByText('8,4 / 10')).toHaveClass('tabular-nums')
    expect(screen.getByText('Películas')).toBeInTheDocument()
  })

  it('interpolates the query as plain text without interpreting markup', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(
      searchPageEnvelope({ items: [movieItem()], hasMore: false, totalPages: 1 })
    )
    await renderSpanish(`/search?q=${encodeURIComponent('<script>alert(1)</script>')}`)

    const heading = await screen.findByRole('heading', {
      name: 'Resultados de «<script>alert(1)</script>»',
    })
    expect(heading.querySelector('script')).toBeNull()
  })
})
