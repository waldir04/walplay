import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'

expect.extend(axeMatchers)

const NativeRequest = globalThis.Request

if (typeof NativeRequest === 'function') {
  // jsdom provides AbortController/AbortSignal while Node provides Request; undici
  // rejects jsdom's signal instance. Drop the signal in tests; navigation still works.
  class TestRequest extends NativeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      if (init && 'signal' in init) {
        const { signal, ...rest } = init
        super(input, rest)
        void signal
        return
      }
      super(input, init)
    }
  }

  globalThis.Request = TestRequest as typeof Request
  window.Request = TestRequest as typeof Request
}

import './matchMedia'

// jsdom does not implement canvas. axe-core probes canvas for icon-ligature
// detection; returning null is a documented jsdom limitation and does not
// affect the accessibility rules exercised by these tests.
const canvasPrototype = window.HTMLCanvasElement?.prototype
if (canvasPrototype) {
  canvasPrototype.getContext = () => null
}

import '@/app/i18n'
import { i18n } from '@/app/i18n'

const unhandledRejections: unknown[] = []

const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
  unhandledRejections.push(event.reason)
  event.preventDefault()
}

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', handleUnhandledRejection)
}

beforeEach(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  window.localStorage.clear()
  await i18n.changeLanguage('en')
})

afterEach(() => {
  cleanup()

  const warnMock = vi.mocked(console.warn)
  const errorMock = vi.mocked(console.error)

  const warnings = warnMock.mock.calls.map((call) => call.map(String).join(' '))
  const errors = errorMock.mock.calls.map((call) => call.map(String).join(' '))

  warnMock.mockRestore()
  errorMock.mockRestore()

  if (unhandledRejections.length > 0) {
    const reasons = unhandledRejections.map(String).join(' | ')
    unhandledRejections.length = 0
    throw new Error(`Unhandled promise rejection during test: ${reasons}`)
  }

  if (warnings.length > 0) {
    throw new Error(`Unexpected console.warn during test: ${warnings.join(' | ')}`)
  }

  if (errors.length > 0) {
    throw new Error(`Unexpected console.error during test: ${errors.join(' | ')}`)
  }
})
