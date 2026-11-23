import { z } from 'zod'

export const AVAILABILITY_REGION_STORAGE_KEY = 'walplay.availability-region.v1'
export const AVAILABILITY_REGION_STORAGE_VERSION = 1
export const AVAILABILITY_DEFAULT_REGION = 'CO'
export const AVAILABILITY_REGION_CODE_PATTERN = /^[A-Z]{2}$/

const storedRegionSchema = z.strictObject({
  version: z.literal(AVAILABILITY_REGION_STORAGE_VERSION),
  region: z.string().regex(AVAILABILITY_REGION_CODE_PATTERN),
})

export type RegionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const getBrowserStorage = (): RegionStorage | null => {
  try {
    if (typeof window === 'undefined' || window.localStorage === undefined) {
      return null
    }
    return window.localStorage
  } catch {
    return null
  }
}

const removeSafely = (storage: RegionStorage): void => {
  try {
    storage.removeItem(AVAILABILITY_REGION_STORAGE_KEY)
  } catch {
    // Storage may be unavailable; the fallback region is still used.
  }
}

export const readStoredRegion = (storage: RegionStorage | null = getBrowserStorage()): string => {
  if (storage === null) {
    return AVAILABILITY_DEFAULT_REGION
  }

  try {
    const raw = storage.getItem(AVAILABILITY_REGION_STORAGE_KEY)
    if (raw === null) {
      return AVAILABILITY_DEFAULT_REGION
    }
    const parsedJson: unknown = JSON.parse(raw)
    const parsed = storedRegionSchema.safeParse(parsedJson)
    if (!parsed.success) {
      removeSafely(storage)
      return AVAILABILITY_DEFAULT_REGION
    }
    return parsed.data.region
  } catch {
    removeSafely(storage)
    return AVAILABILITY_DEFAULT_REGION
  }
}

export const writeStoredRegion = (
  region: string,
  storage: RegionStorage | null = getBrowserStorage()
): boolean => {
  const normalized = region.trim().toUpperCase()
  if (!AVAILABILITY_REGION_CODE_PATTERN.test(normalized)) {
    return false
  }
  if (storage === null) {
    return false
  }

  try {
    storage.setItem(
      AVAILABILITY_REGION_STORAGE_KEY,
      JSON.stringify({ version: AVAILABILITY_REGION_STORAGE_VERSION, region: normalized })
    )
    return true
  } catch {
    return false
  }
}
