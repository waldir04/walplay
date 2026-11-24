import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { movieDetail } from '@/test/fixtures/detail'
import { renderWithProviders } from '@/test/renderWithProviders'

import { DetailActions } from './DetailActions'

describe('DetailActions personal lists', () => {
  it('renders the watchlist control when the capability is enabled', async () => {
    await renderWithProviders(
      <DetailActions
        detail={movieDetail({ trailer: undefined })}
        capabilities={{ trailer: false, availability: false, personalLists: true }}
      />
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Actions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Fight Club to watchlist' })).toBeInTheDocument()
  })

  it('renders no personal control when the capability is disabled', async () => {
    const { container } = await renderWithProviders(
      <DetailActions
        detail={movieDetail({ trailer: undefined })}
        capabilities={{ trailer: false, availability: false, personalLists: false }}
      />
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('button', { name: /watchlist|favorite/i })).toBeNull()
  })
})
