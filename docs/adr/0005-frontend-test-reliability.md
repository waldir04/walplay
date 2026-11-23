# ADR 0005: Frontend Test Reliability and Performance

- **Status**: Accepted
- **Date**: 2026-11-23
- **Feature**: `005-frontend-test-reliability`
- **Context**: `research.md`, `data-model.md`, and the plan's Complexity Tracking

## Context

The frontend suite ran every file serially through `vitest run --coverage
--no-file-parallelism`. The same 176 files and 691 tests took 111.02 s cold and 113.73 s warm
serially versus 32.30 s with file-level concurrency: file serialization, not test execution,
was the dominant cost. Several tests also depended on real wall-clock waits, and repeated
executions had no way to prove that per-test outcomes were independent of order. The gate
therefore had to become faster without becoming less trustworthy, and any flake had to be
reproducible from recorded evidence.

## Decision

1. **Restore file-level parallelism for the normal test command.** Remove
   `--no-file-parallelism` from `npm run test` and keep Vitest's default per-file isolation and
   default worker selection. No worker-count override is introduced until the CI runner class
   shows a variance that requires one. Isolation, not serialization, is the guarantee.

2. **Harden automatic cleanup instead of disabling isolation.** Add `unstubGlobals: true` and
   `unstubEnvs: true` to `frontend/vitest.config.ts` and keep `restoreMocks: true`. Global and
   environment stubs are now removed automatically, so a missing per-file cleanup cannot leak
   into the next file. Module-level caches such as `src/shared/config/env.ts` are handled with
   `vi.resetModules()` and dynamic imports in the test that exercises them, never by changing
   production modules.

3. **Replace every real-time wait.** Timer-driven behavior uses fake timers with
   `userEvent.setup({ advanceTimers })` and restores real timers in `afterEach`. Promise-ordering
   races use `act` or `waitFor` with microtask flushing. No fixed `setTimeout` wait remains in
   the suite, and no assertion is weakened or timeout raised.

4. **Add a TypeScript reliability runner executed with the existing `vite-node` tooling.**
   `frontend/scripts/reliability/aggregate.ts` is a pure aggregation module; `run.ts` is the CLI.
   The runner invokes the local `frontend/node_modules/.bin/vitest` binary, requests Vitest's
   JSON reporter, validates the parsed output with a small Zod schema, derives one deterministic
   seed per iteration, aggregates per-test outcomes, writes a JSON report, and exits non-zero on
   any failed run, flaky test, or skipped test. `vite-node` is declared explicitly in
   `devDependencies` because it is already installed through Vitest; it is test-only tooling and
   does not enter the production bundle. No new package is added.

5. **Shuffling is confined to reliability runs.** Normal push and pull-request CI keeps a fixed
   order so a pull-request result is reproducible and the gate cost is unchanged. Shuffled
   execution happens only through `npm run test:reliability` or the on-demand CI input.

6. **Flake disposition is fix-or-block.** A mixed per-test outcome across runs must be triaged,
   fixed in its owning test, and re-verified with the recorded seeds. Retry, quarantine, `.skip`,
   and timeout inflation are not valid dispositions because they hide the defect class this
   feature exists to expose. The runner's seed list makes a recurrence reproducible.

7. **Measurement boundary is the test command.** Baseline and post-change durations are measured
   for `npm run test` only, on Node.js 22 from `frontend/.nvmrc`, and compared on the same runner
   class. `npm ci`, lint, typecheck, and build are excluded. The target is the stricter of a 40%
   median reduction and 90 seconds, with p95 within 125% of the median.

8. **On-demand CI entry point.** `.github/workflows/ci.yml` gains a `workflow_dispatch` input
   `frontend_reliability_runs` (default `0`). After the normal test step, the reliability runner
   executes only when the input is greater than zero. The frontend job timeout rises from 15 to
   30 minutes to accommodate a manual 20-iteration request; normal runs are unaffected.

9. **Close the TypeScript strictness gaps in the files this feature touches.**
   `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
   `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax` are enabled in
   `frontend/tsconfig.node.json` and the solution-level `frontend/tsconfig.json`, and
   `scripts/**/*.ts` is included in the node project. The constitution's known-gaps register
   requires a touched area to be brought into compliance rather than extended.

## Rejected Alternatives

- **Keep serial execution** — misses the 40% and 90-second targets by roughly 80 seconds.
- **Shard the suite or add a worker count immediately** — coordination cost or unexplained
  configuration without measurements on the target runner class.
- **`isolate: false` or global `mockReset: true`** — trades real isolation for speed, or forces
  every test to re-establish module mocks, with a blast radius larger than the requirement.
- **Keep short real waits or raise `waitFor` timeouts** — still timing-dependent and explicitly
  prohibited by the requirements.
- **Global fake timers** — interferes with `user-event` and jsdom in integration tests; fake
  timers stay local to the files that need them.
- **JavaScript `runner.mjs`, `tsx`, or `--experimental-strip-types`** — violates the
  TypeScript-everywhere principle, adds a package that duplicates existing tooling, or relies on
  an experimental flag.
- **A third-party flake detector** — a new dependency and configuration for a small,
  well-defined loop that Vitest's own JSON reporter already supports.
- **Run the reliability loop on every pull request or on a schedule** — multiplies gate cost
  without a requirement; the input keeps it on demand.
- **Retry or quarantine** — rejected by the specification; coverage and trust would decline
  silently.
