export interface PosterFallbackProps {
  readonly title: string
  readonly mediaTypeLabel: string
}

export const PosterFallback = ({ title, mediaTypeLabel }: PosterFallbackProps) => (
  <div
    aria-hidden="true"
    className="flex aspect-[2/3] w-full flex-col items-start justify-end gap-2 overflow-hidden rounded-control border border-border bg-surface-raised p-3"
  >
    <span className="line-clamp-2 text-caption font-semibold text-text">{title}</span>
    <span className="text-caption text-text-muted">{mediaTypeLabel}</span>
  </div>
)
