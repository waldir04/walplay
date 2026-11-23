import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EpisodeList } from './EpisodeList'
import { episodes } from '@/test/fixtures/detail'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('EpisodeList', () => {
  it('renders every episode in provider order with identifying facts', async () => {
    const { container } = await renderWithProviders(<EpisodeList episodes={episodes()} />)

    const items = container.querySelectorAll('ol > li')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Secrets')
    expect(items[1]).toHaveTextContent('Lies')
    expect(screen.getByRole('heading', { level: 3, name: 'Secrets' })).toBeInTheDocument()
    expect(screen.getAllByText('December 1, 2017')).toHaveLength(2)
    expect(screen.getByText('51 min')).toBeInTheDocument()
    expect(screen.getByText('8.1 / 10')).toBeInTheDocument()
    expect(screen.getByText(/In 2019, a man disappears/)).toBeInTheDocument()
  })

  it('identifies an unnamed episode by number', async () => {
    await renderWithProviders(
      <EpisodeList episodes={[{ number: 7, airDate: '2019', runtimeMinutes: 45 }]} />
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Episode 7' })).toBeInTheDocument()
    expect(screen.getByText('2019')).toBeInTheDocument()
  })

  it('omits missing fields without placeholders', async () => {
    await renderWithProviders(<EpisodeList episodes={[{ name: 'Bare' }]} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Bare' })).toBeInTheDocument()
    expect(screen.queryByText('0')).toBeNull()
    expect(screen.queryByText('N/A')).toBeNull()
    expect(screen.queryByText('—')).toBeNull()
  })

  it('reserves still dimensions and hides the image from assistive technology', async () => {
    const { container } = await renderWithProviders(<EpisodeList episodes={episodes()} />)
    const image = container.querySelector('img')
    expect(image?.className).toContain('aspect-video')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('aria-hidden', 'true')
    expect(image).toHaveAttribute('loading', 'lazy')
  })

  it('shows the localized empty state inside the episode area', async () => {
    await renderWithProviders(<EpisodeList episodes={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('No episodes available')
    expect(screen.getByText(/TMDB does not list episodes for this season/)).toBeInTheDocument()
  })

  it('renders a very large episode list without truncation', async () => {
    const large = Array.from({ length: 80 }, (_, index) => ({
      number: index + 1,
      name: `Episode ${index + 1}`,
    }))
    const { container } = await renderWithProviders(<EpisodeList episodes={large} />)
    expect(container.querySelectorAll('ol > li')).toHaveLength(80)
  })
})
