import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { formatPopularity, resolveInterfaceLanguage, toLocaleCode } from '@/entities/catalog'

export interface ProviderMetadataProps {
  readonly popularity?: number | undefined
  readonly attribution: ReactNode
}

export const ProviderMetadata = ({ popularity, attribution }: ProviderMetadataProps) => {
  const { t, i18n } = useTranslation()
  const locale = toLocaleCode(resolveInterfaceLanguage(i18n.language))
  const showPopularity = popularity !== undefined && Number.isFinite(popularity) && popularity > 0

  return (
    <section
      aria-labelledby="detail-provider-metadata-heading"
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
    >
      <h2 id="detail-provider-metadata-heading" className="text-title text-text">
        {t('detail.sections.providerMetadata')}
      </h2>
      {showPopularity ? (
        <p className="text-body text-text">
          <span className="text-text-muted">{t('detail.popularity.label')}: </span>
          <span className="tabular-nums">{formatPopularity(popularity, locale)}</span>
        </p>
      ) : null}
      <p className="max-w-prose text-caption text-text-muted">{t('detail.providerValuesNote')}</p>
      <div>{attribution}</div>
    </section>
  )
}
