import { useTranslation } from 'react-i18next'

import { CREW_PREVIEW_LIMIT } from '@/shared/config/constants'

import { crewRoleLabelKey } from '../../model/titleDetail'
import type { CrewCredit } from '../../model/titleDetail'

export interface CrewListProps {
  readonly crew: readonly CrewCredit[]
}

export const CrewList = ({ crew }: CrewListProps) => {
  const { t } = useTranslation()
  const visible = crew.slice(0, CREW_PREVIEW_LIMIT)

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((credit, index) => (
        <li
          key={`${credit.name}-${credit.role}-${index}`}
          className="flex items-center gap-3 rounded-card border border-border bg-surface p-3"
        >
          {credit.profile === undefined ? (
            <span
              aria-hidden="true"
              className="aspect-[2/3] w-12 shrink-0 rounded-control bg-surface-raised"
            />
          ) : (
            <img
              src={credit.profile.url}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="aspect-[2/3] w-12 shrink-0 rounded-control border border-border object-cover"
            />
          )}
          <div className="flex flex-col">
            <span className="text-caption font-semibold text-text">{credit.name}</span>
            <span className="text-caption text-text-muted">{t(crewRoleLabelKey(credit.role))}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
