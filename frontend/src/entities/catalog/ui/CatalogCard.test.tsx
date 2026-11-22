import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { movieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCard } from './CatalogCard'

describe('CatalogCard', () => {
  it('renders one interactive target with a complete accessible name', async () => {
    const { container } = await renderWithProviders(<CatalogCard item={movieItem()} />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAccessibleName('Fight Club, Movies, 1999, 8.4 out of 10')
    expect(links[0]).toHaveAttribute('href', '/browse/movies/title/d2wxOm1vdmllOjU1MA')
    expect(container.querySelectorAll('a')).toHaveLength(1)
  })

  it('shows title, textual media type, year, rating, and genres', async () => {
    await renderWithProviders(<CatalogCard item={movieItem()} />)

    expect(screen.getByText('Fight Club')).toBeInTheDocument()
    expect(screen.getByText('Movies')).toBeInTheDocument()
    expect(screen.getByText('1999')).toBeInTheDocument()
    expect(screen.getByText('8.4 / 10')).toBeInTheDocument()
    expect(screen.getByText('Drama')).toBeInTheDocument()
  })

  it('loads artwork lazily with a reserved ratio and responsive candidates', async () => {
    await renderWithProviders(<CatalogCard item={movieItem()} />)

    const image = document.querySelector('img')
    expect(image).not.toBeNull()
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('decoding', 'async')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('aria-hidden', 'true')
    expect(image?.getAttribute('srcset')).toContain('780w')
    expect(image?.className).toContain('aspect-[2/3]')
  })

  it('falls back to a neutral artwork panel when the poster is absent', async () => {
    await renderWithProviders(<CatalogCard item={movieItem({ poster: undefined })} />)

    expect(document.querySelector('img')).toBeNull()
    const fallback = document.querySelector('[aria-hidden="true"]')
    expect(fallback).not.toBeNull()
    expect(fallback?.textContent).toContain('Fight Club')
    expect(fallback?.textContent).toContain('Movies')
  })

  it('swaps to the fallback when the image fails without exposing an error', async () => {
    await renderWithProviders(<CatalogCard item={movieItem()} />)

    const image = document.querySelector('img')
    expect(image).not.toBeNull()
    fireEvent.error(image as HTMLImageElement)

    expect(document.querySelector('img')).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAccessibleName('Fight Club, Movies, 1999, 8.4 out of 10')
  })
})
