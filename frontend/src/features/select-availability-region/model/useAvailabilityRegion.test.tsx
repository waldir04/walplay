import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AVAILABILITY_REGION_STORAGE_KEY } from './regionPreference'

const loadHook = async () => {
  vi.resetModules()
  const module = await import('./useAvailabilityRegion')
  return module.useAvailabilityRegion
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('useAvailabilityRegion', () => {
  it('reads the stored region on initialization', async () => {
    window.localStorage.setItem(
      AVAILABILITY_REGION_STORAGE_KEY,
      JSON.stringify({ version: 1, region: 'US' })
    )
    const useAvailabilityRegion = await loadHook()

    const { result } = renderHook(() => useAvailabilityRegion())

    expect(result.current.region).toBe('US')
  })

  it('defaults to Colombia when no preference is stored', async () => {
    const useAvailabilityRegion = await loadHook()

    const { result } = renderHook(() => useAvailabilityRegion())

    expect(result.current.region).toBe('CO')
  })

  it('persists a change and never writes during render', async () => {
    const useAvailabilityRegion = await loadHook()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    const { result } = renderHook(() => useAvailabilityRegion())
    expect(setItem).not.toHaveBeenCalled()

    act(() => result.current.setRegion('us'))

    expect(result.current.region).toBe('US')
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(
      JSON.parse(window.localStorage.getItem(AVAILABILITY_REGION_STORAGE_KEY) ?? '{}')
    ).toEqual({ version: 1, region: 'US' })
    setItem.mockRestore()
  })

  it('ignores invalid region changes', async () => {
    const useAvailabilityRegion = await loadHook()
    const { result } = renderHook(() => useAvailabilityRegion())

    act(() => result.current.setRegion('not-a-region'))

    expect(result.current.region).toBe('CO')
  })

  it('shares one global region across all hooks', async () => {
    const useAvailabilityRegion = await loadHook()
    const first = renderHook(() => useAvailabilityRegion())
    const second = renderHook(() => useAvailabilityRegion())

    act(() => first.result.current.setRegion('US'))

    expect(first.result.current.region).toBe('US')
    expect(second.result.current.region).toBe('US')
  })

  it('reads the device value independently after a fresh initialization', async () => {
    const useAvailabilityRegion = await loadHook()
    const first = renderHook(() => useAvailabilityRegion())
    expect(first.result.current.region).toBe('CO')

    window.localStorage.setItem(
      AVAILABILITY_REGION_STORAGE_KEY,
      JSON.stringify({ version: 1, region: 'FR' })
    )
    const useSecondDeviceRegion = await loadHook()
    const second = renderHook(() => useSecondDeviceRegion())

    expect(second.result.current.region).toBe('FR')
  })
})
