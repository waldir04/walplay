import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { runAxe } from '@/test/axe'

import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

const criticalOrSerious = (violations: { impact?: string | null }[]): unknown[] =>
  violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious'
  )

describe('accessibility', () => {
  it.each([
    ['/', 'Welcome to Walplay'],
    ['/settings', 'Settings'],
    ['/missing-page', 'Page not found'],
  ])('has no critical or serious violations on %s', async (path, heading) => {
    installMatchMediaMock(true)
    const { container } = renderApp([path])

    await screen.findByRole('heading', { level: 1, name: heading })

    const results = await runAxe(container)
    expect(criticalOrSerious(results.violations)).toEqual([])
    expect(results).toHaveNoViolations()
  })

  it('has no critical or serious violations with the compact menu open', async () => {
    installMatchMediaMock(false)
    const user = userEvent.setup()
    const { container } = renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    expect(document.querySelector('dialog')).toHaveAttribute('open')

    const results = await runAxe(container)
    expect(criticalOrSerious(results.violations)).toEqual([])
  })

  it('exposes meaningful names for brand, navigation, menu, and language controls', async () => {
    installMatchMediaMock(false)
    const user = userEvent.setup()
    renderApp(['/settings'])
    await screen.findByRole('heading', { level: 1, name: 'Settings' })

    expect(screen.getByRole('link', { name: 'Walplay' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Interface language' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
  })
})
