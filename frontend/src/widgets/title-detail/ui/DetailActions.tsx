import { useTranslation } from 'react-i18next'

import type { DetailCapabilities } from '@/shared/config/detailCapabilities'
import { DETAIL_CAPABILITIES } from '@/shared/config/detailCapabilities'

import type { TitleDetail } from '@/entities/catalog'

export interface DetailActionsProps {
  readonly detail: TitleDetail
  readonly capabilities?: DetailCapabilities
}

export const DetailActions = ({
  detail,
  capabilities = DETAIL_CAPABILITIES,
}: DetailActionsProps) => {
  const { t } = useTranslation()

  if (!capabilities.trailer || detail.trailer === undefined) {
    return null
  }

  return (
    <section aria-labelledby="detail-actions-heading" className="flex flex-col gap-3">
      <h2 id="detail-actions-heading" className="text-title text-text">
        {t('detail.sections.actions')}
      </h2>
      <a
        href={detail.trailer.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 w-fit flex-col justify-center rounded-control border border-border-strong bg-surface px-4 py-2 font-semibold text-text transition-colors duration-150 ease-out hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span>{t('detail.actions.trailer')}</span>
        <span className="text-caption font-normal text-text-muted">
          {t('detail.actions.trailerExternal')}
        </span>
      </a>
    </section>
  )
}
