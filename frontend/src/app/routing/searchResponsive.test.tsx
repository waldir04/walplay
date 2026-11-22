import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { movieItem } from '@/test/fixtures/catalog'
import { firstSearchPage, searchPageEnvelope } from '@/test/fixtures/catalog/search'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
  fetchSearchPage: vi.fn(),
}))

const { fetchSearchPage } = await import('@/entities/catalog/api/catalogClient')

const longTitle = 'El increíble viaje extraordinario de una familia muy larga'

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchSearchPage)
    .mockReset()
    .mockResolvedValue(
      searchPageEnvelope({
        items: [movieItem({ title: longTitle }), firstSearchPage().data.items[1]!],
        hasMore: true,
        totalPages: 2,
      })
    )
})

describe('search responsive contract', () => {
  it('uses the shared 2/3/4/5 column grid at the supported breakpoints', async () => {
    const { container } = renderApp(['/search?q=the+matrix'])
    await screen.findByRole('list', { name: 'Search results for the matrix' })

    const grid = Array.from(container.querySelectorAll('ul')).find((element) =>
      element.className.includes('grid-cols-2')
    )
    expect(grid?.className).toContain('md:grid-cols-3')
    expect(grid?.className).toContain('lg:grid-cols-4')
    expect(grid?.className).toContain('xl:grid-cols-5')
  })

  it('introduces no fixed or overflowing width utilities', async () => {
    const { container } = renderApp(['/search?q=the+matrix'])
    await screen.findByRole('list', { name: 'Search results for the matrix' })

    expect(container.innerHTML).not.toContain('overflow-x-scroll')
    expect(container.innerHTML).not.toContain('w-[1200px]')
    expect(container.innerHTML).not.toContain('min-w-[1200px]')
  })

  it('reserves the artwork aspect ratio and keeps primary controls at 44px', async () => {
    const { container } = renderApp(['/search?q=the+matrix'])
    await screen.findByRole('list', { name: 'Search results for the matrix' })

    const image = container.querySelector('img')
    expect(image?.className).toContain('aspect-[2/3]')
    expect(image?.className).toContain('w-full')
    for (const button of container.querySelectorAll('button')) {
      expect(button.className).toContain('min-h-11')
    }
  })

  it('retains the full accessible name for a long Spanish title', async () => {
    renderApp(['/search?q=the+matrix'])
    const collection = await screen.findByRole('list', { name: 'Search results for the matrix' })
    const firstLink = collection.querySelector('a')
    expect(firstLink?.getAttribute('aria-label')).toContain(longTitle)
  })
})
