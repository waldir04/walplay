# ADR 0007: Trailer Inventory and Embedded Playback Boundary

- **Status**: Accepted
- **Date**: 2026-11-24
- **Feature**: `008-trailers-video-content`
- **Context**: `spec.md`, `research.md`, `contracts/`, constitution v1.5.0

## Context

Walplay needs a promotional video surface on movie and TV detail pages that never hosts, proxies,
downloads, scrapes, or inspects video. The capability is release-gated: legal, embedding/link-out
authorization, consent, attribution, and regional decisions (OD-T2 through OD-T11) are unresolved.
The existing TMDB integration is the approved metadata provider; TMDB's documented movie and TV
`/videos` operations are the initial inventory source. YouTube is the only initial platform.

The feature also replaces feature 004's external-only trailer link so that one trailer pathway
exists. It does not make in-app playback of the title itself available.

## Decision

1. **One provider-neutral inventory boundary.** `TrailerProvider` exposes only `fetchTrailers` and
   the TMDB adapter is the single implementation. Provider field names, record ids, numeric provider
   ids, `size`, country, ratings, raw errors, and stream references never cross the API. Every
   provider payload is validated with Zod before mapping.

2. **One additive endpoint.** `GET /api/catalog/:mediaType/titles/:itemId/videos` returns a bounded,
   normalized, server-ranked inventory plus freshness metadata, sets `Cache-Control: no-store`,
   rejects unknown query parameters, and reuses the existing error envelope. The route is mounted
   only when `TRAILERS_ENABLED=true`; otherwise the existing `ROUTE_NOT_FOUND` behavior applies.

3. **Eligibility and normalization.** Only YouTube records with an 11-character identifier, a usable
   title, and an eligible type (trailer, teaser, featurette, clip, behind-the-scenes, bloopers) are
   kept. Duplicates collapse by `youtube:<videoId>` using the documented merge rule. The official
   flag is tri-state at the provider boundary and collapses to a boolean for display only. Language
   is kept only when it is a valid ISO 639-1 code that `Intl.DisplayNames` resolves. Publication
   dates are kept only when parseable and not future-dated.

4. **Server-constructed, allowlisted destinations.** The embed and canonical watch URLs are built
   server-side from the validated identifier and the configured host allowlists
   (`TRAILERS_EMBED_HOSTS`, `TRAILERS_EXTERNAL_HOSTS`). The only permitted frame parameters are the
   platform's documented `autoplay` and `playsinline`; no visitor identifier, analytics, advertising,
   or personalization parameter is added. A record without an authorized destination is dropped.

5. **TMDB only, YouTube embed only.** No download, proxy, mirror, transcode, stream extraction,
   embeddability probe, DRM/region/age bypass, player SDK, postMessage control, or playback telemetry
   exists. Walplay does not inspect player internals; the frame is cross-origin and platform
   controls remain intact.

6. **Ranking and cache.** The server returns at most 24 videos ordered by type rank, official first,
   provider order, then identifier. A dedicated `CatalogCache` uses a `provider + trailers +
   mediaType + providerId` key with a 24-hour fresh window and 7-day retention, single-flight, and a
   bounded entry count. Empty provider results are the `no-videos` state; data older than retention is
   `CATALOG_UNAVAILABLE`. The interface language is never part of the cache key; it only refines
   presentation order on the client.

7. **Activation-only embedded playback.** No iframe, script, image, font, style, preconnect, DNS
   prefetch, preload, prefetch, cookie, or storage write for the platform exists before explicit
   visitor activation. Activation loads exactly one privacy-enhanced frame
   (`www.youtube-nocookie.com`) in a reserved 16:9 area with
   `referrerPolicy="strict-origin-when-cross-origin"`, an accessible name containing the video title
   and platform, and no overlay. Replacing a video unmounts the previous frame first; only the newest
   choice may create a frame.

8. **Sizing floor and timeout-only detection.** The player area must measure at least 356 CSS px wide,
   which yields a 16:9 viewport of at least 356 × 200.25 px and satisfies the platform's 200 × 200
   minimum. Below that width no frame is rendered; the interface states the reason and offers the
   canonical external destination. Because a cross-origin frame exposes no reliable error signal, the
   only detected failure is a 15-second load timeout, which unmounts the frame and shows a localized
   unavailable explanation that enumerates possible causes without asserting one. The external option
   is rendered adjacent to the player in loading, ready, and unavailable states regardless of failure.

9. **Privacy and disclosure.** The section names the platform, states that activation loads
   third-party content, and links the platform's terms and privacy policy adjacent to every play
   action. The copy does not claim that the privacy-enhanced host eliminates third-party processing.
   The canonical external link is always labeled with a leaving-Walplay warning in its accessible
   name.

10. **Release gating.** `TRAILERS_ENABLED` and `VITE_TRAILERS_ENABLED` default to `false`. The
    capability is implemented and tested with both flags enabled but must not be enabled in a shared
    or production environment until the Product Overview amendment, the feature 004 amendment, and
    OD-T2 through OD-T11 are resolved.

## Consequences

- Replacing the inventory source requires a new `TrailerProvider` adapter, not a service, route, or
  client rewrite.
- The API remains the only place provider credentials, identifiers, and field names exist.
- A failed inventory never blocks detail identity, overview, seasons, credits, related titles,
  availability, or personal-list actions.
- If a Content Security Policy is introduced, it must allow
  `frame-src https://www.youtube-nocookie.com` and must not add `noreferrer` to the frame context.
- The 356 px floor is stricter than the platform's raw minimum; it is a deliberate accessibility
  decision that preserves a 16:9 presentation.
