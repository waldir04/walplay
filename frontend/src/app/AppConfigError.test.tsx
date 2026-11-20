import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { AppConfigError } from './AppConfigError'

describe('AppConfigError', () => {
  it('renders the localized fatal screen without the shell', async () => {
    await renderWithProviders(<AppConfigError />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Walplay cannot start' })
    ).toBeInTheDocument()
    expect(screen.getByText(/missing valid configuration/i)).toBeInTheDocument()
    expect(screen.queryByRole('header')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
  })

  it('renders in Spanish when the resolved startup language is Spanish', async () => {
    await renderWithProviders(<AppConfigError />, { locale: 'es' })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Walplay no puede iniciarse' })
    ).toBeInTheDocument()
  })

  it('never exposes variable names, values, or technical detail', async () => {
    const { container } = await renderWithProviders(<AppConfigError />, { locale: 'es' })
    const content = container.textContent ?? ''

    expect(content).not.toMatch(/VITE_/)
    expect(content).not.toMatch(/import\.meta/)
    expect(content).not.toMatch(/stack/i)
    expect(content).not.toMatch(/undefined/)
  })
})
