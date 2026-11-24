import { describe, expect, it } from 'vitest'

import { DETAIL_CAPABILITIES, resolveDetailCapabilities } from './detailCapabilities'
import type { AppConfig } from './env'

const config = (overrides: Partial<AppConfig> = {}): AppConfig => ({
  environmentName: 'local',
  applicationVersion: '1.0.0',
  apiBaseUrl: 'http://localhost:4000',
  availabilityEnabled: false,
  trailersEnabled: false,
  ...overrides,
})

describe('detail capabilities', () => {
  it('resolves the trailer capability from validated configuration', () => {
    expect(resolveDetailCapabilities(config({ trailersEnabled: true })).trailer).toBe(true)
    expect(resolveDetailCapabilities(config({ trailersEnabled: false })).trailer).toBe(false)
  })

  it('keeps personal lists enabled by default and availability configuration-driven', () => {
    const resolved = resolveDetailCapabilities(config({ availabilityEnabled: true }))
    expect(resolved).toEqual({
      trailer: false,
      availability: true,
      personalLists: true,
    })
  })

  it('fails closed in the static defaults', () => {
    expect(DETAIL_CAPABILITIES).toEqual({
      trailer: false,
      availability: false,
      personalLists: true,
    })
  })
})
