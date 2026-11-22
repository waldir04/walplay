import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { LoadMoreControl } from './LoadMoreControl'

describe('load-more retry single flight', () => {
  it('prevents concurrent duplicate activations while a load is pending', async () => {
    const onLoadMore = vi.fn()
    const user = userEvent.setup()
    await renderWithProviders(<LoadMoreControl hasMore isFetching onLoadMore={onLoadMore} />)

    await user.dblClick(screen.getByRole('button'))
    expect(onLoadMore).not.toHaveBeenCalled()
  })
})
