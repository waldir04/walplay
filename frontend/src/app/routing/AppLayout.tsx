import { AppShell } from '@/widgets/app-shell'

import { usePageTitle } from './usePageTitle'
import { useRouteAnnouncement } from './useRouteAnnouncement'

export const AppLayout = () => {
  const { announcement } = useRouteAnnouncement()
  usePageTitle()

  return <AppShell announcement={announcement} />
}
