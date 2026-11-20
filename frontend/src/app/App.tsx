import { useState } from 'react'
import { RouterProvider } from 'react-router'

import { createAppRouter } from './routing/routes'

export const App = () => {
  const [router] = useState(createAppRouter)

  return <RouterProvider router={router} />
}
