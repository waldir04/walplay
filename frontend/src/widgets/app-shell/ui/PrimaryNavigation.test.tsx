import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

describe('responsive navigation presentation', () => {
  it('shows the compact trigger below the wide breakpoint', async () => {
    installMatchMediaMock(false)
    renderApp(['/'])

    await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })

    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('shows the wide navigation at 768px and hides the compact trigger', async () => {
    installMatchMediaMock(true)
    renderApp(['/'])

    await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open navigation menu' })).not.toBeInTheDocument()
  })
})

describe('PrimaryNavigation', () => {
  beforeEach(() => {
    installMatchMediaMock(true)
  })

  it('marks the current destination and provides multiple non-color cues', async () => {
    renderApp(['/settings'])

    await screen.findByRole('heading', { level: 1, name: 'Settings' })

    const settingsLink = screen.getByRole('link', { name: /Settings/ })
    expect(settingsLink).toHaveAttribute('aria-current', 'page')
    expect(settingsLink.className).toContain('bg-surface-raised')
    expect(settingsLink.className).toContain('font-semibold')
    expect(settingsLink.querySelector('[aria-hidden="true"]')).not.toBeNull()

    const homeLink = screen.getByRole('link', { name: 'Home' })
    expect(homeLink).not.toHaveAttribute('aria-current')
  })

  it('provides at least 44px navigation targets', async () => {
    renderApp(['/'])

    const nav = await screen.findByRole('navigation', { name: 'Primary navigation' })
    const links = nav.querySelectorAll('a')

    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => {
      expect(link.className).toContain('min-h-11')
    })
  })
})
