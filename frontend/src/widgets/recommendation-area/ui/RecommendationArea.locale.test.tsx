import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/app/i18n'
import { HomePage } from '@/pages/home'
import { CatalogApiError } from '@/shared/api/httpClient'
import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
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

const expectNoRawKeys = (): void => {
  expect(document.body.textContent).not.toMatch(/recommendations\./)
}

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
  window.localStorage.clear()
})

describe('RecommendationArea localization', () => {
  it('renders every Walplay-owned area string in English', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular' })
    )
    await renderWithProviders(<HomePage />)

    expect(await screen.findByRole('heading', { level: 2, name: 'Discover' })).toBeInTheDocument()
    expect(screen.getByText('Popular titles from the provider.')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Popular now, Movies' })
    ).toBeInTheDocument()
    expect(screen.getByText('Based on provider popularity, not personalized')).toBeInTheDocument()
    expect(screen.getByText('How recommendations work')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Movies' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'TV shows' })).toBeInTheDocument()
    await waitFor(() =>
      expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe(
        'Popular suggestions updated.'
      )
    )
    expectNoRawKeys()
  })

  it('renders all Walplay copy in Spanish while provider titles stay as supplied', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular' })
    )
    await renderWithProviders(<HomePage />, { locale: 'es' })

    expect(await screen.findByRole('heading', { level: 2, name: 'Descubre' })).toBeInTheDocument()
    expect(screen.getByText('Títulos populares del proveedor.')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Popular ahora, Películas' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Según la popularidad del proveedor, no personalizado')
    ).toBeInTheDocument()
    expect(screen.getByText('Cómo funcionan las recomendaciones')).toBeInTheDocument()
    expect(
      screen.getByText('Walplay no usa los títulos que guardaste para elegir estas sugerencias.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Películas' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Series' })).toBeInTheDocument()
    expect(screen.getByText('Fight Club')).toBeInTheDocument()
    await waitFor(() =>
      expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe(
        'Sugerencias populares actualizadas.'
      )
    )
    expectNoRawKeys()
  })

  it('localizes empty and error actions in Spanish', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [], section: 'popular' }))
    const empty = await renderWithProviders(<HomePage />, { locale: 'es' })
    const message = await screen.findByText('No hay sugerencias disponibles ahora')
    const panel = message.closest('[role="status"]') as HTMLElement
    expect(within(panel).getByRole('link', { name: 'Explorar el catálogo' })).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Buscar títulos' })).toBeInTheDocument()
    expectNoRawKeys()
    empty.unmount()

    vi.mocked(fetchSectionPage).mockRejectedValue(new CatalogApiError('CATALOG_RATE_LIMITED', 429))
    await renderWithProviders(<HomePage />, { locale: 'es' })
    expect(
      await screen.findByText('Las sugerencias están limitadas temporalmente')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver a intentar' })).toBeInTheDocument()
    expectNoRawKeys()
  })

  it('keeps the active media scope and refetches it once when the language changes', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular' })
    )
    const user = userEvent.setup()
    await renderWithProviders(<HomePage />)
    await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })

    await user.click(screen.getByRole('button', { name: 'TV shows' }))
    await screen.findByRole('heading', { level: 3, name: 'Popular now, TV shows' })
    const requestsBefore = vi.mocked(fetchSectionPage).mock.calls.length

    await act(async () => {
      await i18n.changeLanguage('es')
    })

    expect(await screen.findByRole('button', { name: 'Series' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(fetchSectionPage).toHaveBeenCalledTimes(requestsBefore + 1)
    expect(fetchSectionPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ mediaType: 'tv', language: 'es' })
    )
    expect(
      screen.getByRole('heading', { level: 3, name: 'Popular ahora, Series' })
    ).toBeInTheDocument()
  })
})
