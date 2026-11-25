import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TrailerSection } from './TrailerSection'
import { runAxe } from '@/test/axe'
import { stubMeasuredWidth } from '@/test/measuredWidth'
import {
  availableTrailerEnvelope,
  noVideosTrailerEnvelope,
  trailerVideo,
} from '@/test/fixtures/trailer'
import { renderWithProviders } from '@/test/renderWithProviders'

const renderAvailable = async () => {
  const envelope = availableTrailerEnvelope()
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

describe('TrailerSection accessibility', () => {
  it('has no axe violations in the available state', async () => {
    stubMeasuredWidth(800)
    const { container } = await renderAvailable()

    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('has no axe violations in the playing state', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    const { container } = await renderAvailable()

    await user.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)

    // A cross-origin frame offers no scannable DOM in jsdom; the frame's own
    // accessible name is asserted below. Scan the host document around it.
    container.querySelector('iframe')?.remove()
    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('has no axe violations when the player is unavailable', async () => {
    stubMeasuredWidth(300)
    const { container } = await renderAvailable()

    expect(screen.getByText('The player cannot be shown at this width')).toBeInTheDocument()
    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('has no axe violations in the no-video state', async () => {
    const envelope = noVideosTrailerEnvelope()
    const { container } = await renderWithProviders(
      <TrailerSection
        state={{
          status: 'ready',
          data: envelope.data,
          meta: envelope.meta,
          onRetry: vi.fn(),
        }}
      />
    )

    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('has no axe violations when only an external destination exists', async () => {
    const envelope = availableTrailerEnvelope([trailerVideo({ embedUrl: undefined })])
    const { container } = await renderWithProviders(
      <TrailerSection
        state={{
          status: 'ready',
          data: envelope.data,
          meta: envelope.meta,
          onRetry: vi.fn(),
        }}
      />
    )

    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('names the frame with the video title and platform', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    await renderAvailable()

    await user.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    expect(screen.getByTitle('Official Trailer — YouTube player')).toBeInTheDocument()
  })
})
