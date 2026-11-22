import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { movieItem, secondMovieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCard } from './CatalogCard'
import { CatalogGrid } from './CatalogGrid'

describe('CatalogGrid', () => {
  it('renders a semantic list with an accessible name in provider order', async () => {
    await renderWithProviders(
      <CatalogGrid label="Popular">
        {[movieItem(), secondMovieItem()].map((item) => (
          <li key={item.id}>
            <CatalogCard item={item} />
          </li>
        ))}
      </CatalogGrid>
    )

    const list = screen.getByRole('list', { name: 'Popular' })
    const items = screen.getAllByRole('listitem')
    expect(list).toBeInTheDocument()
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Fight Club')
    expect(items[1]).toHaveTextContent('Arrival')
  })

  it('declares the responsive column contract', async () => {
    await renderWithProviders(<CatalogGrid label="Popular">{null}</CatalogGrid>)
    const list = screen.getByRole('list')
    expect(list.className).toContain('grid-cols-2')
    expect(list.className).toContain('md:grid-cols-3')
    expect(list.className).toContain('lg:grid-cols-4')
    expect(list.className).toContain('xl:grid-cols-5')
  })
})
