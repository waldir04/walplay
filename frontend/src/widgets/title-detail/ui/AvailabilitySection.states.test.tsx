import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { AvailableData } from '@/entities/catalog'

import { AvailabilitySection } from './AvailabilitySection'
import {
  availabilityMeta,
  availableData,
  noInformationData,
  unsupportedRegionData,
} from '@/test/fixtures/availability'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('AvailabilitySection states', () => {
  it('renders an accessible loading skeleton with decorative shapes', async () => {
    const { container } = await renderWithProviders(
      <AvailabilitySection region="CO" state={{ status: 'loading', onRetry: vi.fn() }} />
    )

    const section = screen.getByRole('region', { name: 'Where to watch' })
    expect(section).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading availability information')).toHaveClass('sr-only')
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders honest no-information copy that does not claim unavailability', async () => {
    await renderWithProviders(
      <AvailabilitySection
        region="CO"
        state={{
          status: 'ready',
          data: noInformationData(),
          meta: availabilityMeta(),
          onRetry: vi.fn(),
        }}
      />
    )

    expect(screen.getByText('Availability information not found')).toBeInTheDocument()
    expect(screen.getByText(/This does not mean the title is unavailable/)).toBeInTheDocument()
    expect(
      screen.getByText(/You can check the availability source or a provider directly/)
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  it('renders only the usable partial categories', async () => {
    const data: AvailableData = {
      state: 'available',
      region: 'CO',
      groups: [
        { category: 'subscription', providers: [{ name: 'Streaming service' }] },
        { category: 'rent', providers: [{ name: 'Rental service' }] },
      ],
    }
    await renderWithProviders(
      <AvailabilitySection
        region="CO"
        state={{ status: 'ready', data, meta: availabilityMeta(), onRetry: vi.fn() }}
      />
    )

    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual(['Included with a subscription', 'Rent'])
  })

  it('renders the unsupported-region state with the informational notice', async () => {
    await renderWithProviders(
      <AvailabilitySection
        region="FR"
        attribution={<p>Availability attribution</p>}
        state={{
          status: 'ready',
          data: unsupportedRegionData('FR'),
          meta: availabilityMeta(),
          onRetry: vi.fn(),
        }}
      />
    )

    expect(screen.getByText('Region not supported')).toBeInTheDocument()
    expect(screen.getByText(/Availability is informational, region-specific/)).toBeVisible()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByText(/Checked by Walplay on/)).toBeNull()
    expect(screen.queryByText('Availability attribution')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders an error alert with retry and no fabricated availability claim', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    await renderWithProviders(
      <AvailabilitySection region="CO" state={{ status: 'error', onRetry }} />
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Availability could not be loaded')
    expect(alert).toHaveTextContent('The rest of the title page is still available.')
    expect(screen.queryByText('Availability information not found')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders the available state when data is present', async () => {
    await renderWithProviders(
      <AvailabilitySection
        region="CO"
        state={{
          status: 'ready',
          data: availableData(),
          meta: availabilityMeta(),
          onRetry: vi.fn(),
        }}
      />
    )

    expect(screen.getByText('HBO Max')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
