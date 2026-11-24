import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TrailerItem } from './TrailerItem'
import { renderWithProviders } from '@/test/renderWithProviders'
import { teaserVideo, trailerVideo } from '@/test/fixtures/trailer'

describe('TrailerItem metadata', () => {
  it('states type, title, platform, language, date, and playback mode as text', async () => {
    await renderWithProviders(
      <TrailerItem video={trailerVideo()} selected={false} playing={false} onSelect={vi.fn()} />
    )

    expect(screen.getByText('Trailer')).toBeInTheDocument()
    expect(screen.getByText('Official Trailer')).toBeInTheDocument()
    expect(screen.getByText('YouTube')).toBeInTheDocument()
    expect(screen.getByText('Official')).toBeInTheDocument()
    expect(screen.getByText('Language: English')).toBeInTheDocument()
    expect(screen.getByText('Published Jan 15, 2026')).toBeInTheDocument()
    expect(screen.getByText('Plays inside Walplay')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play Official Trailer' })).toBeInTheDocument()
  })

  it('states the external playback mode without merging it with the play action', async () => {
    await renderWithProviders(
      <TrailerItem
        video={teaserVideo({ embedUrl: undefined })}
        selected={false}
        playing={false}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByText('Opens on YouTube')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Watch on YouTube/ })).toHaveAttribute(
      'target',
      '_blank'
    )
    expect(screen.getByRole('button', { name: 'Play First Teaser' })).toBeInTheDocument()
  })

  it('exposes selected and playing state in accessible text', async () => {
    await renderWithProviders(
      <TrailerItem video={trailerVideo()} selected playing onSelect={vi.fn()} />
    )

    expect(screen.getByText('Selected')).toBeInTheDocument()
    expect(screen.getByText('Playing in the player')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play Official Trailer' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('warns that the canonical external link leaves Walplay', async () => {
    await renderWithProviders(
      <TrailerItem video={trailerVideo()} selected={false} playing={false} onSelect={vi.fn()} />
    )

    const link = screen.getByRole('link', { name: /Watch on YouTube/ })
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link.getAttribute('aria-label')).toContain('Leaves Walplay')
    expect(link.getAttribute('aria-label')).toContain('YouTube')
  })

  it('keeps long provider titles readable instead of hiding them', async () => {
    const longTitle = 'A very long promotional title that keeps going without truncation'
    await renderWithProviders(
      <TrailerItem
        video={trailerVideo({ title: longTitle })}
        selected={false}
        playing={false}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByText(longTitle)).toHaveClass('break-words')
  })
})
