import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'

import { cn } from '@/shared/lib/cn'

export interface LinkProps {
  to: string
  children: ReactNode
  className?: string
  onClick?: () => void
  'aria-current'?: 'page'
}

export const Link = ({
  to,
  children,
  className,
  onClick,
  'aria-current': ariaCurrent,
}: LinkProps) => (
  <RouterLink
    to={to}
    onClick={onClick}
    aria-current={ariaCurrent}
    className={cn(
      'inline-flex items-center gap-2 rounded-control text-primary underline-offset-4 transition-colors duration-150 ease-out hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
      className
    )}
  >
    {children}
  </RouterLink>
)
