import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { runAxe } from '@/test/axe'
import {
  availableTrailerEnvelope,
  noVideosTrailerEnvelope,
  trailerMeta,
  trailerVideo,
} from '@/test/fixtures/trailer'
import { renderWithProviders } from '@/test/renderWithProviders'
import { stubMeasuredWidth } from '@/test/measuredWidth'

import { TrailerSection } from './TrailerSection'

describe('TrailerSection states', () => {
  it('renders a calm, localized no-video state without a dead player', async () => {
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

    expect(screen.getByRole('heading', { level: 2, name: 'Trailer' })).toBeInTheDocument()
    expect(screen.getByText('No trailer information available')).toBeInTheDocument()
    expect(
      screen.getByText('There is no promotional video information for this title right now.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('[class*="animate-"]')).toBeNull()
  })

  it('has no axe violations in the no-video state', async () => {
    const envelope = noVideosTrailerEnvelope()
    const { container } = await renderWithProviders(
      <TrailerSection
        state={{ status: 'ready', data: envelope.data, meta: envelope.meta, onRetry: vi.fn() }}
      />
    )

    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('renders a distinct inline error with a single-flight retry', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    await renderWithProviders(<TrailerSection state={{ status: 'error', onRetry }} />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Trailer information is unavailable')
    expect(alert).toHaveTextContent('the rest of the page is still available.')
    expect(screen.queryByText('No trailer information available')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('disables retry while a retry is pending', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    await renderWithProviders(
      <TrailerSection state={{ status: 'error', onRetry, retrying: true }} />
    )

    const retry = screen.getByRole('button', { name: 'Try again' })
    expect(retry).toBeDisabled()
    await user.click(retry)
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('has no axe violations in the error state', async () => {
    const { container } = await renderWithProviders(
      <TrailerSection state={{ status: 'error', onRetry: vi.fn() }} />
    )

    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('labels stale cached inventory with last-checked and caution copy', async () => {
    stubMeasuredWidth(800)
    const envelope = availableTrailerEnvelope()
    const meta = trailerMeta({
      stale: true,
      source: 'stale-cache',
      freshness: 'stale',
      lastUpdatedAt: '2026-11-20T09:30:00.000Z',
    })
    await renderWithProviders(
      <TrailerSection state={{ status: 'stale', data: envelope.data, meta, onRetry: vi.fn() }} />
    )

    expect(screen.getByText(/Last checked/)).toBeInTheDocument()
    expect(screen.getByText('This information may be out of date.')).toBeInTheDocument()
    expect(screen.getAllByText('Official Trailer').length).toBeGreaterThan(0)
  })

  it('keeps a non-interface-language inventory available instead of showing no-video', async () => {
    stubMeasuredWidth(800)
    const envelope = availableTrailerEnvelope([trailerVideo({ language: 'ja' })])
    await renderWithProviders(
      <TrailerSection
        state={{ status: 'ready', data: envelope.data, meta: envelope.meta, onRetry: vi.fn() }}
      />
    )

    expect(screen.queryByText('No trailer information available')).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!).toBeInTheDocument()
    expect(screen.getAllByText('Language: Japanese').length).toBeGreaterThan(0)
  })

  it('keeps error and no-video semantics distinct across renders', async () => {
    const noVideos = noVideosTrailerEnvelope()
    const { unmount } = await renderWithProviders(
      <TrailerSection
        state={{ status: 'ready', data: noVideos.data, meta: noVideos.meta, onRetry: vi.fn() }}
      />
    )
    expect(screen.queryByRole('alert')).toBeNull()
    unmount()

    await renderWithProviders(<TrailerSection state={{ status: 'error', onRetry: vi.fn() }} />)
    expect(screen.queryByText('No trailer information available')).toBeNull()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
