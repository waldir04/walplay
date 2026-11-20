import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { Link } from './Link'

describe('Link', () => {
  it('renders a router link with an accessible name from its content', async () => {
    await renderWithProviders(<Link to="/settings">Settings</Link>)

    const link = screen.getByRole('link', { name: 'Settings' })
    expect(link).toHaveAttribute('href', '/settings')
  })

  it('uses semantic tokens and the shared focus outline', async () => {
    await renderWithProviders(<Link to="/">Home</Link>)

    const link = screen.getByRole('link', { name: 'Home' })
    expect(link.className).toContain('text-primary')
    expect(link.className).toContain('focus-visible:outline-2')
    expect(link.className).not.toMatch(/#[0-9a-f]{3,8}/i)
  })
})
