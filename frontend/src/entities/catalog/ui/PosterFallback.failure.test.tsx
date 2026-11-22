import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { movieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCard } from './CatalogCard'

describe('CatalogCard poster failure', () => {
  it('keeps the reserved layout and accessible name after an image failure', async () => {
    const { container } = await renderWithProviders(<CatalogCard item={movieItem()} />)
    const image = container.querySelector('img')
    expect(image).not.toBeNull()

    fireEvent.error(image as HTMLImageElement)

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[aria-hidden="true"]')?.className).toContain('aspect-[2/3]')
    expect(screen.getByRole('link')).toHaveAccessibleName('Fight Club, Movies, 1999, 8.4 out of 10')
  })

  it('does not expose an error message when artwork fails', async () => {
    const { container } = await renderWithProviders(<CatalogCard item={movieItem()} />)
    fireEvent.error(container.querySelector('img') as HTMLImageElement)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/error|failed/i)
  })
})
