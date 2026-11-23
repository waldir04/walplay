import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { appRouteObjects } from '@/app/routing/routes'
import { QueryClientProvider, createQueryClient } from '@/app/providers/QueryClientProvider'
import { DocumentTitleProvider } from '@/shared/lib/documentTitle'

export const renderApp = (initialEntries: string[] = ['/']) => {
  const router = createMemoryRouter(appRouteObjects, { initialEntries })
  const queryClient = createQueryClient()
  const result = render(
    <QueryClientProvider client={queryClient}>
      <DocumentTitleProvider>
        <RouterProvider router={router} />
      </DocumentTitleProvider>
    </QueryClientProvider>
  )
  return { router, queryClient, ...result }
}
