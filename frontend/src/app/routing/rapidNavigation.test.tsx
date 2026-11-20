import { act, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { AppLayout } from './AppLayout'
import { RouteContent } from './RouteContent'
import { RouteRenderError } from './RouteRenderError'
import type { PageModule } from './usePageModule'

const createDeferred = () => {
  let resolve: (module: PageModule) => void = () => undefined
  const promise = new Promise<PageModule>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

const HomePage = () => (
  <div>
    <h1 id="page-heading" tabIndex={-1}>
      Home page
    </h1>
  </div>
)

const SettingsPage = () => (
  <div>
    <h1 id="page-heading" tabIndex={-1}>
      Settings page
    </h1>
  </div>
)

describe('rapid navigation', () => {
  it('keeps the final route when a previous load settles later', async () => {
    const homeDeferred = createDeferred()
    const settingsDeferred = createDeferred()
    const settingsImporter = vi.fn(() => settingsDeferred.promise)

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <AppLayout />,
          children: [
            {
              errorElement: <RouteRenderError />,
              children: [
                {
                  index: true,
                  element: <RouteContent importer={() => homeDeferred.promise} />,
                  handle: { titleKey: 'meta.title.home' },
                },
                {
                  path: 'settings',
                  element: <RouteContent importer={settingsImporter} />,
                  handle: { titleKey: 'meta.title.settings' },
                },
              ],
            },
          ],
        },
      ],
      { initialEntries: ['/'] }
    )

    render(<RouterProvider router={router} />)

    act(() => {
      void router.navigate('/settings')
    })
    await waitFor(() => expect(settingsImporter).toHaveBeenCalled())

    act(() => {
      void router.navigate('/')
    })

    homeDeferred.resolve({ default: HomePage })
    settingsDeferred.resolve({ default: SettingsPage })

    expect(await screen.findByRole('heading', { level: 1, name: 'Home page' })).toBeInTheDocument()
    await waitFor(() => {
      expect(document.querySelectorAll('h1')).toHaveLength(1)
      expect(
        screen.queryByRole('heading', { level: 1, name: 'Settings page' })
      ).not.toBeInTheDocument()
    })

    await waitFor(() => {
      const regions = Array.from(document.querySelectorAll<HTMLElement>('[aria-live="polite"]'))
      expect(regions.map((region) => region.textContent)).toEqual(['Navigated to Home · Walplay'])
    })
  })
})
