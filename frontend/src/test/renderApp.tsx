import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { appRouteObjects } from '@/app/routing/routes'
import { QueryClientProvider, createQueryClient } from '@/app/providers/QueryClientProvider'

export const renderApp = (initialEntries: string[] = ['/']) => {
  const router = createMemoryRouter(appRouteObjects, { initialEntries })
  const queryClient = createQueryClient()
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return { router, queryClient, ...result }
}
