import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { PosterFallback } from './PosterFallback'

describe('PosterFallback', () => {
  it('contains the title and media type and stays hidden from the accessible name', async () => {
    const { container } = await renderWithProviders(
      <PosterFallback title="Fight Club" mediaTypeLabel="Movies" />
    )

    const fallback = container.firstElementChild
    expect(fallback).not.toBeNull()
    expect(fallback).toHaveAttribute('aria-hidden', 'true')
    expect(fallback?.textContent).toContain('Fight Club')
    expect(fallback?.textContent).toContain('Movies')
    expect(fallback?.className).toContain('aspect-[2/3]')
  })

  it('uses no broken-image icon or image element', async () => {
    const { container } = await renderWithProviders(
      <PosterFallback title="Fight Club" mediaTypeLabel="Movies" />
    )
    expect(container.querySelector('img')).toBeNull()
  })
})
