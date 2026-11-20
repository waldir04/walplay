import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WALPLAY_MONOGRAM_PATH, WalplayLogo } from './WalplayLogo'

describe('WalplayLogo', () => {
  it('renders the exact monogram geometry and decorative mark', () => {
    const { container } = render(<WalplayLogo />)
    const svg = container.querySelector('svg')
    const path = container.querySelector('path')

    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 32 32')
    expect(svg?.getAttribute('width')).toBe('28')
    expect(svg?.getAttribute('height')).toBe('28')
    expect(svg?.getAttribute('fill')).toBe('none')
    expect(svg?.getAttribute('stroke')).toBe('currentColor')
    expect(svg?.getAttribute('stroke-width')).toBe('3.6')
    expect(svg?.getAttribute('stroke-linecap')).toBe('round')
    expect(svg?.getAttribute('stroke-linejoin')).toBe('round')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('class')).toContain('text-primary')
    expect(path?.getAttribute('d')).toBe(WALPLAY_MONOGRAM_PATH)
  })

  it('renders the live Walplay wordmark by default', () => {
    const { getByText } = render(<WalplayLogo />)
    const wordmark = getByText('Walplay')

    expect(wordmark.tagName).toBe('SPAN')
    expect(wordmark.className).toContain('text-xl')
    expect(wordmark.className).toContain('font-semibold')
    expect(wordmark.className).toContain('text-text')
  })

  it('renders only the icon when showText is false', () => {
    const { queryByText, container } = render(<WalplayLogo showText={false} />)

    expect(queryByText('Walplay')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('uses no image element or animation', () => {
    const { container } = render(<WalplayLogo />)

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('animate')).toBeNull()
  })
})
