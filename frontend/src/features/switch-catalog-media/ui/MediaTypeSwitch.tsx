import { useTranslation } from 'react-i18next'

import { browseLandingPath, categoryPath } from '@/entities/catalog'
import type { CategorySlug, MediaType } from '@/entities/catalog'
import { cn } from '@/shared/lib/cn'
import { Link } from '@/shared/ui'

export interface MediaTypeSwitchProps {
  readonly current: MediaType
  readonly category?: CategorySlug
}

export const MediaTypeSwitch = ({ current, category }: MediaTypeSwitchProps) => {
  const { t } = useTranslation()

  const destinationFor = (mediaType: MediaType): string =>
    category ? categoryPath(mediaType, category) : browseLandingPath(mediaType)

  return (
    <div
      role="group"
      aria-label={t('catalog.mediaType.label')}
      className="flex flex-wrap items-center gap-2"
    >
      {(['movie', 'tv'] as const).map((mediaType) => {
        const isSelected = mediaType === current
        return (
          <Link
            key={mediaType}
            to={destinationFor(mediaType)}
            aria-current={isSelected ? 'page' : undefined}
            className={cn(
              'min-h-11 min-w-11 justify-center rounded-control border px-4 py-2 text-caption font-semibold no-underline transition-colors duration-150 ease-out',
              isSelected
                ? 'border-primary bg-surface-raised text-primary'
                : 'border-border bg-surface text-text-muted hover:bg-surface-raised hover:text-text'
            )}
          >
            {t(`catalog.mediaType.${mediaType}`)}
          </Link>
        )
      })}
    </div>
  )
}
