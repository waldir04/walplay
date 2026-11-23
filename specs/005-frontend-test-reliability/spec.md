# Feature Specification: Frontend Test Reliability and Performance

**Feature Branch**: `feat/005-frontend-test-reliability`

**Created**: 2026-11-23

**Status**: Approved

**Input**: User description: "Improve the reliability and performance of the frontend unit test suite, with particular focus on intermittent failures and inconsistent execution times in GitHub Actions. The goal is to make frontend tests deterministic, isolated, maintainable, and efficient without compromising test coverage or the quality of existing assertions. The specification should cover: identifying and preventing flaky tests; ensuring proper isolation between tests; improving asynchronous test behavior and mocking reliability; addressing inconsistencies between local and CI test execution; reducing unnecessary test execution overhead; maintaining existing coverage requirements and quality gates. The solution must preserve the current application behavior and existing testing standards. Do not assume specific technical solutions before investigating the current implementation. Avoid prescribing changes to workers, timeouts, MSW configuration, or GitHub Actions unless justified by the actual project requirements. Define measurable acceptance criteria for test reliability, execution performance, and coverage preservation. This is an internal engineering improvement, not a new user-facing application feature."

## Clarifications

### Session 2026-11-23

- Q: How should the 20-run flaky-test evidence for the same unchanged commit be produced? → A: On-demand repeated CI runs of the frontend test step on the feature commit, plus optional scheduled runs on the integration branch.
- Q: When a flaky test is discovered, what disposition is required before the change can be considered complete? → A: Fix the test before merge; no quarantine, skip, or automatic retry may be used to make the suite pass.
- Q: Should shuffled test execution be part of every regular CI run or only dedicated reliability runs? → A: Use shuffled order only in dedicated reliability runs; regular CI keeps a fixed order.
- Q: What does "frontend test step duration" measure, and how is the target applied if the CI baseline is unavailable? → A: Measure only the frontend test command, record 10 pre-change CI runs, and require the stricter of at least 40% reduction and no more than 90 seconds.
- Q: May coverage drop slightly, or must it remain at or above the recorded baseline? → A: Coverage must not drop below the recorded baseline for any global metric; existing thresholds remain mandatory.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trustworthy test outcomes on every run (Priority: P1)

A developer or reviewer needs the frontend test result to mean the same thing every time: the same commit either passes or fails for a real reason, never because of timing, order, or machine conditions.

**Why this priority**: An intermittent quality gate is worse than a slow one. It blocks merges at random, trains the team to rerun instead of investigate, and can hide real regressions when a failure is dismissed as noise.

**Independent Test**: Run the unchanged frontend suite repeatedly, in different orders, and under CPU contention; every run must produce the same per-test outcomes and the same aggregate result.

**Acceptance Scenarios**:

1. **Given** an unchanged commit, **When** the frontend test step runs 20 consecutive on-demand CI executions, **Then** every execution reports identical per-test outcomes and zero flaky failures.
2. **Given** a test that passes when run alone, **When** it runs after any other test and under a different file order, **Then** it still passes.
3. **Given** a normally loaded runner, **When** the runner is slowed by competing CPU work, **Then** no test changes from pass to fail because of the added delay.

---

### User Story 2 - Fast and predictable feedback (Priority: P2)

A developer needs the frontend test step to finish quickly and to take a similar amount of time on each run, so waiting for feedback and CI queue time are predictable.

**Why this priority**: Test time directly affects delivery speed. A suite whose duration varies widely also makes performance regressions hard to notice and encourages people to skip local verification.

**Independent Test**: Measure the frontend test command over repeated runs on the same CI runner class and compare its median, high percentile, and spread against the recorded pre-change baseline.

**Acceptance Scenarios**:

1. **Given** the recorded pre-change CI baseline for the frontend test command, **When** the suite runs on CI, **Then** the median duration satisfies the stricter of at least 40% lower and no more than 90 seconds.
2. **Given** 10 consecutive runs of the same commit, **When** durations are compared, **Then** the high percentile is no more than 25% above the median.
3. **Given** a failing test in a reliability run, **When** the suite ends, **Then** the failure identifies the test file, test name, and the order seed used for that run without requiring a second run.

---

### User Story 3 - Isolated and deterministic asynchronous tests (Priority: P3)

A test author needs each test to start from a known state and to control asynchronous work explicitly, so a test cannot pass because of another test's leftovers or fail because a response arrived late.

**Why this priority**: Most intermittent failures originate in shared state, uncontrolled clocks, and mocks that leak between tests. Fixing these makes future tests reliable by default instead of by luck.

**Independent Test**: Reorder tests, repeat individual files, and deliberately change the resolution order of mocked asynchronous work; every test must keep the same result.

**Acceptance Scenarios**:

1. **Given** a test that changes locale, storage, DOM globals, or a module-level mock, **When** the next test starts, **Then** it observes the same default state as a test run in a fresh process.
2. **Given** asynchronous work whose completion order is deliberately changed, **When** a race-related test runs, **Then** its assertion still verifies the intended final state deterministically.
3. **Given** a test has finished, **When** the suite tears it down, **Then** no pending timer, subscription, or unresolved operation remains.
4. **Given** the complete suite, **When** it finishes, **Then** it reports zero unhandled rejections, zero asynchronous UI-update warnings, and zero unexpected console warnings or errors.

---

### User Story 4 - Consistent behavior between local and CI execution (Priority: P4)

A developer needs the result they see locally to match the result CI will report for the same commit, without undocumented setup differences.

**Why this priority**: Local and CI divergence forces developers to debug the environment instead of the change, and it makes "works on my machine" a recurring source of delay.

**Independent Test**: Run the same commit locally on the pinned runtime and in CI, including a run without optional local environment files and a run with different time zone and locale settings; results must match.

**Acceptance Scenarios**:

1. **Given** the same commit and the pinned runtime, **When** the suite runs locally and in CI, **Then** both report the same test count, pass/fail result, and coverage outcome.
2. **Given** a local checkout without optional environment files, **When** the suite runs, **Then** no test result changes compared with a checkout that has them.
3. **Given** different time zone and locale settings on the runner, **When** the suite runs, **Then** zero tests fail.

---

### Edge Cases

- A runner is significantly slower than the machine where the test was authored.
- A test passes in the full suite but fails when run alone, or the reverse.
- Test files execute in a shuffled or reversed order.
- A test leaves a timer, subscription, or unresolved promise behind.
- A mock is restored or replaced in one test but another test depends on the original behavior.
- The process runs without optional local environment files.
- The runner uses a different time zone, locale, or first day of week.
- Coverage instrumentation changes timing enough to expose an order dependency.
- A test passes only after an automatic retry or after a timeout is increased.
- A flaky test is found but its root cause requires a separate change; the current change must not merge with a quarantine, skip, or retry.
- A shuffled reliability run exposes an order-dependent failure that fixed-order regular CI runs do not.
- Coverage measurement fluctuates slightly below the recorded baseline; the baseline must be re-measured on the pinned runtime before acceptance is claimed.
- A new test file is added without being included in the reliability and performance baseline.
- Two tests run in the same process and the second one observes module-level state from the first.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: For an unchanged commit, the frontend test suite MUST produce the same per-test pass/fail outcomes on every run.
- **FR-002**: Each test MUST produce the same result regardless of the order in which test files or test cases execute.
- **FR-003**: Each test MUST produce the same result whether it runs alone, after any other test, or as part of the complete suite.
- **FR-004**: Any behavior that depends on elapsed time MUST be controlled deterministically so that a test result cannot depend on machine speed.
- **FR-005**: Tests MUST NOT perform real network calls or depend on external services being reachable.
- **FR-006**: Mocks and stubs for network, storage, timers, observers, and browser APIs MUST be reset or restored between tests.
- **FR-007**: Shared mutable state, including active locale, persisted preferences, DOM globals, and module-level singletons, MUST be reset between tests.
- **FR-008**: Every test MUST finish with no pending timers, subscriptions, or unresolved asynchronous operations that affect later tests.
- **FR-009**: The suite MUST fail on unhandled promise rejections, asynchronous UI-update warnings, and unexpected console warnings or errors, consistent with the existing zero-unexpected-warning policy.
- **FR-010**: Local development and CI MUST use the same pinned runtime version and the same frontend test command.
- **FR-011**: Test outcomes MUST NOT depend on optional local environment files, environment variables that are absent in CI, time zone, locale, or host operating system.
- **FR-012**: The frontend test step, defined as the frontend test command only and excluding dependency installation, lint, typecheck, and build, MUST complete with a median duration that satisfies the stricter of (a) at least 40% below the recorded pre-change CI median for the same runner class and (b) no more than 90 seconds.
- **FR-013**: The frontend test step MUST NOT become less predictable: its high-percentile duration MUST remain within 25% of its median across 10 consecutive runs.
- **FR-014**: Tests MUST NOT rely on automatic retries, extended per-test timeouts, or suppressed warnings to pass.
- **FR-015**: All existing test assertions MUST be preserved, or replaced by assertions of equal or stronger behavioral value.
- **FR-016**: Coverage MUST remain at or above the existing global thresholds and per-file critical-area thresholds, and MUST NOT drop below the recorded pre-change baseline for any global metric. Thresholds MUST NOT be lowered.
- **FR-017**: The number of verified behaviors MUST NOT decrease; removing a duplicate test is permitted only when its behavior remains covered by an equal or stronger assertion.
- **FR-018**: The suite MUST provide a repeatable way to detect flaky tests. A test that fails intermittently MUST be treated as a defect and fixed before the change is considered complete; quarantining, skipping, or automatic retries MUST NOT be used to make the suite pass.
- **FR-019**: Each test failure MUST identify the test file and test name. A reliability run MUST also report the execution-order seed used for that run.
- **FR-020**: The change MUST NOT alter user-facing application behavior, application output, or production runtime dependencies.
- **FR-021**: `lint`, `typecheck`, `test`, and `build` MUST continue to pass with zero warnings, and no existing quality gate may be relaxed.
- **FR-022**: The reliability and performance results, including the before-and-after baseline, MUST be documented so a reviewer can reproduce them.

### Key Entities *(include if feature involves data)*

- **Test Case**: An individual executable check. Key attributes: owning file, name, expected behavior, observed outcome, duration, and any shared state it touches.
- **Test Run**: One execution of the suite. Key attributes: commit, pinned runtime, environment inputs, execution order or seed, per-test outcomes, total duration, and coverage result.
- **Reliability Baseline**: A recorded series of repeated runs used to calculate flake rate and per-test stability before and after the change.
- **Performance Baseline**: The recorded median, high percentile, and spread of frontend test durations on a defined runner class, including a breakdown of fixed setup time versus test execution time.
- **Coverage Baseline**: The recorded global and critical-area coverage values together with the existing thresholds.
- **Flake Incident**: A recorded intermittent failure. Key attributes: affected test, observed frequency, environment, suspected cause, and resolution.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 20 consecutive on-demand CI executions of the frontend test step on the same unchanged commit report identical per-test outcomes, with zero flaky failures.
- **SC-002**: 10 consecutive local runs of the complete suite report identical pass/fail results, and every test file also passes when run alone.
- **SC-003**: In dedicated reliability runs, the complete suite passes under at least 10 different execution-order seeds with zero order-dependent failures; regular CI runs keep a fixed order.
- **SC-004**: The median duration of the frontend test command on CI, excluding dependency installation, lint, typecheck, and build, satisfies the stricter of at least 40% below the recorded pre-change CI median for the same runner class and no more than 90 seconds.
- **SC-005**: Across 10 consecutive runs, the 95th-percentile duration is no more than 125% of the median duration.
- **SC-006**: Global coverage remains at or above the existing 80% thresholds for statements, branches, functions, and lines, and does not drop below the recorded pre-change baseline for any global metric; designated critical-area coverage remains at or above 90%.
- **SC-007**: The suite reports zero unhandled rejections, zero asynchronous UI-update warnings, and zero unexpected console warnings or errors.
- **SC-008**: The complete suite reports zero test failures when a competing CPU-bound process runs alongside it.
- **SC-009**: Local and CI runs of the same commit report the same test count, pass/fail result, and coverage outcome on the pinned runtime.
- **SC-010**: Runs with different time zone and locale settings report zero failures.
- **SC-011**: The number of verified behaviors does not decrease; any reduction in test count is documented with an equivalent or stronger assertion.
- **SC-012**: A reviewer can reproduce the before-and-after reliability and performance results using the documented command and environment, with measured durations within 10% of the recorded values on the same runner class.

## Assumptions

- **Scope**: This is an internal engineering improvement for frontend unit, component, and route-integration tests. Backend tests, end-to-end browser tests, product behavior, and user-facing features are out of scope.
- **Platform scope**: macOS and Linux are the supported development and CI hosts for this improvement; Windows is out of scope.
- **Preserved standards**: The existing testing principles apply unchanged: behavior-focused assertions, Arrange-Act-Assert structure, real application rendering for route integration, mocked network dependencies, and the zero-unexpected-warning policy.
- **Coverage floor**: Existing global thresholds are 80% for statements, branches, functions, and lines, with 90% for designated critical areas. No global metric may fall below the recorded pre-change baseline, and no threshold may be lowered.
- **Baseline for this specification**: On 2026-11-23 the suite contained 176 test files and 691 tests. A full run with coverage and serialized file execution took 111.02 seconds cold and 113.73 seconds warm; the same suite with file-level concurrency took 32.30 seconds. Aggregate per-file environment setup accounted for approximately 31 seconds of the serial run. Coverage was 97.43% statements, 93.81% branches, 94.44% functions, and 97.43% lines.
- **Baseline limitation**: The recorded baseline was produced on a workstation running a newer runtime than the pinned CI runtime. Before acceptance, 10 pre-change CI runs of the frontend test command must be recorded on the target runner class. If a CI baseline cannot be recorded, the local baseline is a proxy and the target becomes the stricter of 40% reduction from that proxy and 90 seconds.
- **Measurement boundary**: "Frontend test step" and "frontend test command" mean the test execution only. Dependency installation, lint, typecheck, and build are excluded from the performance target.
- **Flake disposition**: A flaky test discovered during this work is a defect. It must be fixed before merge; quarantine, skip, and automatic retry are not acceptable substitutes.
- **Shuffle scope**: Fixed execution order remains the regular CI default. Shuffled execution with recorded seeds is used only in dedicated reliability runs.
- **Runtime alignment**: The repository pins the CI runtime through `.nvmrc`, but the local baseline above used a different major version. Aligning local execution with the pinned runtime is part of this work.
- **Performance interpretation**: The measured gap between serialized file execution and file-level concurrency indicates avoidable fixed overhead in environment setup rather than slow test logic. The specification sets the outcome target and does not prescribe a specific configuration change.
- **No solution presumed**: The investigation found no shared network-interception layer. This specification does not presume introducing one, changing worker counts, changing timeouts, or changing the CI workflow. Any such change must be justified by measured results or an accepted clarification from this specification.
- **Dependencies**: No new production dependency is expected. Existing test-only tooling may be declared explicitly; a genuinely new test-only package requires written justification and must not affect the production bundle or application behavior.
- **Flake detection cost**: Flake detection is performed through on-demand repeated CI runs on the feature commit before merge, with optional scheduled runs on the integration branch. It is not required on every pull request, so ordinary per-PR overhead does not increase.
- **Reorganization**: Test files may be renamed, merged, or moved to improve isolation and startup cost, provided coverage mapping, failure diagnostics, and assertion standards are preserved.
- **Documentation**: Reliability and performance evidence belongs with the change, and any architectural or testing-convention decision that results from it must be recorded as required by the project's documentation rules.
