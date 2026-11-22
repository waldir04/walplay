import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { movieItem } from '@/test/fixtures/catalog'
import {
  itemWithLongSpanishTitle,
  itemWithMissingMetadata,
  itemWithoutPoster,
} from '@/test/fixtures/catalog/incomplete'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCard } from './CatalogCard'

describe('CatalogCard incomplete metadata', () => {
  it('omits year, rating, and genre rows cleanly when absent', async () => {
    await renderWithProviders(<CatalogCard item={itemWithMissingMetadata()} />)

    expect(screen.queryByText('1999')).not.toBeInTheDocument()
    expect(screen.queryByText('8.4 / 10')).not.toBeInTheDocument()
    expect(screen.queryByText('Drama')).not.toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\bUntitled\b/)
  })

  it('keeps the fallback complete when no poster exists', async () => {
    await renderWithProviders(<CatalogCard item={itemWithoutPoster()} />)
    expect(screen.getByRole('link')).toHaveAccessibleName('No Artwork, Movies, 1999, 8.4 out of 10')
  })

  it('uses the original title and remains readable for long titles', async () => {
    const { container } = await renderWithProviders(
      <CatalogCard item={itemWithLongSpanishTitle()} />,
      { locale: 'es' }
    )

    const title = screen.getByText(itemWithLongSpanishTitle().title)
    expect(title.className).toContain('line-clamp-2')
    expect(container.textContent).not.toContain('Untitled')
  })

  it('renders no fabricated values for zero-vote or out-of-range ratings', async () => {
    await renderWithProviders(
      <CatalogCard item={movieItem({ rating: undefined, genres: [], releaseYear: undefined })} />
    )
    expect(screen.getByText('Fight Club')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
