import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui'

export interface LoadMoreControlProps {
  readonly hasMore: boolean
  readonly isFetching: boolean
  readonly onLoadMore: () => void
}

export const LoadMoreControl = ({ hasMore, isFetching, onLoadMore }: LoadMoreControlProps) => {
  const { t } = useTranslation()

  if (!hasMore) {
    return null
  }

  return (
    <div className="flex justify-center pt-4">
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 min-w-11"
        aria-busy={isFetching}
        disabled={isFetching}
        onClick={() => {
          if (!isFetching) {
            onLoadMore()
          }
        }}
      >
        {t('catalog.actions.loadMore')}
      </Button>
    </div>
  )
}
