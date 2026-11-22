import { createBrowserRouter, Navigate } from 'react-router'
import type { RouteObject } from 'react-router'

import { APP_ROUTES, CATALOG_ROUTE_TITLES } from '@/shared/config/routes'
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
  browse: () => import('@/pages/browse'),
  'catalog-category': () => import('@/pages/catalog-category'),
  'title-detail': () => import('@/pages/title-detail'),
  'catalog-not-found': () => import('@/pages/catalog-not-found'),
  search: () => import('@/pages/search'),
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

const catalogRoute = (kind: PageKind, path: string, titleKey: string): RouteObject => ({
  path,
  element: <RouteContent importer={pageImporters[kind]} />,
  handle: { titleKey },
})

const landingRoutes = ['browse/movies', 'browse/tv-shows'].map((path) =>
  catalogRoute('browse', path, CATALOG_ROUTE_TITLES.browse)
)

const categoryRoutes = [
  'browse/movies/popular',
  'browse/movies/top-rated',
  'browse/tv-shows/popular',
  'browse/tv-shows/top-rated',
].map((path) => catalogRoute('catalog-category', path, CATALOG_ROUTE_TITLES.category))

const detailRoutes = ['browse/movies/title/:itemId', 'browse/tv-shows/title/:itemId'].map((path) =>
  catalogRoute('title-detail', path, CATALOG_ROUTE_TITLES.detail)
)

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
          {
            path: 'browse',
            element: <Navigate to="/browse/movies" replace />,
          },
          ...landingRoutes,
          ...categoryRoutes,
          ...detailRoutes,
          contentRoute('search', 'search'),
          catalogRoute('catalog-not-found', 'browse/*', CATALOG_ROUTE_TITLES.notFound),
          contentRoute('not-found', '*'),
        ],
      },
    ],
  },
]

export const createAppRouter = () => createBrowserRouter(appRouteObjects)
