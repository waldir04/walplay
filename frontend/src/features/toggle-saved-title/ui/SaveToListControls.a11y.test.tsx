import { describe, expect, it } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedStorage } from '@/entities/saved-library'
import { runAxe } from '@/test/axe'
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

const criticalOrSerious = (violations: { impact?: string | null }[]): unknown[] =>
  violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious'
  )

describe('SaveToListControls accessibility', () => {
  it('has no critical or serious violations for both controls', async () => {
    const { container } = await renderWithProviders(
      <div>
        <SaveToListControls
          collection="watchlist"
          title="Fight Club"
          snapshot={savedSnapshot()}
          store={createStore()}
        />
        <SaveToListControls
          collection="favorites"
          title="Fight Club"
          snapshot={savedSnapshot()}
          store={createStore()}
        />
      </div>
    )

    const results = await runAxe(container)
    expect(criticalOrSerious(results.violations)).toEqual([])
    expect(results).toHaveNoViolations()
  })
})
