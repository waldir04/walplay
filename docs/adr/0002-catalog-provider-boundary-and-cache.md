# ADR 0002: Catalog Provider Boundary and In-Memory Cache

- **Status**: Accepted
- **Date**: 2026-11-22
- **Feature**: `002-entertainment-catalog`
- **Context**: `research.md` provider, cache, and persistence decisions; constitution v1.4.0

## Context

The catalog must present provider data without exposing the provider credential,
provider DTOs, raw identifiers, popularity scores, or provider error text to the
browser. It must also degrade honestly when the provider fails: a fresh response,
a labeled stale response, or a stable error code, never a fabricated list. The
feature has no user data and no persistence requirement.

## Decision

1. **Backend-only provider boundary.** A separate Express 5 + TypeScript
   application under `backend/` is the only component that calls the provider. It
   sends the bearer token from server configuration and validates every provider
   response with Zod before mapping it to the provider-neutral catalog model. The
   SPA consumes only the internal JSON contract at `/api/catalog`.

2. **Provider adapter.** `CatalogProvider` is an internal interface with
   capabilities, section-page, and item reads. TMDB is one adapter behind that
   interface. Controllers, routes, and the browser contract never import provider
   DTOs. Replacing the provider requires a new adapter plus a capability
   declaration, not a client change.

3. **Opaque item identity.** Items are identified by
   `base64url("wl1:<mediaType>:<providerId>")`. The service decodes and validates
   the token, rejects type mismatches, and never serializes the numeric provider
   id. Invalid, mismatched, unknown, and adult-flagged items map to
   `CATALOG_NOT_FOUND`.

4. **In-memory TTL cache with labeled stale serving.** The cache is bounded,
   process-local, and keyed by every result-affecting parameter (provider, media
   type, section, language, page, and item id for detail). Fresh hits avoid
   provider traffic; identical concurrent misses share one in-flight promise.
   After the freshness window the provider is contacted again. On failure, a
   last-known-good entry may be served only inside the stale window, with
   `meta.stale = true`, `meta.source = "stale-cache"`, and the original fetch
   time. When no usable entry exists the stable error code is returned.

5. **No repository or database layer.** Under constitution v1.4.0, repositories
   exist only for persisted data. This feature reads an external provider and
   stores nothing beyond a disposable performance cache, so the request flow is
   `routes → controllers → services → provider adapter`. Introducing Prisma or an
   empty repository would be speculative and would violate Principles I and XXI.

## Rejected Alternatives

- **Provider key in the browser** — violates Principles XIII and XX.
- **Vite development proxy only** — still ships the credential path with the
  frontend and provides no deployable production boundary.
- **Serverless edge function** — not in the approved architecture; a distinct
  independently deployable Express service is the approved option.
- **SSR or server-side rendering** — not in the approved frontend architecture and
  unnecessary for this catalog.
- **Persisting provider payloads in PostgreSQL** — no user data, caching rules
  require freshness control, and the constitution forbids unused persistence.
  Stale serving must be explicit, not silently durable.
- **Client-side caching as the source of truth** — credentials and provider DTOs
  would cross the boundary, and concurrent reads could not be coordinated.
