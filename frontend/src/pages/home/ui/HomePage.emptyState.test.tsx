import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { HomePage } from './HomePage'

describe('HomePage catalog entry', () => {
  it('links to the Browse destination', async () => {
    await renderWithProviders(<HomePage />)

    const link = screen.getByRole('link', { name: 'Browse the catalog' })
    expect(link).toHaveAttribute('href', '/browse')
  })

  it('adds no other catalog functionality', async () => {
    await renderWithProviders(<HomePage />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})
