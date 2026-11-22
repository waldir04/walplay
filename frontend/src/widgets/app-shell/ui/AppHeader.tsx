import { useTranslation } from 'react-i18next'

import { PageContainer, Link, WalplayLogo } from '@/shared/ui'

import { navigationItems } from '../model/navigationItems'
import { CompactMenu } from './CompactMenu'
import { PrimaryNavigation } from './PrimaryNavigation'
import type { PrimaryNavigationItem } from './PrimaryNavigation'

export interface AppHeaderProps {
  readonly isWide: boolean
}

export const AppHeader = ({ isWide }: AppHeaderProps) => {
  const { t } = useTranslation()
  const items: readonly PrimaryNavigationItem[] = navigationItems.map((item) => ({
    to: item.to,
    label: t(item.labelKey),
    ...(item.matchPrefix === undefined ? {} : { matchPrefix: item.matchPrefix }),
  }))

  return (
    <header className="border-b border-border bg-canvas">
      <PageContainer className="flex items-center justify-between gap-4 py-4">
        <Link to="/" aria-label={t('app.name')} className="text-text hover:no-underline">
          <WalplayLogo />
        </Link>

        {isWide ? (
          <PrimaryNavigation items={items} ariaLabel={t('navigation.label')} />
        ) : (
          <CompactMenu
            triggerLabel={t('navigation.openMenu')}
            closeLabel={t('navigation.closeMenu')}
            title={t('navigation.menuTitle')}
          >
            <PrimaryNavigation items={items} ariaLabel={t('navigation.label')} />
          </CompactMenu>
        )}
      </PageContainer>
    </header>
  )
}
