# Continuous Integration

The quality gate is defined in `.github/workflows/ci.yml`. It runs on pull requests
targeting `develop` and `main`, and on pushes to those branches after merge. It defines three
independent jobs, `Frontend checks`, `Backend checks`, and `Branch name validation`, with
read-only repository permissions. There are no path filters and no manual trigger, so every
push or pull request to those branches runs the workflow, including documentation-only
changes.

## Application detection

Both applications are optional until introduced. Each job starts with a detection step
run from the repository root; the remaining steps run only when it reports
`present=true`. Detection reads the working tree at run time and also checks the base
revision so an application cannot be deleted silently.

| Application | Introduced when | Failure conditions |
| ----------- | --------------- | ------------------ |
| `frontend/` | `frontend/package.json` is a file | If introduced, `frontend/package-lock.json` and `frontend/.nvmrc` are required. If `frontend/package.json` is absent but existed at the base revision, the job fails. |
| `backend/`  | The `backend/` path exists | If introduced, it must be a directory containing `backend/package.json`, `backend/package-lock.json`, and `backend/.nvmrc`. If `backend/package.json` is absent but existed at the base revision, the job fails. |

- When an application is absent, the detection step logs that it has not been introduced,
  writes `present=false`, and every later step in that job is skipped. The job still
  reports success, so it can be a required status check before either application exists.
- The detection markers differ intentionally: the frontend is introduced by its
  `package.json`, while the backend is introduced by the `backend/` directory. A `backend/`
  path that exists but is not a directory fails the job.
- Removal protection compares against the base revision: the pull-request base SHA for
  pull requests, or `github.event.before` for pushes. If `package.json` existed at that
  revision and is now missing, the job fails instead of silently skipping.
- The base comparison is skipped when no usable base SHA exists, such as the first push to
  a new branch, where `github.event.before` is all zeros.
- `fetch-depth: 0` is required so the base commit is available. If the base commit cannot
  be resolved, the detection step fails rather than guessing.

Both jobs use the same script contract and neither adds application-specific checks or
creates application files.

## What each job runs

Both jobs use the application script contract required by the constitution:

1. `npm ci` from the committed application lockfile.
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run build`

The Node.js version comes from the application's `.nvmrc`, and the npm cache is keyed to
the application lockfile. Any failing step fails its job. Each job has a 15-minute timeout,
and checkout uses `fetch-depth: 0` and `persist-credentials: false`.

`Frontend checks` and `Backend checks` each run their validation steps only when their
detection step reports `present=true`; otherwise they log that the application has not been
introduced and skip them. The jobs are independent and run in parallel.

## Branch name validation

`Branch name validation` checks only the format of the branch tied to the run:
`github.head_ref` for pull requests and `github.ref_name` for pushes. It accepts:

| Kind | Accepted format |
| ---- | --------------- |
| Specification branch | `feat/NNN-slug`, `docs/NNN-slug`, `fix/NNN-slug` |
| Non-specification branch | `chore/slug`, `refactor/slug` |

`NNN` is exactly three digits. `slug` is lowercase alphanumeric segments separated by single
hyphens. Uppercase letters, underscores, spaces, empty segments, repeated or trailing
hyphens, missing prefixes, and unsupported prefixes fail the job. Pushes to the integration
branches `develop` and `main` are exempt, because they are merge targets rather than topic
branches.

The job validates the branch-name format only. It does not check that `specs/NNN-slug`
exists or that the branch slug matches a specification folder; that correspondence remains a
project convention enforced through the constitution and development workflow.

## Concurrency

Runs are grouped by workflow and Git ref (`${{ github.workflow }}-${{ github.ref }}`) with
`cancel-in-progress: true`, so a new run for the same pull request or branch cancels the
superseded run. Pull-request refs (`refs/pull/<number>/merge`) and branch refs
(`refs/heads/<branch>`) are different groups, so post-merge runs are not cancelled by
pull-request runs.

## Local reproduction

Frontend, once introduced:

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Backend, once introduced:

```bash
cd backend
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

## Required GitHub repository settings

These settings cannot be configured from a workflow file. A repository administrator must
apply them manually in GitHub.

### 1. Enable Actions with read-only default permissions

1. Open **Settings → Actions → General**.
2. Under **Workflow permissions**, select **Read repository contents and packages
   permissions**.
3. Save.

The workflow also declares `permissions: contents: read` explicitly and does not persist
checkout credentials.

### 2. Protect `develop` and `main`

For each branch, open **Settings → Branches → Add branch protection rule** (or
**Settings → Rules → Rulesets → New branch ruleset**) and configure:

1. **Branch name pattern**: `develop` (repeat the rule for `main`).
2. Enable **Require a pull request before merging**.
3. Enable **Require status checks to pass before merging**.
4. Search for and select the **`Frontend checks`**, **`Backend checks`**, and **`Branch name
   validation`** status checks.
5. Recommended: enable **Require branches to be up to date before merging**.
6. Recommended: enable **Do not allow bypassing the above settings** so administrators are
   also blocked by the gate.
7. Save the rule.

The workflow reports exactly three checks: `Frontend checks`, `Backend checks`, and `Branch
name validation`. The application jobs always report a conclusion: they pass when their
application is absent and run the full script contract once it is introduced. The branch job
passes when the branch name is valid. Requiring all three is therefore safe before either
application exists, and starts gating an application as soon as it appears.

Notes:

- Both jobs fail if an application's `package.json` existed at the base revision and has
  disappeared. Deleting an application is not a way to bypass the gate.
- The status check entries appear in the selector only after the workflow has run at least
  once.
- `main` does not currently exist in this repository. Create it before adding a protection
  rule for it; the workflow already includes `main` in both triggers.
- Configure the same rule for both branches so neither can merge with a failing gate.
- Do not configure branch protection through external APIs; apply it through repository
  settings as described above.

## Remaining limitations

- Removal protection depends on the base revision being present in the checkout. On the
  first push to a new branch (all-zero `github.event.before`) there is no base to compare,
  so an application absent there is treated as not introduced.
- A `frontend/` directory without `package.json` is treated as not introduced, whereas a
  `backend/` directory without the required files fails. This asymmetry follows the
  detection markers above.
- Root tooling (`husky`, `lint-staged`, `commitlint`) supports local git hooks and is not
  installed in CI, so commit-message linting is not part of this gate.
- Actions are referenced by major version tag (`actions/checkout@v4`,
  `actions/setup-node@v4`). Pin them to commit SHAs if the repository requires immutable
  action references.
- For same-repository pull requests, Actions runs the workflow file from the pull-request
  merge revision. Protect `.github/workflows/` with CODEOWNERS or a ruleset if only
  maintainers should change CI.
