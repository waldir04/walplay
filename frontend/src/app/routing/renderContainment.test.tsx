import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { installMatchMediaMock } from '@/test/matchMedia'
import { AppShell } from '@/widgets/app-shell'

import { RouteRenderError } from './RouteRenderError'

const ThrowingPage = (): never => {
  throw new Error('internal-stack-detail')
}

describe('render failure containment', () => {
  it('keeps the shell usable and focuses the fallback heading', async () => {
    installMatchMediaMock(true)

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <AppShell />,
          children: [
            {
              errorElement: <RouteRenderError />,
              children: [{ index: true, element: <ThrowingPage /> }],
            },
          ],
        },
      ],
      { initialEntries: ['/'] }
    )

    const { container } = render(<RouterProvider router={router} />)

    const fallbackHeading = await screen.findByRole('heading', {
      level: 2,
      name: 'This page could not be displayed',
    })

    await waitFor(() => expect(fallbackHeading).toHaveFocus())

    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
    expect(container.textContent).not.toMatch(/internal-stack-detail|stack|module/i)

    vi.mocked(console.error).mockClear()
  })
})
