import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TrailerSection } from './TrailerSection'
import { stubMeasuredWidth } from '@/test/measuredWidth'
import { availableTrailerEnvelope, trailerVideo } from '@/test/fixtures/trailer'
import { renderWithProviders } from '@/test/renderWithProviders'

const renderWithVideos = async (videos = [trailerVideo()]) => {
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

afterEach(() => {
  vi.useRealTimers()
})

describe('TrailerSection unavailable states', () => {
  it('unmounts the frame and explains the failure after the load timeout', async () => {
    vi.useFakeTimers()
    stubMeasuredWidth(800)

    await renderWithVideos()
    fireEvent.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    expect(document.querySelectorAll('iframe')).toHaveLength(1)

    await act(async () => {
      vi.advanceTimersByTime(15_000)
    })

    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.getByText('This video cannot be played here')).toBeInTheDocument()
    expect(screen.getByText(/The video’s owner may have disabled embedding/)).toBeInTheDocument()
    expect(screen.getByText(/private, deleted, age-restricted/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Watch on YouTube/ })[0]!).toBeInTheDocument()
  })

  it('does not retry automatically after a timeout', async () => {
    vi.useFakeTimers()
    stubMeasuredWidth(800)

    await renderWithVideos()
    fireEvent.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    await act(async () => {
      vi.advanceTimersByTime(15_000)
    })
    expect(document.querySelector('iframe')).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(120_000)
    })
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('treats a frame load before the timeout as ready and cancels the timeout', async () => {
    vi.useFakeTimers()
    stubMeasuredWidth(800)

    await renderWithVideos()
    fireEvent.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    fireEvent.load(screen.getByTitle('Official Trailer — YouTube player'))

    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })

    expect(document.querySelectorAll('iframe')).toHaveLength(1)
    expect(screen.getAllByText('Official Trailer player loaded').length).toBeGreaterThan(0)
    expect(screen.queryByText('This video cannot be played here')).toBeNull()
  })

  it('renders the external option adjacent to loading, ready, and unavailable states', async () => {
    vi.useFakeTimers()
    stubMeasuredWidth(800)

    await renderWithVideos()
    fireEvent.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    expect(screen.getAllByRole('link', { name: /Watch on YouTube/ })[0]!).toBeInTheDocument()

    fireEvent.load(screen.getByTitle('Official Trailer — YouTube player'))
    expect(screen.getAllByRole('link', { name: /Watch on YouTube/ })[0]!).toBeInTheDocument()
  })

  it('offers only the external destination below the compliant width', async () => {
    stubMeasuredWidth(300)
    await renderWithVideos()

    expect(screen.getByText('The player cannot be shown at this width')).toBeInTheDocument()
    expect(screen.getByText('Open the video on YouTube to watch it.')).toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.getAllByRole('link', { name: /Watch on YouTube/ })[0]!).toBeInTheDocument()
  })

  it('does not assert a cause or expose raw error codes', async () => {
    vi.useFakeTimers()
    stubMeasuredWidth(800)

    await renderWithVideos()
    fireEvent.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    await act(async () => {
      vi.advanceTimersByTime(15_000)
    })

    const panel = screen.getByText('This video cannot be played here').closest('div')
    expect(panel?.textContent).toContain('may have')
    expect(panel?.textContent).not.toMatch(/player-timeout|15000|error code/i)
  })

  it('keeps the video identifiable and the list usable after a failure', async () => {
    vi.useFakeTimers()
    stubMeasuredWidth(800)

    await renderWithVideos()
    fireEvent.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    await act(async () => {
      vi.advanceTimersByTime(15_000)
    })

    expect(screen.getByRole('list', { name: 'Available videos' })).toBeInTheDocument()
    expect(screen.getAllByText('Official Trailer').length).toBeGreaterThan(0)
  })

  it('does not unmount a ready player on a redundant load event', async () => {
    stubMeasuredWidth(800)
    await renderWithVideos()

    fireEvent.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    fireEvent.load(screen.getByTitle('Official Trailer — YouTube player'))
    fireEvent.load(screen.getByTitle('Official Trailer — YouTube player'))
    await waitFor(() =>
      expect(screen.getAllByText('Official Trailer player loaded').length).toBeGreaterThan(0)
    )
    expect(document.querySelectorAll('iframe')).toHaveLength(1)
  })
})
