import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CreditsSection } from './CreditsSection'
import { creditsEnvelope, emptyCreditsEnvelope } from '@/test/fixtures/detail'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('CreditsSection', () => {
  it('renders cast and crew sections with their own headings', async () => {
    await renderWithProviders(
      <CreditsSection
        credits={{ status: 'loaded', data: creditsEnvelope().data, onRetry: () => undefined }}
      />
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Cast' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Crew' })).toBeInTheDocument()
    expect(screen.getByText('Edward Norton')).toBeInTheDocument()
    expect(screen.getByText('David Fincher')).toBeInTheDocument()
  })

  it('omits the whole area when both previews are empty', async () => {
    await renderWithProviders(
      <CreditsSection
        credits={{ status: 'loaded', data: emptyCreditsEnvelope().data, onRetry: () => undefined }}
      />
    )
    expect(screen.queryByRole('heading', { name: 'Cast' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Crew' })).toBeNull()
  })

  it('shows a section-scoped loading label', async () => {
    await renderWithProviders(
      <CreditsSection credits={{ status: 'loading', onRetry: () => undefined }} />
    )
    expect(screen.getByLabelText('Loading this section')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Loading title details')).toBeNull()
  })

  it('shows a section-scoped stale label with a last-update note', async () => {
    await renderWithProviders(
      <CreditsSection
        credits={{
          status: 'stale',
          data: creditsEnvelope().data,
          onRetry: () => undefined,
          lastUpdatedLabel: 'Cached data from Nov 20, 2026',
        }}
      />
    )
    expect(screen.getByText(/Showing cached section data/)).toBeInTheDocument()
    expect(screen.getByText(/Nov 20, 2026/)).toBeInTheDocument()
  })

  it('shows an inline alert and retries only this section', async () => {
    const onRetry = vi.fn()
    await renderWithProviders(<CreditsSection credits={{ status: 'error', onRetry }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('This section could not be loaded')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
