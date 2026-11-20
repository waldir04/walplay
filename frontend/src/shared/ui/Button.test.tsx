import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'

describe('Button', () => {
  it('preserves native button semantics and forwards activation', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    render(
      <Button variant="primary" onClick={onClick}>
        Save
      </Button>
    )

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.className).toContain('bg-primary')
    expect(button.className).toContain('min-h-11')
    expect(button.className).toContain('rounded-control')

    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('supports secondary and ghost variants', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-border-strong')
    expect(screen.getByRole('button')).toHaveClass('min-h-11')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-primary')
  })

  it('supports an accessible name for icon-only ghost use', () => {
    render(
      <Button variant="ghost" aria-label="Close menu">
        <span aria-hidden="true">×</span>
      </Button>
    )

    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument()
  })

  it('includes the shared focus treatment', () => {
    render(<Button>Focusable</Button>)

    expect(screen.getByRole('button').className).toContain('focus-visible:outline-2')
  })
})
