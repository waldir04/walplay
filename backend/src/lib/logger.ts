export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogOutcome = 'success' | 'failure' | 'stale'

export interface LogFields {
  readonly requestId?: string
  readonly provider?: string
  readonly route?: string
  readonly mediaType?: string
  readonly section?: string
  readonly language?: string
  readonly page?: number
  readonly durationMs?: number
  readonly outcome?: LogOutcome
  readonly statusClass?: '2xx' | '4xx' | '5xx'
}

export interface Logger {
  readonly log: (level: LogLevel, fields: LogFields) => void
  readonly debug: (fields: LogFields) => void
  readonly info: (fields: LogFields) => void
  readonly warn: (fields: LogFields) => void
  readonly error: (fields: LogFields) => void
}

const LEVEL_WEIGHT: Readonly<Record<LogLevel, number>> = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
})

const ALLOWED_KEYS: ReadonlySet<keyof LogFields> = new Set<keyof LogFields>([
  'requestId',
  'provider',
  'route',
  'mediaType',
  'section',
  'language',
  'page',
  'durationMs',
  'outcome',
  'statusClass',
])

export type LogSink = (line: string) => void

const pickSafeFields = (fields: LogFields): Record<string, unknown> => {
  const result: Record<string, unknown> = {}
  for (const key of ALLOWED_KEYS) {
    const value = fields[key]
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}

export const createLogger = (
  level: LogLevel = 'info',
  sink: LogSink = (line) => process.stdout.write(`${line}\n`)
): Logger => {
  const log = (entryLevel: LogLevel, fields: LogFields): void => {
    if (LEVEL_WEIGHT[entryLevel] < LEVEL_WEIGHT[level]) {
      return
    }
    const payload = { level: entryLevel, ...pickSafeFields(fields) }
    sink(JSON.stringify(payload))
  }

  return Object.freeze({
    log,
    debug: (fields: LogFields) => log('debug', fields),
    info: (fields: LogFields) => log('info', fields),
    warn: (fields: LogFields) => log('warn', fields),
    error: (fields: LogFields) => log('error', fields),
  })
}

export const silentLogger: Logger = createLogger('error', () => undefined)
