import { useTranslation } from 'react-i18next'

import { CAST_PREVIEW_LIMIT } from '@/shared/config/constants'

import type { CastCredit } from '../../model/titleDetail'

export interface CastListProps {
  readonly cast: readonly CastCredit[]
}

export const CastList = ({ cast }: CastListProps) => {
  const { t } = useTranslation()
  const visible = cast.slice(0, CAST_PREVIEW_LIMIT)

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {visible.map((credit, index) => (
        <li key={`${credit.name}-${index}`} className="flex flex-col gap-2">
          {credit.profile === undefined ? (
            <div className="flex aspect-[2/3] w-full items-end rounded-control border border-border bg-surface-raised p-2">
              <span className="line-clamp-2 text-caption text-text-muted">
                {t('detail.credits.profileFallback', { name: credit.name })}
              </span>
            </div>
          ) : (
            <img
              src={credit.profile.url}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="aspect-[2/3] w-full rounded-control border border-border object-cover"
            />
          )}
          <div className="flex flex-col">
            <span className="text-caption font-semibold text-text">{credit.name}</span>
            {credit.character === undefined ? null : (
              <span className="line-clamp-2 text-caption text-text-muted">
                {t('detail.credits.character', { character: credit.character })}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
