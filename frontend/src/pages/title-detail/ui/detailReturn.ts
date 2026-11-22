import { browseLandingPath, parseCatalogPath } from '@/entities/catalog'
import type { MediaType } from '@/entities/catalog'

interface DetailLocationState {
  readonly from?: unknown
}

const isSearchOrigin = (from: string): boolean => {
  if (!from.startsWith('/') || from.startsWith('//')) {
    return false
  }
  try {
    const url = new URL(from, 'http://walplay.invalid')
    return url.pathname === '/search' && url.searchParams.has('q')
  } catch {
    return false
  }
}

export const resolveDetailReturn = (
  mediaType: MediaType,
  state: unknown
): { readonly path: string; readonly isCategory: boolean; readonly isSearch: boolean } => {
  const fallback = browseLandingPath(mediaType)
  if (state === null || typeof state !== 'object') {
    return { path: fallback, isCategory: false, isSearch: false }
  }

  const from = (state as DetailLocationState).from
  if (typeof from !== 'string') {
    return { path: fallback, isCategory: false, isSearch: false }
  }

  if (isSearchOrigin(from)) {
    return { path: from, isCategory: false, isSearch: true }
  }

  const parsed = parseCatalogPath(from)
  if (parsed.kind === 'landing' && parsed.mediaType === mediaType) {
    return { path: from, isCategory: false, isSearch: false }
  }
  if (parsed.kind === 'category' && parsed.mediaType === mediaType) {
    return { path: from, isCategory: true, isSearch: false }
  }

  return { path: fallback, isCategory: false, isSearch: false }
}
