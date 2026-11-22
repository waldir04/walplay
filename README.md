# Walplay

Walplay is an entertainment companion for deciding what to watch and keeping a personal record of films and series across streaming services. The product direction is defined in the [Product Overview](docs/product-overview.md); the current codebase implements the application foundation and the entertainment catalog.

## Overview

Viewing is spread across several streaming services, which makes choosing something to watch and remembering viewing intentions harder than it should be. Walplay aims to bring discovery, title information, and a personal viewing record into one calm, provider-independent place.

The current implementation is a React single-page application backed by an independent JSON API:

- The browser renders the catalog and never calls the external metadata provider directly.
- The backend is the only component that holds the provider credential and the only source of catalog data.
- Provider failures degrade the affected catalog surface with stable errors or explicitly labeled stale data instead of fabricated results.

The broader MVP scope, including personal lists, availability information, and watched status, is described in the product documentation and remains subject to the product decisions recorded there.

## Key features

- **Entertainment catalog browsing** for movies and TV shows, with landing previews for trending, popular, and top-rated sections, paginated category lists, and a minimal title detail view.
- **Accessible, responsive application shell** with keyboard navigation, focus management, route announcements, and mobile-to-desktop layouts.
- **English and Spanish localization**, including persisted language preference and localized configuration and error states.
- **Backend catalog API** with strict request and provider-response validation, opaque item identifiers, and a stable `{ data, meta }` / `{ error }` response contract.
- **Credential isolation and provider attribution**: the provider token stays on the server; every provider-data surface carries attribution.
- **Honest degraded states** for loading, empty, error, rate-limited, timeout, and stale-cache outcomes.
- **Fail-fast configuration** in both applications, with field-only warnings and no secret values in logs or browser bundles.
- **Automated quality gates** for linting, type checking, tests, build, accessibility, and coverage.

Current catalog scope excludes search, filters, watchlists, availability, playback, accounts, authentication, and persistence. See [frontend scope boundaries](frontend/README.md#scope-boundaries) for the recorded boundary.

## Repository structure

| Path | Purpose |
| --- | --- |
| [`frontend/`](frontend/) | React SPA: application shell, routes, catalog UI, localization, and frontend tests. |
| [`backend/`](backend/) | Express and TypeScript catalog API, provider adapter, cache, and API tests. |
| [`docs/`](docs/) | Product overview, CI documentation, architecture decision records, and Walday design references. |
| [`specs/`](specs/) | Spec Kit feature artifacts: specifications, plans, tasks, data models, contracts, and quickstarts. |
| [`.specify/`](.specify/) | Project constitution, Spec Kit templates, scripts, and extensions. |
| [`.github/workflows/`](.github/workflows/) | Continuous integration and pull-request source validation. |
| [`.husky/`](.husky/) | Repository Git hooks for pre-commit, commit message, and pre-push validation. |
| [`package.json`](package.json) | Root development tooling: Husky, lint-staged, and commitlint. |

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript 5, Vite 7, Tailwind CSS 4, React Router 7, TanStack Query 5, Zod 4, i18next / react-i18next |
| Backend | Node.js 22 LTS, Express 5, TypeScript 5, Zod 4 |
| Testing | Vitest, React Testing Library, jest-dom, vitest-axe, V8 coverage |
| Tooling | npm, ESLint, Prettier, Husky, lint-staged, commitlint, GitHub Actions |

The catalog API uses a bounded in-memory cache. It has no database or persistence layer.

## Getting started

### Prerequisites

- Node.js 22 LTS. Both applications pin the version in their `.nvmrc` and require `>=22.12.0`.
- npm with the committed lockfiles.
- A TMDB access token for the backend catalog. It is server-side only and must never be exposed to the browser.
- A current desktop or mobile browser for the frontend.

Install root dependencies once to enable the Git hooks:

```bash
npm install
```

### Application setup

Each application has its own setup, environment inventory, and script contract:

- **Frontend:** follow the [frontend setup instructions](frontend/README.md#setup). The frontend requires `VITE_APP_ENV` and the internal API origin in `VITE_API_BASE_URL`.
- **Backend:** follow the [backend local setup instructions](backend/README.md#local-setup). The backend requires `TMDB_ACCESS_TOKEN` and an exact-origin `CORS_ALLOWED_ORIGINS` value.

Both applications provide `.env.example` files. Full environment details, defaults, and validation behavior are documented in the application READMEs.

## Development workflow

The project follows the Spec Kit flow defined by the constitution: specification, then plan with an explicit Constitution Check, then tasks, then implementation. Before creating or changing a specification, plan, task list, or application code, review the [product overview](docs/product-overview.md) and the [constitution](.specify/memory/constitution.md).

Branch and review conventions:

- Specification branches use `feat/NNN-slug`, `docs/NNN-slug`, or `fix/NNN-slug`, matching the folder under `specs/`.
- Non-specification branches use `chore/slug` or `refactor/slug`.
- Pull requests into `main` must originate from `develop`.
- Commit messages follow Conventional Commits, enforced by commitlint.

Quality gates:

- Every application must pass `lint`, `typecheck`, `test`, and `build`.
- Husky runs Prettier and frontend ESLint on staged files before commit, and the full application checks before push.
- CI runs the same application checks on pull requests and pushes to `develop` and `main`, plus branch-name validation.

See [Continuous Integration](docs/ci.md) for the complete workflow, detection rules, and local reproduction commands.

## Documentation

- [Product Overview](docs/product-overview.md)
- [Project Constitution](.specify/memory/constitution.md)
- [Continuous Integration](docs/ci.md)
- [Architecture Decision Records](docs/adr/)
- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)
- [Feature specifications](specs/)
- [Walday design references](docs/reference/walday/)
- [Repository instructions for agents](AGENTS.md)

Feature-level implementation and verification details live in the application READMEs and the relevant `specs/NNN-slug/` directory. For example, the catalog quickstart is documented in [specs/002-entertainment-catalog/quickstart.md](specs/002-entertainment-catalog/quickstart.md).

## Contributing

There is no separate contributor guide. Contributions follow the constitution and the workflow above:

1. Review the product overview and constitution, and identify any conflict explicitly.
2. Create a branch using the naming convention and, for specification work, the matching `specs/NNN-slug/` artifacts.
3. Implement with tests and the required loading, empty, error, and success states.
4. Run `lint`, `typecheck`, `test`, and `build` in each affected application.
5. Update documentation or an ADR when architecture, contracts, configuration, or behavior changes.
6. Open a pull request into `develop` and ensure CI is green.

Reviews verify constitutional compliance as well as functional correctness, including type safety, validation at boundaries, accessibility, responsive behavior, security, documentation, and test quality.
