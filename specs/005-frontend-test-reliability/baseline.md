# Frontend Test Reliability Baseline and Evidence

**Feature**: `005-frontend-test-reliability`
**Runtime**: Node.js v22.23.5 (`frontend/.nvmrc` → 22)
**Runner class**: local workstation (macOS arm64, 8 cores)
**Pre-change commit**: `e45a6c98697559432233550f999fd333b553d1bb`
**Working tree under test**: `e45a6c9` plus this feature's uncommitted changes
**Test command (pre-change)**: `vitest run --coverage --no-file-parallelism`
**Test command (post-change)**: `vitest run --coverage`

## Pre-change performance baseline (T001)

Ten consecutive local runs of `npm run test`, after `nvm use 22`, before any test-script or
config change.

| Run | Duration |
| --- | -------- |
| 1   | 123.64 s |
| 2   | 118.80 s |
| 3   | 119.09 s |
| 4   | 117.50 s |
| 5   | 121.15 s |
| 6   | 119.25 s |
| 7   | 119.92 s |
| 8   | 116.61 s |
| 9   | 118.08 s |
| 10  | 119.13 s |

- **Median**: 119.11 s
- **p95** (nearest rank): 123.64 s
- **Test files / tests**: 176 files, 691 tests
- **Coverage**: statements 97.43%, branches 93.81–93.82%, functions 94.44%, lines 97.43%
- **Outcome**: 8/10 runs passed all 691 tests; 2/10 runs had exactly one failure each (see
  Flake incidents below).
- **Required post-change target**: the stricter of a 40% median reduction (≤ 71.47 s) and 90 s.

### Pre-change flake incidents observed during the baseline

These occurred with serialized file execution and no shuffling, so they are not caused by
parallelism; they were exposed by repetition.

| Test ID                                                                                                                                                                                                 | First seen | Cause                                                                                                                                                                                                                 | Resolution                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/app/routing/catalogKeyboard.test.tsx::catalog keyboard journey > keeps the focus indicator contract on catalog controls`                                                                           | run 6      | `findByText('Fight Club')` matched three identical cards once an extra page had been appended, so the query was ambiguous.                                                                                            | Use `findAllByText`, matching the intent (the page rendered); the assertion is about focus classes, not text uniqueness. |
| `src/widgets/search-results/SearchResults.multiPage.integration.test.tsx::SearchResults multi-page integration > loads the first page, appends two pages without duplicates, and reaches the end state` | run 7      | `getByText('End of results for the matrix')` matched both the visible paragraph and the `role="status"` live-region announcement; whether the live region had been populated at that instant depended on real timers. | Scope the assertion to the visible paragraph with `{ selector: 'p' }`.                                                   |

## Shuffled-order reliability evidence (T010–T012)

`npm run test:reliability` derives one deterministic seed per iteration and runs the complete
suite with `--sequence.shuffle.files --sequence.shuffle.tests`. Base seed `20261123`; iteration
`n` uses `20261123 + n × 7919` modulo 2 147 483 647.

### Ten-seed run (accepted)

`npm run test:reliability -- --runs 10`

- Seeds: 20269042, 20276961, 20284880, 20292799, 20300718, 20308637, 20316556, 20324475,
  20332394, 20340313.
- **10/10 runs passed**, 701 tests per run, **zero flaky tests, zero skipped tests**.
- Median 38.16 s, p95 40.11 s.

### Twenty-run report (T012)

`npm run test:reliability -- --runs 20`

- Seeds: the ten above plus 20348232, 20356151, 20364070, 20371989, 20379908, 20387827,
  20395746, 20403665, 20411584, 20419503.
- **20/20 runs passed**, 701 tests per run, **zero flaky tests, zero skipped tests**.
- Median 44.46 s, p95 46.38 s.

### Failure-path exercise (T012)

A temporary synthetic test asserting `expect(true).toBe(false)` was added, the runner was
invoked with `--runs 1`, and the fixture was removed afterwards. Observed:

- Exit code **1**.
- `Failed (seed 20269042): 1/1 src/reliability-diagnostic.test.ts::reliability runner diagnostic fixture fails on purpose to exercise the failure path`.
- The JSON report recorded the failed run and exit status; no temporary file remained.

**Not performed here**: the 20 on-demand CI executions. `gh` is not installed in this
environment and `workflow_dispatch` is exposed only after the trigger exists on the repository
default branch, so a maintainer must dispatch the workflow to complete the CI-side evidence. The
trigger and the conditional `Reliability runs` step are implemented in `.github/workflows/ci.yml`.

### Order-dependent failures found by shuffling and their fixes

| Test ID                                                                                                                                                                     | Reproduction                | Cause                                                                                                                                                                                               | Resolution                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/pages/title-detail/ui/TitleDetailPage.fromCard.test.tsx::TitleDetailPage from a card > opens from a card, always runs the core query, and keeps the origin return`     | seed 20269042; passes alone | The heading renders optimistically from router state and is then replaced when the detail query settles, so `findByRole(...)` could resolve with a node that is detached before the assertion runs. | Wait for the settled invariant with `waitFor(() => expect(screen.getByRole('heading', ...)).toBeInTheDocument())`. |
| `src/app/routing/searchRoutes.integration.test.tsx::search routes integration > opens the existing detail destination and restores the active search with back and forward` | seed 20269042               | Same optimistic-then-settled heading replacement, including after a forward navigation.                                                                                                             | Same `waitFor` invariant; assertions unchanged.                                                                    |
| `src/app/routing/searchRoutes.integration.test.tsx::search routes integration > returns from detail with the return action and restores cached results`                     | seeds 20284880, 20300718    | The "Return to search" link was clicked while the detail page was still in its optimistic render; the settled render replaced the node, so the click never reached the router.                      | Wait for the detail query to report `success` in the test query client before clicking.                            |
| `src/app/routing/catalogKeyboard.test.tsx::catalog keyboard journey > activates a card by keyboard and moves to a unique detail address`                                    | same-pattern audit          | Same heading replacement after keyboard activation.                                                                                                                                                 | Same `waitFor` invariant.                                                                                          |
| `src/app/routing/catalogResponsive.test.tsx::catalog responsive contract` (four tests)                                                                                      | seed 20269042               | `findByText('Fight Club')` was ambiguous because the browse landing renders several sections from one repeated fixture page.                                                                        | `findAllByText`, which is what the assertions actually require (the page rendered).                                |

## Post-change performance and coverage (T016–T018)

Ten consecutive local runs of `npm run test` after the change, Node.js 22, no competing work.

| Run | Duration |
| --- | -------- |
| 1   | 52.72 s  |
| 2   | 52.97 s  |
| 3   | 44.69 s  |
| 4   | 43.22 s  |
| 5   | 43.20 s  |
| 6   | 43.58 s  |
| 7   | 44.08 s  |
| 8   | 43.10 s  |
| 9   | 43.76 s  |
| 10  | 42.84 s  |

- **Median**: 43.67 s (63.3% below the 119.11 s pre-change median; target ≤ 71.47 s)
- **p95**: 52.97 s (121.3% of the median; target ≤ 125%)
- **Test files / tests**: 177 files, 701 tests on every run
- **Coverage**: statements 97.43%, branches 93.81–93.83%, functions 94.44%, lines 97.43%
- **Coverage comparison**: no global metric is lower than the pre-change baseline
  (97.43 / 93.81 / 94.44 / 97.43). Branch coverage varied between 93.81 and 93.83 across runs;
  its minimum equals the pre-change minimum. Thresholds are unchanged.
- **Test-count comparison**: 691 → 701. The increase is exactly the ten
  `frontend/scripts/reliability/aggregate.test.ts` cases. No product test was removed.

## Warnings, rejections, and isolated-file runs (T028–T029)

- Every frontend test file was executed alone with `vitest run <file>`: **177/177 files passed**,
  zero failures.
- Ten complete post-change runs passed with `frontend/src/test/setup.ts` active. That setup
  throws on any unhandled promise rejection, any `console.warn`, and any `console.error`, so a
  passing run is evidence of zero unhandled rejections, zero `act()` warnings surfaced as console
  errors, and zero unexpected console output.
- Nine fixed wall-clock waits were removed; `grep -rn "setTimeout(resolve"` over the suite
  returns no match.

## Runtime and environment independence (T031–T032)

| Scenario                                                  | Result                                                                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Without `.env.local`                                      | 177 files / 701 tests passed; coverage 97.43 / 93.82 / 94.44 / 97.43, identical to the normal run. `.env.local` was restored afterwards. |
| `TZ=UTC`                                                  | 177 / 701 passed; coverage 97.43 / 93.82 / 94.44 / 97.43, identical to the normal run.                                                   |
| `TZ=America/New_York LANG=es_ES.UTF-8 LC_ALL=es_ES.UTF-8` | 177 / 701 passed; coverage 97.43 / 93.82 / 94.44 / 97.43.                                                                                |
| Four competing `yes` processes (CPU contention)           | 177 / 701 passed in 50.78 s; no test changed outcome.                                                                                    |

## Invalidated attempts

Two intermediate attempts were discarded because the host suspended during the run, which is
visible in their durations and worker timeouts: one 10-seed iteration reported p95 196.2 s and
one no-`.env.local` run reported `setup 682.09 s` with `[vitest-worker] Timeout calling
"onTaskUpdate"` errors. Re-running the same seeds and the same environment on an awake host
produced the accepted results above. Accepted runs completed in 38–53 s.

## Local/CI parity (T033)

Pending. CI dispatch is not available from this environment: `gh` is not installed, and
`workflow_dispatch` is exposed only after the trigger exists on the repository default branch.
Local runs of the working tree on Node.js 22 report 177 files / 701 tests, 100% pass, and
coverage 97.43 / 93.81–93.83 / 94.44 / 97.43. The CI side of the comparison, plus the 10
pre-change and 10 post-change CI runs from T002/T017, remain to be collected from the Actions
page by a maintainer.
