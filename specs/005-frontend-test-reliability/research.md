# Phase 0 Research: Frontend Test Reliability and Performance

**Feature**: `005-frontend-test-reliability`
**Date**: 2026-11-23
**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

## Baseline Measurements

Recorded on the implementation workstation with the current frontend test command (`vitest run --coverage --no-file-parallelism`) and the same 176 files / 691 tests.

| Measurement | Value |
|---|---|
| Test files | 176 |
| Tests | 691 |
| Serial cold run | 111.02 s |
| Serial warm run | 113.73 s |
| File-level concurrency run | 32.30 s |
| Serial run spread | 2.71 s (2.4% of the mean) |
| Aggregate environment setup, serial | 30.94 s |
| Aggregate setup files, serial | 16.06 s |
| Aggregate test execution, serial | 24.88 s |
| Coverage — statements | 97.43% |
| Coverage — branches | 93.81% |
| Coverage — functions | 94.44% |
| Coverage — lines | 97.43% |

The serial baseline was produced on Node.js 24.22.0. CI and the repository pin Node.js 22 through `frontend/.nvmrc`, so the baseline must be repeated on Node.js 22 before final acceptance. Both serial runs and the concurrent run passed all 691 tests with identical coverage.

## Decision 1: Restore file-level parallelism for the frontend test command

**Decision**: Remove `--no-file-parallelism` from the frontend `test` script. Keep Vitest's default file isolation and default worker selection. Do not add a worker-count override in the first change.

**Rationale**: The same suite completed in 32.30 s with file-level concurrency versus 111–114 s serialized, a reduction of about 71%. The per-file isolation default remains enabled, so each test file still receives a fresh environment. The suite already passes in both modes. This is the smallest change that reaches the performance target without touching application code or adding a new execution layer.

**Alternatives considered**:
- **Keep serial execution**: fails the 40% reduction and 90-second targets by a wide margin.
- **Shard the suite**: adds coordination and reporting complexity without evidence that a single runner cannot meet the target.
- **Set a fixed worker count immediately**: adds configuration before measuring the target runner class. Measure first; add a justified cap only if CI variance requires it.
- **Disable isolation for speed**: rejected because it directly conflicts with the isolation requirements and would hide the class of failures this feature exists to prevent.

**Risk**: A real cross-file dependency may surface. The mitigation is to run 10 shuffled seeds and every file in isolation, then fix the leaking test or reset. Reverting to serial execution is not an acceptable fix.

## Decision 2: Harden automatic mock, global, and environment cleanup

**Decision**: Add `unstubGlobals: true` and `unstubEnvs: true` to `frontend/vitest.config.ts`. Keep `restoreMocks: true`. Do not globally enable `mockReset` or disable isolation.

**Rationale**: Vitest 3.2.7 exposes `restoreMocks`, `clearMocks`, `mockReset`, `unstubGlobals`, and `unstubEnvs` as test options. `restoreMocks` already restores spies before each test, but global stubs and environment stubs are only guaranteed to be removed when `unstubGlobals`/`unstubEnvs` are enabled or the test calls the explicit unstub APIs. The suite already uses `vi.stubGlobal` in two files and `vi.stubEnv` in two files; automatic cleanup removes the opportunity for order-dependent leakage.

**Alternatives considered**:
- **Global `mockReset: true`**: resets implementations of module mocks and can force every test to re-establish behavior; broader blast radius than needed.
- **`isolate: false`**: faster but unsafe and contrary to FR-002/FR-003.
- **Per-file cleanup only**: workable today because most files clean up, but it does not prevent future leaks. Keep explicit cleanup where it exists and add the automatic backstop.

**Residual module state**: `src/shared/config/env.ts` caches the parsed configuration in a module-level variable. Only one test file exercises the cache. Where module-level state matters, use `vi.resetModules()` and a dynamic import rather than changing production code.

## Decision 3: Replace real-time waits with controlled timers or deterministic microtasks

**Decision**: Remove all nine fixed wall-clock waits. Use fake timers for timer-driven behavior and deterministic microtask/`act` flushing for promise-ordering tests.

**Rationale**: The current waits are 20 ms, 100 ms (three occurrences), 150 ms (two occurrences), 200 ms, 450 ms, and 0 ms. They make the suite slower and make absence assertions depend on elapsed time. The application's own timer is the 350 ms search settle delay; tests that exercise it can advance fake timers to exactly the boundary. Race tests need controlled promise resolution, not a delay.

**Affected files**:
- `src/pages/search/ui/SearchPage.input.integration.test.tsx`
- `src/app/routing/searchKeyboard.test.tsx`
- `src/widgets/search-results/ui/SearchResults.interimEmpty.test.tsx`
- `src/widgets/search-results/ui/SearchResults.error.test.tsx`
- `src/entities/catalog/api/searchQueries.race.test.ts`
- `src/entities/catalog/api/detailQueries.race.test.ts`

**Alternatives considered**:
- **Keep real waits but shorten them**: still timing-dependent and still fails FR-004.
- **Increase `waitFor` timeouts**: violates FR-014 and hides rather than removes the dependency.
- **Global fake timers**: interferes with user-event and jsdom behavior across integration tests. Enable fake timers only in the tests that need them.

**Implementation note**: When `userEvent` is used with fake timers, pass `advanceTimers` to `userEvent.setup`. Restore real timers in `afterEach` in every file that enables fake timers.

## Decision 4: Align local validation with the pinned Node.js runtime

**Decision**: Run all baseline and validation commands on Node.js 22 from `frontend/.nvmrc`. Document the requirement in `frontend/README.md`. Do not widen or replace the engine range.

**Rationale**: CI already reads `.nvmrc`; the recorded local baseline used Node.js 24.22.0. That is a real local/CI divergence and a plausible source of timing or platform-specific differences. Aligning local execution is the least invasive way to make the comparison valid. No application code or dependency requires a different major version.

**Alternatives considered**:
- **Move CI to Node.js 24**: changes the deployed toolchain for a test-infrastructure feature and is not justified by evidence.
- **Support both majors**: doubles the validation matrix without evidence of a compatibility need.
- **Rely on `engines` alone**: `>=22.12.0` does not enforce the same major version and does not create parity.

## Decision 5: Add a TypeScript reliability runner

**Decision**: Add `frontend/scripts/reliability/run.ts`, backed by a pure `aggregate.ts` module and an `aggregate.test.ts` unit test under the existing jsdom setup. Execute the runner with the already-installed `vite-node` 3.2.4 tooling, declared explicitly as a test-only dev dependency. The runner executes Vitest repeatedly with deterministic shuffled seeds, validates and parses Vitest's JSON reporter output, aggregates per-test outcomes, writes a report, and exits non-zero on any flake, failed run, or skipped test.

**Rationale**: The spec requires a repeatable flake detector, deterministic seeds, and actionable diagnostics. Constitution Principle II requires TypeScript throughout the frontend, so the tooling must not be JavaScript. `vite-node` is already present in the Vitest dependency tree, so declaring it explicitly adds no new package, no production bundle impact, and no second test framework. Deterministic seeds make a reported failure reproducible. The pure aggregation function can be tested directly, which is important because the flake verdict is the feature's acceptance signal.

**Runner contract**:
- `--runs <n>`: number of iterations, default 10.
- `--seed <n>`: base seed, default a fixed value recorded in the report.
- `--report <path>`: report path, default `reliability-report.json`.
- `--no-shuffle`: fixed-order baseline mode.
- `--coverage`: enable coverage for baseline runs; off by default for reliability runs.
- Each iteration uses `--sequence.shuffle.files --sequence.shuffle.tests --sequence.seed=<derived seed>` unless `--no-shuffle` is set.
- Invoke the local `frontend/node_modules/.bin/vitest` binary rather than `npx`, so the runner cannot reach the network.
- Validate the parsed reporter output before aggregation.
- Exit code 1 on any mixed-outcome test, any failed run, or any skipped test; exit code 0 only when every iteration passes and every test has a consistent, non-skipped outcome.

**Alternatives considered**:
- **JavaScript `.mjs` runner**: rejected because Principle II requires TypeScript throughout the frontend; JSDoc checking is not TypeScript.
- **Add `tsx`**: adds a package and duplicates tooling already provided through the Vitest/Vite stack.
- **Node.js `--experimental-strip-types`**: avoids a dependency but relies on an experimental flag and can emit warnings; less maintainable than the existing Vite tooling.
- **Add a third-party flake detector**: new dependency and configuration for a small, well-defined loop.
- **Rely on manual reruns only**: does not provide deterministic seeds, per-test aggregation, or a machine-checkable failure signal.
- **Run unbounded repetitions in one process**: loses process isolation and makes the result depend on accumulated state.

**Tooling choice**: Write the runner as `.ts`, include `frontend/scripts/**/*.ts` in `tsconfig.node.json`, and execute it with the existing `vite-node` binary. Add `vite-node` to `frontend/devDependencies` so the binary is explicit rather than an undeclared transitive dependency. No `allowJs` or `checkJs` compromise is needed. The aggregation test stays under the default jsdom environment because `frontend/src/test/setup.ts` assumes a DOM; adding a separate Node-environment project would duplicate setup and provide no meaningful benefit for pure aggregation.

## Decision 6: Add an on-demand CI reliability entry point

**Decision**: Add a `workflow_dispatch` input to `.github/workflows/ci.yml` for the number of frontend reliability runs (default `0`). After the normal frontend test step, run the reliability script only when the input is greater than zero. Keep the normal push/pull-request path, fixed order, and coverage step unchanged.

**Rationale**: The spec's accepted evidence method is on-demand repeated CI runs on the feature commit. The existing workflow has no manual trigger and no way to request shuffled repetitions. A single boolean/number input is the smallest change that enables the evidence without adding cost to normal pull requests. A schedule is optional in the spec and is not required for initial acceptance.

**Alternatives considered**:
- **Separate reliability workflow**: more duplication of checkout, Node setup, and install; no benefit for a small input.
- **Run 20 iterations on every pull request**: violates the accepted flake-detection cost assumption.
- **Manual GitHub re-runs only**: cannot request shuffled order or select a seed.

**Operational note**: Raise the frontend job timeout cap to 30 minutes so a manual 20-run request can complete. This does not change normal-run duration or failure behavior.

## Decision 7: Measure before and after on the same runner class

**Decision**: Capture 10 pre-change runs of the existing test command on Node.js 22, both locally and through the on-demand CI entry point, before removing `--no-file-parallelism`. Capture 10 post-change runs the same way. Report median, p95, coverage, and test count.

**Rationale**: The spec requires the stricter of a 40% reduction and a 90-second median against the CI baseline. Local results are evidence of the bottleneck but cannot stand in for the CI runner class. Capturing the baseline before changing the test script avoids comparing against an already-improved command.

**Alternatives considered**:
- **Use the local baseline as the final baseline**: permitted only as a proxy when CI cannot be recorded; weaker evidence.
- **Compare only the fastest run**: hides variance and does not satisfy the predictability criterion.
- **Measure the whole frontend job**: includes installation, lint, typecheck, and build, which the spec explicitly excludes from the test-step target.

## Decision 8: Keep quality guardrails unchanged

**Decision**: Do not add retries, per-test timeout increases, warning suppression, `.skip`, or quarantine. Do not change production source or production dependencies. Keep the existing coverage thresholds and zero-warning setup.

**Rationale**: The feature exists to make the gate trustworthy. Retries and quarantine would mask the defect class under investigation; suppressing warnings would violate Principle VIII. The existing setup already throws on unexpected warnings, unhandled rejections, and console output, which is the correct enforcement mechanism.

**Alternatives considered**:
- **Automatic retry for flaky tests**: rejected by the accepted clarification and FR-018.
- **Quarantine with a tracking issue**: rejected by the accepted clarification; coverage would silently decline.
- **Raise `testTimeout` globally**: rejected by FR-014 and would only mask slow, uncontrolled waits.

## Decision 9: Record the strategy in an ADR and update operator docs

**Decision**: Add `docs/adr/0005-frontend-test-reliability.md`, update `docs/ci.md`, and update `frontend/README.md`.

**Rationale**: The change alters test-execution configuration and adds an operator-facing CI input. The constitution requires documentation or an ADR when configuration or behavior changes. The ADR captures the parallel-execution decision, the shuffle-only-in-reliability policy, the flake disposition, and the rejected alternatives.

## Decision 10: Close the TypeScript strictness gaps while touching them

**Decision**: Enable `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, and `verbatimModuleSyntax` in `frontend/tsconfig.node.json` and the solution-level `frontend/tsconfig.json` when adding the scripts include. Fix any resulting errors in `vite.config.ts`, `vitest.config.ts`, or the new scripts without suppressions.

**Rationale**: Constitution Principle II requires those settings in every TypeScript project, including the solution-level configuration. The constitution's Known-gaps register requires a tracked gap to be closed when the affected area is touched. This feature already edits `frontend/tsconfig.node.json`, so leaving the settings out would knowingly extend a constitutional violation.

**Alternatives considered**:
- **Create a separate strict tsconfig only for scripts**: duplicates configuration and leaves the existing node and solution projects non-compliant.
- **Use `allowJs`/`checkJs` for a JavaScript runner**: does not satisfy "TypeScript MUST be used throughout".
- **Suppress resulting errors**: prohibited by the constitution and the zero-warning policy.
- **Leave the gap for a later change**: violates the Known-gaps rule because this feature touches the file.

## Resolved Unknowns

| Unknown | Resolution |
|---|---|
| Primary cause of long execution time | File serialization: 111–114 s serial versus 32.30 s concurrent for the same suite. |
| Whether the suite is safe under file concurrency | All 691 tests pass and coverage is identical in the concurrent run; final proof still requires 10 shuffled seeds and isolated-file runs. |
| Whether MSW or another interception layer is required | No shared interception layer exists; network dependencies are mocked at the client boundary. No new layer is presumed. |
| Which runtime to standardize on | Node.js 22, already pinned by `frontend/.nvmrc` and used by CI. |
| How to execute shuffled order | Vitest 3.2.7 supports `--sequence.shuffle.files`, `--sequence.shuffle.tests`, and `--sequence.seed`; confirmed against the installed CLI. |
| How to guarantee stub cleanup | Vitest 3.2.7 supports `unstubGlobals` and `unstubEnvs`; confirmed against the installed type definitions. |
| How to produce machine-readable per-test outcomes | Vitest's `json` reporter with `--outputFile`; confirmed in the installed CLI help. |
| How to execute TypeScript tooling without a new package | `vite-node` 3.2.4 is already installed through Vitest; declare it explicitly as test-only dev tooling and run the `.ts` scripts with it. |
| How to close the existing TypeScript strictness gaps | Enable the constitution-required options in `tsconfig.node.json` and the solution-level `tsconfig.json`, then fix the resulting config errors without suppression. |
| How to gather 20 CI runs | A `workflow_dispatch` input on the existing CI workflow, with normal runs at zero reliability iterations. |
