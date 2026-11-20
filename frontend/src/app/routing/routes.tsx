import { createBrowserRouter } from 'react-router'
import type { RouteObject } from 'react-router'

import { APP_ROUTES } from '@/shared/config/routes'
import type { AppRoute, PageKind } from '@/shared/config/routes'

import { AppLayout } from './AppLayout'
import { RouteContent } from './RouteContent'
import { RouteRenderError } from './RouteRenderError'
import type { PageModule } from './usePageModule'

export { APP_ROUTES, navigableRoutes } from '@/shared/config/routes'
export type { AppRoute, PageKind } from '@/shared/config/routes'

export const pageImporters: Record<PageKind, () => Promise<PageModule>> = {
  home: () => import('@/pages/home'),
  settings: () => import('@/pages/settings'),
  'not-found': () => import('@/pages/not-found'),
}

const routeByKind = (kind: PageKind): AppRoute => {
  const route = APP_ROUTES.find((candidate) => candidate.kind === kind)
  if (!route) {
    throw new Error(`Missing route metadata for page kind: ${kind}`)
  }
  return route
}

const contentRoute = (kind: PageKind, path?: string): RouteObject => {
  const route = routeByKind(kind)
  const element = <RouteContent importer={pageImporters[kind]} />
  const shared = {
    element,
    handle: { titleKey: route.titleKey },
  }

  return path === undefined ? { index: true, ...shared } : { path, ...shared }
}

export const appRouteObjects: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        errorElement: <RouteRenderError />,
        children: [
          contentRoute('home'),
          contentRoute('settings', 'settings'),
          contentRoute('not-found', '*'),
        ],
      },
    ],
  },
]

export const createAppRouter = () => createBrowserRouter(appRouteObjects)
