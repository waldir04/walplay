import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

import {
  RECOMMENDATION_MEDIA_SCOPE_LABEL_KEYS,
  RECOMMENDATION_MEDIA_TYPES,
} from '../model/constants'
import type { RecommendationMediaScope as RecommendationMediaScopeValue } from '../model/constants'

export interface RecommendationMediaScopeProps {
  readonly value: RecommendationMediaScopeValue
  readonly onChange: (scope: RecommendationMediaScopeValue) => void
}

export const RecommendationMediaScope = ({ value, onChange }: RecommendationMediaScopeProps) => {
  const { t } = useTranslation()
  const labelId = useId()

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <span id={labelId} className="text-caption font-semibold text-text">
        {t('recommendations.section.mediaScope.label')}
      </span>
      <div className="flex flex-wrap gap-2">
        {RECOMMENDATION_MEDIA_TYPES.map((option) => {
          const selected = option === value
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              className={cn(
                'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-control border px-4 py-2 font-semibold transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none',
                selected
                  ? 'border-primary bg-primary text-text-inverse'
                  : 'border-border-strong bg-surface text-text hover:bg-surface-raised'
              )}
            >
              {t(RECOMMENDATION_MEDIA_SCOPE_LABEL_KEYS[option])}
            </button>
          )
        })}
      </div>
    </div>
  )
}
