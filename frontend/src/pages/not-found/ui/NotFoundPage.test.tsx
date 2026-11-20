import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { NotFoundPage } from './NotFoundPage'

describe('NotFoundPage', () => {
  it('renders distinct not-found wording and a working home action', async () => {
    await renderWithProviders(<NotFoundPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByText(/requested does not exist/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })

  it('uses no error or technical wording', async () => {
    const { container } = await renderWithProviders(<NotFoundPage />)

    expect(container.textContent).not.toMatch(/error|stack|module|exception/i)
  })
})
