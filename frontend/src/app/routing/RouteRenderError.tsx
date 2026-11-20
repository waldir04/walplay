import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router'

import { ErrorState } from '@/shared/ui'

export const RouteRenderError = () => {
  useRouteError()
  const { t } = useTranslation()

  return (
    <ErrorState
      title={t('errors.render.title')}
      description={t('errors.render.description')}
      homeAction={{ label: t('errors.render.home'), href: '/' }}
    />
  )
}
