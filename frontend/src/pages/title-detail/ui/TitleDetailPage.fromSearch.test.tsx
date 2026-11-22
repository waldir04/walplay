import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MOVIE_ID, movieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { TitleDetailPage } from './TitleDetailPage'

const detailEntry = (from?: string) => ({
  pathname: `/browse/movies/title/${MOVIE_ID}`,
  state: { item: movieItem(), ...(from === undefined ? {} : { from }) },
})

describe('TitleDetailPage search origin', () => {
  it('labels the return action for a search origin and keeps the detail address', async () => {
    await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [detailEntry('/search?q=the%20matrix')],
    })

    expect(screen.getByRole('link', { name: 'Return to search' })).toHaveAttribute(
      'href',
      '/search?q=the%20matrix'
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
  })

  it('keeps the catalog label for catalog origins', async () => {
    await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [detailEntry('/browse/movies/popular')],
    })

    expect(screen.getByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
      'href',
      '/browse/movies/popular'
    )
  })

  it.each([undefined, '/search', 'https://evil.example/search?q=x'])(
    'falls back to the media landing for a missing or invalid origin (%s)',
    async (from) => {
      await renderWithProviders(<TitleDetailPage />, {
        initialEntries: [detailEntry(from)],
      })

      expect(screen.getByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
        'href',
        '/browse/movies'
      )
      expect(screen.queryByRole('link', { name: 'Return to search' })).not.toBeInTheDocument()
    }
  )
})
