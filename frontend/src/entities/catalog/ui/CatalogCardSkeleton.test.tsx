import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCardSkeleton } from './CatalogCardSkeleton'

describe('CatalogCardSkeleton', () => {
  it('is hidden from assistive technology and reserves the card layout', async () => {
    const { container } = await renderWithProviders(<CatalogCardSkeleton />)
    const root = container.firstElementChild

    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    expect(container.innerHTML).toContain('aspect-[2/3]')
  })

  it('uses reduced-motion-safe skeleton animation', async () => {
    const { container } = await renderWithProviders(<CatalogCardSkeleton />)
    expect(container.innerHTML).toContain('motion-safe:animate-pulse')
  })
})
