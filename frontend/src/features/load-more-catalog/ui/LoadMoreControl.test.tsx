import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { LoadMoreControl } from './LoadMoreControl'

describe('LoadMoreControl', () => {
  it('renders nothing when there are no more pages', async () => {
    await renderWithProviders(
      <LoadMoreControl hasMore={false} isFetching={false} onLoadMore={vi.fn()} />
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('issues one request per activation', async () => {
    const onLoadMore = vi.fn()
    const user = userEvent.setup()
    await renderWithProviders(
      <LoadMoreControl hasMore isFetching={false} onLoadMore={onLoadMore} />
    )

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('exposes a busy disabled state while a request is pending', async () => {
    const onLoadMore = vi.fn()
    const user = userEvent.setup()
    await renderWithProviders(<LoadMoreControl hasMore isFetching onLoadMore={onLoadMore} />)

    const button = screen.getByRole('button', { name: 'Load more' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await user.click(button)
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('ignores duplicate activation while pending', async () => {
    const onLoadMore = vi.fn()
    const Harness = () => {
      const [fetching, setFetching] = useState(false)
      return (
        <LoadMoreControl
          hasMore
          isFetching={fetching}
          onLoadMore={() => {
            onLoadMore()
            setFetching(true)
          }}
        />
      )
    }
    const user = userEvent.setup()
    await renderWithProviders(<Harness />)

    const button = screen.getByRole('button')
    await user.click(button)
    await user.click(button)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('meets the 44px target size and is keyboard reachable', async () => {
    await renderWithProviders(<LoadMoreControl hasMore isFetching={false} onLoadMore={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Load more' })
    expect(button.className).toContain('min-h-11')
    button.focus()
    expect(button).toHaveFocus()
  })
})
