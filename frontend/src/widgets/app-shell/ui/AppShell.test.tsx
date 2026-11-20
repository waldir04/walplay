import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

beforeEach(() => {
  installMatchMediaMock(true)
})

describe('AppShell', () => {
  it('renders exactly one header, labelled navigation, and main region', async () => {
    const { container } = renderApp(['/'])

    await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })

    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(screen.getAllByRole('navigation', { name: 'Primary navigation' })).toHaveLength(1)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('exposes the brand link with the application accessible name', async () => {
    renderApp(['/settings'])

    await screen.findByRole('heading', { level: 1, name: 'Settings' })

    const brand = screen.getByRole('link', { name: 'Walplay' })
    expect(brand).toHaveAttribute('href', '/')
  })

  it('centers a padded main content region', async () => {
    renderApp(['/'])

    const main = await screen.findByRole('main')
    expect(main.className).toContain('mx-auto')
    expect(main.className).toContain('max-w-5xl')
    expect(main.className).toContain('px-page')
    expect(main.className).toContain('sm:px-page-sm')
    expect(main).toHaveAttribute('tabindex', '-1')
  })

  it('renders no footer, legal region, or header language shortcut', async () => {
    renderApp(['/'])

    const header = await screen.findByRole('banner')
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(header.textContent).not.toMatch(/language|legal|privacy/i)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('places the skip link as the first focusable element', async () => {
    const { container } = renderApp(['/'])

    await screen.findByRole('heading', { level: 1 })

    const focusables = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    expect(focusables[0]).toHaveTextContent('Skip to main content')
  })
})
