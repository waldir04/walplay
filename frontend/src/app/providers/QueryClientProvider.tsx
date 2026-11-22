import {
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'

export const CATALOG_STALE_TIME_MS = 5 * 60 * 1000
export const CATALOG_GC_TIME_MS = 30 * 60 * 1000

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: CATALOG_STALE_TIME_MS,
        gcTime: CATALOG_GC_TIME_MS,
        refetchOnWindowFocus: false,
      },
    },
  })

export interface QueryClientProviderProps {
  readonly children: ReactNode
  readonly client?: QueryClient
}

export const QueryClientProvider = ({ children, client }: QueryClientProviderProps) => {
  const [ownedClient] = useState(() => client ?? createQueryClient())
  return <TanStackQueryClientProvider client={ownedClient}>{children}</TanStackQueryClientProvider>
}
