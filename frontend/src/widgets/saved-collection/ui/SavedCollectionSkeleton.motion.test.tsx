import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { SavedCollectionSkeleton } from './SavedCollectionSkeleton'

describe('SavedCollectionSkeleton motion', () => {
  it('uses only reduced-motion-safe animation and no spinner', async () => {
    const { container } = await renderWithProviders(<SavedCollectionSkeleton />)

    const animated = container.querySelectorAll('[class*="animate-"]')
    expect(animated.length).toBeGreaterThan(0)
    animated.forEach((element) => {
      expect(element.className).toContain('motion-safe:animate-pulse')
      expect(element.className).not.toMatch(/animate-(spin|bounce|ping)/)
    })
    expect(container.querySelector('[class*="animate-spin"]')).toBeNull()
  })

  it('reserves layout space to avoid a layout shift', async () => {
    const { container } = await renderWithProviders(<SavedCollectionSkeleton />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    const rows = container.querySelectorAll('[class*="aspect-[2/3]"]')
    expect(rows.length).toBeGreaterThan(0)
    rows.forEach((row) => {
      expect(row.className).toContain('w-16')
    })
  })
})
