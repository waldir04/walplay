import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { DetailOverview } from './DetailOverview'
import { movieDetail } from '@/test/fixtures/detail'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('DetailOverview', () => {
  it('renders the overview with a section heading and the optional tagline', async () => {
    await renderWithProviders(<DetailOverview detail={movieDetail()} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Overview' })).toBeVisible()
    expect(screen.getByText(/ticking-time-bomb insomniac/)).toBeVisible()
    expect(screen.getByText('Mischief. Mayhem. Soap.')).toBeVisible()
  })

  it('omits the whole section when no usable overview exists', async () => {
    const { container } = await renderWithProviders(
      <DetailOverview detail={movieDetail({ overview: undefined, tagline: undefined })} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('expands a long overview without removing the full text', async () => {
    const longOverview = 'Long provider overview. '.repeat(60)
    const { getByRole, container } = await renderWithProviders(
      <DetailOverview detail={movieDetail({ overview: longOverview })} />
    )
    const paragraph = container.querySelector('p.whitespace-pre-line')
    expect(paragraph?.textContent).toBe(longOverview)
    await userEvent.click(getByRole('button', { name: 'Show more' }))
    expect(getByRole('button', { name: 'Show less' })).toBeVisible()
  })
})
