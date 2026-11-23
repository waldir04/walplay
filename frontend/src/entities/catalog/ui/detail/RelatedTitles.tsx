import { SIMILAR_PREVIEW_LIMIT } from '@/shared/config/constants'

import type { CatalogItem } from '../../model/catalogItem'
import { CatalogCard } from '../CatalogCard'
import { CatalogGrid } from '../CatalogGrid'

export interface RelatedTitlesProps {
  readonly items: readonly CatalogItem[]
  readonly label: string
}

export const RelatedTitles = ({ items, label }: RelatedTitlesProps) => {
  const visible = items.slice(0, SIMILAR_PREVIEW_LIMIT)

  return (
    <CatalogGrid label={label}>
      {visible.map((item) => (
        <li key={item.id}>
          <CatalogCard item={item} showRating={false} />
        </li>
      ))}
    </CatalogGrid>
  )
}
