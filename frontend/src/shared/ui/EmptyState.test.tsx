import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders a real subheading and description', async () => {
    await renderWithProviders(
      <EmptyState title="Nothing here yet" description="There is no content to show." />
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Nothing here yet' })).toBeInTheDocument()
    expect(screen.getByText('There is no content to show.')).toBeInTheDocument()
  })

  it('omits the action entirely when none is supplied', async () => {
    await renderWithProviders(<EmptyState title="Empty" description="Nothing to do." />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders a functional action when provided', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    await renderWithProviders(
      <EmptyState title="Empty" description="Nothing to do." action={{ label: 'Retry', onClick }} />
    )

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
