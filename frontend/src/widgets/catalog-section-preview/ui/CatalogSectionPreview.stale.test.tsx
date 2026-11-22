import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogSectionPreview } from './CatalogSectionPreview'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
})

describe('CatalogSectionPreview stale state', () => {
  it('labels stale data and shows a locale-formatted last update time', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], stale: true })
    )
    await renderWithProviders(
      <CatalogSectionPreview
        mediaType="movie"
        capability={{ id: 'popular', order: 2, mediaTypes: ['movie'], paginated: true }}
        language="en"
      />
    )

    expect(await screen.findByText(/Cached data from/)).toBeInTheDocument()
    expect(document.body.textContent).toMatch(/2026/)
  })

  it('does not present stale data as current', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], stale: true })
    )
    await renderWithProviders(
      <CatalogSectionPreview
        mediaType="movie"
        capability={{ id: 'popular', order: 2, mediaTypes: ['movie'], paginated: true }}
        language="es"
      />,
      { locale: 'es' }
    )
    expect(await screen.findByText(/Datos en caché/)).toBeInTheDocument()
  })
})
