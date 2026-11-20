import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMatches } from 'react-router'

interface RouteHandle {
  readonly titleKey?: string
}

export const usePageTitle = (): void => {
  const { t } = useTranslation()
  const matches = useMatches()

  const titleKey = matches
    .map((match) => (match.handle as RouteHandle | undefined)?.titleKey)
    .filter((key): key is string => typeof key === 'string')
    .at(-1)

  useEffect(() => {
    if (!titleKey) {
      return
    }
    document.title = t(titleKey)
  }, [t, titleKey])
}
