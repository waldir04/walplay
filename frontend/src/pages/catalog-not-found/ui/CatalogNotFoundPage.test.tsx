import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogNotFoundPage } from './CatalogNotFoundPage'

describe('CatalogNotFoundPage', () => {
  it('renders a localized not-found state inside a page with a working return', async () => {
    const { container } = await renderWithProviders(<CatalogNotFoundPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Title not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
      'href',
      '/browse/movies'
    )
    expect(container.textContent).not.toMatch(/404|CATALOG_NOT_FOUND|stack/i)
  })

  it('renders in Spanish', async () => {
    await renderWithProviders(<CatalogNotFoundPage />, { locale: 'es' })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Título no encontrado' })
    ).toBeInTheDocument()
  })
})
