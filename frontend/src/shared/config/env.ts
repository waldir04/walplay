import { z } from 'zod'

import { DEFAULT_APPLICATION_VERSION } from './constants'

const environmentNameSchema = z.enum(['local', 'development', 'staging', 'production'])
const versionSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/)

export type EnvironmentName = z.infer<typeof environmentNameSchema>

export interface AppConfig {
  readonly environmentName: EnvironmentName
  readonly applicationVersion: string
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

  const frozenWarnings = Object.freeze([...warnings])
  emitWarnings(frozenWarnings)
  const config: AppConfig = Object.freeze({
    environmentName: environmentResult.data,
    applicationVersion,
  })

  return Object.freeze({ status: 'valid', config, warnings: frozenWarnings })
}
