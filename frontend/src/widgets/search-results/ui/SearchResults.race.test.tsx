import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery } from '@/entities/catalog'
import { movieItem } from '@/test/fixtures/catalog'
import { searchPageEnvelope } from '@/test/fixtures/catalog/search'
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

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
}

const deferred = <T,>(): Deferred<T> => {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const Harness = () => {
  const [identity, setIdentity] = useState<'alpha' | 'beta'>('alpha')
  return (
    <div>
      <button type="button" onClick={() => setIdentity('alpha')}>
        alpha
      </button>
      <button type="button" onClick={() => setIdentity('beta')}>
        beta
      </button>
      <SearchResults query={buildSearchQuery(identity)} language="en" />
    </div>
  )
}

beforeEach(() => {
  vi.mocked(fetchSearchPage).mockReset()
})

describe('SearchResults race safety', () => {
  it('discards a superseded response and never presents it as the newest query', async () => {
    const alpha = deferred<ReturnType<typeof searchPageEnvelope>>()
    const beta = deferred<ReturnType<typeof searchPageEnvelope>>()
    vi.mocked(fetchSearchPage).mockImplementation(({ query }) =>
      query === 'alpha' ? alpha.promise : beta.promise
    )
    const user = userEvent.setup()
    await renderWithProviders(<Harness />)

    await user.click(screen.getByRole('button', { name: 'beta' }))
    beta.resolve(
      searchPageEnvelope({
        items: [movieItem({ id: 'beta-item-001', title: 'Beta Result' })],
        hasMore: false,
        totalPages: 1,
      })
    )
    expect(await screen.findByRole('heading', { name: 'Results for “beta”' })).toBeInTheDocument()

    alpha.resolve(
      searchPageEnvelope({
        items: [movieItem({ id: 'alpha-item-01', title: 'Alpha Result' })],
        hasMore: false,
        totalPages: 1,
      })
    )
    await waitFor(() => expect(fetchSearchPage).toHaveBeenCalledTimes(2))

    expect(screen.queryByText('Alpha Result')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Results for “beta”' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Search results for beta' })).toBeInTheDocument()

    await waitFor(() => {
      const status = screen.getAllByRole('status')[0]
      expect(status?.textContent?.toLowerCase()).toContain('beta')
    })
    const status = screen.getAllByRole('status')[0]
    expect(status?.textContent?.toLowerCase()).not.toContain('alpha')
  })

  it('discards a superseded pending load-more page instead of appending it', async () => {
    const alphaPageOne = deferred<ReturnType<typeof searchPageEnvelope>>()
    const alphaPageTwo = deferred<ReturnType<typeof searchPageEnvelope>>()
    const betaPageOne = deferred<ReturnType<typeof searchPageEnvelope>>()
    vi.mocked(fetchSearchPage).mockImplementation(({ query, page }) => {
      if (query === 'alpha') {
        return page === 1 ? alphaPageOne.promise : alphaPageTwo.promise
      }
      return betaPageOne.promise
    })
    const user = userEvent.setup()
    await renderWithProviders(<Harness />)

    alphaPageOne.resolve(
      searchPageEnvelope({
        items: [movieItem({ id: 'alpha-item-01', title: 'Alpha One' })],
        hasMore: true,
        totalPages: 3,
      })
    )
    await screen.findByText('Alpha One')

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    await waitFor(() =>
      expect(fetchSearchPage).toHaveBeenCalledWith({ query: 'alpha', language: 'en', page: 2 })
    )

    await user.click(screen.getByRole('button', { name: 'beta' }))
    alphaPageTwo.resolve(
      searchPageEnvelope({
        items: [movieItem({ id: 'alpha-item-02', title: 'Alpha Page Two' })],
        page: 2,
        hasMore: false,
        totalPages: 2,
      })
    )

    betaPageOne.resolve(
      searchPageEnvelope({
        items: [movieItem({ id: 'beta-item-001', title: 'Beta Result' })],
        hasMore: false,
        totalPages: 1,
      })
    )

    expect(await screen.findByText('Beta Result')).toBeInTheDocument()
    expect(screen.queryByText('Alpha Page Two')).not.toBeInTheDocument()
    expect(screen.queryByText('Alpha One')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Results for “beta”' })).toBeInTheDocument()
  })
})
