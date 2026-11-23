import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AvailableData } from '@/entities/catalog'
import { availabilityMeta } from '@/test/fixtures/availability'
import { renderWithProviders } from '@/test/renderWithProviders'

import { AvailabilitySection } from './AvailabilitySection'

const renderWithProvidersData = async (data: AvailableData) => {
  const result = await renderWithProviders(
    <AvailabilitySection
      region="CO"
      state={{ status: 'ready', data, meta: availabilityMeta(), onRetry: vi.fn() }}
    />
  )
  return result
}

describe('AvailabilitySection provider logos', () => {
  it('renders no image when the source supplies no logo', async () => {
    const { container } = await renderWithProvidersData({
      state: 'available',
      region: 'CO',
      groups: [{ category: 'free', providers: [{ name: 'Free service' }] }],
    })

    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(screen.getByText('Free service')).toBeVisible()
  })

  it('renders a decorative logo with reserved dimensions beside the visible name', async () => {
    const { container } = await renderWithProvidersData({
      state: 'available',
      region: 'CO',
      groups: [
        {
          category: 'subscription',
          providers: [
            {
              name: 'HBO Max',
              logo: { url: 'https://image.example.test/w92/hbo.png' },
            },
          ],
        },
      ],
    })

    const image = container.querySelector('img')
    expect(image).not.toBeNull()
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('aria-hidden', 'true')
    expect(image).toHaveAttribute('width', '48')
    expect(image).toHaveAttribute('height', '32')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image?.className).not.toMatch(/animate|grayscale|sepia|hue-rotate/)
    expect(screen.getByText('HBO Max')).toBeVisible()
  })

  it('falls back to the provider name without a broken-image placeholder on error', async () => {
    const { container } = await renderWithProvidersData({
      state: 'available',
      region: 'CO',
      groups: [
        {
          category: 'subscription',
          providers: [
            {
              name: 'Movistar Play',
              logo: { url: 'https://image.example.test/w92/movistar.png' },
            },
          ],
        },
      ],
    })

    const image = container.querySelector('img')
    expect(image).not.toBeNull()
    fireEvent.error(image as Element)

    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(screen.getByText('Movistar Play')).toBeVisible()
  })

  it('keeps long and non-Latin provider names as supplied', async () => {
    await renderWithProvidersData({
      state: 'available',
      region: 'CO',
      groups: [
        {
          category: 'buy',
          providers: [{ name: 'Proveedor de películas en línea' }, { name: '映画ストア' }],
        },
      ],
    })

    expect(screen.getByText('Proveedor de películas en línea')).toBeVisible()
    expect(screen.getByText('映画ストア')).toBeVisible()
  })
})
