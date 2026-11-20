import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LiveRegion } from './LiveRegion'

afterEach(() => {
  vi.useRealTimers()
})

describe('LiveRegion', () => {
  it('renders a visually hidden polite region by default', () => {
    render(<LiveRegion message="" />)

    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region.className).toContain('sr-only')
  })

  it('supports an assertive politeness option', () => {
    render(<LiveRegion message="" politeness="assertive" />)

    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
  })

  it('clears the previous message before setting the next one', async () => {
    vi.useFakeTimers()
    const { rerender } = render(<LiveRegion message="First message" />)

    await act(async () => {
      vi.runAllTimers()
    })
    expect(screen.getByRole('status')).toHaveTextContent('First message')

    await act(async () => {
      rerender(<LiveRegion message="Second message" />)
    })
    expect(screen.getByRole('status')).toHaveTextContent('')

    await act(async () => {
      vi.runAllTimers()
    })
    expect(screen.getByRole('status')).toHaveTextContent('Second message')
  })
})
