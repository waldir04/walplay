import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AvailabilityRegionSelector } from '@/features/select-availability-region'
import { runAxe } from '@/test/axe'
import { availabilityMeta, availableData } from '@/test/fixtures/availability'
import { renderWithProviders } from '@/test/renderWithProviders'

import { AvailabilitySection } from './AvailabilitySection'

const renderSection = async () => {
  const result = await renderWithProviders(
    <AvailabilitySection
      region="CO"
      regionSelector={
        <AvailabilityRegionSelector value="CO" regions={['CO', 'US']} onChange={vi.fn()} />
      }
      state={{
        status: 'ready',
        data: availableData(),
        meta: availabilityMeta(),
        onRetry: vi.fn(),
      }}
    />
  )
  return result
}

describe('AvailabilitySection accessibility', () => {
  it('has no automated accessibility violations', async () => {
    const { container } = await renderSection()

    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('uses one section heading and category subheadings with list semantics', async () => {
    await renderSection()

    expect(screen.getByRole('heading', { level: 2, name: 'Where to watch' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
    expect(screen.getAllByRole('list')).toHaveLength(2)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('exposes the region through the section description', async () => {
    await renderSection()

    const section = screen.getByRole('region', { name: 'Where to watch' })
    const describedBy = section.getAttribute('aria-describedby')
    expect(describedBy).toBe('availability-region-context')
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent(
      'Availability in Colombia (CO)'
    )
    expect(section).toHaveAttribute('aria-busy', 'false')
  })

  it('keeps the selector, retry, and destination keyboard reachable with visible focus styles', async () => {
    const { unmount } = await renderSection()

    expect(screen.getByLabelText('Availability region')).toHaveClass('min-h-11')
    const destination = screen.getByRole('link')
    expect(destination).toHaveClass('min-h-11')
    expect(destination.className).toContain('focus-visible:outline')
    expect(destination.className).toContain('motion-reduce:transition-none')
    unmount()

    await renderWithProviders(
      <AvailabilitySection region="CO" state={{ status: 'error', onRetry: vi.fn() }} />
    )
    const retry = screen.getByRole('button', { name: 'Try again' })
    expect(retry).toHaveClass('min-h-11')
    expect(retry.className).toContain('focus-visible:outline')
  })

  it('conveys state through text rather than color alone', async () => {
    const { unmount } = await renderSection()
    expect(screen.getByText('Availability in Colombia (CO)')).toBeInTheDocument()
    expect(screen.getByText(/Checked by Walplay on/)).toBeInTheDocument()
    unmount()

    await renderWithProviders(
      <AvailabilitySection
        region="CO"
        state={{
          status: 'ready',
          data: { state: 'no-information', region: 'CO', groups: [] },
          meta: availabilityMeta(),
          onRetry: vi.fn(),
        }}
      />
    )
    expect(screen.getByText('Availability information not found')).toBeInTheDocument()
  })

  it('does not autoplay media or use attention-seeking animation', async () => {
    const { container } = await renderSection()

    expect(container.querySelectorAll('video, audio, iframe')).toHaveLength(0)
    expect(container.querySelector('[class*="animate-"]:not([class*="motion-safe"])')).toBeNull()
  })
})
