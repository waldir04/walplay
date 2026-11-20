import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

const openMenu = async (): Promise<{ dialog: HTMLDialogElement; trigger: HTMLElement }> => {
  const user = userEvent.setup()
  const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
  await user.click(trigger)
  const dialog = document.querySelector('dialog')
  if (!dialog) {
    throw new Error('expected a dialog')
  }
  return { dialog, trigger }
}

describe('CompactMenu', () => {
  it('opens a labelled dialog and exposes expanded state', async () => {
    installMatchMediaMock(false)
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    const { dialog, trigger } = await openMenu()

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', dialog.id)
    expect(dialog).toHaveAttribute('open')
    expect(dialog).toHaveAttribute('aria-labelledby')
    expect(screen.getByRole('heading', { level: 2, name: 'Navigation' })).toBeInTheDocument()
  })

  it('moves focus into the dialog and contains Tab navigation', async () => {
    installMatchMediaMock(false)
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    const { dialog } = await openMenu()
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    )
    const first = focusables[0]
    const last = focusables.at(-1)

    expect(document.activeElement).toBe(first)

    last?.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    first?.focus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    installMatchMediaMock(false)
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    const { dialog, trigger } = await openMenu()
    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(dialog).not.toHaveAttribute('open')
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on route change', async () => {
    installMatchMediaMock(false)
    const user = userEvent.setup()
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    const { dialog } = await openMenu()
    await user.click(screen.getByRole('link', { name: 'Settings' }))

    await screen.findByRole('heading', { level: 1, name: 'Settings' })
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'))
  })

  it('closes when the viewport widens without leaving focus in a hidden control', async () => {
    const controller = installMatchMediaMock(false)
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    const { dialog } = await openMenu()

    act(() => {
      controller.setMatches(true)
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Open navigation menu' })).not.toBeInTheDocument()
    })
    expect(dialog.isConnected).toBe(false)
    expect(document.activeElement?.closest('dialog')).toBeNull()
  })
})
