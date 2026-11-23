import { screen } from '@testing-library/react'
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { installMatchMediaMock } from '@/test/matchMedia'
import {
  detailEnvelope,
  movieDetail,
  emptyCreditsEnvelope,
  seasonEnvelope,
  similarEnvelope,
  collectionEnvelope,
} from '@/test/fixtures/detail'
import { renderApp } from '@/test/renderApp'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
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

const { fetchCapabilities, fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')
const { fetchCredits, fetchDetail, fetchSeason, fetchSimilar, fetchCollection } =
  await import('@/entities/catalog/api/detailClient')

const ID_ONE = 'd2wxOm1vdmllOjU1MA'
const ID_TWO = 'd2wxOm1vdmllOjY4MA'

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchCapabilities)
    .mockReset()
    .mockResolvedValue({ data: { sections: [] } })
  vi.mocked(fetchSectionPage).mockReset()
  vi.mocked(fetchDetail).mockReset()
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
})

describe('TitleDetailPage rapid changes', () => {
  it('never lets an older title response replace the final selection', async () => {
    let releaseFirst: (value: ReturnType<typeof detailEnvelope>) => void = () => undefined
    vi.mocked(fetchDetail).mockImplementation(async ({ itemId }) => {
      if (itemId === ID_ONE) {
        return new Promise((resolve) => {
          releaseFirst = resolve
        })
      }
      return detailEnvelope(movieDetail({ id: ID_TWO, title: 'Final Title' }))
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
      releaseFirst(detailEnvelope(movieDetail({ id: ID_ONE, title: 'Old Title' })))
      await Promise.resolve()
    })
    expect(screen.queryByText('Old Title')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Final Title' })).toBeInTheDocument()
  })
})
