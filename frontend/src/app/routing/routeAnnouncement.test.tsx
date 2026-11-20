import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

const politeRegions = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[aria-live="polite"]'))

beforeEach(() => {
  installMatchMediaMock(true)
})

describe('route announcements', () => {
  it('does not move focus or announce on the initial document load', async () => {
    renderApp(['/'])

    const heading = await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })

    expect(heading).not.toHaveFocus()
    expect(politeRegions().map((region) => region.textContent)).toEqual([''])
  })

  it('focuses the new heading and announces exactly once on in-app navigation', async () => {
    const { router } = renderApp(['/'])
    await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })

    await act(async () => {
      await router.navigate('/settings')
    })

    const heading = await screen.findByRole('heading', { level: 1, name: 'Settings' })
    await waitFor(() => expect(heading).toHaveFocus())

    await waitFor(() => {
      expect(
        politeRegions()
          .map((region) => region.textContent)
          .filter((text) => text !== '')
      ).toEqual(['Navigated to Settings · Walplay'])
    })
    expect(document.querySelectorAll('h1')).toHaveLength(1)
  })

  it('leaves no stale headings or announcements after rapid navigation', async () => {
    const { router } = renderApp(['/'])
    await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })

    await act(async () => {
      await router.navigate('/settings')
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()

    await act(async () => {
      void router.navigate('/missing-page')
      await router.navigate('/')
    })

    const heading = await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })
    await waitFor(() => expect(heading).toHaveFocus())

    expect(screen.queryByRole('heading', { level: 1, name: 'Settings' })).not.toBeInTheDocument()
    expect(document.querySelectorAll('h1')).toHaveLength(1)

    await waitFor(() => {
      const texts = politeRegions()
        .map((region) => region.textContent)
        .filter((text) => text !== '')
      expect(texts).toEqual(['Navigated to Home · Walplay'])
    })
  })
})
