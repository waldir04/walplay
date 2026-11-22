import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('explains the purpose and offers a working catalog entry', async () => {
    await renderWithProviders(<HomePage />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome to Walplay' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('A calm place to discover films and series worth your time.')
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Start browsing' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the catalog' })).toHaveAttribute(
      'href',
      '/browse'
    )
  })

  it('exposes a focusable page heading for route focus management', async () => {
    await renderWithProviders(<HomePage />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveAttribute('tabindex', '-1')
    expect(heading.id).toBe('page-heading')
  })

  it('contains no fabricated entertainment content', async () => {
    const { container } = await renderWithProviders(<HomePage />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(container.querySelectorAll('img, picture, video')).toHaveLength(0)
    expect(container.textContent).not.toMatch(/\b(?:rating|watch now|availability)\b/i)
  })
})
