import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery } from '@/entities/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SearchResults } from './SearchResults'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
  fetchSearchPage: vi.fn(),
}))

const { fetchSearchPage } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  vi.mocked(fetchSearchPage)
    .mockReset()
    .mockImplementation(() => new Promise(() => undefined))
})

describe('SearchResults reduced motion', () => {
  it('animates skeletons only when reduced motion is not preferred', async () => {
    const { container } = await renderWithProviders(
      <SearchResults query={buildSearchQuery('the matrix')} language="en" />
    )
    await screen.findByLabelText('Search results are loading')

    expect(container.innerHTML).toContain('motion-safe:animate-pulse')
    expect(container.querySelector('.animate-pulse')).toBeNull()
  })

  it('reserves skeleton layout so loading does not shift results', async () => {
    const { container } = await renderWithProviders(
      <SearchResults query={buildSearchQuery('the matrix')} language="en" />
    )
    await screen.findByLabelText('Search results are loading')

    expect(container.innerHTML).toContain('aspect-[2/3]')
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(10)
    for (const hazardous of ['motion-reduce:animate', 'scroll-', 'translate-']) {
      expect(container.innerHTML).not.toContain(hazardous)
    }
  })
})
