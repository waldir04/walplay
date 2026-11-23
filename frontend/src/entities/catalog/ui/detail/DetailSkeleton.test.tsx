import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DetailSkeleton } from './DetailSkeleton'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('DetailSkeleton', () => {
  it('announces a busy region with the localized core loading label', async () => {
    const { container } = await renderWithProviders(<DetailSkeleton />)
    const region = screen.getByLabelText('Loading title details')
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
  })

  it('reserves identity, artwork, facts, and overview dimensions', async () => {
    const { container } = await renderWithProviders(<DetailSkeleton />)
    expect(container.querySelector('.aspect-\\[2\\/3\\]')).not.toBeNull()
    expect(container.querySelectorAll('.h-4').length).toBeGreaterThan(2)
    expect(container.querySelectorAll('.h-6').length).toBeGreaterThan(0)
  })
})
