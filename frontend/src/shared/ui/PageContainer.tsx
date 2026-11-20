import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export interface PageContainerProps {
  children: ReactNode
  className?: string
}

export const PageContainer = ({ children, className }: PageContainerProps) => (
  <div className={cn('mx-auto w-full max-w-5xl px-page sm:px-page-sm', className)}>{children}</div>
)
