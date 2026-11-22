# Walplay Backend

Server-side catalog API for Walplay. The SPA never calls the external provider
directly: this application is the only component that holds the provider
credential.

## Prerequisites

- Node.js 22 LTS (see `.nvmrc`)
- npm with the committed `package-lock.json`

## Local setup

```bash
npm ci
cp .env.example .env.local
# set TMDB_ACCESS_TOKEN and CORS_ALLOWED_ORIGINS in .env.local
npm run dev
```

The server listens on `PORT` (default `4000`). It fails fast when required
configuration is missing or invalid, and prints field names only — never values.

## Script contract

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the API with TypeScript watch mode |
| `npm run lint` | ESLint, zero warnings |
| `npm run typecheck` | Strict TypeScript, no emit |
| `npm run test` | Unit and route-integration tests with coverage |
| `npm run build` | Emit production JavaScript to `dist/` |
| `npm start` | Run the built server |

## Provider credential handling

- `TMDB_ACCESS_TOKEN` is read only by `src/config/env.ts` and passed only to the
  provider client.
- The token is never placed in a URL, query string, image URL, response body,
  log line, error envelope, or source map.
- Provider payloads, titles, genres, and provider error bodies are never logged.
- Responses use stable catalog error codes; provider status text is not exposed.

## Configuration

See `.env.example` for the complete inventory. CORS uses an exact-origin
allowlist with no wildcards and no credentials. In production,
`CORS_ALLOWED_ORIGINS` is required.

## Cache behavior

The catalog uses a bounded, process-local TTL cache. Entries are fresh for
`TMDB_CACHE_TTL_SECONDS`; after that the provider is contacted again. If the
provider fails, a labeled stale entry may be served until
`TMDB_CACHE_STALE_SECONDS`, with `meta.stale = true` and
`meta.source = "stale-cache"`. No database or persisted storage is used; the
cache is lost on restart.

## Security verification

Recorded checks:

- No provider token, provider base URL, provider field name, provider error
  body, or stack trace is present in API responses or logs.
- Image URLs contain no credential.
- Deployment can apply a Content Security Policy that allowlists only the API
  origin and the provider image host.
- Provider attribution and terms remain a release gate (OD-13).

## API surface

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Liveness only; never calls the provider |
| `GET /api/catalog/capabilities` | Declared sections in order |
| `GET /api/catalog/:mediaType/:section?language=&page=` | Section page, including the trending preview |
| `GET /api/catalog/:mediaType/titles/:itemId?language=` | Minimal card fields for the detail destination |

Every route validates params and query keys with strict Zod schemas. Responses use
`{ data, meta }` or the single `{ error: { code, message, details? } }` envelope.
`Cache-Control: no-store` keeps freshness/stale metadata visible. CORS allows only
the configured exact origins, `GET`/`OPTIONS`, no credentials, and `Vary: Origin`.

## Quality gates

Latest run in `backend/`:

- `npm run lint` — pass, zero warnings (type-aware rules; `any`, `@ts-ignore`,
  floating promises, and unsafe assertions are rejected).
- `npm run typecheck` — pass with all strict flags.
- `npm run test` — 29 files, 176 tests, zero unexpected warnings.
- Coverage — 98.06% statements/lines, 93.95% branches, 97.8% functions. Global
  80% and the 90% per-file thresholds for the mapper, cache, domain errors, and
  service error classification pass.
- `npm run build` — pass.

## Security verification record

- No credential appears in source (outside the configuration module and test
  fixtures), responses, logs, error envelopes, or route tests.
- Provider field names, payloads, status text, and stack traces are absent from
  every non-2xx response; error middleware maps unknown exceptions to
  `INTERNAL_ERROR`.
- Logger output is field-only; tokens, titles, payloads, URLs with credentials, and
  provider error bodies are not accepted fields.
- Image URLs are composed on the server from the documented image host and
  approved sizes; they carry no credential.
- The built server naturally contains provider configuration field names (it is
  not browser-delivered); the frontend bundle scan is recorded in
  `frontend/README.md`.
- Legal confirmation of provider terms, attribution, artwork, caching, and rate
  limits remains release gate OD-13.

## CI and pre-push

`.github/workflows/ci.yml` detects `backend/` automatically, requires
`backend/package.json`, `backend/package-lock.json`, and `backend/.nvmrc`, and runs
the same four scripts as the frontend job. `.husky/pre-push` runs both
applications when present and fails when an introduced application is missing its
lockfile or Node pin.

## Release dependency

Use of the provider's terms, attribution mark, artwork, caching, and rate
limits must be confirmed by legal review before production release (OD-13).
Until confirmed, this is a documented release blocker.
