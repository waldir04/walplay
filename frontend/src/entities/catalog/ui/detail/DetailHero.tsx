import { useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'
import { PAGE_HEADING_ID } from '@/shared/lib/domIds'

import type { TitleDetail } from '../../model/titleDetail'
import { PosterFallback } from '../PosterFallback'

export interface DetailHeroProps {
  readonly detail: TitleDetail
  readonly mediaTypeLabel: string
  readonly originalTitleLabel: string
  readonly returnAction: ReactNode
}

export const DetailHero = ({
  detail,
  mediaTypeLabel,
  originalTitleLabel,
  returnAction,
}: DetailHeroProps) => {
  const [posterFailed, setPosterFailed] = useState(false)
  const [backdropFailed, setBackdropFailed] = useState(false)
  const showPoster = detail.poster !== undefined && !posterFailed
  const showBackdrop = detail.backdrop !== undefined && !backdropFailed
  const showOriginalTitle =
    detail.originalTitle !== undefined && detail.originalTitle !== detail.title

  return (
    <header className="relative overflow-hidden rounded-card border border-border bg-surface">
      {showBackdrop && detail.backdrop ? (
        <img
          src={detail.backdrop.url}
          srcSet={
            detail.backdrop.urlLarge
              ? `${detail.backdrop.url} 780w, ${detail.backdrop.urlLarge} 1280w`
              : undefined
          }
          sizes="100vw"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setBackdropFailed(true)}
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
      ) : null}

      <div className="relative flex flex-col gap-4 p-4 sm:p-6 md:flex-row md:items-start">
        <div className="order-1 flex flex-1 flex-col gap-2">
          <p className="text-caption uppercase tracking-wide text-text-muted">{mediaTypeLabel}</p>
          <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-display text-text">
            {detail.title}
          </h1>
          {showOriginalTitle ? (
            <p className="text-body text-text-muted">
              <span className="font-semibold">{originalTitleLabel}: </span>
              {detail.originalTitle}
            </p>
          ) : null}
          <div className="mt-stack">{returnAction}</div>
        </div>

        <div className={cn('order-2 w-full max-w-48 shrink-0 md:max-w-56')}>
          {showPoster && detail.poster ? (
            <img
              src={detail.poster.url}
              srcSet={
                detail.poster.urlLarge
                  ? `${detail.poster.url} 342w, ${detail.poster.urlLarge} 780w`
                  : `${detail.poster.url} 342w, ${detail.poster.url} 780w`
              }
              sizes="(min-width: 768px) 224px, 60vw"
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              onError={() => setPosterFailed(true)}
              className="aspect-[2/3] w-full rounded-control border border-border object-cover"
            />
          ) : (
            <PosterFallback title={detail.title} mediaTypeLabel={mediaTypeLabel} />
          )}
        </div>
      </div>
    </header>
  )
}
