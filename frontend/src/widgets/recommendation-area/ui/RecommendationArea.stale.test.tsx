import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '@/pages/home'
import { movieItem, pageEnvelope, providerMeta } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
  fetchSearchPage: vi.fn(),
}))

vi.mock('@/shared/config/env', () => ({
  getAppConfig: () => ({
    environmentName: 'local',
    applicationVersion: '0.0.0',
    apiBaseUrl: 'http://localhost:4000',
    availabilityEnabled: false,
    trailersEnabled: false,
    recommendationsEnabled: true,
  }),
  getApiBaseUrl: () => 'http://localhost:4000',
}))

const { fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

const lastUpdatedAt = providerMeta().lastUpdatedAt
const expectedDate = (locale: string): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(lastUpdatedAt)
  )

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
  window.localStorage.clear()
})

describe('RecommendationArea stale data', () => {
  it('labels previously loaded suggestions with a localized update time', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular', stale: true })
    )
    await renderWithProviders(<HomePage />)

    expect(
      await screen.findByText('These suggestions were loaded earlier and may not be current.')
    ).toBeInTheDocument()
    expect(screen.getByText(`Loaded on ${expectedDate('en-US')}`)).toBeInTheDocument()
  })

  it('localizes the stale label and date in Spanish', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular', stale: true })
    )
    await renderWithProviders(<HomePage />, { locale: 'es' })

    expect(
      await screen.findByText('Estas sugerencias se cargaron antes y pueden no estar actualizadas.')
    ).toBeInTheDocument()
    expect(screen.getByText(`Datos cargados el ${expectedDate('es-ES')}`)).toBeInTheDocument()
  })

  it('shows neither stale label when the data is current', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular' })
    )
    await renderWithProviders(<HomePage />)

    await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })
    expect(
      screen.queryByText('These suggestions were loaded earlier and may not be current.')
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/Loaded on/)).not.toBeInTheDocument()
  })
})
