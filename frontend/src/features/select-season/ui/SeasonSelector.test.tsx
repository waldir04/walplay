import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SeasonSelector } from './SeasonSelector'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { Season } from '@/entities/catalog'

const seasons: readonly Season[] = [
  { number: 1, name: 'Season 1', airYear: 2017, episodeCount: 10 },
  { number: 2, name: 'Season 2', airYear: 2019, episodeCount: 8 },
  { number: 0, name: 'Specials', airYear: 2018, episodeCount: 2 },
]

const largeSeasons: readonly Season[] = Array.from({ length: 40 }, (_, index) => ({
  number: index + 1,
  name: `Season ${index + 1}`,
  episodeCount: 10,
}))

describe('SeasonSelector', () => {
  it('renders regular seasons then specials with localized text and selected state', async () => {
    const { container } = await renderWithProviders(
      <SeasonSelector seasons={seasons} selectedSeason={2} onSelectSeason={() => undefined} />
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]).toHaveTextContent('Season 1 · 10 episodes')
    expect(buttons[1]).toHaveTextContent('Season 2 · 8 episodes')
    expect(buttons[2]).toHaveTextContent('Specials')

    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[1]).toHaveTextContent('Selected')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Season 2' })).toBe(buttons[1])
    expect(container.querySelector('ul')).toHaveAttribute('aria-label', 'Select season')
  })

  it('reports the activated season and is keyboard operable', async () => {
    const onSelectSeason = vi.fn()
    await renderWithProviders(
      <SeasonSelector seasons={seasons} selectedSeason={1} onSelectSeason={onSelectSeason} />
    )

    const second = screen.getByRole('button', { name: 'Season 2' })
    second.focus()
    await userEvent.keyboard('{Enter}')
    expect(onSelectSeason).toHaveBeenCalledWith(2)

    await userEvent.click(screen.getByRole('button', { name: 'Season 0' }))
    expect(onSelectSeason).toHaveBeenCalledWith(0)
  })

  it('exposes a very large season list without clipping', async () => {
    await renderWithProviders(
      <SeasonSelector seasons={largeSeasons} selectedSeason={1} onSelectSeason={() => undefined} />
    )
    expect(screen.getAllByRole('button')).toHaveLength(40)
    expect(screen.getByRole('button', { name: 'Season 40' })).toBeInTheDocument()
  })

  it('meets the minimum touch target size through its control classes', async () => {
    await renderWithProviders(
      <SeasonSelector seasons={seasons} selectedSeason={1} onSelectSeason={() => undefined} />
    )
    expect(screen.getAllByRole('button')[0]?.className).toContain('min-h-11')
  })
})
