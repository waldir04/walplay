import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AVAILABILITY_UNSUPPORTED_REGION_DESCRIPTION_ID,
  formatRegionLabel,
  resolveInterfaceLanguage,
  toLocaleCode,
} from '@/entities/catalog'

export interface AvailabilityRegionSelectorProps {
  readonly value: string
  readonly regions: readonly string[]
  readonly onChange: (region: string) => void
}

export const AvailabilityRegionSelector = ({
  value,
  regions,
  onChange,
}: AvailabilityRegionSelectorProps) => {
  const { t, i18n } = useTranslation()
  const selectId = useId()
  const locale = toLocaleCode(resolveInterfaceLanguage(i18n.language))
  const supported = regions.includes(value)

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={selectId} className="text-caption font-semibold text-text">
        {t('detail.availability.regionSelectorLabel')}
      </label>
      <select
        id={selectId}
        value={supported ? value : ''}
        aria-describedby={supported ? undefined : AVAILABILITY_UNSUPPORTED_REGION_DESCRIPTION_ID}
        onChange={(event) => {
          const next = event.currentTarget.value
          if (next.length > 0) {
            onChange(next)
          }
        }}
        className="min-h-11 min-w-11 rounded-control border border-border-strong bg-surface px-3 py-2 text-body text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {supported ? null : (
          <option value="" disabled>
            {t('detail.availability.regionSelectorPlaceholder')}
          </option>
        )}
        {regions.map((code) => (
          <option key={code} value={code}>
            {formatRegionLabel(code, locale)}
          </option>
        ))}
      </select>
    </div>
  )
}
