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

const PLATFORM_HOSTS = /youtube|youtube-nocookie|googlevideo|google\./i

describe('TrailerSection privacy', () => {
  it('makes zero third-party contact before activation', async () => {
    stubMeasuredWidth(800)
    const { container } = await renderAvailable()

    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('[rel="preconnect"]')).toBeNull()
    expect(container.querySelector('[rel="dns-prefetch"]')).toBeNull()
    expect(container.querySelector('[rel="preload"]')).toBeNull()
    expect(container.querySelector('[rel="prefetch"]')).toBeNull()

    const loadedResources = Array.from(
      container.querySelectorAll('script[src], img[src], source[src], link[href]')
    )
    expect(
      loadedResources.filter((element) => {
        const reference = element.getAttribute('src') ?? element.getAttribute('href') ?? ''
        return (
          PLATFORM_HOSTS.test(reference) && !element.getAttribute('rel')?.includes('stylesheet')
        )
      })
    ).toEqual([])

    expect(window.localStorage.length).toBe(0)
    expect(document.cookie).toBe('')
  })

  it('discloses the platform, third-party loading, terms, and privacy policy before activation', async () => {
    stubMeasuredWidth(800)
    await renderAvailable()

    expect(
      screen.getAllByText('Activating a video loads content from YouTube.').length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('Walplay does not host these videos.').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /YouTube terms of service/ })[0]).toHaveAttribute(
      'href',
      'https://www.youtube.com/t/terms'
    )
    expect(screen.getAllByRole('link', { name: /YouTube privacy policy/ })[0]).toHaveAttribute(
      'href',
      'https://policies.google.com/privacy'
    )
    expect(
      screen.getAllByText(
        'Privacy-enhanced playback limits personalization. It does not eliminate third-party processing.'
      ).length
    ).toBeGreaterThan(0)
  })

  it('creates exactly one privacy-enhanced frame after activation', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    const { container } = await renderAvailable()

    await user.click(screen.getAllByRole('button', { name: 'Play Official Trailer' })[0]!)

    const frames = container.querySelectorAll('iframe')
    expect(frames).toHaveLength(1)
    const source = frames[0]?.getAttribute('src') ?? ''
    const url = new URL(source)
    expect(url.hostname).toBe('www.youtube-nocookie.com')
    expect([...url.searchParams.keys()].sort()).toEqual(['autoplay', 'playsinline'])
    expect(source).not.toMatch(/walplay|session|token|utm_|gclid/i)
  })

  it('never contacts the platform host from the pre-activation cover artwork', async () => {
    stubMeasuredWidth(800)
    const { container } = await renderAvailable()

    const hosts = Array.from(container.querySelectorAll('img')).map(
      (image) => new URL(image.src, 'http://localhost').hostname
    )
    expect(hosts.every((host) => !PLATFORM_HOSTS.test(host))).toBe(true)
  })

  it('does not imply partnership or eliminate third-party processing', async () => {
    stubMeasuredWidth(800)
    await renderAvailable()

    expect(document.body.textContent).not.toMatch(/partner|endorse|sponsor/i)
    expect(document.body.textContent).not.toMatch(/no third.party|zero third.party/i)
  })
})
