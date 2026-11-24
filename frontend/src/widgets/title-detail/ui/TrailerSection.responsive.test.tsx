import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

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

describe('TrailerSection responsive layout', () => {
  it.each([360, 768, 1024, 1440])('uses fluid containers at %i px', async (width) => {
    stubMeasuredWidth(width)
    const { container } = await renderWithVideos()

    const section = screen.getByRole('region', { name: 'Trailer' })
    expect(section.className).toContain('min-w-0')
    expect(container.querySelector('.aspect-video')).toBeNull()
    expect(document.body.textContent).not.toMatch(/overflow-x/)
    expect(container.querySelectorAll('[class*="w-["]')).toHaveLength(0)
  })

  it('falls back to the external destination at 360 px', async () => {
    stubMeasuredWidth(300)
    await renderWithVideos()

    expect(screen.getByText('The player cannot be shown at this width')).toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.getAllByRole('link', { name: /Watch on YouTube/ })[0]!).toBeInTheDocument()
  })

  it('reserves a 16:9 area before activation and while playing', async () => {
    stubMeasuredWidth(1024)
    const user = userEvent.setup()
    const { container } = await renderWithVideos()

    await user.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)
    const player = container.querySelector('.aspect-video')
    expect(player).not.toBeNull()
    expect(player?.className).toContain('w-full')
    expect(player?.querySelector('iframe')).not.toBeNull()
  })

  it('wraps long titles and long platform text without clipping', async () => {
    stubMeasuredWidth(768)
    const longTitle = 'Trailer '.repeat(40).trim()
    await renderWithVideos([trailerVideo({ title: longTitle })])

    expect(screen.getAllByText(longTitle)[0]).toHaveClass('break-words')
    const actionRow = screen
      .getAllByRole('button', { name: `Play ${longTitle}` })[0]!
      .closest('div')
    expect(actionRow?.className).toContain('flex-wrap')
  })

  it('keeps controls usable at a narrow width with wrapping', async () => {
    stubMeasuredWidth(320)
    await renderWithVideos()

    const external = screen.getAllByRole('link', { name: /Watch on YouTube/ })[0]!
    expect(external.className).toContain('max-w-full')
    expect(external.className).toContain('break-words')
  })
})
