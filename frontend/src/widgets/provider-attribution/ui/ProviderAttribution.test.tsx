import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'
import { ProviderAttribution } from './ProviderAttribution'

describe('ProviderAttribution', () => {
  it('renders the official mark and the non-endorsement statement', async () => {
    await renderWithProviders(<ProviderAttribution />)

    const mark = document.querySelector('img')
    expect(mark).not.toBeNull()
    expect(mark).toHaveAttribute('alt', 'TMDB')
    expect(mark?.getAttribute('src')).toMatch(/^(data:image\/svg\+xml|\/)/)
    expect(document.body.textContent).toContain(
      'This product uses the TMDB API but is not endorsed or certified by TMDB.'
    )
  })

  it('is a page-level labelled region', async () => {
    await renderWithProviders(<ProviderAttribution />)
    expect(document.querySelector('section')).toHaveAttribute('aria-label', 'Provider attribution')
  })
})
