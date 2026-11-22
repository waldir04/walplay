import { browseLandingPath, parseCatalogPath } from '@/entities/catalog'
import type { MediaType } from '@/entities/catalog'

interface DetailLocationState {
  readonly from?: unknown
}

export const resolveDetailReturn = (
  mediaType: MediaType,
  state: unknown
): { readonly path: string; readonly isCategory: boolean } => {
  const fallback = browseLandingPath(mediaType)
  if (state === null || typeof state !== 'object') {
    return { path: fallback, isCategory: false }
  }

  const from = (state as DetailLocationState).from
  if (typeof from !== 'string') {
    return { path: fallback, isCategory: false }
  }

  const parsed = parseCatalogPath(from)
  if (parsed.kind === 'landing' && parsed.mediaType === mediaType) {
    return { path: from, isCategory: false }
  }
  if (parsed.kind === 'category' && parsed.mediaType === mediaType) {
    return { path: from, isCategory: true }
  }

  return { path: fallback, isCategory: false }
}
