import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { detailPageCopyKeys } from '../../model/detailErrors'

export interface DetailNotFoundProps {
  readonly returnAction: ReactNode
}

export const DetailNotFound = ({ returnAction }: DetailNotFoundProps) => {
  const { t } = useTranslation()
  const copy = detailPageCopyKeys('not-found')

  return (
    <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
      <h2 className="text-title text-text">{t(copy.title)}</h2>
      <p className="mt-stack max-w-prose text-text-muted">{t(copy.description)}</p>
      <div className="mt-4">{returnAction}</div>
    </section>
  )
}
