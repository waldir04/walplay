export type PageKind = 'home' | 'settings' | 'not-found'

export interface AppRoute {
  readonly path: string
  readonly kind: PageKind
  readonly navigable: boolean
  readonly isDefault: boolean
  readonly titleKey: string
  readonly navigationLabelKey: string | null
  readonly loadsOnDemand: boolean
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
