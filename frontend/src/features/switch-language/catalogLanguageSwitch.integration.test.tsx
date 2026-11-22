import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/app/i18n'
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
  vi.mocked(fetchCapabilities)
    .mockReset()
    .mockResolvedValue({ data: { sections: CAPABILITIES } })
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockImplementation(async ({ language, section }) =>
      pageEnvelope({
        items: [
          language === 'es'
            ? movieItem({ title: 'El club de la lucha' })
            : movieItem({ title: 'Fight Club' }),
        ],
        section,
      })
    )
})

describe('catalog language switch', () => {
  it('updates labels and provider metadata without a reload', async () => {
    renderApp(['/browse/movies'])
    await screen.findByRole('heading', { name: 'Browse Movies' })
    expect(await screen.findAllByText('Fight Club')).not.toHaveLength(0)

    await act(async () => {
      await i18n.changeLanguage('es')
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Explorar Películas' })
    ).toBeInTheDocument()
    expect(await screen.findAllByText('El club de la lucha')).not.toHaveLength(0)
    await waitFor(() => expect(screen.queryByText('Fight Club')).not.toBeInTheDocument())
    expect(fetchSectionPage).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'es', page: 1 })
    )
  })
})
