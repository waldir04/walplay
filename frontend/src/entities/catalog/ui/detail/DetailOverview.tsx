import { useTranslation } from 'react-i18next'

import { ExpandableText } from '@/shared/ui'
import { OVERVIEW_PREVIEW_CODE_POINTS } from '@/shared/config/constants'

import type { TitleDetail } from '../../model/titleDetail'

export interface DetailOverviewProps {
  readonly detail: TitleDetail
}

export const DetailOverview = ({ detail }: DetailOverviewProps) => {
  const { t } = useTranslation()

  if (detail.overview === undefined || detail.overview.trim().length === 0) {
    return null
  }
  const tagline =
    detail.tagline !== undefined && detail.tagline.trim().length > 0 ? detail.tagline : undefined

  return (
    <section aria-labelledby="detail-overview-heading" className="flex flex-col gap-2">
      <h2 id="detail-overview-heading" className="text-title text-text">
        {t('detail.sections.overview')}
      </h2>
      {tagline === undefined ? null : (
        <p className="text-caption italic text-text-muted">{tagline}</p>
      )}
      <ExpandableText
        text={detail.overview}
        previewCodePoints={OVERVIEW_PREVIEW_CODE_POINTS}
        showMoreLabel={t('detail.overview.showMore')}
        showLessLabel={t('detail.overview.showLess')}
      />
    </section>
  )
}
