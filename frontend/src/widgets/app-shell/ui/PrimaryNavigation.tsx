import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { cn } from '@/shared/lib/cn'
import { Link } from '@/shared/ui'

export interface PrimaryNavigationItem {
  readonly to: string
  readonly label: string
}

export interface PrimaryNavigationProps {
  items: readonly PrimaryNavigationItem[]
  ariaLabel: string
  onNavigate?: () => void
}

export const PrimaryNavigation = ({ items, ariaLabel, onNavigate }: PrimaryNavigationProps) => {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <nav aria-label={ariaLabel}>
      <ul className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
        {items.map((item) => {
          const isActive = location.pathname === item.to
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 w-full items-center gap-2 rounded-control border border-transparent px-3 py-2 text-caption font-medium transition-colors duration-150 ease-out hover:bg-surface-raised hover:text-primary-strong md:w-auto',
                  isActive && 'border-border bg-surface-raised font-semibold text-primary'
                )}
              >
                {isActive ? (
                  <span aria-hidden="true" className="h-5 w-0.5 rounded-full bg-primary" />
                ) : null}
                <span>{item.label}</span>
                {isActive ? <span className="sr-only">({t('a11y.currentPage')})</span> : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
