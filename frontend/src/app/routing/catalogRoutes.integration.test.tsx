import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    .mockResolvedValue(pageEnvelope({ items: [movieItem()] }))
})

describe('catalog routing integration', () => {
  it('redirects /browse to /browse/movies with replace', async () => {
    const { router } = renderApp(['/browse'])

    await screen.findByRole('heading', { name: 'Browse Movies' })
    expect(router.state.location.pathname).toBe('/browse/movies')
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('keeps Browse marked active on the landing and nested catalog paths', async () => {
    renderApp(['/browse/movies'])
    await screen.findByRole('heading', { name: 'Browse Movies' })
    expect(screen.getByRole('link', { name: /Browse/ })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps Home and Settings destinations unchanged', async () => {
    renderApp(['/settings'])
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveAttribute('aria-current', 'page')
  })

  it('renders both media landings inside the shell from lazy chunks', async () => {
    renderApp(['/browse/tv-shows'])
    expect(await screen.findByRole('heading', { name: 'Browse TV Shows' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Walplay' })).toBeInTheDocument()
  })

  it('reaches the catalog from Home in one action', async () => {
    const { router } = renderApp(['/'])
    await screen.findByRole('heading', { name: 'Welcome to Walplay' })

    const link = screen.getByRole('link', { name: 'Browse the catalog' })
    link.click()

    await waitFor(() => expect(router.state.location.pathname).toBe('/browse'))
  })
})
