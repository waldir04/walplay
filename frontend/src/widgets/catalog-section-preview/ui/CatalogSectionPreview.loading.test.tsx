import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogSectionPreview } from './CatalogSectionPreview'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
  vi.mocked(fetchSectionPage).mockReturnValue(new Promise(() => undefined))
})

describe('CatalogSectionPreview loading state', () => {
  it('uses a bust region with hidden skeletons and no spinner-only treatment', async () => {
    const { container } = await renderWithProviders(
      <CatalogSectionPreview
        mediaType="movie"
        capability={{ id: 'popular', order: 2, mediaTypes: ['movie'], paginated: true }}
        language="en"
      />
    )

    await waitFor(() =>
      expect(container.querySelector('section')).toHaveAttribute('aria-busy', 'true')
    )
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
    expect(container.textContent).not.toMatch(/loading…/i)
  })

  it('reserves the final card ratio to avoid layout shift', async () => {
    const { container } = await renderWithProviders(
      <CatalogSectionPreview
        mediaType="movie"
        capability={{ id: 'popular', order: 2, mediaTypes: ['movie'], paginated: true }}
        language="en"
      />
    )
    await waitFor(() => expect(container.innerHTML).toContain('aspect-[2/3]'))
  })
})
