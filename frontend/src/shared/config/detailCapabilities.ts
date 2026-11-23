import type { AppConfig } from './env'

export interface DetailCapabilities {
  readonly trailer: boolean
  readonly availability: boolean
}

export const DETAIL_CAPABILITIES: DetailCapabilities = Object.freeze({
  trailer: false,
  availability: false,
})

export const resolveDetailCapabilities = (config: AppConfig): DetailCapabilities =>
  Object.freeze({
    trailer: DETAIL_CAPABILITIES.trailer,
    availability: config.availabilityEnabled,
  })
