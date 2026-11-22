import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'
import { ProviderAttribution } from './ProviderAttribution'

describe('ProviderAttribution languages', () => {
  it('renders the localized statement in English', async () => {
    await renderWithProviders(<ProviderAttribution />, { locale: 'en' })
    expect(document.body.textContent).toContain('not endorsed or certified by TMDB')
  })

  it('renders the localized statement in Spanish', async () => {
    await renderWithProviders(<ProviderAttribution />, { locale: 'es' })
    expect(document.body.textContent).toContain('no está respaldado ni certificado por TMDB')
    expect(document.querySelector('img')).not.toBeNull()
  })

  it('keeps the mark present at every supported width', async () => {
    await renderWithProviders(<ProviderAttribution />)
    const section = document.querySelector('section')
    expect(section?.className).toContain('sm:flex-row')
    expect(document.querySelector('img')?.className).toContain('h-6')
  })
})
