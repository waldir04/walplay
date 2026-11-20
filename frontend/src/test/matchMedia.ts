import { afterEach, vi } from 'vitest'

export interface MatchMediaController {
  setMatches: (matches: boolean) => void
}

interface Listener {
  (event: MediaQueryListEvent): void
}

const listeners = new Set<Listener>()
let currentMatches = false

const createMediaQueryList = (query: string): MediaQueryList => {
  const mediaQueryList = {
    matches: currentMatches,
    media: query,
    onchange: null,
    addEventListener: (type: string, listener: Listener) => {
      if (type === 'change') {
        listeners.add(listener)
      }
    },
    removeEventListener: (type: string, listener: Listener) => {
      if (type === 'change') {
        listeners.delete(listener)
      }
    },
    addListener: (listener: Listener) => listeners.add(listener),
    removeListener: (listener: Listener) => listeners.delete(listener),
    dispatchEvent: () => true,
  }

  Object.defineProperty(mediaQueryList, 'matches', {
    get: () => currentMatches,
  })

  return mediaQueryList as unknown as MediaQueryList
}

export const setMatchMediaMatches = (matches: boolean): void => {
  currentMatches = matches
  listeners.forEach((listener) => {
    listener({ matches } as MediaQueryListEvent)
  })
}

export const resetMatchMedia = (): void => {
  listeners.clear()
  currentMatches = false
}

export const installMatchMediaMock = (initialMatches = false): MatchMediaController => {
  listeners.clear()
  currentMatches = initialMatches

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => createMediaQueryList(query)),
  })

  return {
    setMatches: (matches: boolean) => {
      setMatchMediaMatches(matches)
    },
  }
}

installMatchMediaMock()

afterEach(() => {
  resetMatchMedia()
})
