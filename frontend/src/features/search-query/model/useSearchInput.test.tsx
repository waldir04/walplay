import { act, fireEvent, screen } from '@testing-library/react'
import { useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { parseSearchQueryAddress } from '@/entities/catalog'
import { SEARCH_SETTLE_MS } from '@/shared/config/constants'
import { renderWithProviders } from '@/test/renderWithProviders'

import { useSearchInput } from './useSearchInput'

const Harness = () => {
  const location = useLocation()
  const activeQuery = parseSearchQueryAddress(location.search)
  const controller = useSearchInput({ activeQuery, language: 'en' })

  return (
    <div>
      <input
        ref={controller.inputRef}
        aria-label="query"
        value={controller.draft}
        onChange={(event) => controller.setDraft(event.target.value)}
      />
      <button type="button" onClick={controller.submit}>
        submit
      </button>
      <button type="button" onClick={controller.clear}>
        clear
      </button>
      <output data-testid="location">{`${location.pathname}${location.search}`}</output>
      <output data-testid="settling">{controller.isSettling ? 'settling' : 'idle'}</output>
    </div>
  )
}

const renderHarness = (entry = '/search') =>
  renderWithProviders(<Harness />, { initialEntries: [entry] })

const locationValue = (): string => screen.getByTestId('location').textContent ?? ''

afterEach(() => {
  vi.useRealTimers()
})

describe('useSearchInput', () => {
  it('waits 350ms before rewriting the address and never navigates while typing', async () => {
    vi.useFakeTimers()
    await renderHarness()

    fireEvent.change(screen.getByRole('textbox', { name: 'query' }), {
      target: { value: 'matrix' },
    })
    expect(locationValue()).toBe('/search')
    expect(screen.getByTestId('settling')).toHaveTextContent('settling')

    await act(async () => {
      vi.advanceTimersByTime(SEARCH_SETTLE_MS - 1)
    })
    expect(locationValue()).toBe('/search')

    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(locationValue()).toBe('/search?q=matrix')
    expect(screen.getByTestId('settling')).toHaveTextContent('idle')
  })

  it('submits immediately on explicit submit and cancels the settling timer', async () => {
    vi.useFakeTimers()
    await renderHarness()

    fireEvent.change(screen.getByRole('textbox', { name: 'query' }), {
      target: { value: 'matrix' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(locationValue()).toBe('/search?q=matrix')

    await act(async () => {
      vi.advanceTimersByTime(SEARCH_SETTLE_MS * 2)
    })
    expect(locationValue()).toBe('/search?q=matrix')
  })

  it('makes no navigation for a resubmitted identical identity', async () => {
    vi.useFakeTimers()
    await renderHarness('/search?q=matrix')

    fireEvent.change(screen.getByRole('textbox', { name: 'query' }), {
      target: { value: '  MATRIX  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))

    expect(locationValue()).toBe('/search?q=matrix')
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_SETTLE_MS * 2)
    })
    expect(locationValue()).toBe('/search?q=matrix')
  })

  it('writes empty, too-short, and too-long drafts immediately without settling', async () => {
    vi.useFakeTimers()
    await renderHarness()
    const input = screen.getByRole('textbox', { name: 'query' })

    fireEvent.change(input, { target: { value: 'a' } })
    expect(locationValue()).toBe('/search?q=a')

    fireEvent.change(input, { target: { value: '   ' } })
    expect(locationValue()).toBe('/search')

    const tooLong = '😀'.repeat(201)
    fireEvent.change(input, { target: { value: tooLong } })
    expect(locationValue()).toBe(`/search?q=${encodeURIComponent(tooLong)}`)

    await act(async () => {
      vi.advanceTimersByTime(SEARCH_SETTLE_MS * 2)
    })
    expect(locationValue()).toBe(`/search?q=${encodeURIComponent(tooLong)}`)
  })

  it('cancels pending settling and supersedes results when a valid query drops below the minimum', async () => {
    vi.useFakeTimers()
    await renderHarness('/search?q=matrix')

    fireEvent.change(screen.getByRole('textbox', { name: 'query' }), {
      target: { value: 'arrival' },
    })
    expect(locationValue()).toBe('/search?q=matrix')

    fireEvent.change(screen.getByRole('textbox', { name: 'query' }), {
      target: { value: 'a' },
    })
    expect(locationValue()).toBe('/search?q=a')

    await act(async () => {
      vi.advanceTimersByTime(SEARCH_SETTLE_MS * 2)
    })
    expect(locationValue()).toBe('/search?q=a')
  })

  it('clears the address, cancels pending work, and keeps focus in the input', async () => {
    vi.useFakeTimers()
    await renderHarness('/search?q=matrix')
    const input = screen.getByRole('textbox', { name: 'query' })

    fireEvent.change(input, { target: { value: 'arrival' } })
    fireEvent.click(screen.getByRole('button', { name: 'clear' }))

    expect(locationValue()).toBe('/search')
    expect(document.activeElement).toBe(input)
    expect(screen.getByTestId('settling')).toHaveTextContent('idle')

    await act(async () => {
      vi.advanceTimersByTime(SEARCH_SETTLE_MS * 2)
    })
    expect(locationValue()).toBe('/search')
  })
})
