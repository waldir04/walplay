import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogGrid } from './CatalogGrid'

describe('CatalogGrid responsive contract', () => {
  it('yields 2, 3, 4, and 5 columns at the supported breakpoints', async () => {
    await renderWithProviders(<CatalogGrid label="Titles">{null}</CatalogGrid>)
    const list = document.querySelector('ul')
    expect(list?.className).toContain('grid-cols-2')
    expect(list?.className).toContain('md:grid-cols-3')
    expect(list?.className).toContain('lg:grid-cols-4')
    expect(list?.className).toContain('xl:grid-cols-5')
  })

  it('introduces no fixed width that would force horizontal scrolling', async () => {
    await renderWithProviders(<CatalogGrid label="Titles">{null}</CatalogGrid>)
    const list = document.querySelector('ul')
    expect(list?.className).not.toMatch(/\bw-\[\d+px\]/)
    expect(list?.className).toContain('grid')
  })
})
