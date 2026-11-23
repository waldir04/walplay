import { useCallback, useSyncExternalStore } from 'react'

import {
  AVAILABILITY_REGION_CODE_PATTERN,
  readStoredRegion,
  writeStoredRegion,
} from './regionPreference'

let currentRegion: string | null = null
const listeners = new Set<() => void>()

const getSnapshot = (): string => {
  if (currentRegion === null) {
    currentRegion = readStoredRegion()
  }
  return currentRegion
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export interface AvailabilityRegionState {
  readonly region: string
  readonly setRegion: (region: string) => void
}

export const useAvailabilityRegion = (): AvailabilityRegionState => {
  const region = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const setRegion = useCallback((next: string) => {
    const normalized = next.trim().toUpperCase()
    if (!AVAILABILITY_REGION_CODE_PATTERN.test(normalized)) {
      return
    }
    writeStoredRegion(normalized)
    if (getSnapshot() === normalized) {
      return
    }
    currentRegion = normalized
    listeners.forEach((listener) => listener())
  }, [])

  return { region, setRegion }
}
