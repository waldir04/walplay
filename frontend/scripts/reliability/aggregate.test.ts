import { describe, expect, it } from 'vitest'

import { aggregateReliability, createTestId, median, percentile } from './aggregate'
import type { RunInput, TestResultInput } from './aggregate'

const passed = (fullName: string, durationMs = 5): TestResultInput => ({
  file: 'src/example.test.ts',
  fullName,
  status: 'passed',
  durationMs,
})

const failed = (fullName: string, durationMs = 5): TestResultInput => ({
  file: 'src/example.test.ts',
  fullName,
  status: 'failed',
  durationMs,
})

const skipped = (fullName: string, durationMs = 0): TestResultInput => ({
  file: 'src/example.test.ts',
  fullName,
  status: 'skipped',
  durationMs,
})

const buildRun = (overrides: Partial<RunInput> = {}): RunInput => ({
  index: 1,
  seed: 1,
  status: 'passed',
  durationMs: 100,
  tests: [],
  ...overrides,
})

describe('createTestId', () => {
  it('combines the file and the full test name', () => {
    expect(createTestId('src/example.test.ts', 'renders a label')).toBe(
      'src/example.test.ts::renders a label'
    )
  })
})

describe('median and percentile', () => {
  it('returns zero for an empty list', () => {
    expect(median([])).toBe(0)
    expect(percentile([], 0.95)).toBe(0)
  })

  it('computes the median for odd and even list lengths', () => {
    expect(median([30, 10, 20])).toBe(20)
    expect(median([10, 20, 30, 40])).toBe(25)
  })

  it('computes the nearest-rank p95 and clamps the fraction', () => {
    expect(percentile([10, 20, 30, 40], 0.95)).toBe(40)
    expect(percentile([10, 20, 30, 40], 1)).toBe(40)
    expect(percentile([10, 20, 30, 40], 0)).toBe(10)
    expect(percentile([10, 20, 30, 40], 2)).toBe(40)
  })
})

describe('aggregateReliability', () => {
  it('reports a passed-only suite with stable outcomes and duration statistics', () => {
    const runs = [
      buildRun({ index: 1, seed: 11, durationMs: 100, tests: [passed('a'), passed('b')] }),
      buildRun({ index: 2, seed: 22, durationMs: 140, tests: [passed('b'), passed('a')] }),
      buildRun({ index: 3, seed: 33, durationMs: 120, tests: [passed('a'), passed('b')] }),
    ]

    const result = aggregateReliability(runs)

    expect(result.tests).toHaveLength(2)
    expect(result.tests.every((test) => test.flaky === false)).toBe(true)
    expect(result.summary).toEqual({
      runCount: 3,
      testCount: 2,
      passedRuns: 3,
      failedRuns: 0,
      flakyTests: [],
      skippedTests: [],
      medianDurationMs: 120,
      p95DurationMs: 140,
    })
  })

  it('reports a consistently failing suite without labeling it flaky', () => {
    const runs = [
      buildRun({ index: 1, seed: 11, status: 'failed', tests: [failed('a')] }),
      buildRun({ index: 2, seed: 22, status: 'failed', tests: [failed('a')] }),
    ]

    const result = aggregateReliability(runs)

    expect(result.summary.failedRuns).toBe(2)
    expect(result.summary.passedRuns).toBe(0)
    expect(result.summary.flakyTests).toEqual([])
    expect(result.tests[0]?.outcomes).toEqual(['failed', 'failed'])
  })

  it('flags mixed outcomes as flaky and attributes the failing seeds', () => {
    const runs = [
      buildRun({ index: 1, seed: 101, status: 'passed', tests: [passed('order dependent')] }),
      buildRun({ index: 2, seed: 202, status: 'failed', tests: [failed('order dependent')] }),
      buildRun({ index: 3, seed: 303, status: 'passed', tests: [passed('order dependent')] }),
      buildRun({ index: 4, seed: 404, status: 'failed', tests: [failed('order dependent')] }),
    ]

    const result = aggregateReliability(runs)

    expect(result.summary.flakyTests).toEqual(['src/example.test.ts::order dependent'])
    expect(result.summary.failedRuns).toBe(2)
    expect(result.tests[0]?.flaky).toBe(true)
    expect(result.tests[0]?.outcomes).toEqual(['passed', 'failed', 'passed', 'failed'])
    expect(result.tests[0]?.failedSeeds).toEqual([202, 404])
  })

  it('lists skipped tests separately and treats a consistent skip as non-flaky', () => {
    const runs = [
      buildRun({
        index: 1,
        seed: null,
        tests: [skipped('quarantined candidate'), passed('healthy')],
      }),
      buildRun({
        index: 2,
        seed: null,
        tests: [skipped('quarantined candidate'), passed('healthy')],
      }),
    ]

    const result = aggregateReliability(runs)

    expect(result.summary.skippedTests).toEqual(['src/example.test.ts::quarantined candidate'])
    expect(result.summary.flakyTests).toEqual([])
    expect(result.tests.find((test) => test.fullName === 'healthy')?.flaky).toBe(false)
  })

  it('treats a skip that becomes a pass as flaky', () => {
    const runs = [
      buildRun({ index: 1, seed: 11, tests: [skipped('intermittent')] }),
      buildRun({ index: 2, seed: 22, tests: [passed('intermittent')] }),
    ]

    const result = aggregateReliability(runs)

    expect(result.summary.flakyTests).toEqual(['src/example.test.ts::intermittent'])
    expect(result.summary.skippedTests).toEqual(['src/example.test.ts::intermittent'])
  })

  it('returns an empty, zero-valued summary for no runs', () => {
    const result = aggregateReliability([])

    expect(result.tests).toEqual([])
    expect(result.summary).toEqual({
      runCount: 0,
      testCount: 0,
      passedRuns: 0,
      failedRuns: 0,
      flakyTests: [],
      skippedTests: [],
      medianDurationMs: 0,
      p95DurationMs: 0,
    })
  })
})
