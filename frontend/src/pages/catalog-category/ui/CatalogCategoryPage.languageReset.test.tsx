import { screen, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/app/i18n'
import { movieItem, pageEnvelope, tvItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCategoryPage } from './CatalogCategoryPage'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockImplementation(async ({ language, mediaType, section }) =>
      pageEnvelope({
        items: [
          language === 'es'
            ? movieItem({ title: 'El club de la lucha' })
            : movieItem({ title: 'Fight Club' }),
          ...(mediaType === 'tv' ? [tvItem()] : []),
        ],
        section,
      })
    )
})

describe('CatalogCategoryPage language reset', () => {
  it('restarts at page one in the new language and discards old pages', async () => {
    await renderWithProviders(<CatalogCategoryPage />, {
      initialEntries: ['/browse/movies/popular'],
    })
    await screen.findByText('Fight Club')

    await act(async () => {
      await i18n.changeLanguage('es')
    })

    expect(await screen.findByText('El club de la lucha')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Fight Club')).not.toBeInTheDocument())
    expect(fetchSectionPage).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'es', page: 1 })
    )
  })
})
