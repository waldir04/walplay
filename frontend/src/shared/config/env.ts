import { z } from 'zod'

import { DEFAULT_API_BASE_URL, DEFAULT_APPLICATION_VERSION } from './constants'

const environmentNameSchema = z.enum(['local', 'development', 'staging', 'production'])
const versionSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/)
const apiBaseUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }, 'must be an http(s) URL')

export type EnvironmentName = z.infer<typeof environmentNameSchema>

export interface AppConfig {
  readonly environmentName: EnvironmentName
  readonly applicationVersion: string
  readonly apiBaseUrl: string
  readonly availabilityEnabled: boolean
  readonly trailersEnabled: boolean
  readonly recommendationsEnabled: boolean
}

export type ConfigResult =
  | { readonly status: 'valid'; readonly config: AppConfig; readonly warnings: readonly string[] }
  | { readonly status: 'invalid-required'; readonly warnings: readonly string[] }

export interface EnvSource {
  readonly [key: string]: unknown
}

const REQUIRED_WARNING =
  'VITE_APP_ENV is required and must be one of: local, development, staging, production.'
const OPTIONAL_MISSING_WARNING = 'VITE_APP_VERSION is not set; applying the default version.'
const OPTIONAL_INVALID_WARNING = 'VITE_APP_VERSION is invalid; applying the default version.'
const API_BASE_URL_MISSING_WARNING =
  'VITE_API_BASE_URL is not set; applying the local development default.'
const API_BASE_URL_REQUIRED_WARNING =
  'VITE_API_BASE_URL is required in production and must be a valid http(s) URL.'
const API_BASE_URL_INVALID_WARNING = 'VITE_API_BASE_URL is invalid and must be a valid http(s) URL.'
const AVAILABILITY_ENABLED_INVALID_WARNING =
  'VITE_AVAILABILITY_ENABLED is invalid and must be true or false; availability is disabled.'
const TRAILERS_ENABLED_INVALID_WARNING =
  'VITE_TRAILERS_ENABLED is invalid and must be true or false; trailers are disabled.'
const RECOMMENDATIONS_ENABLED_INVALID_WARNING =
  'VITE_RECOMMENDATIONS_ENABLED is invalid and must be true or false; recommendations are disabled.'

const emitWarnings = (warnings: readonly string[]): void => {
  warnings.forEach((warning) => {
    console.warn(`[walplay:config] ${warning}`)
  })
}

export const parseConfig = (source: EnvSource = import.meta.env): ConfigResult => {
  const warnings: string[] = []
  const environmentResult = environmentNameSchema.safeParse(source.VITE_APP_ENV)

  if (!environmentResult.success) {
    warnings.push(REQUIRED_WARNING)
    const frozenWarnings = Object.freeze([...warnings])
    emitWarnings(frozenWarnings)
    return Object.freeze({ status: 'invalid-required', warnings: frozenWarnings })
  }

  const rawVersion = source.VITE_APP_VERSION
  let applicationVersion = DEFAULT_APPLICATION_VERSION

  if (rawVersion === undefined || rawVersion === null || rawVersion === '') {
    warnings.push(OPTIONAL_MISSING_WARNING)
  } else {
    const versionResult = versionSchema.safeParse(rawVersion)
    if (versionResult.success) {
      applicationVersion = versionResult.data
    } else {
      warnings.push(OPTIONAL_INVALID_WARNING)
    }
  }

  const rawApiBaseUrl = source.VITE_API_BASE_URL
  let apiBaseUrl = DEFAULT_API_BASE_URL

  if (rawApiBaseUrl === undefined || rawApiBaseUrl === null || rawApiBaseUrl === '') {
    if (environmentResult.data === 'production') {
      warnings.push(API_BASE_URL_REQUIRED_WARNING)
      const frozenWarnings = Object.freeze([...warnings])
      emitWarnings(frozenWarnings)
      return Object.freeze({ status: 'invalid-required', warnings: frozenWarnings })
    }
    warnings.push(API_BASE_URL_MISSING_WARNING)
  } else {
    const apiResult = apiBaseUrlSchema.safeParse(rawApiBaseUrl)
    if (!apiResult.success) {
      warnings.push(API_BASE_URL_INVALID_WARNING)
      const frozenWarnings = Object.freeze([...warnings])
      emitWarnings(frozenWarnings)
      return Object.freeze({ status: 'invalid-required', warnings: frozenWarnings })
    }
    apiBaseUrl = apiResult.data.replace(/\/+$/, '')
  }

  const rawAvailabilityEnabled = source.VITE_AVAILABILITY_ENABLED
  let availabilityEnabled = false
  if (
    rawAvailabilityEnabled !== undefined &&
    rawAvailabilityEnabled !== null &&
    rawAvailabilityEnabled !== ''
  ) {
    const normalizedAvailability = String(rawAvailabilityEnabled).trim().toLowerCase()
    if (normalizedAvailability === 'true') {
      availabilityEnabled = true
    } else if (normalizedAvailability !== 'false') {
      warnings.push(AVAILABILITY_ENABLED_INVALID_WARNING)
    }
  }

  const rawTrailersEnabled = source.VITE_TRAILERS_ENABLED
  let trailersEnabled = false
  if (
    rawTrailersEnabled !== undefined &&
    rawTrailersEnabled !== null &&
    rawTrailersEnabled !== ''
  ) {
    const normalizedTrailers = String(rawTrailersEnabled).trim().toLowerCase()
    if (normalizedTrailers === 'true') {
      trailersEnabled = true
    } else if (normalizedTrailers !== 'false') {
      warnings.push(TRAILERS_ENABLED_INVALID_WARNING)
    }
  }

  const rawRecommendationsEnabled = source.VITE_RECOMMENDATIONS_ENABLED
  let recommendationsEnabled = false
  if (
    rawRecommendationsEnabled !== undefined &&
    rawRecommendationsEnabled !== null &&
    rawRecommendationsEnabled !== ''
  ) {
    const normalizedRecommendations = String(rawRecommendationsEnabled).trim().toLowerCase()
    if (normalizedRecommendations === 'true') {
      recommendationsEnabled = true
    } else if (normalizedRecommendations !== 'false') {
      warnings.push(RECOMMENDATIONS_ENABLED_INVALID_WARNING)
    }
  }

  const frozenWarnings = Object.freeze([...warnings])
  emitWarnings(frozenWarnings)
  const config: AppConfig = Object.freeze({
    environmentName: environmentResult.data,
    applicationVersion,
    apiBaseUrl,
    availabilityEnabled,
    trailersEnabled,
    recommendationsEnabled,
  })

  return Object.freeze({ status: 'valid', config, warnings: frozenWarnings })
}

let cachedConfig: AppConfig | null = null

export const getAppConfig = (): AppConfig => {
  if (cachedConfig !== null) {
    return cachedConfig
  }
  const result = parseConfig()
  if (result.status !== 'valid') {
    throw new Error('The application configuration is invalid.')
  }
  cachedConfig = result.config
  return cachedConfig
}

export const getApiBaseUrl = (): string => getAppConfig().apiBaseUrl
