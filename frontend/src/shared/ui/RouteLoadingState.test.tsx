import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { runAxe } from '@/test/axe'

import { RouteLoadingState } from './RouteLoadingState'

describe('RouteLoadingState', () => {
  it('exposes a busy status with an accessible label', () => {
    render(<RouteLoadingState heading="Preparing this page" busyLabel="Page content is loading" />)

    const status = screen.getByRole('status', { name: 'Page content is loading' })
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Preparing this page' })
    ).toBeInTheDocument()
  })

  it('hides decorative skeletons from assistive technology', () => {
    const { container } = render(<RouteLoadingState heading="Preparing" busyLabel="Busy" />)

    const decorative = container.querySelectorAll('[aria-hidden="true"]')
    expect(decorative.length).toBeGreaterThan(0)
  })

  it('uses no spinner or bare loading text as the only indication', () => {
    const { container } = render(<RouteLoadingState heading="Preparing" busyLabel="Busy" />)
    const text = container.textContent ?? ''

    expect(text.trim()).not.toBe('Loading…')
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('has no critical or serious accessibility violations', async () => {
    const { container } = render(<RouteLoadingState heading="Preparing" busyLabel="Busy" />)

    expect(await runAxe(container)).toHaveNoViolations()
  })
})
