export type TestStatus = 'passed' | 'failed' | 'skipped'

export type RunStatus = 'passed' | 'failed'

export interface TestResultInput {
  readonly file: string
  readonly fullName: string
  readonly status: TestStatus
  readonly durationMs: number
}

export interface RunInput {
  readonly index: number
  readonly seed: number | null
  readonly status: RunStatus
  readonly durationMs: number
  readonly startedAt?: string
  readonly tests: readonly TestResultInput[]
}

export interface AggregatedTest {
  readonly id: string
  readonly file: string
  readonly fullName: string
  readonly outcomes: readonly TestStatus[]
  readonly durationsMs: readonly number[]
  readonly failedSeeds: readonly number[]
  readonly flaky: boolean
}

export interface ReliabilitySummary {
  readonly runCount: number
  readonly testCount: number
  readonly passedRuns: number
  readonly failedRuns: number
  readonly flakyTests: readonly string[]
  readonly skippedTests: readonly string[]
  readonly medianDurationMs: number
  readonly p95DurationMs: number
}

export interface ReliabilityAggregate {
  readonly tests: readonly AggregatedTest[]
  readonly summary: ReliabilitySummary
}

export const createTestId = (file: string, fullName: string): string => `${file}::${fullName}`

const sortAscending = (values: readonly number[]): number[] =>
  [...values].sort((left, right) => left - right)

/** Median of the supplied values; returns 0 for an empty list. */
export const median = (values: readonly number[]): number => {
  if (values.length === 0) {
    return 0
  }

  const sorted = sortAscending(values)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0
  }

  const lower = sorted[middle - 1] ?? 0
  const upper = sorted[middle] ?? 0
  return (lower + upper) / 2
}

/** Nearest-rank percentile; returns 0 for an empty list. */
export const percentile = (values: readonly number[], fraction: number): number => {
  if (values.length === 0) {
    return 0
  }

  const clamped = Math.min(1, Math.max(0, fraction))
  const sorted = sortAscending(values)
  const rank = Math.ceil(clamped * sorted.length)
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1))
  return sorted[index] ?? 0
}

interface TestAccumulator {
  readonly file: string
  readonly fullName: string
  readonly outcomes: TestStatus[]
  readonly durationsMs: number[]
  readonly failedSeeds: number[]
}

export const aggregateReliability = (runs: readonly RunInput[]): ReliabilityAggregate => {
  const accumulators = new Map<string, TestAccumulator>()

  for (const run of runs) {
    for (const test of run.tests) {
      const id = createTestId(test.file, test.fullName)
      const existing = accumulators.get(id)
      const accumulator: TestAccumulator = existing ?? {
        file: test.file,
        fullName: test.fullName,
        outcomes: [],
        durationsMs: [],
        failedSeeds: [],
      }

      accumulator.outcomes.push(test.status)
      accumulator.durationsMs.push(test.durationMs)
      if (test.status === 'failed' && run.seed !== null) {
        accumulator.failedSeeds.push(run.seed)
      }

      accumulators.set(id, accumulator)
    }
  }

  const tests: AggregatedTest[] = [...accumulators.entries()].map(([id, accumulator]) => ({
    id,
    file: accumulator.file,
    fullName: accumulator.fullName,
    outcomes: accumulator.outcomes,
    durationsMs: accumulator.durationsMs,
    failedSeeds: accumulator.failedSeeds,
    flaky: new Set(accumulator.outcomes).size > 1,
  }))

  const runDurations = runs.map((run) => run.durationMs)

  return {
    tests,
    summary: {
      runCount: runs.length,
      testCount: tests.length,
      passedRuns: runs.filter((run) => run.status === 'passed').length,
      failedRuns: runs.filter((run) => run.status === 'failed').length,
      flakyTests: tests.filter((test) => test.flaky).map((test) => test.id),
      skippedTests: tests
        .filter((test) => test.outcomes.includes('skipped'))
        .map((test) => test.id),
      medianDurationMs: median(runDurations),
      p95DurationMs: percentile(runDurations, 0.95),
    },
  }
}
