import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { CAPABILITIES, movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'
import { runAxe } from '@/test/axe'

import { BrowsePage } from './BrowsePage'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchCapabilities, fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  vi.mocked(fetchCapabilities).mockReset()
  vi.mocked(fetchSectionPage).mockReset()
})

describe('BrowsePage accessibility', () => {
  it('has one h1, meaningful sections, a labelled media switch, and no serious violations', async () => {
    vi.mocked(fetchCapabilities).mockResolvedValue({ data: { sections: CAPABILITIES } })
    vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [movieItem()] }))

    const { container } = await renderWithProviders(<BrowsePage />, {
      initialEntries: ['/browse/movies'],
    })
    await screen.findAllByText('Fight Club')

    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('group', { name: 'Media type' })).toBeInTheDocument()
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('has no serious violations in the all-sections-failed state', async () => {
    vi.mocked(fetchCapabilities).mockResolvedValue({ data: { sections: CAPABILITIES } })
    vi.mocked(fetchSectionPage).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE'))

    const { container } = await renderWithProviders(<BrowsePage />, {
      initialEntries: ['/browse/movies'],
    })
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(1))
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })
})
