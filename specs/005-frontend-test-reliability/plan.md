# Implementation Plan: Frontend Test Reliability and Performance

**Branch**: `feat/005-frontend-test-reliability` | **Date**: 2026-11-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-frontend-test-reliability/spec.md`

## Summary

Make the frontend suite deterministic and fast without changing application behavior or lowering coverage. The approach is deliberately small:

1. Remove serialized file execution from the frontend test command, based on the measured 111.02–113.73 s serial result versus 32.30 s with file-level concurrency for the same 176 files and 691 tests.
2. Harden per-test isolation with Vitest's per-file isolation, explicit global/environment unstubbing, and targeted fixes where tests depend on module or timer state.
3. Replace the nine remaining real-time waits with controlled timers or deterministic microtask flushing.
4. Align local validation with the pinned Node.js 22 runtime and verify environment, time-zone, and locale independence.
5. Add a TypeScript reliability runner, executed with the existing `vite-node` test tooling, that executes the suite repeatedly with deterministic shuffled seeds, aggregates per-test outcomes, and fails on any flaky result.
6. Add an on-demand CI entry point for reliability runs. Normal pull-request CI keeps its fixed order, current coverage gate, and warning policy.

No production source, product behavior, coverage threshold, or existing assertion is changed.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 22 pinned by `frontend/.nvmrc`, Vite 7

**Primary Dependencies**: Vitest 3.2.7, React Testing Library 16.3, jsdom 26, V8 coverage, and the already-installed `vite-node` 3.2.4 as explicit test-only tooling for running TypeScript scripts. No new package is installed, and no production dependency changes.

**Storage**: No application storage. Reliability and baseline reports are local JSON files; CI may print the summary to the job log.

**Testing**: Vitest unit, component, and route-integration tests. Current suite: 176 files, 691 tests, 97.43% statements/lines, 93.81% branches, 94.44% functions.

**Target Platform**: CI on `ubuntu-latest`, local macOS/Linux; jsdom test environment; browser product code is unchanged.

**Project Type**: Web application monorepo with independent `frontend/` and `backend/` applications. This feature touches `frontend/` test infrastructure, test files, CI documentation, and an on-demand CI trigger only.

**Performance Goals**: The frontend test command median duration must satisfy the stricter of 40% below the recorded pre-change CI baseline and 90 seconds. The 95th-percentile duration must stay within 125% of the median.

**Constraints**:
- Coverage must not fall below the recorded baseline for any global metric; existing 80%/90% thresholds remain mandatory.
- Zero unexpected warnings, zero unhandled rejections, zero React `act()` warnings.
- No application behavior, output, or production dependency changes.
- No quarantine, skip, retry, or timeout inflation to pass.
- Shuffled execution is limited to dedicated reliability runs; normal CI keeps a fixed order.
- Local validation uses the pinned Node.js 22 runtime.
- No new production dependency is added. The existing test-only `vite-node` tooling is declared explicitly; it does not enter the production bundle.

**Scale/Scope**: 176 test files and 691 tests; 20 on-demand CI executions of the frontend test step; 10 shuffled seeds for order-independence evidence.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence / plan alignment |
|---|---|---|
| I. Clean Code, SOLID, Simplicity | Pass | One test-script flag removed, one small TypeScript runner using existing test tooling, no new architecture layer. |
| II. Strict TypeScript and Type Safety | Pass | The runner and aggregation module are TypeScript, executed with the existing `vite-node` tooling and included in `tsconfig.node.json`. T003 also closes the existing strictness gaps in `tsconfig.node.json` and the solution-level `tsconfig.json` by enabling `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, and `verbatimModuleSyntax`; no `any` or suppression is introduced. |
| IV. Frontend Function Syntax: Arrow Functions | Pass | All new test and script functions use arrow functions. |
| VIII. Testing, Quality Assurance, Zero-Warning Policy | Pass | Directly implements deterministic timers, per-test isolation, no real network, no suppressed warnings, no retries, no quarantine. Existing assertion and warning standards remain. |
| IX. Performance and Resource Efficiency | Pass | The change targets a measured bottleneck: file-level serialization costs about 79 s on the recorded baseline. No speculative optimization. |
| XVII. Automated Quality Gates, Git Hooks, and Commit Convention | Pass | `lint`, `typecheck`, `test`, and `build` remain unchanged and mandatory. CI adds an on-demand reliability entry point only; normal PR behavior is unchanged. |
| XVIII. Frontend Server State and Async UX | Pass | No production query, cache, or UI behavior changes. Test query clients keep the existing retry-disabled, isolated configuration. |
| XXI. Technology Stack Governance and Dependency Discipline | Pass | No new dependency; the runner uses Node.js built-ins and Vitest's existing JSON reporter. |

No gate violations. Post-design re-check after Phase 1: no new violation introduced; the reliability runner remains test-only and does not enter the production bundle.

## Project Structure

### Documentation (this feature)

```text
specs/005-frontend-test-reliability/
├── plan.md              # This file
├── research.md          # Phase 0: measured decisions and rejected alternatives
├── data-model.md        # Phase 1: test-run, flake, and baseline entities
├── quickstart.md        # Phase 1: runnable validation scenarios
└── checklists/
    └── requirements.md  # Existing spec-quality checklist
```

No `contracts/` directory is created. The feature is internal test tooling with no external interface; the reliability report shape is documented in `data-model.md` instead of a public contract.

### Source Code (repository root)

```text
frontend/
├── package.json                         # remove --no-file-parallelism; add test:reliability
├── vitest.config.ts                     # harden unstubGlobals/unstubEnvs; keep fixed order
├── tsconfig.json                        # solution-level strict options
├── tsconfig.node.json                   # strict options; include scripts/ TypeScript tooling
├── scripts/
│   └── reliability/
│       ├── aggregate.ts                 # pure outcome aggregation and flake detection
│       ├── aggregate.test.ts            # aggregation tests under the existing jsdom setup
│       └── run.ts                       # repeated shuffled Vitest runs and report writer
├── src/test/
│   ├── setup.ts                         # existing isolation and zero-warning enforcement
│   └── ...                              # existing helpers; add a small async helper only if duplication appears
└── src/**/*.test.ts(x)                  # replace real waits; reset timer/mock state

.github/workflows/ci.yml                 # workflow_dispatch reliability input; no normal-path change
docs/
├── adr/0005-frontend-test-reliability.md
└── ci.md                                # manual reliability run and pinned-runtime notes
frontend/README.md                       # scripts table and Node.js pin guidance
```

**Structure Decision**: All implementation stays inside `frontend/` and its test configuration. The backend application, production source, and normal pull-request CI path are untouched. The reliability runner is test-only tooling under `frontend/scripts/`, checked by the existing node TypeScript project and the existing ESLint configuration.

## Phase 0: Research Summary

See [research.md](./research.md). Key decisions:

- Remove `--no-file-parallelism` from the frontend test command; Vitest keeps per-file isolation by default.
- Add `unstubGlobals: true` and `unstubEnvs: true`; keep `restoreMocks: true`.
- Replace all nine real-time waits with fake timers or deterministic microtask flushing.
- Validate on Node.js 22 and verify runs without optional local env files and across time zones/locales.
- Add a TypeScript reliability runner, executed with the existing `vite-node` tooling, with deterministic seeds and a JSON report.
- Add a `workflow_dispatch` reliability input to the existing CI workflow; no scheduled runs in the initial implementation.
- Record the pre-change baseline on the pinned runtime before changing the test command, then record the post-change baseline on the same runner class.

## Phase 1: Design Summary

See [data-model.md](./data-model.md) and [quickstart.md](./quickstart.md).

- **Test Case**: stable identity from file plus full test name; outcome and duration per run.
- **Test Run**: commit, runtime, seed, order, wall-clock duration, and optional coverage.
- **Reliability Report**: per-run outcomes, per-test status set, flaky-test list, and summary counts.
- **Performance Baseline**: median, p95, and run durations for the frontend test command.
- **Coverage Baseline**: global metrics and existing thresholds.
- **Flake Incident**: detected → triaged → fixed → verified; any unverified incident blocks completion.

The report writer exits non-zero when any test has mixed outcomes across runs, any run fails, or any test is skipped. It prints the affected tests and seeds so a failure is actionable without a second run.

## Implementation Phases

### Phase A: Baseline capture and measurement harness

1. Install and use Node.js 22 from `frontend/.nvmrc`.
2. Add the `workflow_dispatch` input to `.github/workflows/ci.yml` with a default of `0`, so the current test command can be run on demand before any test-script change. Record 10 pre-change runs of `npm run test` locally and through that entry point. The baseline records median, p95, and coverage.
3. Add the pure reliability aggregation module (`frontend/scripts/reliability/aggregate.ts`) and its aggregation unit test (`frontend/scripts/reliability/aggregate.test.ts`). The test runs under the existing jsdom setup because the shared setup file assumes a DOM; the aggregation logic itself is environment-agnostic.
4. Add the TypeScript CLI runner (`frontend/scripts/reliability/run.ts`) with `--runs`, `--seed`, `--report`, `--no-shuffle`, and `--coverage` options. Run it with the existing `vite-node` tooling; it measures wall-clock duration, validates the reporter output with a small Zod schema, and writes the JSON report.

### Phase B: Execution and isolation changes

1. Remove `--no-file-parallelism` from the frontend `test` script. Leave the backend script unchanged.
2. Add `unstubGlobals: true` and `unstubEnvs: true` to the Vitest configuration. Keep `restoreMocks: true` and the existing per-file isolation default.
3. Audit tests that depend on module-level singletons or global stubs; use `vi.resetModules()` or explicit reset helpers where needed rather than changing production modules.
4. Add `afterEach(() => vi.useRealTimers())` to every file that enables fake timers.

### Phase C: Deterministic asynchronous tests

Replace the nine real-time waits in these files:

| File | Current wait | Replacement |
|---|---|---|
| `src/pages/search/ui/SearchPage.input.integration.test.tsx` | 100 ms, 200 ms, 450 ms | Fake timers with `userEvent.setup({ advanceTimers })`; advance past `SEARCH_SETTLE_MS` and flush |
| `src/app/routing/searchKeyboard.test.tsx` | 100 ms | `waitFor` on the focus invariant; no elapsed-time assertion |
| `src/widgets/search-results/ui/SearchResults.interimEmpty.test.tsx` | 150 ms twice | Fake timers; advance past the interval and assert the call count |
| `src/widgets/search-results/ui/SearchResults.error.test.tsx` | 100 ms | Fake timers; advance and assert no automatic retry |
| `src/entities/catalog/api/searchQueries.race.test.ts` | 20 ms | Deterministic microtask flush with `act`/`waitFor`; no wall-clock wait |
| `src/entities/catalog/api/detailQueries.race.test.ts` | 0 ms | Deterministic microtask flush with `act`/`waitFor`; assert the final state |

The tests keep their existing behavioral assertions. No assertion is weakened, and no retry or timeout increase is introduced.

### Phase D: Local and CI parity

1. Use Node.js 22 for all baseline and validation runs; update `frontend/README.md` with the `nvm use` guidance.
2. Verify a run without `.env.local` produces the same result as a run with it.
3. Verify `TZ=UTC` and an alternate time zone/locale produce the same result. If a date assertion fails, pin the expected value to the same time zone used by the renderer rather than suppressing the check.
4. Run the complete suite with shuffled files and tests for at least 10 deterministic seeds.
5. Run a subset under competing CPU load and confirm no outcome changes.

### Phase E: On-demand reliability execution

1. Use the `workflow_dispatch` input added in Phase A for the number of frontend reliability runs; `0` keeps the normal path unchanged.
2. After the normal frontend test step, run `npm run test:reliability -- --runs <input>` only when the input is greater than zero.
3. Raise the frontend job timeout cap to 30 minutes so a manual 20-execution request can complete; normal-run duration and failure behavior are unchanged.
4. Keep the normal push/pull-request path and its fixed order unchanged. Do not add a schedule in the initial implementation.
5. Print the flaky-test summary to the job log; no additional artifact action is required.

### Phase F: Documentation and completion evidence

1. Add `docs/adr/0005-frontend-test-reliability.md` recording the parallel-execution decision, the TypeScript `vite-node` tooling choice, isolated-shuffle policy, flake disposition, and rejected alternatives.
2. Update `docs/ci.md` with the manual reliability run, input semantics, and pinned-runtime requirement.
3. Update `frontend/README.md` with the `test:reliability` script and local baseline/reliability commands.
4. Record before/after median, p95, coverage, test count, and the 10-seed result in the feature evidence.
5. Confirm the spec checklist remains satisfied and no coverage threshold or assertion was lowered.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Parallel file execution exposes a real cross-file leak. | Run 10 shuffled seeds and every file in isolation; fix the leaking test or reset, never disable isolation or revert to serial execution without measured justification. |
| Fake timers conflict with `userEvent`. | Use `userEvent.setup({ advanceTimers })` and restore real timers in `afterEach`; keep real timers where no debounce or delay is involved. |
| Node.js 22 is not installed locally. | Use `nvm install 22` and `nvm use` from `frontend/.nvmrc`; CI already uses the same file. |
| CI has fewer cores than the workstation, so the speedup is smaller. | Measure on the target runner class; the 90-second absolute cap and 40% relative target are evaluated against the CI baseline, not the workstation result. |
| A manual 20-execution request exceeds the normal job timeout. | Raise the frontend job timeout cap to 30 minutes for manual runs; normal runs are unaffected. |
| GitHub does not expose `workflow_dispatch` until the trigger exists on the default branch. | Land the trigger-only CI change first, or use the existing re-run capability for the pre-change baseline until the trigger is available. |
| Coverage drifts downward after test rewrites. | Add an assertion or preserve the existing test; never lower a threshold. |
| Test count decreases through consolidation. | Confirm the increase is limited to new tooling tests and document the equivalent or stronger assertion for every removed product test, per SC-011. |
| The reliability runner becomes a maintenance burden. | Keep aggregation pure and unit-tested; use the existing `vite-node` tooling, Node.js built-ins, and Vitest's JSON reporter; no new package. |
| Enabling constitution-required strict options in `tsconfig.node.json` or the solution-level `tsconfig.json` surfaces errors in the Vite or Vitest config. | Fix the config code; do not suppress the error or relax the option. Re-run `npm run typecheck`. |

## Testing Requirements

- The complete suite must pass with the restored file-level concurrency.
- Every test file must pass alone and in at least 10 shuffled orders.
- The suite must report zero unhandled rejections, zero `act()` warnings, and zero unexpected console output.
- Coverage must meet or exceed the pre-change baseline for every global metric and keep every critical-area threshold.
- No `.only`, `.skip`, retry, or increased per-test timeout may be introduced.
- The reliability aggregation module must be unit-tested for passed-only, failed-only, mixed-outcome with seed attribution, skipped, empty, and duration-statistics cases.
- `lint`, `typecheck`, `test`, and `build` must pass on Node.js 22.
- Local and CI must report the same test count, pass/fail result, and coverage outcome.

## Complexity Tracking

No constitutional violations or unjustified complexity. The TypeScript reliability runner is the only new component; it is test-only, executed with the existing `vite-node` tooling, and unit-tested because the flake-detection requirement depends on its aggregation correctness.
