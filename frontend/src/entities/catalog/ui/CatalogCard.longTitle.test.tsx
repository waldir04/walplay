import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { itemWithLongSpanishTitle } from '@/test/fixtures/catalog/incomplete'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCard } from './CatalogCard'

describe('CatalogCard long titles', () => {
  it('keeps the full title in the accessible name while clamping visible text', async () => {
    const item = itemWithLongSpanishTitle()
    await renderWithProviders(<CatalogCard item={item} />, { locale: 'es' })

    const title = screen.getByText(item.title)
    expect(title.className).toContain('line-clamp-2')
    expect(screen.getByRole('link')).toHaveAccessibleName(new RegExp('^El extraordinariamente'))
  })

  it('never hides the only occurrence of the title', async () => {
    const item = itemWithLongSpanishTitle()
    const { container } = await renderWithProviders(<CatalogCard item={item} />, { locale: 'es' })
    const occurrences = (container.textContent ?? '').split(item.title).length - 1
    expect(occurrences).toBeGreaterThanOrEqual(1)
  })
})
