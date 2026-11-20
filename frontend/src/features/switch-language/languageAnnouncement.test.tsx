import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { LanguageSwitcher } from './ui/LanguageSwitcher'

const announcementRegions = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[aria-live]'))

describe('language announcements', () => {
  it('announces one completed change and clears the message before reuse', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<LanguageSwitcher groupLabel="Interface language" />)

    await user.click(screen.getByRole('radio', { name: 'Español' }))

    await waitFor(() => {
      expect(announcementRegions().map((region) => region.textContent)).toContain(
        'El idioma de la interfaz ha cambiado a Español'
      )
    })

    await user.click(screen.getByRole('radio', { name: 'English' }))

    await waitFor(() => {
      const texts = announcementRegions().map((region) => region.textContent)
      expect(texts).toContain('Interface language changed to English')
      expect(texts).not.toContain('El idioma de la interfaz ha cambiado a Español')
    })

    const messages = announcementRegions().filter((region) => (region.textContent ?? '').length > 0)
    expect(messages).toHaveLength(1)
  })
})
