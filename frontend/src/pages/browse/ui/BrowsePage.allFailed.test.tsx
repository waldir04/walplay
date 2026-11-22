import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { CAPABILITIES, movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchCapabilities, fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchCapabilities).mockReset()
  vi.mocked(fetchSectionPage).mockReset()
})

describe('BrowsePage all sections failed', () => {
  it('shows one page-level error with retry inside the shell', async () => {
    vi.mocked(fetchCapabilities).mockResolvedValue({ data: { sections: CAPABILITIES } })
    vi.mocked(fetchSectionPage).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE'))

    renderApp(['/browse/movies'])

    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(1))
    expect(screen.getByRole('alert')).toHaveTextContent('The catalog could not be loaded')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
  })

  it('avoids duplicate section errors when the page-level state is shown', async () => {
    vi.mocked(fetchCapabilities).mockResolvedValue({ data: { sections: CAPABILITIES } })
    vi.mocked(fetchSectionPage).mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT'))

    renderApp(['/browse/tv-shows'])
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.queryByText('This section could not be loaded')).not.toBeInTheDocument()
  })

  it('retries all sections and recovers when the provider returns', async () => {
    vi.mocked(fetchCapabilities).mockResolvedValue({ data: { sections: CAPABILITIES } })
    vi.mocked(fetchSectionPage)
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE'))
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE'))
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE'))
      .mockResolvedValue(pageEnvelope({ items: [movieItem()] }))

    renderApp(['/browse/movies'])
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect((await screen.findAllByText('Fight Club')).length).toBeGreaterThan(0)
  })
})
