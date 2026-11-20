import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { i18n } from '@/app/i18n'
import { resolveInitialLanguage } from '@/shared/i18n/resolveInitialLanguage'
import { LANGUAGE_STORAGE_KEY } from '@/shared/config/constants'
import { renderWithProviders } from '@/test/renderWithProviders'

import { LanguageSwitcher } from './ui/LanguageSwitcher'

describe('language persistence', () => {
  it('stores the selection and restores it through the resolution chain', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<LanguageSwitcher groupLabel="Interface language" />)

    await user.click(screen.getByRole('radio', { name: 'Español' }))

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '')).toEqual({
        version: 1,
        locale: 'es',
      })
    })

    await i18n.changeLanguage('en')
    const resolved = resolveInitialLanguage({ languages: ['en-US'] })
    expect(resolved).toEqual({ locale: 'es', origin: 'explicit', persistence: 'stored' })
  })

  it.each([
    ['invalid JSON', '{not-json'],
    ['outdated version', JSON.stringify({ version: 9, locale: 'fr' })],
  ])('falls back safely for %s', async (_label, storedValue) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, storedValue)

    const resolved = resolveInitialLanguage({ languages: ['fr-FR'] })
    expect(resolved.locale).toBe('en')

    await renderWithProviders(<LanguageSwitcher groupLabel="Interface language" />)
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked()
  })

  it('falls back when the key is absent', () => {
    const resolved = resolveInitialLanguage({ storage: window.localStorage, languages: ['es-MX'] })

    expect(resolved).toEqual({ locale: 'es', origin: 'detected', persistence: 'absent' })
  })

  it('still switches for the session when storage is unavailable', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const user = userEvent.setup()

    await renderWithProviders(<LanguageSwitcher groupLabel="Interface language" />)
    await user.click(screen.getByRole('radio', { name: 'Español' }))

    await waitFor(() => expect(i18n.language).toBe('es'))
    expect(screen.getByRole('radio', { name: 'Español' })).toBeChecked()

    getItem.mockRestore()
    setItem.mockRestore()
  })
})
