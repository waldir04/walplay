import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { movieDetail } from '@/test/fixtures/detail'
import { renderWithProviders } from '@/test/renderWithProviders'

import { DetailActions } from './DetailActions'

describe('DetailActions', () => {
  it('renders nothing when every capability is disabled', async () => {
    const { container } = await renderWithProviders(
      <DetailActions
        detail={movieDetail()}
        capabilities={{ trailer: false, availability: false, personalLists: false }}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the trailer capability is enabled without a known inventory', async () => {
    const { container } = await renderWithProviders(
      <DetailActions
        detail={movieDetail()}
        capabilities={{ trailer: true, availability: false, personalLists: false }}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders personal-list controls with production capability defaults', async () => {
    await renderWithProviders(<DetailActions detail={movieDetail()} />)

    expect(screen.getByRole('button', { name: 'Add Fight Club to watchlist' })).toBeInTheDocument()
  })

  it('renders a keyboard-operable in-page trailer entry only when inventory is known', async () => {
    await renderWithProviders(
      <DetailActions
        detail={movieDetail()}
        capabilities={{ trailer: true, availability: false, personalLists: false }}
        trailerEntry={{ headingId: 'trailer-heading' }}
      />
    )
    const link = screen.getByRole('link', { name: 'Watch trailer' })
    expect(link).toHaveAttribute('href', '#trailer-heading')
    expect(screen.getByRole('heading', { level: 2, name: 'Actions' })).toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull()
    expect(document.querySelector('video')).toBeNull()
  })

  it('never renders availability, disabled, or coming-soon controls', async () => {
    await renderWithProviders(
      <DetailActions
        detail={movieDetail()}
        capabilities={{ trailer: true, availability: false, personalLists: true }}
        trailerEntry={{ headingId: 'trailer-heading' }}
      />
    )
    expect(document.body.textContent).not.toMatch(/coming soon|availability/i)
    expect(screen.queryByRole('button', { name: /availability/i })).toBeNull()
  })
})
