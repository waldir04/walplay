import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { SettingsPage } from './SettingsPage'

describe('SettingsPage', () => {
  it('renders the purpose, language choice, and storage notice', async () => {
    await renderWithProviders(<SettingsPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText(/choose how Walplay speaks to you/i)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Interface language' })).toBeInTheDocument()
    expect(screen.getByText(/stored only in this browser/i)).toBeInTheDocument()
  })

  it('renders no version, environment, account, or diagnostic content', async () => {
    const { container } = await renderWithProviders(<SettingsPage />)
    const text = container.textContent ?? ''

    expect(text).not.toMatch(/\bversion\b/i)
    expect(text).not.toMatch(/\benvironment\b/i)
    expect(text).not.toMatch(/\baccount\b/i)
    expect(text).not.toMatch(/\bdiagnostic/i)
    expect(text).not.toMatch(/0\.0\.0/)
  })

  it('allows long localized copy to wrap without truncation', async () => {
    const { container } = await renderWithProviders(<SettingsPage />, { locale: 'es' })

    expect(container.innerHTML).not.toMatch(/truncate|whitespace-nowrap/)
    expect(container.querySelector('.flex-col')).not.toBeNull()
    expect(screen.getByText(/almacenamiento del navegador/i)).toBeInTheDocument()
  })

  it('renders the storage notice in both locales with no technical detail', async () => {
    const { unmount } = await renderWithProviders(<SettingsPage />)

    const englishNotice = screen.getByText(/stored only in this browser/i)
    expect(englishNotice.textContent).not.toMatch(/localStorage|VITE_|quota/i)
    unmount()

    await renderWithProviders(<SettingsPage />, { locale: 'es' })

    const spanishNotice = screen.getByText(/se guarda únicamente en este navegador/i)
    expect(spanishNotice.textContent).not.toMatch(/localStorage|VITE_|quota/i)
  })
})
