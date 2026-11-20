import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

import { Button } from './Button'

export interface EmptyStateAction {
  label: string
  onClick: () => void
}

export interface EmptyStateProps {
  title: string
  description: string
  action?: EmptyStateAction | undefined
  icon?: ReactNode
}

export const EmptyState = ({ title, description, action, icon }: EmptyStateProps) => (
  <section
    className={cn(
      'rounded-card border border-border bg-surface p-6 sm:p-8',
      'flex flex-col items-start gap-stack'
    )}
  >
    {icon ? <span className="text-primary">{icon}</span> : null}
    <h2 className="text-title text-text">{title}</h2>
    <p className="max-w-prose text-text-muted">{description}</p>
    {action ? (
      <Button variant="primary" onClick={action.onClick}>
        {action.label}
      </Button>
    ) : null}
  </section>
)
