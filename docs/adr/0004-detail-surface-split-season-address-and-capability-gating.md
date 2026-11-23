# ADR 0004: Detail Surface Split, Season Address Semantics, and Capability Gating

- **Status**: Accepted
- **Date**: 2026-11-22
- **Feature**: `004-entertainment-details`
- **Context**: `research.md`, `data-model.md`, the detail API contract, and the plan's Complexity Tracking

## Context

A title detail must show a provider-backed core identity, facts, overview, seasons and episodes for
TV, cast and crew, similar titles, and a movie collection. The approved stack has no persistence, no
additional state library, and the existing catalog cache, item card, and detail destination must be
reused. TMDB failures on a secondary surface must not take the core title down, and no provider field
names, identifiers, or credentials may cross the JSON boundary.

## Decision

1. **One core endpoint, four independent secondary endpoints.** `GET /:mediaType/titles/:itemId/detail`
   returns the core plus meta. Credits, similar, collection, and season are separate endpoints with
   their own cache entries and metadata. Every detail route is `Cache-Control: no-store`. The core
   query always runs, even when router state supplies a validated card; the card is only a first-paint
   seed.

2. **Provider-neutral mapping at the adapter boundary.** Each provider response is validated and then
   mapped into internal models. Placeholder text (`n/a`, `na`, `tbd`, `unknown`, `untitled`, dashes),
   zero or implausible values, and invalid dates are omitted rather than replaced. Ratings require a
   viable value and vote count and remain attributed to TMDB. The raw provider id is used only to
   build the opaque item id and to read collection membership; it never reaches the response.

3. **Collection membership is read from the cached core entry.** A movie collection is fetched only
   when the cached core envelope carries a provider collection id. TV collection requests are not
   found. The collection cache key is derived from the current movie and language, so it is populated
   once per title even though the provider collection id is used in the request.

4. **One conditional original-language detail request.** When the localized overview is unusable and
   `original_language` differs, the adapter makes exactly one additional detail request in the
   original language. Tagline follows the same fallback. The cache key stays the requested language.

5. **The address owns the selected TV season.** `/title/:itemId?season=N` is the source of truth.
   Invalid, out-of-range, or missing values resolve to the first regular season, then specials. The
   page writes that effective season once with `replace`, preserving other query parameters, router
   state, and history depth. Season changes are user actions only. A `DETAIL_SEASON_NOT_FOUND`
   response triggers one fallback to the initial season; after that the episode area reports its own
   error. Movies ignore the parameter and never fetch a season.

6. **Secondary surfaces are gated and contained.** Credits, similar, collection, and season queries
   are enabled only after the core succeeds and only for supported media types. Each surface owns its
   loading, empty, stale, and error presentation; a failed surface leaves the core and other surfaces
   usable, and its retry re-requests only itself.

7. **Capabilities gate optional actions.** `DETAIL_CAPABILITIES.trailer` defaults to `false`. Even
   when enabled, the trailer action renders only with a validated YouTube trailer URL, and it is an
   external link. No playback, availability, personal-list, disabled, or coming-soon controls are
   added.

8. **Document identity follows the resolved title.** While loading, the route title is static. On
   success the page sets a title override of localized title plus content type, and the route title
   resumes when the page unmounts. The page keeps exactly one `h1` in every state.

## Rejected Alternatives

- **One aggregate detail response** — couples independent failures, increases payload size, and makes
  partial retry impossible.
- **Trusting router state as the detail** — would skip the always-required provider refresh and break
  direct links, reloads, and stale data handling.
- **Inventing fallback values such as `0`, `N/A`, or dashes** — fabricates content and contradicts
  the omission contract.
- **Putting the season in a separate state store** — loses direct links, reload behaviour, and
  back/forward semantics that the address already provides.
- **Pushing a history entry per season change** — pollutes history and makes Back abandon the title.
- **An initial-season write on every render** — creates redundant history mutations; the effective
  season is compared with the address first.
- **Embedding the trailer** — adds a third-party player surface that the product explicitly avoids.
- **A separate related entity slice** — related titles reuse the catalog card and item model, so a
  separate slice would import a sibling entity and violate Feature-Sliced Design.

## Consequences

- The core stays usable when any secondary surface fails, and each surface retries independently.
- Direct links and reloads restore page-one core detail and the requested season; deeper pagination
  remains out of scope.
- Cache entries are language- and season-specific, so a language change refetches the core and the
  active season while preserving the address.
- Providers can fix or remove secondary data without changing the client contract; unusable data is
  omitted rather than displayed as placeholders.
- The trailer capability can be enabled later without a client contract change.
- A very large episode list (60 episodes) and a 40-season selector were measured in the responsive
  tests. Both are rendered in full, in provider order, with list semantics and no truncation, so
  virtualization is not justified at these bounds; introducing it later must preserve every
  episode's list membership and reachability.
