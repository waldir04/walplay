import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CastList } from './CastList'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { CastCredit } from '@/entities/catalog'

const makeCast = (count: number): CastCredit[] =>
  Array.from({ length: count }, (_, index) => ({
    name: `Performer ${index + 1}`,
    ...(index === 1 ? { character: 'The Narrator' } : {}),
    ...(index === 2
      ? {}
      : { profile: { url: `https://image.example.test/w185/p${index + 1}.jpg` } }),
  }))

describe('CastList', () => {
  it('bounds the preview to ten credits in provider order', async () => {
    const { container } = await renderWithProviders(<CastList cast={makeCast(15)} />)
    expect(container.querySelectorAll('li')).toHaveLength(10)
    expect(container.querySelector('li')).toHaveTextContent('Performer 1')
    expect(container).not.toHaveTextContent('Performer 11')
  })

  it('renders the character only when known', async () => {
    const { container } = await renderWithProviders(<CastList cast={makeCast(3)} />)
    expect(screen.getByText('as The Narrator')).toBeInTheDocument()
    expect(container.querySelectorAll('li')).toHaveLength(3)
  })

  it('shows a neutral fallback carrying the name and keeps images decorative', async () => {
    const { container } = await renderWithProviders(<CastList cast={makeCast(3)} />)
    const fallback = container.querySelector('li:nth-child(3) div')
    expect(fallback).toHaveTextContent('Performer 3')
    const image = container.querySelector('img')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('aria-hidden', 'true')
    expect(image?.className).toContain('aspect-[2/3]')
  })
})
