import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { movieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCard } from './CatalogCard'

describe('CatalogCard interactive targets', () => {
  it('exposes exactly one interactive element', async () => {
    await renderWithProviders(<CatalogCard item={movieItem()} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('includes year and out-of-10 rating only when present', async () => {
    await renderWithProviders(<CatalogCard item={movieItem()} />)
    const accessibleName = screen.getByRole('link').getAttribute('aria-label') ?? ''
    expect(accessibleName).toContain('1999')
    expect(accessibleName).toContain('8.4 out of 10')
  })

  it('does not require hover to expose information', async () => {
    const { container } = await renderWithProviders(<CatalogCard item={movieItem()} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Fight Club')
    expect(text).toContain('Movies')
    expect(text).toContain('1999')
    expect(text).toContain('8.4 / 10')
  })
})
