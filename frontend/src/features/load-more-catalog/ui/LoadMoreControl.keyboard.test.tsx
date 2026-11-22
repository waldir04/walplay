import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { LoadMoreControl } from './LoadMoreControl'

describe('LoadMoreControl keyboard support', () => {
  it('is reachable, visibly focusable, and activates by keyboard', async () => {
    const onLoadMore = vi.fn()
    const user = userEvent.setup()
    await renderWithProviders(
      <LoadMoreControl hasMore isFetching={false} onLoadMore={onLoadMore} />
    )

    const button = screen.getByRole('button', { name: 'Load more' })
    await user.tab()
    expect(button).toHaveFocus()
    expect(button.className).toContain('focus-visible:outline-2')

    await user.keyboard('{Enter}')
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('prevents activation while busy and exposes the busy state', async () => {
    const onLoadMore = vi.fn()
    const user = userEvent.setup()
    await renderWithProviders(<LoadMoreControl hasMore isFetching onLoadMore={onLoadMore} />)

    await user.tab()
    await user.keyboard(' ')
    expect(onLoadMore).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })
})
