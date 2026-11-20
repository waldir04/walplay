import { useTranslation } from 'react-i18next'

import { ErrorState, RouteLoadingState } from '@/shared/ui'

import type { PageImporter } from './usePageModule'
import { usePageModule } from './usePageModule'

export interface RouteContentProps {
  readonly importer: PageImporter
}

export const RouteContent = ({ importer }: RouteContentProps) => {
  const { t } = useTranslation()
  const { status, Component, retry } = usePageModule(importer)

  if (status === 'loading') {
    return <RouteLoadingState heading={t('states.loading.title')} busyLabel={t('a11y.loading')} />
  }

  if (status === 'error' || !Component) {
    return (
      <ErrorState
        title={t('states.error.title')}
        description={t('states.error.description')}
        retry={{ label: t('states.error.retry'), onRetry: retry }}
        homeAction={{ label: t('states.notFound.home'), href: '/' }}
      />
    )
  }

  return <Component />
}
