import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'

import { MAIN_CONTENT_ID, WIDE_LAYOUT_BREAKPOINT } from '@/shared/config/constants'
import { LiveRegion, SkipLink } from '@/shared/ui'

import { useMediaQuery } from '../lib/useMediaQuery'
import { AppHeader } from './AppHeader'

const WIDE_LAYOUT_QUERY = `(min-width: ${WIDE_LAYOUT_BREAKPOINT}px)`

export interface AppShellProps {
  readonly announcement?: string
}

export const AppShell = ({ announcement = '' }: AppShellProps) => {
  const { t } = useTranslation()
  const isWide = useMediaQuery(WIDE_LAYOUT_QUERY)

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink label={t('a11y.skipToContent')} targetId={MAIN_CONTENT_ID} />
      <AppHeader isWide={isWide} />
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-page pb-16 pt-8 sm:px-page-sm sm:pt-10"
      >
        <Outlet />
      </main>
      <LiveRegion message={announcement} />
    </div>
  )
}
