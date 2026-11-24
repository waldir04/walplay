import type { AppConfig } from './env'

export interface DetailCapabilities {
  readonly trailer: boolean
  readonly availability: boolean
  readonly personalLists: boolean
}

export const DETAIL_CAPABILITIES: DetailCapabilities = Object.freeze({
  trailer: false,
  availability: false,
  personalLists: true,
})

export const resolveDetailCapabilities = (config: AppConfig): DetailCapabilities =>
  Object.freeze({
    trailer: config.trailersEnabled,
    availability: config.availabilityEnabled,
    personalLists: true,
  })
