import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { movieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'
import { runAxe } from '@/test/axe'

import { CatalogCard } from './CatalogCard'

describe('CatalogCard accessibility', () => {
  it('has one interactive target with title and media type in the name', async () => {
    await renderWithProviders(<CatalogCard item={movieItem()} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link')).toHaveAccessibleName(/Fight Club, Movies/)
  })

  it('has no critical or serious axe violations for incomplete metadata', async () => {
    const { container } = await renderWithProviders(
      <CatalogCard item={movieItem({ poster: undefined, releaseYear: undefined })} />
    )
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })
})
