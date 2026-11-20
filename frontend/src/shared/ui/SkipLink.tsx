import type { MouseEvent } from 'react'

export interface SkipLinkProps {
  label: string
  targetId: string
}

export const SkipLink = ({ label, targetId }: SkipLinkProps) => {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault()
    const target = document.getElementById(targetId)
    if (!target) {
      return
    }
    target.focus()
    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'start' })
    }
  }

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-control focus:border focus:border-border-strong focus:bg-surface focus:px-4 focus:py-2.5 focus:text-text"
    >
      {label}
    </a>
  )
}
