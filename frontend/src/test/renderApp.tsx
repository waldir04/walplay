import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { appRouteObjects } from '@/app/routing/routes'

export const renderApp = (initialEntries: string[] = ['/']) => {
  const router = createMemoryRouter(appRouteObjects, { initialEntries })
  const result = render(<RouterProvider router={router} />)
  return { router, ...result }
}
