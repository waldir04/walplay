import { waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderApp } from '@/test/renderApp'

describe('usePageTitle', () => {
  it.each([
    ['/', 'Home · Walplay'],
    ['/settings', 'Settings · Walplay'],
    ['/search', 'Search · Walplay'],
    ['/missing-page', 'Page not found · Walplay'],
  ])('sets the localized title for %s', async (path, expectedTitle) => {
    renderApp([path])

    await waitFor(() => {
      expect(document.title).toBe(expectedTitle)
    })
  })

  it('updates the title on language change without a reload', async () => {
    const { router } = renderApp(['/settings'])
    await waitFor(() => expect(document.title).toBe('Settings · Walplay'))

    const { i18n } = await import('@/app/i18n')
    await i18n.changeLanguage('es')

    await waitFor(() => expect(document.title).toBe('Ajustes · Walplay'))
    expect(router.state.location.pathname).toBe('/settings')
  })
})
