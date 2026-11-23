import { useState } from 'react'
import { RouterProvider } from 'react-router'

import { DocumentTitleProvider } from '@/shared/lib/documentTitle'

import { createAppRouter } from './routing/routes'
import { QueryClientProvider } from './providers/QueryClientProvider'

export const App = () => {
  const [router] = useState(createAppRouter)

  return (
    <QueryClientProvider>
      <DocumentTitleProvider>
        <RouterProvider router={router} />
      </DocumentTitleProvider>
    </QueryClientProvider>
  )
}
