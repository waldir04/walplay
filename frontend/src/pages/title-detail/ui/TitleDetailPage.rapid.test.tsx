import { screen } from '@testing-library/react'
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { movieItem } from '@/test/fixtures/catalog'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchCapabilities, fetchSectionPage, fetchItem } =
  await import('@/entities/catalog/api/catalogClient')

const ID_ONE = 'd2wxOm1vdmllOjU1MA'
const ID_TWO = 'd2wxOm1vdmllOjY4MA'

const envelope = (id: string, title: string) => ({
  data: movieItem({ id, title }),
  meta: {
    language: 'en-US' as const,
    stale: false,
    lastUpdatedAt: '2026-11-22T15:00:00.000Z',
    source: 'provider' as const,
  },
})

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchCapabilities)
    .mockReset()
    .mockResolvedValue({ data: { sections: [] } })
  vi.mocked(fetchSectionPage).mockReset()
  vi.mocked(fetchItem).mockReset()
})

describe('TitleDetailPage rapid changes', () => {
  it('never lets an older item response replace the final selection', async () => {
    let releaseFirst: (value: ReturnType<typeof envelope>) => void = () => undefined
    vi.mocked(fetchItem).mockImplementation(async ({ itemId }) => {
      if (itemId === ID_ONE) {
        return new Promise((resolve) => {
          releaseFirst = resolve
        })
      }
      return envelope(ID_TWO, 'Final Title')
    })

    const { router } = renderApp([`/browse/movies/title/${ID_ONE}`])
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      await router.navigate(`/browse/movies/title/${ID_TWO}`)
    })
    expect(await screen.findByRole('heading', { name: 'Final Title' })).toBeInTheDocument()

    await act(async () => {
      releaseFirst(envelope(ID_ONE, 'Old Title'))
      await Promise.resolve()
    })
    expect(screen.queryByText('Old Title')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Final Title' })).toBeInTheDocument()
  })
})
