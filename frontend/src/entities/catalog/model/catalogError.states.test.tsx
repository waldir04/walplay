import { afterAll, describe, expect, it } from 'vitest'

import { i18n } from '@/app/i18n'
import { ERROR_CODE_TO_STATE, STATE_COPY_KEYS, stateForErrorCode } from '@/entities/catalog'

const states = [...new Set(Object.values(ERROR_CODE_TO_STATE))]

describe('localized catalog error states', () => {
  it('maps every code to calm, non-technical English copy', () => {
    for (const state of states) {
      const copy = STATE_COPY_KEYS[state]
      const title = i18n.t(copy.title)
      const description = i18n.t(copy.description)
      expect(title).not.toBe(copy.title)
      expect(description).not.toBe(copy.description)
      expect(`${title} ${description}`).not.toMatch(/\b(?:429|502|504|TMDB_|stack)\b/)
    }
  })

  it('provides translated copy for Spanish', async () => {
    await i18n.changeLanguage('es')
    for (const state of states) {
      const copy = STATE_COPY_KEYS[state]
      const title = i18n.t(copy.title)
      expect(title).not.toBe(copy.title)
      expect(title).not.toMatch(/\b(?:429|502|504)\b/)
    }
  })

  it('uses distinct copy for not-found, rate-limited, and timeout states', () => {
    expect(stateForErrorCode('CATALOG_NOT_FOUND')).toBe('not-found')
    expect(stateForErrorCode('CATALOG_RATE_LIMITED')).toBe('rate-limited')
    expect(stateForErrorCode('CATALOG_TIMEOUT')).toBe('timed-out')
    const titles = states.map((state) => STATE_COPY_KEYS[state].title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})

afterAll(async () => {
  await i18n.changeLanguage('en')
})
