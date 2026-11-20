import { useEffect, useRef } from 'react'

import { Button } from './Button'
import { Link } from './Link'

export interface ErrorStateRetry {
  label: string
  onRetry: () => void
}

export interface ErrorStateHomeAction {
  label: string
  href: string
}

export interface ErrorStateProps {
  title: string
  description: string
  retry?: ErrorStateRetry | undefined
  homeAction: ErrorStateHomeAction
}

export const ErrorState = ({ title, description, retry, homeAction }: ErrorStateProps) => {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section role="alert" className="rounded-card border border-border bg-surface p-6 sm:p-8">
      <h2 ref={headingRef} tabIndex={-1} className="text-title text-text">
        {title}
      </h2>
      <p className="mt-stack max-w-prose text-text-muted">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {retry ? (
          <Button type="button" onClick={retry.onRetry}>
            {retry.label}
          </Button>
        ) : null}
        <Link to={homeAction.href} className="min-h-11 px-1">
          {homeAction.label}
        </Link>
      </div>
    </section>
  )
}
