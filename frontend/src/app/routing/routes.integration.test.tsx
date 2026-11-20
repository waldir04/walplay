import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

beforeEach(() => {
  installMatchMediaMock(true)
})

describe('route behavior', () => {
  it.each([
    ['/', 'Welcome to Walplay', 'Home · Walplay'],
    ['/settings', 'Settings', 'Settings · Walplay'],
    ['/does-not-exist', 'Page not found', 'Page not found · Walplay'],
  ])('loads %s directly inside the shell', async (path, heading, title) => {
    const { container } = renderApp([path])

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    await waitFor(() => expect(document.title).toBe(title))
  })

  it('navigates between destinations and restores history', async () => {
    const user = userEvent.setup()
    const { router } = renderApp(['/'])

    await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })

    await user.click(screen.getByRole('link', { name: 'Settings' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/settings')

    await act(async () => {
      await router.navigate(-1)
    })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })
    ).toBeInTheDocument()

    await act(async () => {
      await router.navigate(1)
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
  })

  it('returns home through the brand link', async () => {
    const user = userEvent.setup()
    const { router } = renderApp(['/settings'])

    await screen.findByRole('heading', { level: 1, name: 'Settings' })
    await user.click(screen.getByRole('link', { name: 'Walplay' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it.each(['/does-not-exist', '/settings/nested/missing'])(
    'preserves the requested address for %s',
    async (path) => {
      const { router } = renderApp([path])

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Page not found' })
      ).toBeInTheDocument()
      expect(router.state.location.pathname).toBe(path)
      expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
      expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    }
  )
})
