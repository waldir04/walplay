import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import {
  SEARCH_COPY_KEYS,
  hasSearchQueryParameter,
  isInterfaceLanguage,
  parseSearchQueryAddress,
} from '@/entities/catalog'
import { SearchForm, useSearchInput } from '@/features/search-query'
import { SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_QUERY_LENGTH } from '@/shared/config/constants'
import { PAGE_HEADING_ID } from '@/shared/lib/domIds'
import { LiveRegion } from '@/shared/ui'
import { ProviderAttribution } from '@/widgets/provider-attribution'
import { SearchResults } from '@/widgets/search-results'

export const SearchPage = () => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const language = isInterfaceLanguage(i18n.language) ? i18n.language : 'en'
  const activeQuery = parseSearchQueryAddress(location.search)
  const hasQueryParameter = hasSearchQueryParameter(location.search)
  const controller = useSearchInput({ activeQuery, language })

  const guidanceMessage =
    hasQueryParameter && activeQuery.validity === 'too-short'
      ? t(SEARCH_COPY_KEYS.tooShort, { min: SEARCH_MIN_QUERY_LENGTH })
      : hasQueryParameter && activeQuery.validity === 'too-long'
        ? t(SEARCH_COPY_KEYS.tooLong, { max: SEARCH_MAX_QUERY_LENGTH })
        : ''

  return (
    <div className="flex flex-col gap-section">
      <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-display text-text">
        {t('navigation.search')}
      </h1>

      <SearchForm
        draft={controller.draft}
        onDraftChange={controller.setDraft}
        onSubmit={controller.submit}
        onClear={controller.clear}
        inputRef={controller.inputRef}
      />

      <LiveRegion message={guidanceMessage} />

      {activeQuery.validity !== 'valid' ? (
        <div className="flex flex-col gap-1">
          <h2 className="text-title text-text">{t(SEARCH_COPY_KEYS.initial.title)}</h2>
          <p className="max-w-prose text-text-muted">{t(SEARCH_COPY_KEYS.initial.description)}</p>
          {guidanceMessage.length > 0 ? (
            <p className="max-w-prose text-caption text-text-muted">{guidanceMessage}</p>
          ) : null}
        </div>
      ) : (
        <SearchResults
          query={activeQuery}
          language={language}
          isSettling={controller.isSettling}
          onEditQuery={() => controller.inputRef.current?.focus()}
          onClearQuery={controller.clear}
          attribution={<ProviderAttribution />}
        />
      )}
    </div>
  )
}
