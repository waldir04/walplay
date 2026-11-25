import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TrailerSection } from './TrailerSection'
import { stubMeasuredWidth } from '@/test/measuredWidth'
import { availableTrailerEnvelope } from '@/test/fixtures/trailer'
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

describe('TrailerSection keyboard and focus', () => {
  it('makes every control keyboard operable in document order', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    await renderAvailable()

    const play = screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!
    play.focus()
    expect(document.activeElement).toBe(play)

    await user.tab()
    expect(screen.getAllByRole('link', { name: /Watch on YouTube/ })[0]).toHaveFocus()

    await user.tab()
    expect(screen.getAllByRole('button', { name: 'Play First Teaser' })[0]).not.toHaveFocus()
    expect(document.activeElement).not.toBe(document.body)
  })

  it('moves focus into the player area when playback starts', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    const { container } = await renderAvailable()

    await user.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)

    const focused = document.activeElement
    expect(focused).not.toBe(document.body)
    expect(focused?.tagName).toBe('DIV')
    expect(focused?.querySelector('iframe')).not.toBeNull()
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
  })

  it('moves focus again when the player is replaced', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    await renderAvailable()

    await user.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    await user.click(screen.getAllByRole('button', { name: 'Play First Teaser' })[0]!)

    const focused = document.activeElement
    expect(focused?.tagName).toBe('DIV')
    expect(focused?.querySelector('iframe')).not.toBeNull()
    expect(screen.getByTitle('First Teaser — YouTube player')).toBeInTheDocument()
  })

  it('does not trap focus inside the section', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    await renderAvailable()

    await user.tab()
    for (let index = 0; index < 25; index += 1) {
      await user.tab()
      expect(document.activeElement).not.toBeNull()
      expect(document.body.contains(document.activeElement)).toBe(true)
    }
  })

  it('keeps the section heading reachable as a fragment target', async () => {
    stubMeasuredWidth(800)
    await renderAvailable()

    const heading = screen.getByRole('heading', { level: 2, name: 'Trailer' })
    heading.focus()
    expect(document.activeElement).toBe(heading)
  })
})
