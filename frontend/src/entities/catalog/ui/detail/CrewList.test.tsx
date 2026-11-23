import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CrewList } from './CrewList'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { CrewCredit } from '@/entities/catalog'

const makeCrew = (count: number): CrewCredit[] =>
  Array.from({ length: count }, (_, index) => ({
    name: `Crew ${index + 1}`,
    role: index % 2 === 0 ? ('director' as const) : ('writer' as const),
    ...(index === 0 ? { profile: { url: 'https://image.example.test/w185/c1.jpg' } } : {}),
  }))

describe('CrewList', () => {
  it('bounds the preview to six credits with localized role labels', async () => {
    const { container } = await renderWithProviders(<CrewList crew={makeCrew(9)} />)
    expect(container.querySelectorAll('li')).toHaveLength(6)
    expect(screen.getAllByText('Director').length).toBe(3)
    expect(screen.getAllByText('Writer').length).toBe(3)
  })

  it('localizes roles for Spanish', async () => {
    await renderWithProviders(<CrewList crew={makeCrew(2)} />, { locale: 'es' })
    expect(screen.getByText('Dirección')).toBeInTheDocument()
    expect(screen.getByText('Guion')).toBeInTheDocument()
  })

  it('uses a neutral fallback without duplicating the accessible name', async () => {
    const { container } = await renderWithProviders(<CrewList crew={makeCrew(2)} />)
    const fallback = container.querySelector('li:nth-child(2) span[aria-hidden="true"]')
    expect(fallback).toHaveTextContent('')
    expect(container.querySelector('li:nth-child(2)')).toHaveTextContent('Crew 2')
  })
})
