import { describe, expect, it, vi } from 'vitest'

import { createLogger } from './logger.js'

describe('logger', () => {
  it('emits field-only structured lines', () => {
    const lines: string[] = []
    const logger = createLogger('debug', (line) => lines.push(line))

    logger.info({
      requestId: 'req-1',
      route: '/api/catalog',
      outcome: 'success',
      statusClass: '2xx',
    })

    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0] ?? '{}')).toEqual({
      level: 'info',
      requestId: 'req-1',
      route: '/api/catalog',
      outcome: 'success',
      statusClass: '2xx',
    })
  })

  it('omits sensitive or unexpected fields', () => {
    const lines: string[] = []
    const logger = createLogger('debug', (line) => lines.push(line))

    const sensitive = {
      requestId: 'req-2',
      provider: 'tmdb',
      token: 'secret-token',
      title: 'Fight Club',
      payload: { results: [] },
      errorBody: 'provider exploded',
      authorization: 'Bearer secret',
    }

    logger.error(sensitive)

    const serialized = lines.join(' ')
    expect(serialized).not.toContain('secret-token')
    expect(serialized).not.toContain('Fight Club')
    expect(serialized).not.toContain('provider exploded')
    expect(serialized).not.toContain('Bearer')
    expect(serialized).toContain('"requestId":"req-2"')
  })

  it('applies the configured level threshold', () => {
    const sink = vi.fn()
    const logger = createLogger('warn', sink)

    logger.debug({ requestId: 'a' })
    logger.info({ requestId: 'b' })
    logger.warn({ requestId: 'c' })
    logger.error({ requestId: 'd' })

    expect(sink).toHaveBeenCalledTimes(2)
  })
})
