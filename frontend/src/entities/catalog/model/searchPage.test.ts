import { describe, expect, it } from 'vitest'

import {
  emptyButMorePage,
  emptyFinalPage,
  finalSearchPage,
  firstSearchPage,
  searchPageEnvelope,
  secondSearchPage,
} from '@/test/fixtures/catalog/search'
import { movieItem } from '@/test/fixtures/catalog'

import { flattenSearchPages, searchPageEnvelopeSchema } from './searchPage'

describe('search page model', () => {
  it('validates the search response envelope and reuses catalog items and meta', () => {
    const parsed = searchPageEnvelopeSchema.parse(firstSearchPage())

    expect(parsed.data.page).toBe(1)
    expect(parsed.data.items).toHaveLength(2)
    expect(parsed.data.hasMore).toBe(true)
    expect(parsed.meta.language).toBe('en-US')
  })

  it('never exposes totalResults even if a payload includes it', () => {
    const payload = {
      ...firstSearchPage(),
      data: { ...firstSearchPage().data, totalResults: 500 },
    }
    const parsed = searchPageEnvelopeSchema.parse(payload)

    expect(parsed.data).not.toHaveProperty('totalResults')
  })

  it('rejects a page whose item violates the catalog item contract', () => {
    const payload = {
      ...firstSearchPage(),
      data: { ...firstSearchPage().data, items: [{ id: 'short', mediaType: 'movie' }] },
    }

    expect(searchPageEnvelopeSchema.safeParse(payload).success).toBe(false)
  })

  it('appends pages in order and drops duplicate opaque ids', () => {
    const first = firstSearchPage()
    const duplicate = {
      ...secondSearchPage(),
      data: {
        ...secondSearchPage().data,
        items: [first.data.items[0]!, movieItem({ id: 'd2wxOm1vdmllOjYwMw' })],
      },
    }

    const result = flattenSearchPages([first, duplicate])

    expect(result.items.map((item) => item.id)).toEqual([
      first.data.items[0]?.id,
      first.data.items[1]?.id,
      'd2wxOm1vdmllOjYwMw',
    ])
    expect(result.duplicates).toBe(1)
    expect(result.hasMore).toBe(true)
    expect(result.meta).toEqual(duplicate.meta)
  })

  it('reports loadedPageHadNoTitles only for an empty page with more pages', () => {
    expect(flattenSearchPages([emptyButMorePage()]).loadedPageHadNoTitles).toBe(true)
    expect(flattenSearchPages([emptyFinalPage()]).loadedPageHadNoTitles).toBe(false)
    expect(flattenSearchPages([]).loadedPageHadNoTitles).toBe(false)
  })

  it('derives hasMore and meta from the last loaded page and handles no pages', () => {
    const pages = [firstSearchPage(), finalSearchPage()]

    expect(flattenSearchPages(pages)).toMatchObject({
      hasMore: false,
      meta: pages[1]?.meta,
    })
    expect(flattenSearchPages([])).toEqual({
      items: [],
      duplicates: 0,
      hasMore: false,
      meta: undefined,
      loadedPageHadNoTitles: false,
    })
  })

  it('keeps an empty final page distinct from missing pages', () => {
    const result = flattenSearchPages([emptyFinalPage()])
    expect(result.items).toEqual([])
    expect(result.hasMore).toBe(false)
    expect(result.loadedPageHadNoTitles).toBe(false)
  })

  it('preserves page order across three page fixtures', () => {
    const result = flattenSearchPages([firstSearchPage(), secondSearchPage(), finalSearchPage()])

    expect(result.items.map((item) => item.title)).toEqual([
      'The Matrix',
      'The Matrix Show',
      'The Matrix Reloaded',
      'The Matrix Revolutions',
    ])
  })

  it('accepts a stale meta envelope', () => {
    const stale = searchPageEnvelope({ items: [movieItem()], stale: true })

    expect(searchPageEnvelopeSchema.parse(stale).meta).toMatchObject({
      stale: true,
      source: 'stale-cache',
    })
  })
})
