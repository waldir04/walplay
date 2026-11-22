import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { movieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCard } from './CatalogCard'

describe('CatalogCard honesty', () => {
  it('never invents a title, date, rating, or genre', async () => {
    const { container } = await renderWithProviders(
      <CatalogCard
        item={movieItem({
          originalTitle: undefined,
          releaseYear: undefined,
          rating: undefined,
          genres: [],
          poster: undefined,
        })}
      />
    )

    const text = container.textContent ?? ''
    expect(text).not.toMatch(/\bUntitled\b/)
    expect(text).not.toMatch(/—|–/)
    expect(text).not.toMatch(/\b0\s*\/\s*10\b/)
    expect(text).not.toMatch(/\b18\b/)
    expect(screen.getByRole('link')).toHaveAccessibleName('Fight Club, Movies')
  })
})
