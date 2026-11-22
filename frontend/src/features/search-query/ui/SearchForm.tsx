import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_QUERY_LENGTH } from '@/shared/config/constants'
import { Button } from '@/shared/ui'

export interface SearchFormProps {
  readonly draft: string
  readonly onDraftChange: (value: string) => void
  readonly onSubmit: () => void
  readonly onClear: () => void
  readonly inputRef: RefObject<HTMLInputElement | null>
}

export const SearchForm = ({
  draft,
  onDraftChange,
  onSubmit,
  onClear,
  inputRef,
}: SearchFormProps) => {
  const { t } = useTranslation()

  return (
    <form
      role="search"
      aria-label={t('search.form.regionLabel')}
      autoComplete="off"
      className="flex w-full flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label htmlFor="search-query" className="text-body font-semibold text-text">
        {t('search.form.label')}
      </label>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          id="search-query"
          name="query"
          type="search"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          aria-describedby="search-hint"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          className="min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 py-2 text-body text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        <div className="flex gap-2">
          <Button type="submit" className="min-h-11 min-w-11 shrink-0">
            {t('search.form.submit')}
          </Button>
          {draft.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 min-w-11 shrink-0"
              aria-label={t('search.form.clear')}
              onClick={onClear}
            >
              {t('search.form.clear')}
            </Button>
          ) : null}
        </div>
      </div>
      <p id="search-hint" className="text-caption text-text-muted">
        {t('search.form.hint', {
          min: SEARCH_MIN_QUERY_LENGTH,
          max: SEARCH_MAX_QUERY_LENGTH,
        })}
      </p>
    </form>
  )
}
