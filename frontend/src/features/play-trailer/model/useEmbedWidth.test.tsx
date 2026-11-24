import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useEmbedWidth } from './useEmbedWidth'

const Harness = () => {
  const { ref, width, canEmbed } = useEmbedWidth()
  return (
    <div ref={ref} data-testid="target">
      {String(canEmbed)}:{width}
    </div>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useEmbedWidth', () => {
  it('measures the content width and enforces the 356 px floor', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 450,
      top: 0,
      left: 0,
      right: 800,
      bottom: 450,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)

    render(<Harness />)

    expect(screen.getByTestId('target')).toHaveTextContent('true:800')
  })

  it('reacts to resize observations, including widths below the floor', () => {
    let callback: ResizeObserverCallback | undefined
    class ResizeObserverMock {
      public readonly observe = vi.fn()
      public readonly disconnect = vi.fn()
      public constructor(observer: ResizeObserverCallback) {
        callback = observer
      }
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 450,
      top: 0,
      left: 0,
      right: 800,
      bottom: 450,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)

    render(<Harness />)
    expect(screen.getByTestId('target')).toHaveTextContent('true:800')

    act(() => {
      callback?.([{ contentRect: { width: 300 } } as ResizeObserverEntry], {} as ResizeObserver)
    })

    expect(screen.getByTestId('target')).toHaveTextContent('false:300')
  })

  it('keeps the capability disabled when no element is attached', () => {
    const HookOnly = () => {
      const hook = useEmbedWidth()
      return (
        <span data-testid="state">
          {String(hook.canEmbed)}:{hook.width}
        </span>
      )
    }

    render(<HookOnly />)

    expect(screen.getByTestId('state')).toHaveTextContent('false:0')
  })
})
