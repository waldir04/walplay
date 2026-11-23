import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProviderAttribution } from '@/widgets/provider-attribution/ui/ProviderAttribution'

import { AvailabilityAttribution } from './AvailabilityAttribution'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('AvailabilityAttribution', () => {
  it('shows the text-only JustWatch attribution without interaction', async () => {
    await renderWithProviders(<AvailabilityAttribution />)

    expect(screen.getByRole('region', { name: 'Availability attribution' })).toBeInTheDocument()
    expect(screen.getByText('Availability data provided by JustWatch')).toBeVisible()
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('does not remove or replace the existing TMDB notice', async () => {
    await renderWithProviders(
      <div>
        <ProviderAttribution />
        <AvailabilityAttribution />
      </div>
    )

    expect(
      screen.getByText(/This product uses the TMDB API but is not endorsed or certified by TMDB/)
    ).toBeVisible()
    expect(screen.getByText('Availability data provided by JustWatch')).toBeVisible()
  })
})
