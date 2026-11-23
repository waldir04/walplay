import { useId, useState } from 'react'

import { cn } from '@/shared/lib/cn'

export interface ExpandableTextProps {
  readonly text: string
  readonly previewCodePoints: number
  readonly showMoreLabel: string
  readonly showLessLabel: string
  readonly className?: string
}

export const ExpandableText = ({
  text,
  previewCodePoints,
  showMoreLabel,
  showLessLabel,
  className,
}: ExpandableTextProps) => {
  const [expanded, setExpanded] = useState(false)
  const textId = useId()
  const exceedsPreview = Array.from(text).length > previewCodePoints

  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      <p
        id={textId}
        className={cn(
          'max-w-prose whitespace-pre-line text-body text-text-muted',
          exceedsPreview && !expanded ? 'line-clamp-6' : undefined
        )}
      >
        {text}
      </p>
      {exceedsPreview ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((current) => !current)}
          className="min-h-11 rounded-control px-1 text-caption font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {expanded ? showLessLabel : showMoreLabel}
        </button>
      ) : null}
    </div>
  )
}
