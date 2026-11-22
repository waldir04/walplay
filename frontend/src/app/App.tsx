import { useState } from 'react'
import { RouterProvider } from 'react-router'

import { createAppRouter } from './routing/routes'
import { QueryClientProvider } from './providers/QueryClientProvider'

export const App = () => {
  const [router] = useState(createAppRouter)

  return (
    <QueryClientProvider>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
