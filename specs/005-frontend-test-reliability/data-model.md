# Data Model: Frontend Test Reliability and Performance

**Feature**: `005-frontend-test-reliability`
**Date**: 2026-11-23
**Input**: [spec.md](./spec.md), [research.md](./research.md)

This feature has no application data. The model below describes the records used to evaluate reliability, performance, and coverage, plus the on-disk reliability report that makes a flake verdict reproducible.

## Entity: Test Case

An individual executable check in the frontend suite.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable identity as `<file>::<fullName>`. Must not change when a seed changes. |
| `file` | string | Repository-relative test file path. |
| `fullName` | string | Full test name including describe blocks. |
| `status` | enum | `passed`, `failed`, or `skipped` per run. |
| `durationMs` | number | Non-negative milliseconds for that run. |
| `outcomes` | array of status | One entry per reliability run, in run order. |
| `flaky` | boolean | True when `outcomes` contains more than one distinct status. |

## Entity: Test Run

One execution of the complete frontend test command.

| Field | Type | Rules |
|---|---|---|
| `index` | number | 1-based position in the reliability sequence. |
| `seed` | number or null | Integer seed for shuffled runs; null for fixed-order runs. |
| `order` | enum | `fixed` or `shuffled`. |
| `commit` | string | Full Git commit SHA under test. |
| `nodeVersion` | string | Runtime version; must start with `v22` for accepted evidence. |
| `command` | string | Exact test command, including shuffle and coverage flags. |
| `status` | enum | `passed` or `failed`. |
| `startedAt` | string | ISO-8601 timestamp. |
| `durationMs` | number | Non-negative wall-clock milliseconds for the test command. |
| `coverage` | object or null | Present only for baseline runs that enable coverage. |
| `tests` | array of Test Case outcomes | One entry per executed test. |

## Entity: Reliability Report

The machine-readable artifact written by the reliability runner. It is an internal test artifact, not a public API.

```json
{
  "schemaVersion": 1,
  "createdAt": "2026-11-23T12:00:00.000Z",
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "nodeVersion": "v22.12.0",
  "command": "vitest run --sequence.shuffle.files --sequence.shuffle.tests",
  "order": "shuffled",
  "baseSeed": 20261123,
  "runs": [
    {
      "index": 1,
      "seed": 20261123,
      "status": "passed",
      "startedAt": "2026-11-23T12:00:00.000Z",
      "durationMs": 33000,
      "coverage": null,
      "tests": [
        {
          "file": "src/shared/ui/Button.test.tsx",
          "fullName": "Button renders a label",
          "status": "passed",
          "durationMs": 12
        }
      ]
    }
  ],
  "tests": [
    {
      "id": "src/shared/ui/Button.test.tsx::Button renders a label",
      "file": "src/shared/ui/Button.test.tsx",
      "fullName": "Button renders a label",
      "outcomes": ["passed"],
      "flaky": false
    }
  ],
  "summary": {
    "runCount": 1,
    "testCount": 1,
    "passedRuns": 1,
    "failedRuns": 0,
    "flakyTests": [],
    "skippedTests": [],
    "medianDurationMs": 33000,
    "p95DurationMs": 33000
  }
}
```

**Validation rules**:

- `schemaVersion` is `1`.
- `command` must include the shuffle flags when `order` is `shuffled`; it must not include them when `order` is `fixed`.
- `baseSeed` is an integer. Every run seed is derived from it and recorded.
- `nodeVersion` must match the pinned major version for accepted evidence.
- `summary.flakyTests` must list every Test Case with `flaky: true`.
- Any failed run, any flaky test, or any skipped test makes the command exit non-zero.
- `medianDurationMs` and `p95DurationMs` are computed from run `durationMs` values. Coverage runs may be reported separately from reliability runs.
- A report with zero runs is invalid.

## Entity: Performance Baseline

The recorded timing evidence for the frontend test command.

| Field | Type | Rules |
|---|---|---|
| `commit` | string | Commit whose command was measured. |
| `nodeVersion` | string | Pinned runtime. |
| `runnerClass` | string | CI runner label or local machine class. |
| `runCount` | number | 10 pre-change and 10 post-change runs. |
| `durationsMs` | array of number | Wall-clock duration per run. |
| `medianMs` | number | Median of the recorded durations. |
| `p95Ms` | number | 95th percentile of the recorded durations. |
| `coverage` | object | Global metrics for the same commit. |
| `testCount` | number | Test count for the same commit. |

Acceptance compares the post-change median with the pre-change median on the same runner class. The stricter of a 40% reduction and 90 seconds applies.

## Entity: Coverage Baseline

The recorded coverage values and the thresholds that must not be lowered.

| Field | Type | Rules |
|---|---|---|
| `statements` | number | Percentage, 0–100. Must not fall below the recorded baseline. |
| `branches` | number | Percentage, 0–100. Must not fall below the recorded baseline. |
| `functions` | number | Percentage, 0–100. Must not fall below the recorded baseline. |
| `lines` | number | Percentage, 0–100. Must not fall below the recorded baseline. |
| `thresholds` | object | Existing global 80% and critical-area 90% values. Must remain unchanged. |
| `commit` | string | Commit that produced the baseline. |

## Entity: Flake Incident

A recorded intermittent failure that must be resolved before completion.

| Field | Type | Rules |
|---|---|---|
| `testId` | string | References a Test Case. |
| `firstSeenSeed` | number | Seed of the first failing run. |
| `observedSeeds` | array of number | Seeds that reproduced the failure. |
| `frequency` | string | e.g. `2/20 runs`. |
| `environment` | string | Runtime, runner class, and relevant order information. |
| `suspectedCause` | string | Shared state, timer, mock, ordering, or environment. |
| `resolution` | string | Required fix or reset. |
| `status` | enum | `detected`, `triaged`, `fixed`, `verified`, `reopened`. |

**State transitions**:

`detected` → `triaged` → `fixed` → `verified`

A `verified` incident returns to `reopened` if it recurs. A `detected`, `triaged`, `fixed`, or `reopened` incident blocks completion. Quarantine, skip, and retry do not produce a valid terminal state.

## Relationships

- A **Test Run** contains one outcome per **Test Case**.
- The **Reliability Report** aggregates all Test Runs and all Test Case outcomes.
- A **Flake Incident** references exactly one **Test Case** and cites the seeds from the **Reliability Report**.
- A **Performance Baseline** and a **Coverage Baseline** are recorded per commit and runtime pair.

## Scale and Retention

- 20 reliability runs × 691 tests = 13,820 per-run outcomes.
- A JSON report of this size is expected to be a few megabytes; it is written to the workspace and printed in summary form.
- Reports are reproducible from their recorded base seed and commit. They are not application data and are not retained by the product.
