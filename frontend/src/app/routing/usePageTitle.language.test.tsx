import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { i18n } from '@/app/i18n'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

beforeEach(() => {
  installMatchMediaMock(true)
})

describe('localized document titles', () => {
  it.each([
    ['/', 'Home · Walplay', 'Inicio · Walplay'],
    ['/settings', 'Settings · Walplay', 'Ajustes · Walplay'],
    ['/missing-page', 'Page not found · Walplay', 'Página no encontrada · Walplay'],
  ])('updates the title for %s on language change', async (path, englishTitle, spanishTitle) => {
    renderApp([path])

    await waitFor(() => expect(document.title).toBe(englishTitle))

    await i18n.changeLanguage('es')

    await waitFor(() => expect(document.title).toBe(spanishTitle))
  })
})
