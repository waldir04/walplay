import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { HomePage } from './HomePage'

describe('HomePage empty state', () => {
  it('offers no action because none is functional yet', async () => {
    await renderWithProviders(<HomePage />)

    const emptyState = screen
      .getByRole('heading', { level: 2, name: 'Your next watch starts here' })
      .closest('section')

    expect(emptyState).not.toBeNull()
    expect(emptyState?.querySelector('button')).toBeNull()
    expect(emptyState?.querySelector('a')).toBeNull()
  })

  it('renders no non-functional call to action anywhere on the page', async () => {
    await renderWithProviders(<HomePage />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
