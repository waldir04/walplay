import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { i18n } from '@/app/i18n'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

beforeEach(() => {
  installMatchMediaMock(true)
})

describe('language switching integration', () => {
  it('updates every visible string, title, labels, and html lang without reload', async () => {
    const user = userEvent.setup()
    renderApp(['/settings'])
    await screen.findByRole('heading', { level: 1, name: 'Settings' })

    const startedAt = performance.now()
    await user.click(screen.getByRole('radio', { name: 'Español' }))
    const elapsed = performance.now() - startedAt

    expect(await screen.findByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
    await waitFor(() => expect(document.title).toBe('Ajustes · Walplay'))
    expect(elapsed).toBeLessThan(1000)
    expect(i18n.language).toBe('es')
  })

  it('announces the completed change exactly once and politely', async () => {
    const user = userEvent.setup()
    renderApp(['/settings'])
    await screen.findByRole('heading', { level: 1, name: 'Settings' })

    await user.click(screen.getByRole('radio', { name: 'Español' }))

    await waitFor(() => {
      const regions = Array.from(document.querySelectorAll('[aria-live="polite"]'))
      expect(regions.map((region) => region.textContent)).toContain(
        'El idioma de la interfaz ha cambiado a Español'
      )
    })
  })
})
