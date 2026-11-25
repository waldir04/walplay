import { useTranslation } from 'react-i18next'

import { SaveToListControls, toSavedSnapshot } from '@/features/toggle-saved-title'
import { DETAIL_CAPABILITIES } from '@/shared/config/detailCapabilities'
import type { DetailCapabilities } from '@/shared/config/detailCapabilities'

import type { TitleDetail } from '@/entities/catalog'

export interface DetailTrailerEntry {
  readonly headingId: string
}

export interface DetailActionsProps {
  readonly detail: TitleDetail
  readonly capabilities?: DetailCapabilities
  readonly trailerEntry?: DetailTrailerEntry | undefined
}

export const DetailActions = ({
  detail,
  capabilities = DETAIL_CAPABILITIES,
  trailerEntry,
}: DetailActionsProps) => {
  const { t } = useTranslation()

  const showTrailerEntry = capabilities.trailer && trailerEntry !== undefined

  if (!showTrailerEntry && !capabilities.personalLists) {
    return null
  }

  return (
    <section aria-labelledby="detail-actions-heading" className="flex flex-col gap-3">
      <h2 id="detail-actions-heading" className="text-title text-text">
        {t('detail.sections.actions')}
      </h2>
      {capabilities.personalLists ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <SaveToListControls
            collection="watchlist"
            title={detail.title}
            snapshot={toSavedSnapshot(detail)}
          />
          <SaveToListControls
            collection="favorites"
            title={detail.title}
            snapshot={toSavedSnapshot(detail)}
          />
        </div>
      ) : null}
      {showTrailerEntry && trailerEntry !== undefined ? (
        <a
          href={`#${trailerEntry.headingId}`}
          onClick={(event) => {
            const target = document.getElementById(trailerEntry.headingId)
            if (target === null) {
              return
            }
            event.preventDefault()
            target.focus()
            target.scrollIntoView?.({ block: 'start' })
          }}
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-control border border-border-strong bg-surface px-4 py-2 font-semibold text-text transition-colors duration-150 ease-out hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
        >
          {t('detail.trailers.entry')}
        </a>
      ) : null}
    </section>
  )
}
