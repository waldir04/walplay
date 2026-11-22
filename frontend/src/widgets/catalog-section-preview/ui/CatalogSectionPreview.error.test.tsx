import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
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

const capability = {
  id: 'popular' as const,
  order: 2,
  mediaTypes: ['movie'] as const,
  paginated: true,
}

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
})

describe('CatalogSectionPreview section isolation', () => {
  it('shows a localized inline error with retry without collapsing the region', async () => {
    vi.mocked(fetchSectionPage).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
    await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('This section could not be loaded')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText(/502|unavailable\./)).not.toBeInTheDocument()
  })

  it('retries only the failed surface', async () => {
    vi.mocked(fetchSectionPage)
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE'))
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()] }))
    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Fight Club')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a stable state on repeated failure', async () => {
    vi.mocked(fetchSectionPage).mockRejectedValue(new CatalogApiError('CATALOG_RATE_LIMITED'))
    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('temporarily limited')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily limited')
  })
})
