import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui'

import { detailPageCopyKeys } from '../../model/detailErrors'

export interface DetailFailureProps {
  readonly onRetry: () => void
  readonly retrying?: boolean
  readonly returnAction: ReactNode
}

export const DetailFailure = ({ onRetry, retrying = false, returnAction }: DetailFailureProps) => {
  const { t } = useTranslation()
  const copy = detailPageCopyKeys('error')

  return (
    <section role="alert" className="rounded-card border border-border bg-surface p-6 sm:p-8">
      <h2 className="text-title text-text">{t(copy.title)}</h2>
      <p className="mt-stack max-w-prose text-text-muted">{t(copy.description)}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onRetry} disabled={retrying}>
          {t('detail.states.retry')}
        </Button>
        {returnAction}
      </div>
    </section>
  )
}
