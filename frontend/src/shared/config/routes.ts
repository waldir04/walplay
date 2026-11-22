export type PageKind =
  | 'home'
  | 'settings'
  | 'not-found'
  | 'browse'
  | 'catalog-category'
  | 'title-detail'
  | 'catalog-not-found'

export interface AppRoute {
  readonly path: string
  readonly kind: PageKind
  readonly navigable: boolean
  readonly isDefault: boolean
  readonly titleKey: string
  readonly navigationLabelKey: string | null
  readonly loadsOnDemand: boolean
  readonly matchPrefix?: string
}

export const APP_ROUTES: readonly AppRoute[] = [
  {
    path: '/',
    kind: 'home',
    navigable: true,
    isDefault: true,
    titleKey: 'meta.title.home',
    navigationLabelKey: 'navigation.home',
    loadsOnDemand: true,
  },
  {
    path: '/browse',
    kind: 'browse',
    navigable: true,
    isDefault: false,
    titleKey: 'meta.title.browse',
    navigationLabelKey: 'navigation.browse',
    loadsOnDemand: true,
    matchPrefix: '/browse/',
  },
  {
    path: '/settings',
    kind: 'settings',
    navigable: true,
    isDefault: false,
    titleKey: 'meta.title.settings',
    navigationLabelKey: 'navigation.settings',
    loadsOnDemand: true,
  },
  {
    path: '*',
    kind: 'not-found',
    navigable: false,
    isDefault: false,
    titleKey: 'meta.title.notFound',
    navigationLabelKey: null,
    loadsOnDemand: true,
  },
]

export const navigableRoutes: readonly AppRoute[] = APP_ROUTES.filter((route) => route.navigable)

export const CATALOG_ROUTE_TITLES = Object.freeze({
  browse: 'meta.title.browse',
  category: 'meta.title.catalogCategory',
  detail: 'meta.title.titleDetail',
  notFound: 'meta.title.catalogNotFound',
})
