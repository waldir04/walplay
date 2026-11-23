# Quickstart: Frontend Test Reliability and Performance

**Feature**: `005-frontend-test-reliability`
**Purpose**: Run the validation scenarios that prove the reliability, performance, and coverage outcomes.

## Prerequisites

- Node.js 22 from `frontend/.nvmrc`.
- npm with the committed `frontend/package-lock.json`.
- macOS or Linux host, matching the supported development and CI platforms.
- A clean checkout of `feat/005-frontend-test-reliability`.
- No production credentials or external services.

```bash
cd frontend
nvm install 22
nvm use
node -v          # must report v22.x
npm ci
```

If `nvm` is unavailable, use any Node.js 22.x installation and confirm `node -v` before recording evidence.

## Scenario 1: Record the pre-change performance baseline

Run this **before** removing `--no-file-parallelism` from the frontend test script.

```bash
cd frontend
for i in $(seq 1 10); do
  npm run test 2>&1 | tee "baseline-$i.log"
done
grep -E '^ *Duration' baseline-*.log
```

Record:

- Test file count and test count.
- The `Duration` value for each run.
- Median and 95th-percentile duration.
- Global statement, branch, function, and line coverage.
- The runtime version and runner class.

The performance target applies to the test command only. Do not include `npm ci`, lint, typecheck, or build in these durations.

Repeat the same 10-run sequence through the on-demand CI entry point before changing the test script, so the CI baseline uses the same runner class as the post-change measurement. Dispatch the workflow 10 times with the frontend reliability runs input set to `0`; each dispatch runs the normal test command once.

## Scenario 2: Run the normal suite after the change

```bash
cd frontend
npm run test
```

Expected:

- All test files and tests pass.
- No unhandled rejection, React `act()` warning, or unexpected console output appears.
- Coverage is at or above the recorded baseline for every global metric.
- The median duration satisfies the stricter of 40% below the pre-change CI baseline and 90 seconds.
- The test count is the same, or any reduction is documented with an equivalent or stronger assertion.

## Scenario 3: Prove order and isolation

```bash
cd frontend
npx vitest run src/shared/ui/Button.test.tsx
npm run test:reliability -- --runs 10
npm run test:reliability -- --runs 20 --report reliability-report.json
```

Expected:

- The isolated file passes.
- The 10-seed run passes with zero flaky tests and zero skipped tests.
- The 20-run report passes every run, lists zero flaky tests, and exits with status 0.
- Every run records a distinct deterministic seed and the complete suite.
- A deliberately introduced order-dependent failure would appear in `summary.flakyTests` with the affected test and seeds.

The reliability runner disables coverage by default to keep the repetition cost low. Coverage is verified by Scenario 2.

## Scenario 4: Verify optional environment-file independence

If `.env.local` exists:

```bash
cd frontend
mv .env.local .env.local.bak
npm run test
mv .env.local.bak .env.local
```

Expected: the same test count, pass/fail result, and coverage as the run with `.env.local` present. Restore the file even if the command fails.

If `.env.local` does not exist, record that the scenario was already exercised by the normal run.

## Scenario 5: Verify time-zone and locale independence

```bash
cd frontend
TZ=UTC npm run test
TZ=America/New_York LANG=es_ES.UTF-8 npm run test
```

Expected: zero failures and the same test count in both runs. If a date assertion fails, align the expected value with the renderer's time zone; do not remove the assertion or suppress the warning.

## Scenario 6: Verify behavior under CPU contention

```bash
cd frontend
for i in 1 2 3 4; do yes > /dev/null & done
LOAD_PIDS=$(jobs -p)
npm run test
kill $LOAD_PIDS
```

Expected: the suite still passes, with no test changing outcome because of the added delay. Restore the machine to normal load afterward.

## Scenario 7: Verify quality gates and parity

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
npm run test
```

Expected:

- `lint`, `typecheck`, `test`, and `build` pass with zero warnings.
- No `.only`, `.skip`, retry, or increased per-test timeout was introduced.
- Local and CI runs of the same commit report the same test count, pass/fail result, and coverage outcome on Node.js 22.

## Scenario 8: Run the on-demand CI reliability check

GitHub exposes `workflow_dispatch` only after the trigger exists on the repository default branch. If the trigger is not yet available, land the trigger-only change first or use the existing CI re-run capability until it is.

1. Open the repository's Actions page.
2. Select the CI workflow.
3. Choose **Run workflow** on `feat/005-frontend-test-reliability`.
4. Set the frontend reliability runs input to `20`.
5. Run the workflow and inspect the reliability summary in the frontend job log.

Expected: the normal frontend checks run first, then 20 shuffled reliability iterations. The job fails if any test has mixed outcomes, any iteration fails, or any test is skipped.

## Completion Evidence

Record the following in the feature evidence:

- Pre-change and post-change median and p95 for the test command on the same runner class.
- Coverage before and after with all four global metrics.
- Test file and test count before and after.
- The 10-seed reliability result and the 20-run result.
- Node.js version and commit SHA for every accepted measurement.
- Links to the CI runs used for the evidence.
