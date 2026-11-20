import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LANGUAGE_STORAGE_KEY } from '@/shared/config/constants'

import { readLanguagePreference, writeLanguagePreference } from './languageStorage'

const createThrowingStorage = (): Storage => ({
  length: 0,
  clear: () => undefined,
  getItem: () => {
    throw new DOMException('storage blocked', 'SecurityError')
  },
  key: () => null,
  removeItem: () => undefined,
  setItem: () => {
    throw new DOMException('storage blocked', 'SecurityError')
  },
})

beforeEach(() => {
  window.localStorage.clear()
})

describe('readLanguagePreference', () => {
  it('returns stored for a valid versioned preference', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify({ version: 1, locale: 'es' }))

    expect(readLanguagePreference(window.localStorage)).toEqual({
      status: 'stored',
      locale: 'es',
    })
  })

  it('returns absent when no preference is stored', () => {
    expect(readLanguagePreference(window.localStorage)).toEqual({ status: 'absent' })
  })

  it('returns invalid for malformed JSON', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, '{not-json')

    expect(readLanguagePreference(window.localStorage)).toEqual({ status: 'invalid' })
  })

  it('returns invalid for an outdated version and unsupported locale', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify({ version: 9, locale: 'fr' }))

    expect(readLanguagePreference(window.localStorage)).toEqual({ status: 'invalid' })
  })

  it('returns invalid for an unsupported locale', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify({ version: 1, locale: 'de' }))

    expect(readLanguagePreference(window.localStorage)).toEqual({ status: 'invalid' })
  })

  it('returns invalid when unknown fields are present', () => {
    window.localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      JSON.stringify({ version: 1, locale: 'en', extra: true })
    )

    expect(readLanguagePreference(window.localStorage)).toEqual({ status: 'invalid' })
  })

  it('returns unavailable when storage access throws', () => {
    expect(readLanguagePreference(createThrowingStorage())).toEqual({
      status: 'unavailable',
    })
  })

  it('returns unavailable when no storage is available', () => {
    expect(readLanguagePreference(null)).toEqual({ status: 'unavailable' })
  })

  it('returns unavailable when the browser storage getter throws', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
    })

    try {
      expect(readLanguagePreference()).toEqual({ status: 'unavailable' })
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'localStorage', descriptor)
      }
    }
  })

  it('never writes on read', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    readLanguagePreference(window.localStorage)

    expect(setItem).not.toHaveBeenCalled()
  })
})

describe('writeLanguagePreference', () => {
  it('persists the versioned preference', () => {
    const status = writeLanguagePreference('en', window.localStorage)

    expect(status).toBe('stored')
    expect(JSON.parse(window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '')).toEqual({
      version: 1,
      locale: 'en',
    })
  })

  it('returns unavailable without throwing when storage writes fail', () => {
    expect(writeLanguagePreference('es', createThrowingStorage())).toBe('unavailable')
  })

  it('returns unavailable when no storage is available', () => {
    expect(writeLanguagePreference('en', null)).toBe('unavailable')
  })
})
