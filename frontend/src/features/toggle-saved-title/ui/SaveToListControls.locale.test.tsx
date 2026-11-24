import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedStorage } from '@/entities/saved-library'
import { SAVED_AT, savedSnapshot } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SaveToListControls } from './SaveToListControls'

const createStore = () => {
  let value: string | null = null
  const storage: SavedStorage = {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
  }
  return createSavedLibraryStore({ storage, now: () => SAVED_AT })
}

describe('SaveToListControls Spanish', () => {
  it('renders all owned copy and announcements in Spanish', async () => {
    await renderWithProviders(
      <SaveToListControls
        collection="watchlist"
        title="Fight Club"
        snapshot={savedSnapshot()}
        store={createStore()}
      />,
      { locale: 'es' }
    )

    const button = screen.getByRole('button', {
      name: 'Añadir Fight Club a la lista para ver',
    })
    expect(button).toHaveTextContent('Añadir a la lista para ver')
    expect(
      screen.getByText('Los títulos guardados permanecen solo en este dispositivo.')
    ).toBeInTheDocument()

    fireEvent.click(button)

    expect(await screen.findByText('Fight Club se añadió a tu lista para ver.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/saved\.(actions|feedback|storageNotice)/)
  })
})
