import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AvailableData } from '@/entities/catalog'

import { AvailabilitySection } from './AvailabilitySection'
import {
  availabilityDestinationUrl,
  availabilityMeta,
  availableData,
  unsupportedRegionData,
} from '@/test/fixtures/availability'
import { renderWithProviders } from '@/test/renderWithProviders'

const renderAvailable = async (data: AvailableData) =>
  renderWithProviders(
    <AvailabilitySection
      region="CO"
      state={{ status: 'ready', data, meta: availabilityMeta(), onRetry: vi.fn() }}
    />
  )

describe('AvailabilitySection destination', () => {
  it('renders one external destination only when the source supplies one', async () => {
    await renderAvailable(availableData())

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', availabilityDestinationUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAccessibleName(/View availability details/)
    expect(link).toHaveAccessibleName(/www.themoviedb.org/)
    expect(link).toHaveAccessibleName(/in a new tab/)
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('omits the destination when the API does not return one', async () => {
    const data: AvailableData = {
      state: 'available',
      region: 'CO',
      groups: [{ category: 'free', providers: [{ name: 'Free service' }] }],
    }
    await renderAvailable(data)

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Free service')).toBeInTheDocument()
  })

  it('never turns provider rows into links', async () => {
    await renderAvailable(availableData())

    expect(screen.getByText('HBO Max').closest('a')).toBeNull()
    expect(screen.getByText('Movistar Play').closest('a')).toBeNull()
    expect(screen.getByText('Google Play Movies').closest('a')).toBeNull()
  })

  it('shows no freshness, destination, or offers for an unsupported region', async () => {
    await renderWithProviders(
      <AvailabilitySection
        region="FR"
        state={{
          status: 'ready',
          data: unsupportedRegionData('FR'),
          meta: availabilityMeta(),
          onRetry: vi.fn(),
        }}
      />
    )

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('listitem')).toBeNull()
    expect(screen.queryByText(/Checked by Walplay on/)).toBeNull()
    expect(screen.getByText('Region not supported')).toBeInTheDocument()
  })
})
