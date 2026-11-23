import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { availabilityMeta, availableData } from '@/test/fixtures/availability'
import { renderWithProviders } from '@/test/renderWithProviders'

import { AvailabilitySection } from './AvailabilitySection'

describe('AvailabilitySection Spanish locale', () => {
  it('renders complete Walplay-owned Spanish copy with unchanged provider names', async () => {
    const { container } = await renderWithProviders(
      <AvailabilitySection
        region="CO"
        state={{
          status: 'ready',
          data: availableData(),
          meta: availabilityMeta(),
          onRetry: vi.fn(),
        }}
      />,
      { locale: 'es' }
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Dónde ver' })).toBeInTheDocument()
    expect(screen.getByText('Disponibilidad en Colombia (CO)')).toBeInTheDocument()
    expect(screen.getByText('Incluido con una suscripción')).toBeInTheDocument()
    expect(screen.getByText('Alquilar')).toBeInTheDocument()
    expect(screen.getByText(/Verificado por Walplay el/)).toBeInTheDocument()
    expect(screen.getByText(/Walplay no aloja ni transmite contenido/)).toBeInTheDocument()
    expect(screen.getByText('Ver detalles de disponibilidad')).toBeInTheDocument()

    for (const provider of ['HBO Max', 'Movistar Play', 'Google Play Movies']) {
      expect(screen.getByText(provider)).toBeVisible()
    }

    expect(container.textContent).not.toContain('detail.availability')
    expect(container.textContent).not.toContain('Where to watch')
    expect(container.textContent).not.toContain('Checked by Walplay')
  })

  it('localizes the stale banner and caution in Spanish', async () => {
    await renderWithProviders(
      <AvailabilitySection
        region="CO"
        state={{
          status: 'ready',
          data: availableData(),
          meta: availabilityMeta({
            stale: true,
            source: 'stale-cache',
            freshness: 'stale',
            lastUpdatedAt: '2026-11-20T09:30:00.000Z',
          }),
          onRetry: vi.fn(),
        }}
      />,
      { locale: 'es' }
    )

    expect(screen.getByText('Última disponibilidad conocida')).toBeInTheDocument()
    expect(screen.getByText(/Última verificación el/)).toBeInTheDocument()
    expect(screen.getByText(/La disponibilidad puede haber cambiado/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('supports the Spanish unsupported-region copy', async () => {
    await renderWithProviders(
      <AvailabilitySection
        region="FR"
        state={{
          status: 'ready',
          data: { state: 'unsupported-region', region: 'FR', groups: [] },
          meta: availabilityMeta(),
          onRetry: vi.fn(),
        }}
      />,
      { locale: 'es' }
    )

    expect(screen.getByText('Región no compatible')).toBeInTheDocument()
    expect(
      screen.getByText(
        /La información de disponibilidad aún no está disponible para Francia \(FR\)/
      )
    ).toBeInTheDocument()
  })
})
