import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DetailActions } from './DetailActions'
import { movieDetail } from '@/test/fixtures/detail'
import { renderWithProviders } from '@/test/renderWithProviders'

const trailer = { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', site: 'youtube' as const }

describe('DetailActions', () => {
  it('renders nothing with production capability defaults', async () => {
    const { container } = await renderWithProviders(
      <DetailActions detail={movieDetail({ trailer })} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the capability is disabled', async () => {
    const { container } = await renderWithProviders(
      <DetailActions
        detail={movieDetail({ trailer })}
        capabilities={{ trailer: false, availability: false }}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the capability is enabled but no validated trailer exists', async () => {
    const { container } = await renderWithProviders(
      <DetailActions
        detail={movieDetail({ trailer: undefined })}
        capabilities={{ trailer: true, availability: false }}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a keyboard-operable external link when enabled with a trailer', async () => {
    await renderWithProviders(
      <DetailActions
        detail={movieDetail({ trailer })}
        capabilities={{ trailer: true, availability: false }}
      />
    )
    const link = screen.getByRole('link', { name: /Watch trailer/ })
    expect(link).toHaveAttribute('href', trailer.url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveTextContent('Opens YouTube in a new tab')
    expect(screen.getByRole('heading', { level: 2, name: 'Actions' })).toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull()
    expect(document.querySelector('video')).toBeNull()
  })

  it('never renders availability, personal-list, disabled, or coming-soon controls', async () => {
    await renderWithProviders(
      <DetailActions
        detail={movieDetail({ trailer })}
        capabilities={{ trailer: true, availability: false }}
      />
    )
    expect(screen.queryByRole('button')).toBeNull()
    expect(document.body.textContent).not.toMatch(/coming soon|availability|watchlist|favorite/i)
  })
})
