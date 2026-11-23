import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RelatedTitles } from './RelatedTitles'
import { renderWithProviders } from '@/test/renderWithProviders'
import { MOVIE_ID, movieItem } from '@/test/fixtures/catalog'
import type { CatalogItem } from '@/entities/catalog'

const items = (count: number): CatalogItem[] =>
  Array.from({ length: count }, (_, index) =>
    movieItem({
      id: `d2wxOm1vdmllOj${String(index + 1).padStart(3, '0')}A`,
      title: `Related ${index + 1}`,
      rating: { value: 8, voteCount: 100, scale: 10 },
    })
  )

describe('RelatedTitles', () => {
  it('bounds the list to twelve items in provider order', async () => {
    const { container } = await renderWithProviders(
      <RelatedTitles items={items(20)} label="Similar titles" />
    )
    expect(container.querySelectorAll('li')).toHaveLength(12)
    expect(container.querySelector('li')).toHaveTextContent('Related 1')
    expect(container).not.toHaveTextContent('Related 13')
  })

  it('renders content type in text and matching type-specific links', async () => {
    await renderWithProviders(
      <RelatedTitles items={[movieItem({ id: MOVIE_ID, title: 'Se7en' })]} label="Similar titles" />
    )
    expect(screen.getByText('Se7en')).toBeInTheDocument()
    expect(screen.getByText('Movies')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', `/browse/movies/title/${MOVIE_ID}`)
  })

  it('does not render a rating on a related card', async () => {
    const { container } = await renderWithProviders(
      <RelatedTitles items={items(2)} label="Similar titles" />
    )
    expect(container).not.toHaveTextContent('8.0 / 10')
    expect(container).not.toHaveTextContent('/ 10')
    expect(screen.getByRole('link', { name: /Related 1, Movies/ })).not.toHaveAccessibleName(
      /\d out of 10/
    )
  })

  it('keeps the list label for assistive technology', async () => {
    await renderWithProviders(<RelatedTitles items={items(2)} label="Similar titles" />)
    expect(screen.getByRole('list', { name: 'Similar titles' })).toBeInTheDocument()
  })
})
