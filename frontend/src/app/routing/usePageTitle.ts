import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMatches } from 'react-router'

import { useDocumentTitleOverride } from '@/shared/lib/documentTitle'

interface RouteHandle {
  readonly titleKey?: string
}

export const usePageTitle = (): void => {
  const { t } = useTranslation()
  const { override } = useDocumentTitleOverride()
  const matches = useMatches()

  const titleKey = matches
    .map((match) => (match.handle as RouteHandle | undefined)?.titleKey)
    .filter((key): key is string => typeof key === 'string')
    .at(-1)

  useEffect(() => {
    if (override !== null) {
      document.title = override
      return
    }
    if (!titleKey) {
      return
    }
    document.title = t(titleKey)
  }, [t, titleKey, override])
}
