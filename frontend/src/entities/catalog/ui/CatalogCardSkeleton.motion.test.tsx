import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCardSkeleton } from './CatalogCardSkeleton'

describe('CatalogCardSkeleton motion', () => {
  it('animates only when reduced motion is not preferred', async () => {
    const { container } = await renderWithProviders(<CatalogCardSkeleton />)
    expect(container.innerHTML).toContain('motion-safe:animate-pulse')
    expect(container.querySelector('.animate-pulse')).toBeNull()
  })

  it('reserves the artwork ratio and text lines without shifting layout', async () => {
    const { container } = await renderWithProviders(<CatalogCardSkeleton />)
    expect(container.innerHTML).toContain('aspect-[2/3]')
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(3)
  })
})
