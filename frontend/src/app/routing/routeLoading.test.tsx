import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/widgets/app-shell'

import { RouteContent } from './RouteContent'
import { RouteRenderError } from './RouteRenderError'
import type { PageImporter, PageModule } from './usePageModule'

interface Deferred {
  promise: Promise<PageModule>
  resolve: (module: PageModule) => void
}

const createDeferred = (): Deferred => {
  let resolve: (module: PageModule) => void = () => undefined
  const promise = new Promise<PageModule>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

const renderContent = (importer: PageImporter) => {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          {
            errorElement: <RouteRenderError />,
            children: [{ index: true, element: <RouteContent importer={importer} /> }],
          },
        ],
      },
    ],
    { initialEntries: ['/'] }
  )

  return render(<RouterProvider router={router} />)
}

describe('route loading', () => {
  it('shows a layout-matching skeleton inside the shell while pending', async () => {
    const deferred = createDeferred()
    const importer = vi.fn(() => deferred.promise)
    const { container } = renderContent(importer)

    const status = await screen.findByRole('status', { name: 'Page content is loading' })
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(container.textContent).not.toBe('Loading…')
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('replaces the skeleton with the page once the module resolves', async () => {
    const deferred = createDeferred()
    const Page = () => (
      <div>
        <h1 id="page-heading" tabIndex={-1}>
          Loaded page
        </h1>
      </div>
    )
    renderContent(vi.fn(() => deferred.promise))

    await screen.findByRole('status', { name: 'Page content is loading' })

    deferred.resolve({ default: Page })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Loaded page' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: 'Page content is loading' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})
