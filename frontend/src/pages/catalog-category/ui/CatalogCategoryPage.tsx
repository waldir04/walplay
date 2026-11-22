import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { CATEGORY_LABEL_KEYS, isInterfaceLanguage, parseCatalogPath } from '@/entities/catalog'
import { MediaTypeSwitch } from '@/features/switch-catalog-media'
import { PAGE_HEADING_ID } from '@/shared/lib/domIds'
import { CatalogCategoryList } from '@/widgets/catalog-category-list'
import { ProviderAttribution } from '@/widgets/provider-attribution'

export const CatalogCategoryPage = () => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const parsed = parseCatalogPath(location.pathname)
  const language = isInterfaceLanguage(i18n.language) ? i18n.language : 'en'

  if (parsed.kind !== 'category') {
    return null
  }

  const { mediaType, category } = parsed
  const mediaTypeLabel = t(`catalog.mediaType.${mediaType}`)
  const categoryLabel = t(CATEGORY_LABEL_KEYS[category])

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-stack">
        <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-display text-text">
          {t('catalog.category.heading', { category: categoryLabel, mediaType: mediaTypeLabel })}
        </h1>
        <MediaTypeSwitch current={mediaType} category={category} />
      </div>

      <CatalogCategoryList mediaType={mediaType} section={category} language={language} />

      <ProviderAttribution />
    </div>
  )
}
