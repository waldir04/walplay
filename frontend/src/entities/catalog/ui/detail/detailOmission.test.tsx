import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TitleDetailView } from '@/widgets/title-detail'

import { movieDetail, omittedMovieDetail } from '@/test/fixtures/detail'
import { renderWithProviders } from '@/test/renderWithProviders'

const FORBIDDEN_TEXT = new Set(['0', '—', '-', 'N/A', 'Unknown', 'Untitled'])

const textTokens = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll('body *'))
    .filter((element) => element.children.length === 0)
    .map((element) => element.textContent?.trim() ?? '')

const renderView = (detail = omittedMovieDetail()) =>
  renderWithProviders(
    <TitleDetailView
      detail={detail}
      returnAction={<a href="/browse/movies">Return to the catalog</a>}
      attribution={<p>Provider attribution</p>}
    />
  )

describe('detail omission rules', () => {
  it('renders a minimal identity without fabricating facts', async () => {
    const { container } = await renderView()
    expect(screen.getByRole('heading', { level: 1, name: 'Minimal' })).toBeVisible()
    expect(screen.getAllByText('Movies').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Overview' })).toBeNull()
    expect(screen.queryByText('Runtime')).toBeNull()
    expect(screen.queryByText('Release date')).toBeNull()
    expect(screen.queryByText('TMDB user rating')).toBeNull()
    expect(screen.queryByText('Status')).toBeNull()
    expect(screen.queryByText('Genres')).toBeNull()

    const tokens = textTokens(container)
    for (const forbidden of FORBIDDEN_TEXT) {
      expect(tokens).not.toContain(forbidden)
    }
  })

  it('omits an overview, tagline, rating, and popularity that are missing', async () => {
    await renderView(
      movieDetail({
        overview: undefined,
        tagline: undefined,
        rating: undefined,
        popularity: undefined,
        runtime: undefined,
        releaseDate: undefined,
        releaseYear: undefined,
        status: undefined,
        genres: [],
        poster: undefined,
        backdrop: undefined,
        collection: undefined,
        trailer: undefined,
      })
    )
    expect(screen.queryByRole('heading', { name: 'Overview' })).toBeNull()
    expect(screen.queryByText('TMDB user rating')).toBeNull()
    expect(screen.queryByText('TMDB popularity:')).toBeNull()
  })

  it('keeps no empty section heading behind an omitted fact', async () => {
    const { container } = await renderView(movieDetail({ genres: [], overview: undefined }))
    for (const heading of Array.from(container.querySelectorAll('h2'))) {
      const section = heading.closest('section')
      expect(
        section?.textContent?.replace(heading.textContent ?? '', '').trim().length
      ).toBeGreaterThan(0)
    }
  })

  it('always identifies the fallback artwork with the title and content type', async () => {
    await renderView(omittedMovieDetail())
    expect(screen.getAllByText('Minimal').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Movies').length).toBeGreaterThanOrEqual(1)
  })
})
