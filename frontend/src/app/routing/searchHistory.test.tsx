import { act, screen, waitFor, within } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { firstSearchPage } from '@/test/fixtures/catalog/search'
import {
  collectionEnvelope,
  detailEnvelope,
  emptyCreditsEnvelope,
  seasonEnvelope,
  similarEnvelope,
} from '@/test/fixtures/detail'
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

vi.mock('@/entities/catalog/api/detailClient', () => ({
  createDetailClient: vi.fn(),
  getDetailClient: vi.fn(),
  fetchDetail: vi.fn(),
  fetchCredits: vi.fn(),
  fetchSimilar: vi.fn(),
  fetchCollection: vi.fn(),
  fetchSeason: vi.fn(),
}))

const { fetchSearchPage } = await import('@/entities/catalog/api/catalogClient')
const { fetchCollection, fetchCredits, fetchDetail, fetchSeason, fetchSimilar } =
  await import('@/entities/catalog/api/detailClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchSearchPage).mockReset().mockResolvedValue(firstSearchPage())
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope())
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
})

describe('search history semantics', () => {
  it('replaces the entry for a settled query and pushes exactly one entry when opening a result', async () => {
    const user = userEvent.setup()
    const { router } = renderApp(['/search'])

    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: 'the matrix' } })

    await waitFor(() => expect(router.state.location.search).toBe('?q=the%20matrix'))
    await waitFor(() => expect(fetchSearchPage).toHaveBeenCalledTimes(1))
    expect(router.state.historyAction).toBe('REPLACE')

    const collection = await screen.findByRole('list', {
      name: 'Search results for the matrix',
    })
    await user.click(within(collection).getAllByRole('link')[0] as HTMLElement)

    expect(router.state.historyAction).toBe('PUSH')
    expect(await screen.findByRole('heading', { level: 1, name: 'The Matrix' })).toBeInTheDocument()

    await act(async () => {
      await router.navigate(-1)
    })

    expect(router.state.historyAction).toBe('POP')
    expect(router.state.location.pathname).toBe('/search')
    expect(router.state.location.search).toBe('?q=the%20matrix')
    expect(
      await screen.findByRole('heading', { name: 'Results for “the matrix”' })
    ).toBeInTheDocument()
    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
  })

  it('never adds an entry for intermediate typing', async () => {
    const { router } = renderApp(['/search'])
    const input = await screen.findByRole('searchbox')

    fireEvent.change(input, { target: { value: 't' } })
    fireEvent.change(input, { target: { value: 'th' } })
    fireEvent.change(input, { target: { value: 'the' } })

    await waitFor(() => expect(router.state.location.search).toBe('?q=the'))
    expect(router.state.historyAction).toBe('REPLACE')
  })
})
