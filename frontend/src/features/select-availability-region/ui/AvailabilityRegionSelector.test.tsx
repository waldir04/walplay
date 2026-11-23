import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AVAILABILITY_UNSUPPORTED_REGION_DESCRIPTION_ID } from '@/entities/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { AvailabilityRegionSelector } from './AvailabilityRegionSelector'

describe('AvailabilityRegionSelector', () => {
  it('renders a visible label and localized country options', async () => {
    await renderWithProviders(
      <AvailabilityRegionSelector value="CO" regions={['CO', 'US']} onChange={vi.fn()} />
    )

    const select = screen.getByLabelText('Availability region')
    expect(select).toHaveValue('CO')
    expect(screen.getByRole('option', { name: 'Colombia (CO)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'United States (US)' })).toBeInTheDocument()
    expect(select).toHaveClass('min-h-11')
  })

  it('is keyboard operable and reports a supported change', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    await renderWithProviders(
      <AvailabilityRegionSelector value="CO" regions={['CO', 'US']} onChange={onChange} />
    )

    const select = screen.getByLabelText('Availability region')
    select.focus()
    expect(document.activeElement).toBe(select)
    await user.selectOptions(select, 'US')

    expect(onChange).toHaveBeenCalledWith('US')
  })

  it('shows a disabled placeholder and an explanation reference for an unsupported region', async () => {
    await renderWithProviders(
      <AvailabilityRegionSelector value="FR" regions={['CO']} onChange={vi.fn()} />
    )

    const select = screen.getByLabelText('Availability region')
    expect(select).toHaveValue('')
    expect(select).toHaveAttribute(
      'aria-describedby',
      AVAILABILITY_UNSUPPORTED_REGION_DESCRIPTION_ID
    )
    expect(screen.getByRole('option', { name: 'Choose a supported region' })).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Colombia (CO)' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /FR/ })).toBeNull()
  })

  it('lets the visitor leave an unsupported region for a supported one', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    await renderWithProviders(
      <AvailabilityRegionSelector value="FR" regions={['CO']} onChange={onChange} />
    )

    await user.selectOptions(screen.getByLabelText('Availability region'), 'CO')

    expect(onChange).toHaveBeenCalledWith('CO')
  })
})
