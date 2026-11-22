import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { SearchForm } from './SearchForm'

const renderForm = async (draft: string) => {
  const onDraftChange = vi.fn()
  const onSubmit = vi.fn()
  const onClear = vi.fn()
  const utils = await renderWithProviders(
    <SearchForm
      draft={draft}
      onDraftChange={onDraftChange}
      onSubmit={onSubmit}
      onClear={onClear}
      inputRef={{ current: null }}
    />
  )
  return { onDraftChange, onSubmit, onClear, ...utils }
}

describe('SearchForm', () => {
  it('renders one labelled input in a named search region with an associated hint', async () => {
    await renderForm('')

    const region = screen.getByRole('search', { name: 'Search movies and TV shows' })
    const input = screen.getByRole('searchbox', { name: 'Search movies and TV shows' })
    expect(region).toContainElement(input)
    expect(input).toHaveAttribute('aria-describedby', 'search-hint')
    expect(screen.getByText(/Enter at least 2 characters/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
  })

  it('disables autocomplete and form history', async () => {
    await renderForm('')

    const form = screen.getByRole('search')
    const input = screen.getByRole('searchbox')
    expect(form).toHaveAttribute('autocomplete', 'off')
    expect(input).toHaveAttribute('autocomplete', 'off')
  })

  it('reports typed changes and submits without navigation', async () => {
    const user = userEvent.setup()
    const { onDraftChange, onSubmit } = await renderForm('')

    await user.type(screen.getByRole('searchbox'), 'matrix')
    expect(onDraftChange).toHaveBeenCalled()
    expect(onDraftChange).toHaveBeenCalledWith('m')

    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('renders a clear action only when a draft exists', async () => {
    const user = userEvent.setup()
    const empty = await renderForm('')
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
    empty.unmount()

    const { onClear } = await renderForm('matrix')
    const clear = screen.getByRole('button', { name: 'Clear search' })
    expect(clear).toHaveClass('min-h-11')
    await user.click(clear)
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
