import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative as relativePath, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { z } from 'zod'

import { aggregateReliability, createTestId } from './aggregate'
import type { RunInput, RunStatus, TestResultInput, TestStatus } from './aggregate'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const FRONTEND_ROOT = resolve(SCRIPT_DIR, '../..')
const VITEST_BIN = join(FRONTEND_ROOT, 'node_modules', '.bin', 'vitest')
const DEFAULT_RUNS = 10
const DEFAULT_SEED = 20261123
const DEFAULT_REPORT = 'reliability-report.json'
const SEED_STRIDE = 7919
const MAX_SEED = 2147483647

const reporterStatusSchema = z.enum(['passed', 'failed', 'skipped', 'pending', 'todo', 'disabled'])

const assertionResultSchema = z.object({
  fullName: z.string(),
  status: reporterStatusSchema,
  duration: z.number().nonnegative().nullable().optional(),
})

const fileResultSchema = z.object({
  name: z.string(),
  assertionResults: z.array(assertionResultSchema),
})

const reporterOutputSchema = z.object({
  testResults: z.array(fileResultSchema),
})

type ReporterStatus = z.infer<typeof reporterStatusSchema>

interface RunnerOptions {
  readonly runs: number
  readonly baseSeed: number
  readonly reportPath: string
  readonly shuffle: boolean
  readonly coverage: boolean
}

const STATUS_MAP: Record<ReporterStatus, TestStatus> = {
  passed: 'passed',
  failed: 'failed',
  skipped: 'skipped',
  pending: 'skipped',
  todo: 'skipped',
  disabled: 'skipped',
}

const usage = `Usage: vite-node scripts/reliability/run.ts [options]

Options:
  --runs <n>       Number of iterations (default ${DEFAULT_RUNS}).
  --seed <n>       Base seed for shuffled runs (default ${DEFAULT_SEED}).
  --report <path>  Report path, relative to the working directory (default ${DEFAULT_REPORT}).
  --no-shuffle     Run in fixed order instead of shuffled order.
  --coverage       Enable coverage for every iteration.
`

class RunnerError extends Error {}

const readNumber = (value: string | undefined, flag: string): number => {
  if (value === undefined || value.trim() === '' || !Number.isInteger(Number(value))) {
    throw new RunnerError(`${flag} requires an integer value.`)
  }

  return Number(value)
}

const parseArguments = (argv: readonly string[]): RunnerOptions => {
  if (argv.includes('--help')) {
    process.stdout.write(usage)
    process.exit(0)
  }

  let runs = DEFAULT_RUNS
  let baseSeed = DEFAULT_SEED
  let reportPath = DEFAULT_REPORT
  let shuffle = true
  let coverage = false

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    switch (argument) {
      case '--runs': {
        runs = readNumber(argv[index + 1], '--runs')
        index += 1
        break
      }
      case '--seed': {
        baseSeed = readNumber(argv[index + 1], '--seed')
        index += 1
        break
      }
      case '--report': {
        const value = argv[index + 1]
        if (value === undefined || value.trim() === '') {
          throw new RunnerError('--report requires a path.')
        }
        reportPath = value
        index += 1
        break
      }
      case '--no-shuffle': {
        shuffle = false
        break
      }
      case '--coverage': {
        coverage = true
        break
      }
      default: {
        throw new RunnerError(`Unknown option: ${argument ?? ''}`)
      }
    }
  }

  if (runs < 1) {
    throw new RunnerError('--runs must be at least 1.')
  }

  if (baseSeed < 0) {
    throw new RunnerError('--seed must be non-negative.')
  }

  return { runs, baseSeed, reportPath, shuffle, coverage }
}

const deriveSeed = (baseSeed: number, runIndex: number): number =>
  (baseSeed + runIndex * SEED_STRIDE) % MAX_SEED

const toRelativeFile = (absolutePath: string): string =>
  relativePath(FRONTEND_ROOT, resolve(FRONTEND_ROOT, absolutePath)).split(sep).join('/')

const buildCommand = (options: RunnerOptions): string => {
  const parts = ['vitest run']

  if (options.shuffle) {
    parts.push('--sequence.shuffle.files', '--sequence.shuffle.tests', '--sequence.seed=<derived>')
  }

  if (options.coverage) {
    parts.push('--coverage')
  }

  return parts.join(' ')
}

const parseReporterOutput = (outputFile: string, stderr: string): readonly TestResultInput[] => {
  let raw: string

  try {
    raw = readFileSync(outputFile, 'utf8')
  } catch {
    throw new RunnerError(`Vitest did not write a JSON report at ${outputFile}.\n${stderr}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new RunnerError(`Vitest wrote an unreadable JSON report at ${outputFile}.\n${stderr}`)
  }

  const validation = reporterOutputSchema.safeParse(parsed)
  if (!validation.success) {
    throw new RunnerError(
      `Vitest JSON report failed schema validation: ${validation.error.message}`
    )
  }

  return validation.data.testResults.flatMap((fileResult) =>
    fileResult.assertionResults.map((assertion) => ({
      file: toRelativeFile(fileResult.name),
      fullName: assertion.fullName,
      status: STATUS_MAP[assertion.status],
      durationMs: assertion.duration ?? 0,
    }))
  )
}

const runIteration = (
  options: RunnerOptions,
  runIndex: number,
  seed: number | null,
  temporaryDir: string
): RunInput => {
  const outputFile = join(temporaryDir, `iteration-${runIndex}.json`)
  const args = ['run', '--reporter=default', '--reporter=json', `--outputFile.json=${outputFile}`]

  if (seed !== null) {
    args.push('--sequence.shuffle.files', '--sequence.shuffle.tests', `--sequence.seed=${seed}`)
  }

  if (options.coverage) {
    args.push('--coverage')
  }

  process.stdout.write(
    `Reliability run ${runIndex}/${options.runs}${seed === null ? '' : ` (seed ${seed})`}...\n`
  )

  const startedAt = new Date().toISOString()
  const start = Date.now()
  const result = spawnSync(VITEST_BIN, args, {
    cwd: FRONTEND_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  const durationMs = Date.now() - start
  const tests = parseReporterOutput(outputFile, result.stderr ?? '')
  const status: RunStatus = result.status === 0 ? 'passed' : 'failed'

  if (status === 'failed') {
    process.stderr.write(`Iteration ${runIndex} failed with exit code ${String(result.status)}.\n`)
    process.stderr.write(result.stdout ?? '')
    process.stderr.write(result.stderr ?? '')
  }

  return {
    index: runIndex,
    seed,
    status,
    startedAt,
    durationMs,
    tests,
  }
}

export const main = (argv: readonly string[]): number => {
  let options: RunnerOptions

  try {
    options = parseArguments(argv)
  } catch (error) {
    if (error instanceof RunnerError) {
      process.stderr.write(`${error.message}\n\n${usage}`)
      return 2
    }
    throw error
  }

  const commit = (() => {
    const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: FRONTEND_ROOT, encoding: 'utf8' })
    return result.status === 0 ? (result.stdout ?? '').trim() : 'unknown'
  })()

  const temporaryDir = mkdtempSync(join(tmpdir(), 'walplay-reliability-'))

  try {
    const runs: RunInput[] = []

    for (let runIndex = 1; runIndex <= options.runs; runIndex += 1) {
      const seed = options.shuffle ? deriveSeed(options.baseSeed, runIndex) : null
      runs.push(runIteration(options, runIndex, seed, temporaryDir))
    }

    const { tests, summary } = aggregateReliability(runs)
    const order = options.shuffle ? 'shuffled' : 'fixed'

    const report = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      commit,
      nodeVersion: process.version,
      command: buildCommand(options),
      order,
      baseSeed: options.baseSeed,
      runs,
      tests,
      summary,
    }

    const reportPath = resolve(process.cwd(), options.reportPath)
    mkdirSync(dirname(reportPath), { recursive: true })
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

    process.stdout.write(
      [
        '',
        `Reliability report: ${reportPath}`,
        `Runs: ${summary.runCount} (passed ${summary.passedRuns}, failed ${summary.failedRuns})`,
        `Tests: ${summary.testCount}`,
        `Median duration: ${summary.medianDurationMs} ms`,
        `p95 duration: ${summary.p95DurationMs} ms`,
        `Flaky tests: ${summary.flakyTests.length}`,
        `Skipped tests: ${summary.skippedTests.length}`,
        '',
      ].join('\n')
    )

    for (const run of runs.filter((candidate) => candidate.status === 'failed')) {
      const seedLabel = run.seed === null ? 'fixed order' : `seed ${run.seed}`
      for (const test of run.tests.filter((candidate) => candidate.status === 'failed')) {
        process.stdout.write(
          `Failed (${seedLabel}): ${run.index}/${options.runs} ${createTestId(test.file, test.fullName)}\n`
        )
      }
    }

    for (const test of tests.filter((candidate) => candidate.flaky)) {
      const seeds = test.failedSeeds.length === 0 ? 'fixed order' : test.failedSeeds.join(', ')
      process.stdout.write(`Flaky: ${test.id} (failed seeds: ${seeds})\n`)
    }

    for (const id of summary.skippedTests) {
      process.stdout.write(`Skipped: ${id}\n`)
    }

    const failed =
      summary.failedRuns > 0 || summary.flakyTests.length > 0 || summary.skippedTests.length > 0
    return failed ? 1 : 0
  } finally {
    rmSync(temporaryDir, { recursive: true, force: true })
  }
}

const exitCode = main(process.argv.slice(2))
process.exitCode = exitCode
