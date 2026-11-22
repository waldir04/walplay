import { APP_ROUTES } from '@/shared/config/routes'

export interface NavigationItem {
  readonly to: string
  readonly labelKey: string
  readonly matchPrefix?: string
}

export const navigationItems: readonly NavigationItem[] = APP_ROUTES.filter(
  (route) => route.navigable && route.navigationLabelKey !== null
).map((route) => ({
  to: route.path,
  labelKey: route.navigationLabelKey ?? 'navigation.home',
  ...(route.matchPrefix === undefined ? {} : { matchPrefix: route.matchPrefix }),
}))
