import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DetailFacts } from './DetailFacts'
import { movieDetail, omittedMovieDetail, tvDetail } from '@/test/fixtures/detail'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('DetailFacts', () => {
  it('renders movie facts with localized labels and a TMDB rating', async () => {
    await renderWithProviders(<DetailFacts detail={movieDetail()} />)

    expect(screen.getByText('Release date')).toBeVisible()
    expect(screen.getByText('October 15, 1999')).toBeVisible()
    expect(screen.getByText('Runtime')).toBeVisible()
    expect(screen.getByText('2 h 19 min')).toBeVisible()
    expect(screen.getByRole('list', { name: 'Genres' })).toBeVisible()
    expect(screen.getAllByText('Drama')).toHaveLength(1)
    expect(screen.getByText('TMDB user rating')).toBeVisible()
    expect(screen.getByText('8.4 / 10')).toBeVisible()
    expect(screen.getByText('30,123 votes')).toBeVisible()
    expect(screen.getByText('Released')).toBeVisible()
    expect(screen.getByText('8.4 out of 10, from 30,123 votes')).toBeInTheDocument()
  })

  it('renders tv episode length as a range and provider summary facts', async () => {
    await renderWithProviders(<DetailFacts detail={tvDetail()} />)

    expect(screen.getByText('First aired')).toBeVisible()
    expect(screen.getByText('Episode length')).toBeVisible()
    expect(screen.getByText('45 min–60 min')).toBeVisible()
    expect(screen.getByText('Seasons reported by TMDB')).toBeVisible()
    expect(screen.getByText('Episodes reported by TMDB')).toBeVisible()
    expect(screen.getAllByText('21')).toHaveLength(1)
    expect(screen.getByText('Networks')).toBeVisible()
    expect(screen.getByText('Netflix')).toBeVisible()
    expect(screen.getByText('Ended')).toBeVisible()
  })

  it('renders a typical episode length when only one value exists', async () => {
    await renderWithProviders(
      <DetailFacts detail={tvDetail({ episodeRuntime: { minMinutes: 45 } })} />
    )
    expect(screen.getByText('About 45 min per episode')).toBeVisible()
  })

  it('omits every missing fact rather than showing a placeholder', async () => {
    await renderWithProviders(<DetailFacts detail={omittedMovieDetail()} />)

    expect(screen.queryByText('Release date')).toBeNull()
    expect(screen.queryByText('Runtime')).toBeNull()
    expect(screen.queryByText('Genres')).toBeNull()
    expect(screen.queryByText('Status')).toBeNull()
    expect(screen.queryByText('TMDB user rating')).toBeNull()
    expect(screen.queryByText('—')).toBeNull()
    expect(screen.queryByText('N/A')).toBeNull()
    expect(screen.queryByText('0')).toBeNull()
  })

  it('omits an unknown status and unavailable provider counts', async () => {
    await renderWithProviders(
      <DetailFacts
        detail={tvDetail({
          status: undefined,
          tvSummary: { firstAirDate: '2017-12-01' },
          rating: undefined,
          episodeRuntime: undefined,
        })}
      />
    )
    expect(screen.queryByText('Status')).toBeNull()
    expect(screen.queryByText('Seasons reported by TMDB')).toBeNull()
    expect(screen.queryByText('Episodes reported by TMDB')).toBeNull()
    expect(screen.queryByText('Episode length')).toBeNull()
  })
})
