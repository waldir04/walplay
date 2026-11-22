import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CAPABILITIES, movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

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
  vi.mocked(fetchCapabilities).mockResolvedValue({ data: { sections: CAPABILITIES } })
  vi.mocked(fetchSectionPage).mockResolvedValue(
    pageEnvelope({ items: [movieItem()], section: 'popular' })
  )
})

describe('BrowsePage', () => {
  it('renders one h1, the media switch, and supported sections in declared order', async () => {
    const { container } = await renderWithProviders(<BrowsePage />, {
      initialEntries: ['/browse/movies'],
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Browse Movies' })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('id', 'page-heading')
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Movies' })).toHaveAttribute('aria-current', 'page')

    const headings = await screen.findAllByRole('heading', { level: 2 })
    const sectionHeadings = headings.map((heading) => heading.textContent).filter(Boolean)
    expect(sectionHeadings.slice(0, 3)).toEqual(['Trending', 'Popular', 'Top rated'])
  })

  it('renders the provider attribution whenever catalog data is displayed', async () => {
    await renderWithProviders(<BrowsePage />, { initialEntries: ['/browse/movies'] })
    expect(await screen.findByRole('region', { name: 'Provider attribution' })).toBeInTheDocument()
  })

  it('renders only sections the capabilities declare for the media type', async () => {
    vi.mocked(fetchCapabilities).mockResolvedValue({
      data: {
        sections: [{ id: 'popular', order: 2, mediaTypes: ['tv'], paginated: true }],
      },
    })
    await renderWithProviders(<BrowsePage />, { initialEntries: ['/browse/tv-shows'] })

    expect(await screen.findByRole('heading', { level: 2, name: 'Popular' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Trending' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Top rated' })).not.toBeInTheDocument()
  })

  it('shows a page-level state when capabilities fail and invents no sections', async () => {
    vi.mocked(fetchCapabilities).mockRejectedValue(new Error('capabilities down'))
    const { container } = await renderWithProviders(<BrowsePage />, {
      initialEntries: ['/browse/movies'],
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The catalog could not be loaded')
    expect(screen.queryByRole('heading', { name: 'Trending' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Popular' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(container.querySelectorAll('h1')).toHaveLength(1)
  })

  it('keeps the attribution when one section fails', async () => {
    vi.mocked(fetchSectionPage).mockImplementation(async ({ section }) => {
      if (section === 'popular') {
        throw new Error('section down')
      }
      return pageEnvelope({ items: [movieItem()], section })
    })
    await renderWithProviders(<BrowsePage />, { initialEntries: ['/browse/movies'] })

    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0))
    expect(screen.getByRole('region', { name: 'Provider attribution' })).toBeInTheDocument()
  })
})
