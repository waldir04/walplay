import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AvailabilityRegionSelector } from '@/features/select-availability-region'
import type { AvailableData } from '@/entities/catalog'
import { availabilityMeta } from '@/test/fixtures/availability'
import { renderWithProviders } from '@/test/renderWithProviders'

import { AvailabilitySection } from './AvailabilitySection'

const longName =
  'Proveedor de streaming con un nombre extraordinariamente largo y sin espacios-para-probar-el-ajuste'

const data: AvailableData = {
  state: 'available',
  region: 'CO',
  groups: [
    {
      category: 'subscription',
      providers: [{ name: longName }, { name: 'サービス・プロバイダー' }],
    },
  ],
  destination: {
    url: 'https://www.themoviedb.org/movie/550/watch?locale=CO',
  },
}

const renderSection = async () => {
  const result = await renderWithProviders(
    <AvailabilitySection
      region="CO"
      regionSelector={
        <AvailabilityRegionSelector value="CO" regions={['CO', 'US']} onChange={vi.fn()} />
      }
      attribution={<p>Availability attribution</p>}
      state={{ status: 'ready', data, meta: availabilityMeta(), onRetry: vi.fn() }}
    />
  )
  return result
}

describe('AvailabilitySection responsive structure', () => {
  it.each([360, 768, 1024, 1440])('keeps wrapping structure at %i px', async () => {
    window.innerWidth = 360
    const { container } = await renderSection()

    const section = screen.getByRole('region', { name: 'Where to watch' })
    expect(section.className).toContain('flex-col')

    const regionRow = section.querySelector('#availability-region-context')?.parentElement
    expect(regionRow?.className).toContain('flex-wrap')
    expect(regionRow?.className).toContain('sm:flex-row')

    const lists = container.querySelectorAll('ul')
    for (const list of lists) {
      expect(list.className).toContain('flex-wrap')
      expect(list.className).toContain('min-w-0')
    }
  })

  it('wraps long and non-Latin provider names without clipping', async () => {
    await renderSection()

    const longItem = screen.getByText(longName)
    expect(longItem.className).toContain('break-words')
    expect(longItem.className).toContain('min-w-0')
    expect(screen.getByText('サービス・プロバイダー')).toBeVisible()
  })

  it('keeps controls at target size and never hides them inline', async () => {
    const { container } = await renderSection()

    expect(screen.getByLabelText('Availability region')).toHaveClass('min-h-11')
    const destination = screen.getByRole('link')
    expect(destination.className).toContain('max-w-full')
    expect(destination.className).not.toContain('overflow-hidden')
    expect(container.querySelectorAll('[hidden]')).toHaveLength(0)
  })

  it('uses structural classes instead of fixed widths or horizontal overflow', async () => {
    const { container } = await renderSection()

    const section = screen.getByRole('region', { name: 'Where to watch' })
    expect(section.className).not.toMatch(/\bw-\[\d/)
    expect(section.className).not.toContain('overflow-x-scroll')
    expect(container.innerHTML).not.toContain('width: 1024px')
  })
})
