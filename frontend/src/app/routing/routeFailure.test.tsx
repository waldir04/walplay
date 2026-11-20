import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/widgets/app-shell'

import { RouteContent } from './RouteContent'
import { RouteRenderError } from './RouteRenderError'
import type { PageImporter, PageModule } from './usePageModule'

const Page = () => (
  <div>
    <h1 id="page-heading" tabIndex={-1}>
      Recovered page
    </h1>
  </div>
)

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

const rejectedModule = (): Promise<PageModule> =>
  Promise.reject(new Error('secret-chunk-module-path'))

describe('route failure and retry', () => {
  it('shows the localized error with retry and home actions', async () => {
    renderContent(vi.fn(rejectedModule))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('This page could not be loaded')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toBeInTheDocument()
    expect(alert.textContent).not.toMatch(/secret|module|stack|Error/i)
  })

  it('genuinely re-invokes the importer on retry and renders the page', async () => {
    const user = userEvent.setup()
    const importer = vi
      .fn<PageImporter>()
      .mockImplementationOnce(rejectedModule)
      .mockImplementationOnce(() => Promise.resolve({ default: Page }))

    renderContent(importer)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recovered page' })
    ).toBeInTheDocument()
    expect(importer).toHaveBeenCalledTimes(2)
  })

  it('shows the error again when the retry fails', async () => {
    const user = userEvent.setup()
    const importer = vi.fn<PageImporter>().mockImplementation(rejectedModule)

    renderContent(importer)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(importer).toHaveBeenCalledTimes(2)
  })
})
