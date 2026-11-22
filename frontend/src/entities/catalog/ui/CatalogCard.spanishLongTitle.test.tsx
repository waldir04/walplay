import { describe, expect, it } from 'vitest'

import { itemWithLongSpanishTitle } from '@/test/fixtures/catalog/incomplete'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCard } from './CatalogCard'

describe('CatalogCard Spanish long titles', () => {
  it('reflows long Spanish titles without clipping the card controls', async () => {
    const { container } = await renderWithProviders(
      <CatalogCard item={itemWithLongSpanishTitle()} />,
      { locale: 'es' }
    )
    const link = container.querySelector('a')
    expect(link).not.toBeNull()
    expect(link?.className).not.toContain('truncate')
    expect(container.textContent).toContain('8,4 / 10')
  })
})
