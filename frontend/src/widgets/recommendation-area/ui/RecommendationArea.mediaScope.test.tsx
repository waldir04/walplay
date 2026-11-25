import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/app/i18n'
import { HomePage } from '@/pages/home'
import { movieItem, pageEnvelope, tvItem } from '@/test/fixtures/catalog'
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

beforeEach(() => {
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockImplementation(async ({ mediaType }) =>
      pageEnvelope({ items: [mediaType === 'tv' ? tvItem() : movieItem()], section: 'popular' })
    )
  window.localStorage.clear()
})

describe('RecommendationArea media scope', () => {
  it('defaults to Movies and requests only the selected provider list at page 1', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<HomePage />)

    expect(await screen.findByRole('button', { name: 'Movies' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'TV shows' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(fetchSectionPage).toHaveBeenCalledTimes(1)
    expect(fetchSectionPage).toHaveBeenLastCalledWith({
      mediaType: 'movie',
      section: 'popular',
      language: 'en',
      page: 1,
    })

    await user.click(screen.getByRole('button', { name: 'TV shows' }))

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Popular now, TV shows' })
    ).toBeInTheDocument()
    expect(screen.queryByText('Fight Club')).not.toBeInTheDocument()
    expect(fetchSectionPage).toHaveBeenLastCalledWith({
      mediaType: 'tv',
      section: 'popular',
      language: 'en',
      page: 1,
    })
    expect(vi.mocked(fetchSectionPage).mock.calls.every(([request]) => request.page === 1)).toBe(
      true
    )
  })

  it('refetches the active scope when the language changes without switching media', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<HomePage />)
    await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })

    await user.click(screen.getByRole('button', { name: 'TV shows' }))
    await screen.findByRole('heading', { level: 3, name: 'Popular now, TV shows' })
    const beforeLanguageChange = vi.mocked(fetchSectionPage).mock.calls.length

    await act(async () => {
      await i18n.changeLanguage('es')
    })

    expect(await screen.findByRole('button', { name: 'Series' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(fetchSectionPage).toHaveBeenCalledTimes(beforeLanguageChange + 1)
    expect(fetchSectionPage).toHaveBeenLastCalledWith({
      mediaType: 'tv',
      section: 'popular',
      language: 'es',
      page: 1,
    })
    const afterSwitch = vi.mocked(fetchSectionPage).mock.calls.slice(beforeLanguageChange)
    expect(afterSwitch.every(([request]) => request.mediaType === 'tv')).toBe(true)
  })

  it('keeps the scope as component state and resets to Movies on remount', async () => {
    const user = userEvent.setup()
    const first = await renderWithProviders(<HomePage />)
    await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })

    await user.click(screen.getByRole('button', { name: 'TV shows' }))
    await screen.findByRole('heading', { level: 3, name: 'Popular now, TV shows' })
    first.unmount()

    await renderWithProviders(<HomePage />)

    expect(await screen.findByRole('button', { name: 'Movies' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(fetchSectionPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ mediaType: 'movie' })
    )
  })
})
