import { useCallback, useEffect, useState } from 'react'

import type { ComponentType } from 'react'

export interface PageModule {
  readonly default: ComponentType
}

export type PageImporter = () => Promise<PageModule>

export interface UsePageModuleResult {
  readonly status: 'loading' | 'ready' | 'error'
  readonly Component: ComponentType | null
  readonly retry: () => void
}

interface PageModuleState {
  readonly status: 'loading' | 'ready' | 'error'
  readonly Component: ComponentType | null
}

const loadingState: PageModuleState = { status: 'loading', Component: null }

export const usePageModule = (importer: PageImporter): UsePageModuleResult => {
  const [state, setState] = useState<PageModuleState>(loadingState)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setState(loadingState)

    importer()
      .then((module) => {
        if (active) {
          setState({ status: 'ready', Component: module.default })
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: 'error', Component: null })
        }
      })

    return () => {
      active = false
    }
  }, [importer, attempt])

  const retry = useCallback(() => {
    setAttempt((current) => current + 1)
  }, [])

  return { status: state.status, Component: state.Component, retry }
}
