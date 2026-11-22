import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCategoryList } from './CatalogCategoryList'

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
})

describe('CatalogCategoryList announcements contract', () => {
  it('announces errors once as alerts', async () => {
    vi.mocked(fetchSectionPage).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE'))
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )

    expect(await screen.findAllByRole('alert')).toHaveLength(1)
  })

  it('uses a polite status region for append and end announcements', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], page: 1, hasMore: false })
    )
    const { container } = await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1)
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0)
  })

  it('marks only the busy collection while loading', async () => {
    vi.mocked(fetchSectionPage).mockReturnValue(new Promise(() => undefined))
    const { container } = await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )

    expect(container.querySelector('ul[aria-busy="true"]')).not.toBeNull()
    expect(container.querySelector('[role="status"]')).not.toBeNull()
  })
})
