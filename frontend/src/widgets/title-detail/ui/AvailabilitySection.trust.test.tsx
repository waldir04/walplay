import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AvailabilityData, AvailabilityMeta } from '@/entities/catalog'

import { AvailabilitySection } from './AvailabilitySection'
import type { AvailabilitySectionProps } from './AvailabilitySection'
import {
  availabilityDestinationUrl,
  availabilityMeta,
  availableData,
  noInformationData,
  unsupportedRegionData,
} from '@/test/fixtures/availability'
import { renderWithProviders } from '@/test/renderWithProviders'

const renderReady = async (
  data: AvailabilityData,
  meta: AvailabilityMeta = availabilityMeta(),
  props: Partial<AvailabilitySectionProps> = {}
) =>
  renderWithProviders(
    <AvailabilitySection
      region={data.region}
      state={{ status: 'ready', data, meta, onRetry: vi.fn() }}
      {...props}
    />
  )

describe('availability trust copy', () => {
  it('labels a Walplay check time when the source supplies no timestamp', async () => {
    await renderReady(availableData())

    expect(screen.getByText(/Checked by Walplay on/)).toBeInTheDocument()
    expect(screen.queryByText(/Updated by the source on/)).toBeNull()
  })

  it('labels a source update time only when the source supplies one', async () => {
    await renderReady(
      availableData(),
      availabilityMeta({ sourceUpdatedAt: '2026-11-23T06:00:00.000Z' })
    )

    expect(screen.getByText(/Updated by the source on/)).toBeInTheDocument()
    expect(screen.getByText(/Updated by the source on/)).not.toHaveTextContent(
      'Checked by Walplay on'
    )
  })

  it('shows a last-known banner with date, caution, and retry when stale', async () => {
    const onRetry = vi.fn()
    await renderReady(
      availableData(),
      availabilityMeta({
        stale: true,
        source: 'stale-cache',
        freshness: 'stale',
        lastUpdatedAt: '2026-11-20T09:30:00.000Z',
      }),
      {
        state: {
          status: 'ready',
          data: availableData(),
          meta: availabilityMeta({
            stale: true,
            source: 'stale-cache',
            freshness: 'stale',
            lastUpdatedAt: '2026-11-20T09:30:00.000Z',
          }),
          onRetry,
        },
      }
    )

    expect(screen.getByText('Last known availability')).toBeInTheDocument()
    expect(screen.getByText(/Last checked on/)).toBeInTheDocument()
    expect(screen.getByText(/Availability may have changed/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows the stale banner for a no-information result too', async () => {
    await renderReady(
      noInformationData(),
      availabilityMeta({ stale: true, source: 'stale-cache', freshness: 'stale' })
    )

    expect(screen.getByText('Last known availability')).toBeInTheDocument()
    expect(screen.getByText('Availability information not found')).toBeInTheDocument()
  })

  it('renders the informational disclaimer for every ready state', async () => {
    for (const data of [availableData(), noInformationData(), unsupportedRegionData()]) {
      const { unmount } = await renderReady(data)
      expect(screen.getByText(/Availability is informational, region-specific/)).toBeVisible()
      unmount()
    }
  })

  it('renders an unsupported region without freshness, destination, or attribution', async () => {
    await renderReady(unsupportedRegionData('FR'), availabilityMeta(), {
      region: 'FR',
      attribution: <p>Availability attribution</p>,
    })

    expect(screen.getByText('Availability in France (FR)')).toBeInTheDocument()
    expect(screen.getByText('Region not supported')).toBeInTheDocument()
    expect(
      screen.getByText(/Availability information is not available for France \(FR\) yet/)
    ).toBeInTheDocument()
    expect(screen.queryByText(/Checked by Walplay on/)).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByText('Availability attribution')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps the destination for a no-information result', async () => {
    await renderReady(noInformationData())

    const link = screen.getByRole('link', { name: /View availability details/ })
    expect(link).toHaveAttribute('href', availabilityDestinationUrl)
  })
})
