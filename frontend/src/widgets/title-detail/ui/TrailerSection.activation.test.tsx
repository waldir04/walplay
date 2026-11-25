import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TrailerSection } from './TrailerSection'
import { stubMeasuredWidth } from '@/test/measuredWidth'
import {
  availableTrailerEnvelope,
  trailerMeta,
  trailerVideos,
  teaserVideo,
} from '@/test/fixtures/trailer'
import { renderWithProviders } from '@/test/renderWithProviders'

const renderReady = async (videos = trailerVideos()) => {
  const envelope = availableTrailerEnvelope(videos)
  return renderWithProviders(
    <TrailerSection
      state={{
        status: 'ready',
        data: envelope.data,
        meta: envelope.meta,
        onRetry: vi.fn(),
      }}
    />
  )
}

describe('TrailerSection activation', () => {
  it('renders a layout-matched busy skeleton with hidden decoration', async () => {
    const { container } = await renderWithProviders(
      <TrailerSection state={{ status: 'loading', onRetry: vi.fn() }} />
    )

    const section = screen.getByRole('region', { name: 'Trailer' })
    expect(section).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading trailer information')).toHaveClass('sr-only')
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('selects the best video without starting playback', async () => {
    stubMeasuredWidth(800)
    await renderReady()

    expect(screen.getAllByText('Official Trailer').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Selected').length).toBeGreaterThan(0)
    expect(screen.queryByTitle('Official Trailer — YouTube player')).toBeNull()
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
    expect(screen.queryByText(/selected\. Loading/)).toBeNull()
  })

  it('loads exactly one privacy-enhanced player after explicit activation', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    await renderReady()

    await user.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)

    const iframes = document.querySelectorAll('iframe')
    expect(iframes).toHaveLength(1)
    const frame = screen.getByTitle('Official Trailer — YouTube player')
    expect(frame).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1'
    )
    expect(frame).toHaveAttribute('referrerPolicy', 'strict-origin-when-cross-origin')
    expect(frame).toHaveAttribute('allow', 'autoplay; encrypted-media; picture-in-picture')
    expect(frame).toHaveAttribute('allowfullscreen')
    expect(frame).toHaveAttribute('loading', 'eager')
    expect(screen.getByText('Loading the YouTube player for Official Trailer')).toBeInTheDocument()
    expect(
      screen.getByText('Captions are controlled by YouTube and the video’s owner.')
    ).toBeInTheDocument()
  })

  it('reports player readiness once on the frame load event', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    const { container } = await renderReady()

    await user.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    const frame = screen.getByTitle('Official Trailer — YouTube player')
    fireEvent.load(frame)

    expect(screen.getByText('Official Trailer player loaded')).toBeInTheDocument()
    await waitFor(() => {
      const readinessLiveRegions = Array.from(
        container.querySelectorAll('[aria-live="polite"]')
      ).filter((element) => element.textContent?.includes('Official Trailer player loaded'))
      expect(readinessLiveRegions).toHaveLength(1)
    })
  })

  it('replaces the current frame when another video is chosen', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    await renderReady()

    await user.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    const firstFrame = screen.getByTitle('Official Trailer — YouTube player')
    expect(firstFrame).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Play First Teaser' })[0]!)

    const frames = document.querySelectorAll('iframe')
    expect(frames).toHaveLength(1)
    expect(screen.queryByTitle('Official Trailer — YouTube player')).toBeNull()
    expect(screen.getByTitle('First Teaser — YouTube player')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/abc123DEF45?autoplay=1&playsinline=1'
    )
  })

  it('keeps the entry-free section operable when only an external destination exists', async () => {
    stubMeasuredWidth(800)
    await renderReady([teaserVideo({ embedUrl: undefined })])

    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Play First Teaser' })[0]!)

    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.getByText('The player cannot be shown at this width')).toBeInTheDocument()
  })

  it('renders the section heading as a focusable region target', async () => {
    stubMeasuredWidth(800)
    await renderReady()

    const heading = screen.getByRole('heading', { level: 2, name: 'Trailer' })
    expect(heading).toHaveAttribute('id', 'trailer-heading')
    expect(heading).toHaveAttribute('tabindex', '-1')
  })

  it('keeps the list accessible while a player is active', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    await renderReady()

    await user.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    const list = screen.getByRole('list', { name: 'Available videos' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  })

  it('renders the caption note next to the active player', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    await renderReady()

    await user.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    expect(
      screen.getByText('Captions are controlled by YouTube and the video’s owner.')
    ).toBeInTheDocument()
  })
})

describe('trailer metadata fixture', () => {
  it('keeps the meta current for the activation fixture', () => {
    expect(trailerMeta().stale).toBe(false)
  })
})
