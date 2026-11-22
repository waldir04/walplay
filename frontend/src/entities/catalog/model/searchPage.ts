import { z } from 'zod'

import { catalogItemSchema } from './catalogItem'
import { catalogResponseMetaSchema } from './catalogSection'

export const searchResultPageSchema = z.object({
  page: z.number().int().positive(),
  items: z.array(catalogItemSchema).readonly(),
  totalPages: z.number().int().nonnegative().optional(),
  hasMore: z.boolean(),
})

export const searchPageEnvelopeSchema = z.object({
  data: searchResultPageSchema,
  meta: catalogResponseMetaSchema,
})

export type SearchResultPage = z.infer<typeof searchResultPageSchema>
export type SearchPageEnvelope = z.infer<typeof searchPageEnvelopeSchema>

export interface AccumulatedSearchResults {
  readonly items: readonly SearchResultPage['items'][number][]
  readonly duplicates: number
  readonly hasMore: boolean
  readonly meta: SearchPageEnvelope['meta'] | undefined
  readonly loadedPageHadNoTitles: boolean
}

export const flattenSearchPages = (
  pages: readonly SearchPageEnvelope[]
): AccumulatedSearchResults => {
  const seen = new Set<string>()
  const items: SearchResultPage['items'][number][] = []
  let duplicates = 0

  for (const page of pages) {
    for (const item of page.data.items) {
      if (seen.has(item.id)) {
        duplicates += 1
        continue
      }
      seen.add(item.id)
      items.push(item)
    }
  }

  const lastPage = pages.at(-1)

  return {
    items,
    duplicates,
    hasMore: lastPage?.data.hasMore ?? false,
    meta: lastPage?.meta,
    loadedPageHadNoTitles:
      (lastPage?.data.items.length ?? 0) === 0 && (lastPage?.data.hasMore ?? false),
  }
}
