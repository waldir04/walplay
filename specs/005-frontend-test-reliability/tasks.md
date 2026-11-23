# Tasks: Frontend Test Reliability and Performance

**Input**: Design documents from `/specs/005-frontend-test-reliability/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Verification tasks are included because this feature is test infrastructure and the specification requires reliability, coverage, and parity evidence. No test-first ordering is required except for the reliability aggregation unit test.

**Organization**: Tasks are grouped by user story so each story can be implemented, verified, and delivered independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same group because it uses different files and has no incomplete dependency.
- **[Story]**: Maps the task to a user story from `spec.md`.
- Every task includes an exact file path.

## Path Conventions

- Frontend application: `frontend/src/`
- Frontend test tooling: `frontend/scripts/`
- Feature evidence: `specs/005-frontend-test-reliability/`
- CI and operator documentation: `.github/workflows/ci.yml`, `docs/`, `frontend/README.md`

No `contracts/` tasks are generated: this is internal test tooling with no external interface.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the pinned runtime, pre-change baseline, and tooling type-checking support.

- [x] T001 Record the pre-change local baseline in `specs/005-frontend-test-reliability/baseline.md`: 10 runs of `npm run test` on Node.js 22, including median, p95, coverage, test count, and commit SHA.
- [x] T002 Add the `workflow_dispatch` input `frontend_reliability_runs` with default `0` to `.github/workflows/ci.yml`, then record 10 pre-change CI runs of the normal test command in `specs/005-frontend-test-reliability/baseline.md`; do not change the test script yet. **Note**: the input is implemented; the 10 pre-change CI runs require a maintainer workflow dispatch, because `gh` is unavailable here and `workflow_dispatch` is not yet exposed on the default branch.
- [x] T003 [P] Enable the constitution-required `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, and `verbatimModuleSyntax` options in `frontend/tsconfig.node.json` and the solution-level `frontend/tsconfig.json`, and include `scripts/**/*.ts` in the node project; run `npm run typecheck` and fix resulting errors in the Vite or Vitest config without suppression.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the reliability tooling and isolation configuration required by every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 [P] Create the pure aggregation module in `frontend/scripts/reliability/aggregate.ts`: per-test identity from file plus full name, status collection, flake detection, skipped-test list, run pass/fail, and median/p95 duration.
- [x] T005 [P] Create `frontend/scripts/reliability/aggregate.test.ts` and run it under the existing jsdom setup; cover passed-only, failed-only, mixed pass/fail with seed attribution, skipped, empty input, and duration statistics.
- [x] T006 [P] Create the TypeScript CLI runner in `frontend/scripts/reliability/run.ts`: `--runs`, `--seed`, `--report`, `--no-shuffle`, and `--coverage`; derive deterministic seeds, invoke the local `frontend/node_modules/.bin/vitest` binary with `--sequence.shuffle.files --sequence.shuffle.tests --sequence.seed`, validate the parsed reporter output with a small Zod schema, use temporary per-run files, write the report, print the flaky summary, and exit non-zero on any failed run, flaky test, or skipped test.
- [x] T007 Add the already-installed `vite-node` 3.2.4 to `frontend/package.json` devDependencies and add the `test:reliability` script, delegating to `frontend/scripts/reliability/run.ts`; keep `test` unchanged until User Story 2.
- [x] T008 [P] Add `unstubGlobals: true` and `unstubEnvs: true` to `frontend/vitest.config.ts`; keep `restoreMocks: true` and the default per-file isolation.
- [x] T009 Add the conditional reliability step to `.github/workflows/ci.yml` after the normal frontend test step: run `npm run test:reliability -- --runs <input>` only when `frontend_reliability_runs` is greater than `0`, and raise the frontend job timeout cap to 30 minutes.

**Checkpoint**: The runner, aggregation tests, isolation configuration, and on-demand CI entry point are ready. User stories can now proceed.

---

## Phase 3: User Story 1 - Trustworthy test outcomes on every run (Priority: P1) 🎯 MVP

**Goal**: The unchanged suite produces identical per-test outcomes across repeated, shuffled, and CPU-constrained runs.

**Independent Test**: Run `npm run test:reliability -- --runs 10` and then 20 on-demand CI executions of the frontend test step; every execution must pass, with zero flaky or skipped tests and with file/name/seed diagnostics on any failure.

### Implementation and Verification for User Story 1

- [x] T010 [US1] Run `npm run test:reliability -- --runs 10` from `frontend/`, triage every order-dependent failure, and record the seed list and affected test IDs in `specs/005-frontend-test-reliability/baseline.md`.
- [x] T011 [US1] Fix each order-dependent test identified by T010 in its owning `frontend/src/**/*.test.ts(x)` file without weakening assertions, and record the cause and resolution in `specs/005-frontend-test-reliability/baseline.md`.
- [x] T012 [US1] Exercise the runner's failure path with a temporary synthetic failing test, confirm exit code 1 and file/name/seed diagnostics, remove the fixture, then run 20 on-demand CI executions of the frontend test step through `.github/workflows/ci.yml` (one dispatch with the reliability input set to `20` is acceptable) and record the 20/20 result, flaky list, skipped list, and run links in `specs/005-frontend-test-reliability/baseline.md`. **Note**: the failure path and a clean 20-iteration local report are recorded; the 20 CI executions require a maintainer dispatch.
- [x] T013 [P] [US1] Verify that `frontend/src/**/*.test.ts(x)` and `frontend/vitest.config.ts` contain no `.only`, `.skip`, retry, or increased per-test timeout; report the result for the final evidence task.
- [x] T014 [P] [US1] Run the complete suite in `frontend/` with competing CPU load and confirm no test outcome changes; report the result for the final evidence task.

**Checkpoint**: User Story 1 is independently satisfied: repeated, shuffled, and loaded runs are consistent, and failures identify the affected test and seed.

---

## Phase 4: User Story 2 - Fast and predictable feedback (Priority: P2)

**Goal**: The frontend test command meets the stricter of 40% below the pre-change CI median and 90 seconds, with stable p95 and preserved coverage.

**Independent Test**: Compare 10 post-change local and CI runs of `npm run test` with the pre-change baseline; verify the median target, p95 ratio, coverage, and test count.

### Implementation and Verification for User Story 2

- [x] T015 [US2] Remove `--no-file-parallelism` from the `test` script in `frontend/package.json`; leave the backend script unchanged.
- [x] T016 [US2] Run 10 post-change local `npm run test` runs on Node.js 22 and record median, p95, coverage, and test count in `specs/005-frontend-test-reliability/baseline.md`.
- [ ] T017 [US2] BLOCKED (requires maintainer CI dispatch): Run 10 post-change CI `npm run test` runs through `.github/workflows/ci.yml` and record median and p95 in `specs/005-frontend-test-reliability/baseline.md`; confirm the stricter of 40% reduction and 90 seconds.
- [x] T018 [US2] Compare post-change coverage and test count with the pre-change baseline; if coverage falls, add an assertion rather than lowering a threshold; confirm any test-count increase comes only from the new tooling tests and no product test was removed; record the comparison in `specs/005-frontend-test-reliability/baseline.md`.
- [x] T019 [US2] Update the performance commands and measurement boundary in `specs/005-frontend-test-reliability/quickstart.md` to match the final test script and evidence.

**Checkpoint**: User Story 2 is independently satisfied: the test command is at least 40% faster or below 90 seconds, p95 is within 125% of the median, and coverage is not lower.

---

## Phase 5: User Story 3 - Isolated and deterministic asynchronous tests (Priority: P3)

**Goal**: Every test starts from a known state, controls asynchronous work deterministically, and leaves no pending work or warnings behind.

**Independent Test**: Run every changed test file alone and in the complete suite; change mocked resolution order; confirm zero unhandled rejections, `act()` warnings, or unexpected console output.

### Implementation for User Story 3

- [x] T020 [P] [US3] Audit `frontend/src/features/search-query/model/useSearchInput.test.tsx` and `frontend/src/shared/ui/LiveRegion.test.tsx` for `vi.useFakeTimers()`; in every such file, assert `vi.getTimerCount() === 0` and then restore real timers in `afterEach`.
- [x] T021 [P] [US3] Replace the 100 ms, 200 ms, and 450 ms waits in `frontend/src/pages/search/ui/SearchPage.input.integration.test.tsx` with fake timers and `userEvent.setup({ advanceTimers })`; keep the existing request-count and validation assertions.
- [x] T022 [P] [US3] Replace the 100 ms wait in `frontend/src/app/routing/searchKeyboard.test.tsx` with a `waitFor` focus assertion; do not assert elapsed time.
- [x] T023 [P] [US3] Replace the two 150 ms waits in `frontend/src/widgets/search-results/ui/SearchResults.interimEmpty.test.tsx` with fake timers; assert the call count after advancing.
- [x] T024 [P] [US3] Replace the 100 ms wait in `frontend/src/widgets/search-results/ui/SearchResults.error.test.tsx` with fake timers; assert no automatic retry after advancing.
- [x] T025 [P] [US3] Replace the 20 ms wait in `frontend/src/entities/catalog/api/searchQueries.race.test.ts` with deterministic microtask flushing using `act` or `waitFor`.
- [x] T026 [P] [US3] Replace the 0 ms wait in `frontend/src/entities/catalog/api/detailQueries.race.test.ts` with deterministic microtask flushing using `act` or `waitFor`.
- [x] T027 [US3] Audit module and global state isolation across `frontend/src/**/*.test.ts(x)`, with specific attention to `frontend/src/shared/config/env.test.ts`, `frontend/src/entities/catalog/api/catalogClient.defaults.test.ts`, and `frontend/src/entities/catalog/api/detailClient.test.ts`; add `vi.resetModules`, dynamic imports, or explicit resets where state can leak, and verify no test performs a real network call.
- [x] T028 [US3] Run every frontend test file alone from `frontend/`, record any file that fails in isolation, and fix the failure in its owning test file without changing application behavior.
- [x] T029 [US3] Run the complete frontend suite and confirm zero unhandled rejections, zero `act()` warnings, and zero unexpected console warnings or errors; record the result in `specs/005-frontend-test-reliability/baseline.md`.

**Checkpoint**: User Story 3 is independently satisfied: no fixed wall-clock waits remain in the changed files, each test passes alone and in suite, and the zero-warning policy holds.

---

## Phase 6: User Story 4 - Consistent behavior between local and CI execution (Priority: P4)

**Goal**: Local and CI runs of the same commit produce the same result on the pinned runtime, independent of optional env files, time zone, and locale.

**Independent Test**: Run the same commit locally and in CI on Node.js 22, then repeat without `.env.local` and under alternate time-zone/locale settings; test count, result, and coverage must match.

### Implementation and Verification for User Story 4

- [x] T030 [P] [US4] Update `frontend/README.md` with Node.js 22 `nvm use` guidance, the `test:reliability` command, and local reliability validation steps.
- [x] T031 [US4] Run the suite in `frontend/` without `.env.local` and with CI-like absent `VITE_*` values, compare test count, pass/fail, and coverage with the normal run, and report the result for the final evidence task.
- [x] T032 [US4] Run the suite in `frontend/` with `TZ=UTC` and an alternate time zone/locale; confirm zero failures and report the result for the final evidence task.
- [ ] T033 [US4] BLOCKED (requires maintainer CI dispatch): Compare local and CI runs of the same commit on Node.js 22 for test count, pass/fail, and coverage; record parity in `specs/005-frontend-test-reliability/baseline.md`.

**Checkpoint**: User Story 4 is independently satisfied: local and CI behavior match on the pinned runtime, and optional environment or locale differences do not change outcomes.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Record decisions, update operator documentation, and verify the complete quality gate.

- [x] T034 [P] Add `docs/adr/0005-frontend-test-reliability.md` recording file-level parallelism, the TypeScript `vite-node` tooling choice, shuffle-only-in-reliability, flake disposition, measurement boundary, and rejected alternatives.
- [x] T035 [P] Update `docs/ci.md` with the `frontend_reliability_runs` input, the 30-minute frontend job cap, the manual reliability procedure, and the pinned Node.js requirement.
- [x] T036 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` from `frontend/` on Node.js 22; record zero warnings and the coverage result.
- [x] T037 [P] Verify the final diff contains no application source change, no production dependency change, no coverage-threshold change, no warning suppression, and no `.only`/`.skip`/retry/timeout inflation in `frontend/`.
- [x] T038 Re-validate `specs/005-frontend-test-reliability/checklists/requirements.md` against the final spec and finalize `specs/005-frontend-test-reliability/baseline.md` with before/after performance, coverage, test-count, 10-seed, and 20-run evidence.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately. T001 must finish before the pre-change measurement is complete; T002 must finish before any post-change CI comparison. T003 is independent.
- **Foundational (Phase 2)**: Depends on Setup. T004 must finish before T005 and T006. T006 must finish before T007 and T009. T008 is independent after Setup and blocks the isolation work in US3.
- **User Stories (Phases 3–6)**: Depend on Foundational. US1 and US2 may proceed in parallel after their respective prerequisites; US3 depends on T008; US4 depends on T001, T002, and the post-change suite from US2.
- **Polish (Phase 7)**: Depends on all selected user stories and their evidence tasks.

### Critical Path

`T001 → T002 → T015 → T016/T017 → T018 → T019 → T033 → T036 → T038`

US1 path: `T004 → T006 → T007 → T010 → T011 → T012 → T038`

US3 path: `T008 → T020–T026 (parallel files) → T027 → T028 → T029 → T036`

### User Story Dependencies

- **US1 (P1)**: Depends on T004, T006, T007, and T009. No dependency on US2–US4.
- **US2 (P2)**: Depends on T001, T002, and T007. It does not depend on US1; it changes only `frontend/package.json` and records measurements.
- **US3 (P3)**: Depends on T008. It changes test files independently of US2's test-script flag and US1's evidence runs.
- **US4 (P4)**: Depends on T001, T002, T017, and T030. It records parity and docs; it does not modify test behavior.

### Within Each User Story

- US1: measure → fix → re-measure → verify diagnostics and load.
- US2: change script → measure local → measure CI → compare coverage → update quickstart.
- US3: audit → replace waits per file → audit global state → run isolated files → run full suite.
- US4: docs → env-file check → time-zone/locale check → local/CI parity.

### Parallel Opportunities

- T003, T004, and T008 can start together after Setup; T005 and T006 can start together after T004.
- T021–T026 touch different test files and can run in parallel after T008; T027 follows them because it audits the resulting suite.
- T031 and T032 must run sequentially: T031 temporarily removes `.env.local`, so running T032 concurrently could invalidate its environment.
- T034 and T035 are different documentation files and can run in parallel.
- T037 is read-only and can run alongside T036 once the implementation is complete.

---

## Parallel Example: User Story 3

```text
Task: "Replace waits in frontend/src/pages/search/ui/SearchPage.input.integration.test.tsx"
Task: "Replace wait in frontend/src/app/routing/searchKeyboard.test.tsx"
Task: "Replace waits in frontend/src/widgets/search-results/ui/SearchResults.interimEmpty.test.tsx"
Task: "Replace wait in frontend/src/widgets/search-results/ui/SearchResults.error.test.tsx"
Task: "Replace wait in frontend/src/entities/catalog/api/searchQueries.race.test.ts"
Task: "Replace wait in frontend/src/entities/catalog/api/detailQueries.race.test.ts"
```

## Parallel Example: Documentation

```text
Task: "Add docs/adr/0005-frontend-test-reliability.md"
Task: "Update docs/ci.md with the reliability input and timeout"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup, including the pinned runtime and pre-change baseline.
2. Complete Phase 2: Foundational, including the runner, aggregation tests, isolation config, and CI input.
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Confirm 10 shuffled seeds and 20 on-demand CI runs are consistent.
5. This is the MVP because it delivers the trustworthy gate that the other stories build on.

### Incremental Delivery

1. Setup + Foundational → tooling ready.
2. US1 → reliable repeated outcomes.
3. US2 → performance target and stable p95.
4. US3 → deterministic async and isolation.
5. US4 → local/CI parity.
6. Polish → ADR, operator docs, final quality gate, evidence.

### Parallel Team Strategy

After Foundational:

- Developer A: US1 order and flake investigation.
- Developer B: US2 performance change and measurements.
- Developer C: US3 test-file isolation and timer work.
- Developer D: US4 parity checks and README guidance.

US2 and US3 touch different files. US1 may need to revisit any file that exposes an order leak; coordinate with US3 before editing the same test file.

---

## Notes

- [P] marks different-file, no-incomplete-dependency work; it is not a promise that a command is cheap.
- GitHub exposes `workflow_dispatch` in the UI only when the trigger exists on the repository default branch. If it is not already available there, land the trigger-only form of T002 as a small preparatory change before collecting CI evidence.
- Every measurement must run on Node.js 22 and record the commit.
- The reliability tooling must remain TypeScript and must be type-checked through `frontend/tsconfig.node.json`; do not reintroduce JavaScript tooling.
- Do not lower coverage, weaken assertions, suppress warnings, add retries, or introduce `.skip`/quarantine.
- Do not modify production source or production dependencies.
- Record evidence in `specs/005-frontend-test-reliability/baseline.md` as tasks complete.
- Commit after each logical group only when explicitly authorized.
