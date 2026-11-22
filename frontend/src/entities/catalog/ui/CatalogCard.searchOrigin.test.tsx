import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useLocation } from 'react-router'

import { CatalogCard, titleDetailPath } from '@/entities/catalog'
import { movieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

const Harness = ({ from }: { readonly from: string }) => {
  const location = useLocation()
  return (
    <div>
      <CatalogCard item={movieItem()} from={from} />
      <output data-testid="location">{JSON.stringify(location.state)}</output>
    </div>
  )
}

const readState = (): { from?: string; item?: { id?: string } } =>
  JSON.parse(screen.getByTestId('location').textContent ?? '{}') as {
    from?: string
    item?: { id?: string }
  }

describe('CatalogCard search origin', () => {
  it('passes the full active search path as router state', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<Harness from="/search?q=the%20matrix" />)

    await user.click(screen.getByRole('link'))

    const state = readState()
    expect(state.from).toBe('/search?q=the%20matrix')
    expect(state.item?.id).toBe(movieItem().id)
    expect(screen.getByTestId('location')).toBeInTheDocument()
    expect(titleDetailPath('movie', movieItem().id)).toBe(`/browse/movies/title/${movieItem().id}`)
  })

  it('keeps catalog origins unchanged', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<Harness from="/browse/movies/popular" />)

    await user.click(screen.getByRole('link'))

    expect(readState().from).toBe('/browse/movies/popular')
  })
})
