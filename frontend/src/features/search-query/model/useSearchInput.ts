import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useNavigate } from 'react-router'

import type { InterfaceLanguage } from '@/entities/catalog'
import { buildSearchQuery, normalizeSearchIdentity } from '@/entities/catalog'
import type { SearchQuery } from '@/entities/catalog'
import { SEARCH_SETTLE_MS } from '@/shared/config/constants'

export interface UseSearchInputOptions {
  readonly activeQuery: SearchQuery
  readonly language: InterfaceLanguage
}

export interface SearchInputController {
  readonly draft: string
  readonly setDraft: (value: string) => void
  readonly submit: () => void
  readonly clear: () => void
  readonly inputRef: RefObject<HTMLInputElement | null>
  readonly isSettling: boolean
}

export const useSearchInput = ({ activeQuery }: UseSearchInputOptions): SearchInputController => {
  const navigate = useNavigate()
  const [draft, setDraftState] = useState(activeQuery.trimmed)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeIdentityRef = useRef(activeQuery.identity)
  activeIdentityRef.current = activeQuery.identity

  const cancelTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const commit = useCallback(
    (raw: string, replace = true): void => {
      const next = buildSearchQuery(raw)
      if (next.identity === activeIdentityRef.current) {
        return
      }
      navigate(
        next.trimmed.length === 0
          ? '/search'
          : { pathname: '/search', search: `?q=${encodeURIComponent(next.trimmed)}` },
        { replace }
      )
    },
    [navigate]
  )

  const setDraft = useCallback(
    (value: string): void => {
      setDraftState(value)
      cancelTimer()

      const next = buildSearchQuery(value)
      if (next.validity !== 'valid') {
        commit(value)
        return
      }
      if (next.identity === activeIdentityRef.current) {
        return
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null
        commit(value)
      }, SEARCH_SETTLE_MS)
    },
    [cancelTimer, commit]
  )

  const submit = useCallback((): void => {
    cancelTimer()
    commit(draft)
  }, [cancelTimer, commit, draft])

  const clear = useCallback((): void => {
    cancelTimer()
    setDraftState('')
    navigate('/search', { replace: true })
    inputRef.current?.focus()
  }, [cancelTimer, navigate])

  useEffect(() => {
    setDraftState(activeQuery.trimmed)
  }, [activeQuery.trimmed])

  useEffect(
    () => () => {
      cancelTimer()
    },
    [cancelTimer]
  )

  return {
    draft,
    setDraft,
    submit,
    clear,
    inputRef,
    isSettling: normalizeSearchIdentity(draft) !== activeQuery.identity && draft.trim().length > 0,
  }
}
