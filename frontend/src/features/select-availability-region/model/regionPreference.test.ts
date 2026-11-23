import { describe, expect, it, vi } from 'vitest'

import {
  AVAILABILITY_DEFAULT_REGION,
  AVAILABILITY_REGION_STORAGE_KEY,
  readStoredRegion,
  writeStoredRegion,
} from './regionPreference'
import type { RegionStorage } from './regionPreference'

const createStorage = (initial: Record<string, string> = {}) => {
  const entries = new Map(Object.entries(initial))
  const storage: RegionStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value)
    },
    removeItem: (key) => {
      entries.delete(key)
    },
  }

  return {
    storage,
    entries,
    raw: (key: string) => entries.get(key),
  }
}

describe('availability region preference', () => {
  it('returns Colombia when nothing is stored', () => {
    const { storage } = createStorage()

    expect(readStoredRegion(storage)).toBe(AVAILABILITY_DEFAULT_REGION)
  })

  it('writes and reads a versioned region value', () => {
    const { storage, raw } = createStorage()

    expect(writeStoredRegion('us', storage)).toBe(true)
    expect(JSON.parse(raw(AVAILABILITY_REGION_STORAGE_KEY) ?? '{}')).toEqual({
      version: 1,
      region: 'US',
    })
    expect(readStoredRegion(storage)).toBe('US')
  })

  it('preserves a valid region that is not currently supported', () => {
    const { storage } = createStorage({
      [AVAILABILITY_REGION_STORAGE_KEY]: JSON.stringify({ version: 1, region: 'FR' }),
    })

    expect(readStoredRegion(storage)).toBe('FR')
  })

  it('falls back and removes malformed, wrong-version, and invalid-code entries', () => {
    const invalidValues = [
      'not-json',
      JSON.stringify({ version: 2, region: 'CO' }),
      JSON.stringify({ version: 1, region: 'co' }),
      JSON.stringify({ version: 1, region: 42 }),
      JSON.stringify({ version: 1, region: 'CO', extra: true }),
    ]

    for (const value of invalidValues) {
      const { storage, entries } = createStorage({ [AVAILABILITY_REGION_STORAGE_KEY]: value })

      expect(readStoredRegion(storage)).toBe(AVAILABILITY_DEFAULT_REGION)
      expect(entries.has(AVAILABILITY_REGION_STORAGE_KEY)).toBe(false)
    }
  })

  it('never throws or logs the stored value when storage is unavailable', () => {
    const warn = vi.spyOn(console, 'warn')
    const error = vi.spyOn(console, 'error')
    const storage: RegionStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }

    expect(readStoredRegion(storage)).toBe(AVAILABILITY_DEFAULT_REGION)
    expect(writeStoredRegion('CO', storage)).toBe(false)
    expect(readStoredRegion(null)).toBe(AVAILABILITY_DEFAULT_REGION)
    expect(writeStoredRegion('CO', null)).toBe(false)
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('does not write invalid region codes', () => {
    const { storage, entries } = createStorage()

    expect(writeStoredRegion('colombia', storage)).toBe(false)
    expect(writeStoredRegion('', storage)).toBe(false)
    expect(entries.size).toBe(0)
  })
})
