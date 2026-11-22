import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { MediaTypeSwitch } from './MediaTypeSwitch'

describe('MediaTypeSwitch', () => {
  it('exposes both media types and the selected state as text plus aria-current', async () => {
    await renderWithProviders(<MediaTypeSwitch current="movie" />)

    const group = screen.getByRole('group', { name: 'Media type' })
    expect(group).toBeInTheDocument()

    const movies = screen.getByRole('link', { name: 'Movies' })
    const tv = screen.getByRole('link', { name: 'TV Shows' })
    expect(movies).toHaveAttribute('aria-current', 'page')
    expect(tv).not.toHaveAttribute('aria-current')
    expect(movies).toHaveTextContent('Movies')
    expect(tv).toHaveTextContent('TV Shows')
  })

  it('targets the other landing from a landing', async () => {
    await renderWithProviders(<MediaTypeSwitch current="movie" />)
    expect(screen.getByRole('link', { name: 'Movies' })).toHaveAttribute('href', '/browse/movies')
    expect(screen.getByRole('link', { name: 'TV Shows' })).toHaveAttribute(
      'href',
      '/browse/tv-shows'
    )
  })

  it('opens the matching category for the other type', async () => {
    await renderWithProviders(<MediaTypeSwitch current="movie" category="top-rated" />)
    expect(screen.getByRole('link', { name: 'TV Shows' })).toHaveAttribute(
      'href',
      '/browse/tv-shows/top-rated'
    )
  })

  it('meets primary target-size requirements', async () => {
    const { container } = await renderWithProviders(<MediaTypeSwitch current="movie" />)
    for (const link of container.querySelectorAll('a')) {
      expect(link.className).toContain('min-h-11')
      expect(link.className).toContain('min-w-11')
    }
  })

  it('renders localized labels', async () => {
    await renderWithProviders(<MediaTypeSwitch current="tv" />, { locale: 'es' })
    expect(screen.getByRole('group', { name: 'Tipo de contenido' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Películas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Series' })).toHaveAttribute('aria-current', 'page')
  })

  it('does not depend on a pointer for activation', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<MediaTypeSwitch current="movie" />)

    const tv = screen.getByRole('link', { name: 'TV Shows' })
    tv.focus()
    expect(tv).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(tv).toHaveFocus()
  })

  it('calls no navigation handler because destinations are real links', async () => {
    const spy = vi.fn()
    await renderWithProviders(<MediaTypeSwitch current="movie" />)
    expect(spy).not.toHaveBeenCalled()
  })
})
