import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProviderMetadata } from './ProviderMetadata'
import { renderWithProviders } from '@/test/renderWithProviders'

const attribution = <p>Provider attribution</p>

describe('ProviderMetadata', () => {
  it('renders popularity only when finite and positive', async () => {
    await renderWithProviders(<ProviderMetadata popularity={63.421} attribution={attribution} />)
    expect(screen.getByText('TMDB popularity:')).toBeVisible()
    expect(screen.getByText('63.4')).toBeVisible()
    expect(screen.getByText(/Ratings and popularity are provided by TMDB/)).toBeVisible()
    expect(screen.getByText('Provider attribution')).toBeVisible()
  })

  it.each([undefined, 0, -1, Number.NaN])(
    'omits popularity for an unusable value (%s)',
    async (popularity) => {
      await renderWithProviders(
        <ProviderMetadata popularity={popularity} attribution={attribution} />
      )
      expect(screen.queryByText('TMDB popularity:')).toBeNull()
      expect(screen.getByText('Provider attribution')).toBeVisible()
    }
  )
})
