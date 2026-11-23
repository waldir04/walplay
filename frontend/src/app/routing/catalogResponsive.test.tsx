import { screen } from '@testing-library/react'
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
    .mockResolvedValue(pageEnvelope({ items: [movieItem()], section: 'popular', hasMore: true }))
})

describe('catalog responsive contract', () => {
  it('uses the 2/3/4/5 column grid at the supported breakpoints', async () => {
    const { container } = renderApp(['/browse/movies'])
    await screen.findAllByText('Fight Club')
    const grids = container.querySelectorAll('ul')
    const catalogGrid = Array.from(grids).find((grid) => grid.className.includes('grid-cols-2'))
    expect(catalogGrid).toBeDefined()
    expect(catalogGrid?.className).toContain('md:grid-cols-3')
    expect(catalogGrid?.className).toContain('lg:grid-cols-4')
    expect(catalogGrid?.className).toContain('xl:grid-cols-5')
  })

  it('introduces no horizontal overflow utilities or fixed pixel widths', async () => {
    const { container } = renderApp(['/browse/movies'])
    await screen.findAllByText('Fight Club')
    expect(container.innerHTML).not.toContain('overflow-x-scroll')
    expect(container.innerHTML).not.toContain('w-[1200px]')
  })

  it('keeps primary controls at least 44px', async () => {
    const { container } = renderApp(['/browse/movies'])
    await screen.findAllByText('Fight Club')
    const group = screen.getByRole('group', { name: 'Media type' })
    const mediaLinks = group.querySelectorAll('a')
    expect(mediaLinks.length).toBe(2)
    for (const control of [...mediaLinks, ...container.querySelectorAll('button')]) {
      expect(control.className).toContain('min-h-11')
    }
  })

  it('keeps long artwork responsive with a reserved aspect ratio', async () => {
    const { container } = renderApp(['/browse/movies'])
    await screen.findAllByText('Fight Club')
    const image = container.querySelector('img')
    expect(image?.className).toContain('aspect-[2/3]')
    expect(image?.className).toContain('w-full')
  })
})
