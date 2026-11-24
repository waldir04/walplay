import { describe, expect, it, vi } from 'vitest'

import { TrailerSection } from './TrailerSection'
import { installMatchMediaMock } from '@/test/matchMedia'
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

describe('TrailerSection motion', () => {
  it('renders no attention-seeking animation under reduced motion', async () => {
    installMatchMediaMock(true)
    stubMeasuredWidth(800)
    const { container } = await renderAvailable()

    expect(container.querySelectorAll('[class*="animate-"]')).toHaveLength(0)
  })

  it('opts interactive transitions out when reduced motion is requested', async () => {
    installMatchMediaMock(true)
    stubMeasuredWidth(800)
    const { container } = await renderAvailable()

    const transitional = Array.from(container.querySelectorAll('.transition-colors'))
    expect(transitional.length).toBeGreaterThan(0)
    expect(
      transitional.every((element) => element.className.includes('motion-reduce:transition-none'))
    ).toBe(true)
  })

  it('keeps the loading skeleton motion-safe only', async () => {
    installMatchMediaMock(true)
    const { container } = await renderWithProviders(
      <TrailerSection state={{ status: 'loading', onRetry: vi.fn() }} />
    )

    const animated = Array.from(container.querySelectorAll('[class*="animate-"]'))
    expect(animated.length).toBeGreaterThan(0)
    expect(animated.every((element) => element.className.includes('motion-safe:'))).toBe(true)
  })
})
