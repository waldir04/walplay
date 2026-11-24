import { describe, expect, it } from 'vitest'

import { CATALOG_ITEM_ID_PATTERN } from '@/entities/catalog'
import { MOVIE_ID, TV_ID } from '@/test/fixtures/catalog'
import { SAVED_AT, savedEntry, savedTvEntry } from '@/test/fixtures/saved'

import { SAVED_ITEM_ID_PATTERN, SAVED_TIME_SENTINEL } from './constants'
import {
  compareEntries,
  dedupeEntries,
  isUsableSavedIdentity,
  normalizeEntries,
  savedEntrySchema,
  savedIdentity,
  storedEntryFromSnapshot,
} from './savedEntry'

describe('savedEntrySchema', () => {
  it('accepts a valid movie entry', () => {
    const parsed = savedEntrySchema.safeParse(savedEntry())
    expect(parsed.success).toBe(true)
  })

  it('accepts a valid television entry without a poster', () => {
    const parsed = savedEntrySchema.safeParse(savedTvEntry())
    expect(parsed.success).toBe(true)
  })

  it('rejects a blank title', () => {
    const parsed = savedEntrySchema.safeParse(savedEntry({ title: '   ' }))
    expect(parsed.success).toBe(false)
  })

  it('rejects a missing or empty item id', () => {
    expect(savedEntrySchema.safeParse(savedEntry({ itemId: '' })).success).toBe(false)
    expect(savedEntrySchema.safeParse(savedEntry({ itemId: '   ' })).success).toBe(false)
  })

  it('retains an entry whose identity is not a usable catalog id', () => {
    const parsed = savedEntrySchema.safeParse(savedEntry({ itemId: 'short' }))
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(isUsableSavedIdentity(parsed.data)).toBe(false)
    }
  })

  it('normalizes an invalid savedAt to the fixed sentinel', () => {
    const parsed = savedEntrySchema.safeParse(savedEntry({ savedAt: 'not-a-timestamp' }))
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.savedAt).toBe(SAVED_TIME_SENTINEL)
    }
  })

  it('normalizes a missing savedAt to the fixed sentinel', () => {
    const raw: Record<string, unknown> = { ...savedEntry() }
    delete raw.savedAt
    const parsed = savedEntrySchema.safeParse(raw)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.savedAt).toBe(SAVED_TIME_SENTINEL)
    }
  })

  it('ignores unknown fields', () => {
    const parsed = savedEntrySchema.safeParse({
      ...savedEntry(),
      accountId: 'secret',
      rating: 5,
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect('accountId' in parsed.data).toBe(false)
      expect('rating' in parsed.data).toBe(false)
    }
  })

  it('mirrors the catalog item id rule', () => {
    expect(SAVED_ITEM_ID_PATTERN.source).toBe(CATALOG_ITEM_ID_PATTERN.source)
  })
})

describe('saved identity helpers', () => {
  it('builds a stable identity', () => {
    expect(savedIdentity('movie', MOVIE_ID)).toBe(`movie:${MOVIE_ID}`)
  })

  it('reports unusable identities', () => {
    expect(isUsableSavedIdentity({ itemId: MOVIE_ID })).toBe(true)
    expect(isUsableSavedIdentity({ itemId: 'short' })).toBe(false)
    expect(isUsableSavedIdentity({ itemId: 'not valid!' })).toBe(false)
  })
})

describe('entry ordering', () => {
  it('orders by savedAt descending then identity ascending', () => {
    const newest = savedEntry({
      itemId: TV_ID,
      mediaType: 'tv',
      savedAt: '2026-11-24T16:00:00.000Z',
    })
    const olderMovie = savedEntry({ itemId: MOVIE_ID, savedAt: '2026-11-24T15:00:00.000Z' })
    const olderTv = savedEntry({
      itemId: 'a2wxOnR2OjEzOTk',
      mediaType: 'tv',
      savedAt: '2026-11-24T15:00:00.000Z',
    })

    expect([olderTv, olderMovie, newest].sort(compareEntries)).toEqual([
      newest,
      olderMovie,
      olderTv,
    ])
  })

  it('keeps the newest entry per identity when deduplicating', () => {
    const older = savedEntry({ savedAt: '2026-11-24T15:00:00.000Z', title: 'Older' })
    const newer = savedEntry({ savedAt: '2026-11-24T16:00:00.000Z', title: 'Newer' })

    expect(dedupeEntries([older, newer])).toEqual([newer])
    expect(normalizeEntries([older, newer])).toEqual([newer])
  })
})

describe('stored entry construction', () => {
  it('writes only the allowed snapshot fields', () => {
    const entry = storedEntryFromSnapshot(
      { mediaType: 'movie', itemId: MOVIE_ID, title: 'Minimal' },
      SAVED_AT
    )

    expect(entry).toEqual({
      mediaType: 'movie',
      itemId: MOVIE_ID,
      title: 'Minimal',
      savedAt: SAVED_AT,
    })
  })

  it('drops an absent large poster url', () => {
    const entry = storedEntryFromSnapshot(
      {
        mediaType: 'movie',
        itemId: MOVIE_ID,
        title: 'Minimal',
        poster: { url: 'https://image.example.test/p.jpg' },
      },
      SAVED_AT
    )

    expect(entry.poster).toEqual({ url: 'https://image.example.test/p.jpg' })
  })

  it('treats entries with the same identity and timestamp as equal', () => {
    expect(compareEntries(savedEntry(), savedEntry())).toBe(0)
  })

  it('keeps the first entry when duplicates share a timestamp', () => {
    const first = savedEntry({ title: 'First' })
    const second = savedEntry({ title: 'Second' })

    expect(dedupeEntries([first, second])).toEqual([first])
  })
})
