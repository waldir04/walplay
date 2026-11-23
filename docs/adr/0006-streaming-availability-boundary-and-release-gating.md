# ADR 0006: Streaming Availability Boundary and Release Gating

- **Status**: Accepted
- **Date**: 2026-11-23
- **Feature**: `006-streaming-availability`
- **Context**: `spec.md`, `research.md`, `contracts/`, constitution v1.5.0

## Context

Walplay needs an honest availability surface: where a title may be legally watched in an
explicitly identified region, with freshness, staleness, missing-information, unsupported-region,
and failure states that never imply playback or unavailability the source did not establish. The
existing TMDB integration is the initial content metadata provider. TMDB exposes watch-provider
data powered by JustWatch, but attribution, logo permission, commercial terms, and Colombian
coverage are not yet approved.

## Decision

1. **One provider-neutral boundary.** Availability is a title sub-resource behind the existing
   `/api/catalog` boundary. `AvailabilityProvider` exposes only `fetchAvailability`, and the TMDB
   adapter is the single implementation. Provider ids, DTO field names, raw errors, prices, plans,
   stream URLs, and per-provider links never cross the API. Replacing the source requires a new
   adapter, not a service, route, or client rewrite.

2. **Two additive endpoints.** `GET /api/catalog/:mediaType/titles/:itemId/availability` returns one
   region's result; `GET /api/catalog/availability/regions` returns the validated allowlist. Both
   set `Cache-Control: no-store`, reject unknown query parameters, and reuse the existing error
   envelope.

3. **Region allowlist, starting with Colombia.** The backend owns the allowlist and the parser
   requires `CO`. A valid but unsupported region returns the successful `unsupported-region` state
   without a provider call and without falling back to another market. The frontend fetches the list
   and never duplicates it.

4. **Freshness and retention.** A dedicated `CatalogCache` keeps results fresh for 6 hours, serves
   stale results for up to 7 days during provider failure, and is bounded at 500 entries with
   single-flight. Freshness is `stale` after 24 hours based on the earlier of a valid source
   timestamp and Walplay's observation time. TMDB supplies no update timestamp, so the interface
   labels a Walplay check time and never claims source freshness. Offers older than the 7-day
   retention window are withheld.

5. **Aggregate destination only.** At most one source-supplied URL per result is accepted. It must
   be HTTPS, use an allowlisted host, carry no credentials, and match the active region when a
   `locale` parameter exists. The URL is used exactly as supplied and is never constructed or
   rewritten. Provider rows are never links; there is no playback, rental, purchase, subscription,
   or download affordance.

6. **Logos and attribution are gated.** Provider logos are omitted unless
   `AVAILABILITY_LOGOS_ENABLED=true` after brand permission. The UI shows a text-only JustWatch
   attribution until the official treatment is approved, and the existing TMDB notice remains
   visible.

7. **Disabled by default.** `AVAILABILITY_ENABLED` and `VITE_AVAILABILITY_ENABLED` default to
   `false`. When the backend flag is off the router is not mounted: the title path returns
   `404 ROUTE_NOT_FOUND` and the regions path falls through to the existing `/:mediaType/:section`
   route and returns `400 VALIDATION_ERROR`. When the frontend flag is off no section is rendered and
   no request is issued. No data migration is required to enable or disable the feature.

## Release gates

- **OD-SA4**: approval of attribution wording, logo treatment, placement, and per-provider logo
  permission.
- **OD-SA5**: commercial classification and TMDB/JustWatch licensing.
- **OD-SA7**: representative Colombian coverage and category-accuracy validation.
- **OD-SA8**: final product decision on ad-supported availability; the `ads` category remains an
  isolated mapping so it can be removed without redesign.

Production enablement requires OD-SA4, OD-SA5, and OD-SA7 to be resolved, plus the OD-SA8 decision
for the initial category set. OD-SA9 (episode-level availability) remains future scope.

## Consequences

- The capability is testable end to end with flags enabled and stays dark in production until the
  legal and coverage gates are resolved.
- Availability cannot take down the detail page: it has its own provider, cache, service, query, and
  section, and failures are isolated and localized with retry.
- Removing ad-supported availability or replacing the provider is contained to one mapping or one
  adapter.
- No new runtime dependency, database, server persistence, top-level route, or browser-stored
  provider data is introduced.
