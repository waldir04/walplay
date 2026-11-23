import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DetailHero } from './DetailHero'
import { movieDetail } from '@/test/fixtures/detail'
import { renderWithProviders } from '@/test/renderWithProviders'

const returnAction = <a href="/browse/movies">Return to the catalog</a>

describe('DetailHero', () => {
  it('exposes one primary heading, the content type, and the return action', async () => {
    await renderWithProviders(
      <DetailHero
        detail={movieDetail({ originalTitle: 'El club de la lucha' })}
        mediaTypeLabel="Movies"
        originalTitleLabel="Original title"
        returnAction={returnAction}
      />
    )

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Fight Club' })).toBeVisible()
    expect(screen.getByText('Movies')).toBeVisible()
    expect(screen.getByText('Original title:')).toBeVisible()
    expect(screen.getByText('El club de la lucha')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Return to the catalog' })).toBeVisible()
  })

  it('omits the original title when it matches the displayed title', async () => {
    await renderWithProviders(
      <DetailHero
        detail={movieDetail()}
        mediaTypeLabel="Movies"
        originalTitleLabel="Original title"
        returnAction={returnAction}
      />
    )
    expect(screen.queryByText('Original title:')).toBeNull()
  })

  it('reserves the poster aspect ratio and falls back for both densities', async () => {
    const { container } = await renderWithProviders(
      <DetailHero
        detail={movieDetail({
          poster: { url: 'https://image.example.test/w342/only.jpg' },
        })}
        mediaTypeLabel="Movies"
        originalTitleLabel="Original title"
        returnAction={returnAction}
      />
    )
    const image = container.querySelector('img[src*="only.jpg"]')
    expect(image).toHaveAttribute('srcset', expect.stringContaining('342w'))
    expect(image).toHaveAttribute('srcset', expect.stringContaining('780w'))
    expect(image?.className).toContain('aspect-[2/3]')
    expect(image).toHaveAttribute('aria-hidden', 'true')
  })

  it('uses the neutral fallback carrying the title and content type', async () => {
    const { container } = await renderWithProviders(
      <DetailHero
        detail={movieDetail({ poster: undefined, backdrop: undefined })}
        mediaTypeLabel="Movies"
        originalTitleLabel="Original title"
        returnAction={returnAction}
      />
    )
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getAllByText('Fight Club').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Movies').length).toBeGreaterThan(0)
  })
})
