import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'
import type { Season } from '@/entities/catalog'

import { seasonOptionLabel } from '../model/seasonAddress'

export interface SeasonSelectorProps {
  readonly seasons: readonly Season[]
  readonly selectedSeason: number
  readonly onSelectSeason: (seasonNumber: number) => void
}

export const SeasonSelector = ({
  seasons,
  selectedSeason,
  onSelectSeason,
}: SeasonSelectorProps) => {
  const { t } = useTranslation()

  return (
    <ul aria-label={t('detail.seasons.selectLabel')} className="flex flex-wrap gap-2">
      {seasons.map((season) => {
        const isSelected = season.number === selectedSeason
        return (
          <li key={season.number}>
            <button
              type="button"
              aria-pressed={isSelected}
              aria-label={t('detail.a11y.seasonControl', { number: season.number })}
              onClick={() => onSelectSeason(season.number)}
              className={cn(
                'flex min-h-11 flex-col items-start justify-center rounded-control border px-3 py-1.5 text-caption transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                isSelected
                  ? 'border-primary bg-surface-raised font-semibold text-primary'
                  : 'border-border bg-surface text-text hover:bg-surface-raised'
              )}
            >
              <span>{seasonOptionLabel(season, t)}</span>
              {isSelected ? (
                <span className="text-caption text-text-muted">{t('detail.seasons.selected')}</span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
