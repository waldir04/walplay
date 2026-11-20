import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { runAxe } from '@/test/axe'

import { renderWithProviders } from '@/test/renderWithProviders'

import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('is announced as an alert and focuses its heading', async () => {
    await renderWithProviders(
      <ErrorState
        title="This page could not be loaded"
        description="Something went wrong."
        homeAction={{ label: 'Back to home', href: '/' }}
      />
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'This page could not be loaded' })
    ).toHaveFocus()
  })

  it('renders retry only when supplied and always offers home', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    await renderWithProviders(
      <ErrorState
        title="Error"
        description="Failed."
        retry={{ label: 'Try again', onRetry }}
        homeAction={{ label: 'Back to home', href: '/' }}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })

  it('omits retry when it is not genuine', async () => {
    await renderWithProviders(
      <ErrorState
        title="Error"
        description="Failed."
        homeAction={{ label: 'Back to home', href: '/' }}
      />
    )

    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toBeInTheDocument()
  })

  it('never renders technical detail', async () => {
    const { container } = await renderWithProviders(
      <ErrorState
        title="Error"
        description="Failed."
        homeAction={{ label: 'Back to home', href: '/' }}
      />
    )

    expect(container.textContent).not.toMatch(/stack|module|TypeError|undefined/i)
  })

  it('has no critical or serious accessibility violations', async () => {
    const { container } = await renderWithProviders(
      <ErrorState
        title="This page could not be loaded"
        description="Something went wrong."
        homeAction={{ label: 'Back to home', href: '/' }}
      />
    )

    expect(await runAxe(container)).toHaveNoViolations()
  })
})
