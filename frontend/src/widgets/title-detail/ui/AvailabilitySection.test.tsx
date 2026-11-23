import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AvailableData } from '@/entities/catalog'

import { AvailabilitySection } from './AvailabilitySection'
import type { AvailabilitySectionProps } from './AvailabilitySection'
import { availableData, availabilityMeta } from '@/test/fixtures/availability'
import { renderWithProviders } from '@/test/renderWithProviders'

const renderSection = async (props: Partial<AvailabilitySectionProps> = {}) =>
  renderWithProviders(
    <AvailabilitySection
      region="CO"
      state={{
        status: 'ready',
        data: availableData(),
        meta: availabilityMeta(),
        onRetry: vi.fn(),
      }}
      {...props}
    />
  )

describe('AvailabilitySection available state', () => {
  it('renders the section heading and the region context', async () => {
    await renderSection()

    expect(screen.getByRole('heading', { level: 2, name: 'Where to watch' })).toBeInTheDocument()
    expect(screen.getByText('Availability in Colombia (CO)')).toBeInTheDocument()
    const section = screen.getByRole('region', { name: 'Where to watch' })
    expect(section).toHaveAttribute('aria-describedby', 'availability-region-context')
  })

  it('renders categories in the fixed order regardless of source order', async () => {
    const data: AvailableData = {
      state: 'available',
      region: 'CO',
      groups: [
        { category: 'buy', providers: [{ name: 'Buy service' }] },
        { category: 'rent', providers: [{ name: 'Rent service' }] },
        { category: 'subscription', providers: [{ name: 'Streaming service' }] },
      ],
    }
    await renderSection({
      state: { status: 'ready', data, meta: availabilityMeta(), onRetry: vi.fn() },
    })

    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual(['Included with a subscription', 'Rent', 'Buy'])
  })

  it('renders provider names in source order', async () => {
    await renderSection()

    const items = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(items).toEqual(['HBO Max', 'Movistar Play', 'Google Play Movies'])
  })

  it('renders a provider that appears in two categories in both categories', async () => {
    const data: AvailableData = {
      state: 'available',
      region: 'CO',
      groups: [
        { category: 'subscription', providers: [{ name: 'HBO Max' }] },
        { category: 'rent', providers: [{ name: 'HBO Max' }] },
      ],
    }
    await renderSection({
      state: { status: 'ready', data, meta: availabilityMeta(), onRetry: vi.fn() },
    })

    expect(screen.getAllByText('HBO Max')).toHaveLength(2)
  })

  it('never renders provider rows as links', async () => {
    const { container } = await renderSection({
      state: {
        status: 'ready',
        data: {
          state: 'available',
          region: 'CO',
          groups: [{ category: 'free', providers: [{ name: 'Free service' }] }],
        },
        meta: availabilityMeta(),
        onRetry: vi.fn(),
      },
    })

    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(
      within(screen.getByRole('region', { name: 'Where to watch' })).queryByRole('link')
    ).toBeNull()
  })

  it('does not offer playback, download, or subscription actions', async () => {
    await renderSection()

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByText(/play now|download|subscribe now|start watching/i)).toBeNull()
  })

  it('renders the attribution and disclaimer slots', async () => {
    await renderSection({ attribution: <p>Availability attribution</p> })

    expect(screen.getByText('Availability attribution')).toBeInTheDocument()
    expect(screen.getByText(/Walplay does not host or stream content/)).toBeInTheDocument()
  })
})
