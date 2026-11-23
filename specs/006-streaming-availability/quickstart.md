# Quickstart: Streaming Availability

**Feature**: `006-streaming-availability` | **Date**: 2026-11-23

This guide validates the availability experience end to end. It is a run/validation guide, not an
implementation guide. Shapes and invariants live in [contracts/](./contracts/) and
[data-model.md](./data-model.md).

## Prerequisites

- Node.js 22.12+ (pinned by both application manifests).
- Repository dependencies installed.
- A TMDB API read access token for manual provider checks. Automated tests never call TMDB.
- A title with current Colombian availability for the happy path. Use TMDB to find one and record its
  opaque Walplay address; do not rely on a fixed title remaining available.
- A title with no Colombian offers for the no-information path.
- A second region for selector testing, used only as a temporary local configuration after checking
  that the provider returns data for it. Do not treat this as a coverage claim.

## Local environment

Backend (`backend/.env.local`), in addition to the existing TMDB token:

```env
NODE_ENV=development
PORT=4000
CORS_ALLOWED_ORIGINS=http://localhost:5173
TMDB_ACCESS_TOKEN=<your TMDB v3 read access token>

# Enable the feature only for local validation.
AVAILABILITY_ENABLED=true
AVAILABILITY_LOGOS_ENABLED=false
AVAILABILITY_SUPPORTED_REGIONS=CO
AVAILABILITY_CACHE_TTL_SECONDS=21600
AVAILABILITY_CACHE_STALE_SECONDS=604800
AVAILABILITY_CACHE_MAX_ENTRIES=500
AVAILABILITY_FRESHNESS_WINDOW_SECONDS=86400
AVAILABILITY_DESTINATION_HOSTS=www.themoviedb.org,themoviedb.org
```

Frontend (`frontend/.env.local`):

```env
VITE_APP_ENV=local
VITE_APP_VERSION=0.0.0
VITE_API_BASE_URL=http://localhost:4000
VITE_AVAILABILITY_ENABLED=true
```

Do not commit real tokens. The feature flags and logo flag default to `false` in
`.env.example`; production enablement is a release decision, not a local convenience.

## Run

From the repository root:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

Open `http://localhost:5173` and navigate to a movie or TV detail page.

## Quality gates

Run the same script contract in each application:

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run test
npm --prefix frontend run build

npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run test
npm --prefix backend run build
```

Expected: all pass with zero unexpected warnings. Coverage remains at least 80 % globally and about
90 % on availability mapping, normalization, state mapping, region storage, and query behavior.

## Automated validation

Provider traffic is mocked in both suites. Useful focused commands:

```bash
npm --prefix backend run test -- availability
npm --prefix backend run test -- env
npm --prefix frontend run test -- availability
npm --prefix frontend run test -- region
npm --prefix frontend run test -- title-detail
```

The suites must cover:

- TMDB watch-provider DTO validation, category mapping, fixed order, duplicate collapse, missing
  names, logo optionality, invalid destinations, missing region, and empty groups.
- Region allowlist validation, `CO` requirement, unsupported region without a provider call, and
  invalid region syntax.
- Fresh, cache, stale-cache, and no-cache outcomes; 24-hour freshness and seven-day retention
  boundaries; invalid and future source timestamps; provider 404 and provider failures.
- Available, no-information, unsupported-region, stale, and error UI states.
- Capability off: no section, no requests.
- Capability on: section, region line, category groups, provider names/logos, freshness, disclaimer,
  attribution, and destination.
- Region change: query key changes, old-region offers disappear, announcement fires once.
- Language change: region and data remain, labels update, no refetch.
- Stored region: valid, malformed, wrong version, unsupported code, storage unavailable.
- External link: HTTPS, new tab, leaving notice, no per-provider links.
- Provider failure: the core detail page remains usable; the section shows retry.
- Axe checks, keyboard operation, heading/list semantics, target sizes, color independence, and
  200 % zoom.
- i18n key parity and usage in English and Spanish.
- Documented contract examples parsing against both the backend response schemas and the frontend
  Zod models.
- Regions-list failure: region line and retry render, no empty selector; stale-state retry; no log
  entry containing the region value or destination query string.

## Manual scenarios

Record the title addresses and region codes used so the pass can be repeated.

### US1 — See where a title can be watched

1. Open a movie detail with known Colombian offers.
   - The “Where to watch” section appears after the action area and before the seasons/credits area.
   - The region text names Colombia and `CO`.
   - Category groups are distinguishable in text: subscription, free, free with ads, rent, buy.
   - Providers appear in source priority order; a provider in two categories appears in both.
   - Names are always visible. If `AVAILABILITY_LOGOS_ENABLED=false`, logos are absent and no broken
     images appear. To verify logo rendering locally, set the flag to `true` only after confirming
     the provider-logo display decision; otherwise keep it `false`.
   - No control starts playback, downloads, subscribes, rents, or purchases.
2. Open a TV detail with known Colombian offers.
   - The same section, categories, provider rules, and region context apply.
   - No episode or season availability control appears.
3. Use browser devtools to inspect the availability response.
   - It contains provider names and optional logo URLs only; no provider ids, TMDB field names,
     tokens, stream URLs, or per-provider links.

### US2 — Trust the region and freshness

1. Open the detail with no stored region preference.
   - Colombia is the default active region and is stated in text.
2. Change the region to another validated code (temporarily add it to
   `AVAILABILITY_SUPPORTED_REGIONS` for this check).
   - The region text and offers update.
   - No offer from the previous region remains visible or announced.
   - The selector change is announced once.
3. Reload the page or reopen the detail.
   - The chosen region is remembered on the device.
4. Set the stored region to a valid but unsupported code:
   ```js
   localStorage.setItem(
     'walplay.availability-region.v1',
     JSON.stringify({ version: 1, region: 'FR' })
   )
   ```
   Reload.
   - The region line names France and `FR`; the unsupported message appears.
   - The selector offers only supported regions; no fallback to Colombia is silent.
5. Verify the freshness line.
   - With TMDB, it says “Checked by Walplay on …”, not “Updated by the source”.
   - The informational notice is visible.
6. With the automated test suite, verify the 24-hour stale boundary and last-known banner.
   - A stale result is labeled as last known and shows the date/time.
   - It is never described as current.
   - The stale banner offers a retry that refetches availability and the region list.

### US3 — Understand missing, incomplete, and failed data

1. Open a title with no Colombian offers.
   - The no-information state appears with a region-specific explanation.
   - It says this does not prove the title is unavailable.
   - No provider or category is fabricated.
2. Block the TMDB request in devtools or point `TMDB_BASE_URL` at an invalid local host after the
   page loads, then retry.
   - With no usable cache, the section shows a localized error, retry, and the rest of the detail page
     remains usable.
   - With a usable cache, the section shows last-known offers with a stale label and retry.
3. Restore the provider and retry.
   - The section recovers without reloading the detail page.
4. Change region or navigate quickly while a request is pending.
   - The newest region/title wins; an older response never replaces the current offers.
5. Block only `GET /api/catalog/availability/regions` and reload the detail.
   - The error state shows the region line and a retry, not an empty region selector.
   - Retry refetches both queries and recovers without reloading the page.

### US4 — Change region and use an authorized destination

1. With a region that has an aggregate destination, inspect the section.
   - One external destination is offered, labeled as an external availability page.
   - The notice names the destination host and warns that the visitor is leaving Walplay.
2. Activate it.
   - It opens in a new tab; the detail page remains in place.
   - Returning preserves the title, region, and availability state.
3. Inspect provider rows.
   - Provider names and logos are not links.
   - No provider URL is constructed, guessed, or inferred.
4. Temporarily return an invalid or untrusted destination from a test fixture.
   - It is omitted; no search engine, affiliate link, or redirect replacement appears.

### US5 — Devices, zoom, and assistive technology

1. Check 360, 768, 1024, and 1440 px and 200 % zoom.
   - No horizontal page scrolling, clipped controls, overlapping content, or lost provider names.
2. Keyboard only:
   - Reach the region selector, retry, and external destination in logical order.
   - Every control has a visible focus indicator and no keyboard trap.
3. Screen reader:
   - The section heading, category headings, provider names, region, freshness, stale/empty/error
     states, disclaimer, and external-link warning are understandable.
   - A region change is announced once.
   - Provider logos are decorative when the name is adjacent; the name is always read.
4. Switch English ↔ Spanish on a loaded detail.
   - All Walplay-owned copy, category labels, state messages, notices, dates, and announcements
     update.
   - Country names update; the region code and provider names remain.
   - No availability request is repeated solely for the language change.
5. Confirm the section does not rely on color alone for category, stale, empty, error, or selected
   region.
6. Verify text and interface contrast in both locales, and enable the operating system's
   reduced-motion preference.
   - Essential text and controls meet WCAG 2.2 AA contrast.
   - No availability animation runs for attention, and no media autoplays.

### Legal and attribution checks

1. The JustWatch attribution is visible in or adjacent to the section.
2. The existing TMDB attribution remains visible on the detail page.
3. No JustWatch logo or brand treatment is invented; text-only attribution is used until OD-SA4 is
   approved.
4. Provider logos are absent when `AVAILABILITY_LOGOS_ENABLED=false`.
5. No playback, stream, download, subscription, rental, purchase, or account action exists.
6. No per-provider link or constructed provider URL exists.
7. The informational notice states that availability is not a guarantee and Walplay does not host or
   stream content.

## Release gate

Local validation with both flags enabled does not approve production. Before production enablement:

- Resolve OD-SA4 (JustWatch/TMDB attribution, logo treatment, provider logo permission).
- Resolve OD-SA5 (commercial classification and licensing).
- Resolve OD-SA7 (representative Colombian coverage and category accuracy).
- Decide OD-SA8 (ad-supported scope) and OD-SA9 (future episode-level scope remains out of scope).
- Confirm the final destination policy and host allowlist.
- Complete the SC-003/SC-004 usability validation (participants correctly identify the offer
  category and correctly explain that a no-information result is not proof of unavailability).
- Re-run the full quality gates and the manual scenarios with the production configuration.

If any gate is unresolved, keep `AVAILABILITY_ENABLED=false` and
`VITE_AVAILABILITY_ENABLED=false`. Disabling the flags restores the pre-feature detail surface with no
data migration or rollback step.
