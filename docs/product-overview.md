# Walplay — Product Overview

**Status**: Authoritative product context for Walplay.
**Version**: 1.0.0
**Date**: 2026-11-18

This document defines **what** Walplay is intended to accomplish and which product requirements guide its development. The engineering standards that define **how** Walplay is built are in `.specify/memory/constitution.md`. Where the two documents overlap, this overview governs product behavior and the constitution governs engineering standards.

Walplay belongs to the same product family as Walday. It shares Walday's brand identity and engineering standards, but it does not share Walday's daily-planning scope.

**Authoritative references**: `.specify/memory/constitution.md` defines Walplay engineering governance and the mandatory shared visual identity. `docs/reference/walday/constitution.md`, `docs/reference/walday/design-system.md`, `docs/reference/walday/branding.md`, and `docs/reference/walday/logo.svg` are the authoritative baseline for the shared Wal brand. This overview is authoritative for product scope and behavior. Where these documents overlap or conflict, the Walplay constitution governs engineering and visual identity, and this overview governs product requirements.

## How to Read This Document

Product statements use four decision labels:

- **Confirmed** — explicitly required by the Walplay constitution, the shared Walday brand reference, or another approved project decision.
- **Proposed** — product direction established by this document, consistent with the constitution, and still subject to user research or technical validation.
- **Open** — not decided. Open decisions are listed in Section 12 and must not be treated as requirements.
- **Confirmed conditional** — required by the constitution only when an open product decision enables the related capability; the condition is stated in the rule.

A feature specification MUST NOT silently widen the scope defined here. When a requirement is ambiguous or conflicts with this document, the conflict MUST be identified and resolved before implementation.

## 1. Product Overview

Walplay is a personal entertainment companion that helps people decide what to watch and keep track of the films and series they care about across streaming services. *(Proposed product framing; the entertainment domain is Confirmed.)*

### The Problem

People increasingly spread their viewing across multiple streaming services. This creates a recurring set of frustrations:

- Deciding what to watch requires checking several services and remembering what each one offers.
- Watchlists and viewing intentions end up scattered across notes, memory, and provider-specific lists.
- Availability is unclear: a title may be present in one region, absent in another, or move between services.
- Browsing interfaces are optimized for each provider's catalog rather than for the viewer's personal intent.

This problem statement is a **working hypothesis** based on the product direction. It has not yet been validated through primary user research.

### What Walplay Is

In its intended form, Walplay is:

- A calm, personal place to discover entertainment titles and decide what to watch next.
- A provider-independent record of what the user wants to watch and what they have watched.
- A clear, honest source of availability information, with limitations stated explicitly.
- Part of the Wal family: the same visual identity and engineering standards as Walday, expressed for entertainment.

### What Walplay Is Not

- It is not a streaming service and does not host, distribute, or redistribute content.
- It is not a replacement for a provider's catalog, player, or account.
- It is not a social network, review community, or team collaboration tool.
- It is not a mechanism for accessing content without authorization.

### Confirmed Foundation

The constitution confirms that Walplay is an entertainment-focused product expected to work with external content metadata, streaming availability information, and potentially authorized video playback sources. TMDB is approved as the initial content metadata provider for the entertainment catalog feature; no streaming availability provider is approved. Live TV and playback are deferred capabilities. Product claims in this document that are grounded in the constitution are marked **Confirmed**; all other specifics are **Proposed** or **Open** until validated.

## 2. Product Vision

> Make choosing what to watch feel effortless, and give people one calm, trustworthy place to remember and plan their entertainment.

### Intended Experience

The intended experience is a quiet loop rather than a feed: the user opens Walplay to a calm personal view, sees a small set of relevant options and saved titles, checks where something can be watched, and either saves it, marks it as watched, or leaves for an authorized service. Every interaction should reduce uncertainty rather than add stimulation.

### Long-Term Direction

- **A trusted decision layer.** Walplay should help users move from "I don't know what to watch" to an informed choice without forcing them through several provider interfaces.
- **One personal memory.** A user's watchlist and viewing history should remain meaningful even when titles move between services.
- **Transparent availability.** Users should understand where a title can be watched, in which region, and how reliable that information is.
- **A calm experience.** Entertainment discovery should feel restful and focused, not noisy, urgent, or manipulative.
- **Optional authorized playback.** If playback or Live TV is ever offered, it must use documented and authorized mechanisms, and it must follow separate legal and technical validation. Neither is a core product promise.

### Vision Guardrails

- Walplay never implies that a title is available when availability is unknown, stale, or region-restricted.
- Walplay never trades user trust for engagement metrics, artificial urgency, or dark patterns.
- Walplay remains useful for personal list management when external providers fail.
- Walplay does not compete with providers for playback; it helps users decide and, where authorized, points them toward the relevant service.
- Walplay's entertainment expression must remain recognizably part of the Wal brand.

## 3. Target Users

### Primary Audience

- Individual viewers who use one or more streaming services and feel decision fatigue when choosing something to watch.
- People who keep informal watchlists in notes or memory and want a more reliable personal record.
- People who value a simple, accessible, low-clutter interface over feature-heavy media platforms.

### Secondary Audience

- Viewers who plan entertainment for themselves but discuss choices with friends, partners, or family without needing shared accounts or social features.
- Users who want to understand availability before committing time to a title.

### Not Designed For

- Teams, organizations, or enterprise content operations.
- Content creators, distributors, or providers seeking a publishing or storefront platform.
- Users seeking unauthorized access, piracy, DRM circumvention, or geographic-restriction bypass.
- Communities seeking public reviews, feeds, followers, or social discovery.

**Assumption**: These audiences are provisional. No primary user research has validated the segments, their relative priority, or their willingness to use a separate entertainment companion.

## 4. Core Value Proposition

Walplay's value comes from reducing the friction between wanting to watch something and actually choosing it.

| Value | What it means for the user |
|---|---|
| Decide with less effort | Discovery, title information, and availability context are brought together in one calm place. |
| Keep one personal list | The user's watchlist belongs to the user, not to a single provider, and remains meaningful when provider catalogs change. |
| Trust the information | Availability is presented with its region and freshness limitations instead of as an absolute promise. |
| Remember what happened | Watched status gives the user a simple, durable record of their viewing. |
| Use it comfortably | The shared Wal visual identity, accessibility standards, and English/Spanish support make the product approachable. |

Walplay does not aim to win on catalog size or playback features. It aims to be the trusted personal layer that helps a viewer use the services they already have.

## 5. Core Features

The following capabilities define the product direction. Their MVP status is a product decision; implementation details belong to individual feature specifications.

| Capability | Purpose | MVP status | Basis |
|---|---|---|---|
| Entertainment discovery and search | Help users find titles without visiting multiple provider catalogs. | In MVP | Proposed; depends on provider capabilities |
| Title details | Present the descriptive information a user needs to decide whether to watch. | In MVP | Proposed |
| Availability information | Show where a title can be watched, for the relevant region, with clear limitations. | In MVP | Confirmed need; proposed user experience |
| Personal watchlist | Let users save titles, review them later, and remove them. | In MVP | Proposed |
| Watched status | Let users record that they have watched a title and correct that record. | In MVP | Proposed |
| Personal home view | Give users a quick, calm summary of saved titles and recent viewing activity. | In MVP | Proposed |
| Episode-level progress | Track progress through a series at episode granularity. | Post-MVP candidate | Proposed |
| Personal ratings or notes | Let users record their own opinion or context about a title. | Post-MVP candidate | Open |
| Recommendations and personalization | Suggest titles based on the user's activity or preferences. | Post-MVP candidate | Open |
| Notifications and reminders | Prompt users about saved titles or viewing intentions. | Post-MVP candidate | Open |
| In-app video playback | Play authorized content inside Walplay. | Deferred capability | Not MVP; requires separate validation |
| Live TV | Provide access to linear television channels. | Optional deferred capability | Not MVP; requires separate validation |
| Sharing and social features | Let users share lists or opinions with other people. | Out of scope for the initial product | Proposed exclusion |

A feature marked post-MVP or deferred is not an implied commitment. It may be rejected after research.

## 6. MVP Scope

**Status**: Proposed. This scope is a product decision that depends on the validation gates listed below. It is not confirmed until the required providers and persistence model are approved.

### Included in the Initial Product

1. **Discovery and search** — a user can find entertainment titles through browsing or search.
2. **Title details** — a user can read the descriptive information needed to make a viewing decision.
3. **Availability** — a user can see whether and where a title is available in the relevant region, with provider attribution and clear limitations.
4. **Personal watchlist** — a user can save and remove titles and review the saved list.
5. **Watched status** — a user can mark a title as watched and undo that status.
6. **Personal home view** — a user can see a concise summary of their saved titles and recent watched activity.

### Cross-Cutting MVP Requirements

- English and Spanish interface support, aligned with the constitution's internationalization requirements.
- WCAG 2.2 AA accessibility for critical journeys.
- Responsive, mobile-first layouts that work at the supported viewport widths.
- Loading, empty, error, and success states for every asynchronous surface.
- Honest degraded states when an external provider is unavailable or its data is stale.
- Personal list management that continues to work when availability or metadata providers fail.

### MVP Outcome

A new user should be able to complete this end-to-end outcome:

> Find a title, understand enough about it to decide, see where it is available in their region, save it to a personal watchlist, and later record that they watched it — without losing access to their personal list when an external provider is unavailable.

### MVP Dependencies and Gates

The MVP depends on decisions that are not yet made:

- Confirmation of TMDB as the initial content metadata provider and selection of a streaming availability provider.
- Confirmation that the selected providers support the required search, regional availability, and attribution behavior.
- An approved persistence and account model, including whether a local-only mode is offered.
- Legal review of provider terms, attribution requirements, artwork usage, and any outbound linking.

These dependencies do not widen the MVP scope. They determine whether the proposed scope can be delivered responsibly.

### Explicit MVP Exclusions

Episode-level progress, personal ratings or notes, recommendations, notifications, sharing, in-app playback, Live TV, and offline/PWA behavior are not part of the MVP. Section 11 records the full boundary.

## 7. Key User Journeys

These journeys describe product-level interactions. They do not prescribe screens, navigation structures, or implementation.

| ID | Journey | Expected outcome | MVP |
|---|---|---|---|
| J1 | **Decide what to watch.** The user opens Walplay, browses or searches for a title, reviews its details and availability, and saves it. | The user reaches an informed viewing decision and has a durable record of it. | Yes |
| J2 | **Return to a saved choice.** The user opens their personal home or watchlist, reviews a saved title and its availability, and proceeds to the relevant authorized service, either through an approved link or on their own. | The user can act on a previous intention without searching again. | Yes |
| J3 | **Record viewing.** The user marks a title as watched, sees the updated state, and can undo the change. | The user's viewing record stays accurate and under their control. | Yes |
| J4 | **Manage the watchlist.** The user reviews saved titles, removes titles they no longer want, and marks titles as watched. | The personal list remains relevant and easy to maintain. | Yes |
| J5 | **Recover from provider degradation.** Availability or metadata is unavailable or stale while the user is managing their list. | The user sees a clear localized explanation, and personal list actions still work. | Yes |
| J6 | **Start for the first time.** A new user encounters an empty state, understands the product's purpose, and saves a first title. | The user can begin without confusion or unnecessary setup. | Yes |
| J7 | **Watch inside Walplay or use Live TV.** The user selects playback or a live channel. | Not an MVP journey. It may only exist after a separate feasibility, authorization, and legal decision. | No |

## 8. Business Rules

These rules constrain every feature specification. A feature that cannot satisfy them MUST be reconsidered rather than implemented around them.

| ID | Rule | Status |
|---|---|---|
| BR-01 | Availability information is informational only. Walplay MUST NOT present it as a guarantee that a title can be watched at a given time, in a given region, or on a given plan. | Confirmed |
| BR-02 | Region restrictions and known inaccuracies MUST be communicated accurately. Walplay MUST NOT imply global availability from region-specific data. | Confirmed |
| BR-03 | Walplay MUST use documented and authorized mechanisms only. Scraping, reverse engineering, DRM circumvention, authentication bypass, and geographic-restriction bypass are prohibited. | Confirmed |
| BR-04 | Provider attribution, licensing terms, and usage restrictions MUST be honored wherever provider data or artwork is shown. | Confirmed |
| BR-05 | Provider failures MUST be mapped to stable internal states. Raw provider errors, provider internals, and unsupported claims MUST NOT reach the user. Unavailable or stale data MUST be labeled as such. | Confirmed |
| BR-06 | A user's personal list and watched status MUST remain usable when external availability or metadata providers fail. Provider failure MUST NOT block core personal actions. | Proposed |
| BR-07 | Availability is not a promise of playback. A title shown as available MUST NOT be described as playable inside Walplay unless an authorized playback capability exists. | Proposed |
| BR-08 | Personal data belongs to the individual user. The initial product MUST NOT expose one user's list or viewing record to another user, and MUST NOT offer shared or collaborative lists. | Proposed |
| BR-09 | Walplay MUST NOT automatically start playback, create a subscription, rent, purchase, or change an external provider account. Any such action requires an explicit user action on an authorized service. | Proposed |
| BR-10 | If a local-only persistence mode is approved, the interface MUST clearly warn that locally stored information can be lost if browser storage is cleared or the device changes. Whether such a mode exists is an open decision. | Confirmed conditional |
| BR-11 | Live TV and in-app video playback are not guaranteed product capabilities. They MUST NOT be treated as MVP requirements or promised in product communication before separate validation. | Confirmed |
| BR-12 | External metadata is attributed to its source. Walplay MUST NOT claim editorial ownership, completeness, or permanent accuracy for provider-supplied titles, descriptions, artwork, or availability. | Proposed |
| BR-13 | The product MUST NOT use artificial urgency, false scarcity, autoplay, or other dark patterns to influence viewing decisions. | Proposed |

## 9. External Integrations

Walplay depends on external content information and may later depend on authorized playback sources. No provider is approved by this document or by the constitution. Provider selection, commercial terms, and technical feasibility MUST be established through the Spec Kit workflow before implementation.

### Integration Categories

| Category | Product need | Constraints | Status |
|---|---|---|---|
| Content metadata and artwork | Titles, descriptions, artwork, and basic descriptive information for discovery and title details. | Provider terms, attribution, artwork licensing, localized metadata, and regional catalogs must be validated. | Needed; TMDB approved as initial provider |
| Streaming availability | Information about where a title can be watched in a region. | Regional coverage, freshness, accuracy, attribution, and rate limits must be validated. | Needed; provider deferred |
| Authorized outbound links | Optionally direct a user to an authorized provider after a decision. | Link-out rights, deep-link behavior, and provider terms must be confirmed. | Proposed; not approved |
| In-app video playback | Play content inside Walplay through an authorized mechanism. | Legal permissions, licensing, DRM, regional rights, and technical feasibility must all be validated. | Deferred; not MVP |
| Live television | Provide linear channel access. | Separate legal, licensing, regional, and technical feasibility is required. | Optional; not MVP |

### Integration Constraints

- Provider-specific errors, identifiers, and data shapes MUST NOT reach the user interface.
- Business rules MUST NOT depend on a single provider. Providers MUST be replaceable without changing product behavior.
- Provider failures, timeouts, and unavailability MUST degrade only the affected feature and MUST NOT take down personal list management.
- Provider rate limits, attribution, licensing, and usage restrictions MUST be respected.
- Credentials and provider keys MUST remain on the backend where required.
- Availability and metadata MUST NOT be presented as verified facts when their freshness or coverage is unknown.
- Logs and user-facing errors MUST NOT expose secrets, unnecessary personal data, or raw provider details.

The constitution (Principle XX) defines the mandatory engineering mechanics for these integrations, including provider adapters, boundary validation, timeouts, bounded retries, caching, and secret handling.

### Legal Boundaries

- Walplay MUST NOT scrape, reverse engineer, bypass authentication, bypass DRM, or circumvent geographic restrictions.
- Publicly accessible content or stream URLs MUST NOT be assumed to be authorized for integration or redistribution.
- Provider documentation, licenses, and terms of service govern what may be displayed, cached, linked, or played.
- No integration may be built against undocumented or unstable private endpoints.

## 10. UX and Design Direction

### Shared Identity

Walplay uses the shared **Walday Dark UI / Calm Tech Dark** identity. It is not an opportunity to introduce a separate visual direction. The constitution's Visual Identity section is the authoritative source for tokens, typography, shape, motion, accessibility, and verification.

- The product is dark-mode only until a constitutional amendment introduces another theme.
- The brand mark is the shared geometric W monogram with the `Walplay` wordmark. The monogram geometry, stroke, and mint accent are shared and are not adapted or redrawn for Walplay; only the wordmark text differs. Raster logos and third-party brand marks are not permitted.
- Interface text uses Inter with `system-ui` fallback. The existing display, title, body, and caption hierarchy is reused.
- Cards and list rows use the established radius, spacing, border, and density rules.
- Numeric data that benefits from vertical alignment, including durations, episode numbers, counts, ratings, and progress, uses tabular numerals.

### Entertainment-Specific Adaptation

Walplay may adapt the shared identity to entertainment through content prominence rather than new visual language:

- Artwork, titles, and descriptive metadata may carry more visual weight than in Walday.
- Discovery and saved lists should remain highly scannable, with a small number of primary data points per row or card.
- Entertainment emphasis MUST NOT be achieved through new hues, neon effects, gloss, heavy shadows, unrelated gradients, or decorative animation.
- Every surface must remain calm and restful rather than resembling an advertising storefront.

### Interaction Principles

- Choosing something to watch should feel low-pressure. The interface presents options and information; it does not push.
- Availability states must use text or icons in addition to color. "Available", "unavailable", and "stale" must be understandable without color perception.
- Saving, removing, and marking watched must be reversible, with clear success and failure feedback.
- Secondary actions may be revealed on hover, but they must also be reachable by keyboard focus and on touch and narrow viewports. Hover must never be the only access path.
- Asynchronous surfaces must provide a skeleton loading state, an empty state with a clear next action, an error state with recovery where meaningful, and success feedback for mutations.
- Motion must be minimal and must respect `prefers-reduced-motion`.

### Accessibility and Localization

- The target is WCAG 2.2 AA for critical journeys, including keyboard operation, focus management, screen-reader announcements, and text alternatives for artwork and status.
- The interface must not rely on color, hover, or icons alone to communicate availability, category, or state.
- The initial interface languages are English and Spanish. All product-owned interface text must be externalized and localized.
- External metadata may arrive in a different language or with incomplete localization. The product must not present machine-translated or provider-supplied text as verified product copy.

### Tone

Walplay's voice is calm, concise, and informative. It helps the user decide without exaggerating availability, creating false urgency, or implying that the product owns content it does not own.

**Reference basis**: The shared identity is defined authoritatively by `.specify/memory/constitution.md` (Visual Identity and Design System), with `docs/reference/walday/design-system.md`, `docs/reference/walday/branding.md`, and `docs/reference/walday/logo.svg` as the Walday baseline. Where a reference marks an element as guidance that may vary between products, this overview and the Walplay constitution govern. Where they conflict, the Walplay constitution prevails; this is why Walplay keeps the exact Walday W geometry rather than adopting the branding guidance that a family product may use a distinct monogram.

## 11. Out of Scope

### Permanently Excluded by Product or Legal Boundary

- Operating as a streaming service, content host, or redistribution platform.
- Unauthorized access to content, including piracy, scraping, DRM circumvention, authentication bypass, and geographic-restriction bypass.
- Presenting provider data as owned, verified, or permanently accurate by Walplay.
- Any feature that requires violating provider terms, licenses, or applicable law.

### Excluded From the Initial Product

| Capability | Reason |
|---|---|
| In-app video playback | Requires separate legal, licensing, DRM, and technical validation; not an MVP promise. |
| Live TV | Optional capability with unresolved legal and technical feasibility; not an MVP requirement. |
| Episode-level progress | Valuable for series tracking but adds scope beyond simple watched status. |
| Personal ratings and notes | Not required for the core decide-save-watch journey. |
| Recommendations and personalization | Requires validation of value, data needs, and user trust expectations. |
| Notifications and reminders | Not required for the initial personal record and discovery experience. |
| Sharing, social feeds, and collaborative lists | The initial product is personal, not social or multi-user. |
| Public reviews and community content | Outside the personal companion positioning. |
| Offline mode, PWA synchronization, and native mobile applications | Deferred; the initial product is a responsive web experience. |
| Subscription sales, rentals, purchases, and payment processing | Walplay informs decisions; it does not transact with providers in the initial scope. |
| Advertising and sponsored placement | Monetization is undecided and must not distort availability or recommendations. |
| Content creation, upload, or publishing | Walplay is not a content platform for creators or distributors. |

Items in the second table are excluded from the initial scope, not necessarily rejected forever. Moving any of them into scope requires an explicit product decision, an update to this document, and a separate specification.

## 12. Open Decisions

The following decisions remain open and require research, validation, or explicit approval. They MUST NOT be treated as settled requirements. Resolved decisions are recorded in Section 12.1.

| ID | Decision | Why it matters | Validation needed |
|---|---|---|---|
| OD-01 | Exact content scope: films, series, episodes, and which regions and content languages are supported first. | Determines catalog shape, metadata needs, and the usefulness of the MVP. | User research and provider capability review |
| OD-03 | Streaming availability provider or providers. | Determines whether regional availability can be shown credibly. | Coverage, freshness, and terms evaluation |
| OD-04 | Whether Walplay may link users out to authorized providers, and under what conditions. | Affects the end of the decision journey and provider compliance. | Provider terms review |
| OD-05 | Feasibility of authorized in-app playback. | Could change the product's role, cost structure, and legal exposure. | Legal, licensing, DRM, and technical feasibility study |
| OD-06 | Feasibility of Live TV. | A separate capability with unresolved rights and regional constraints. | Dedicated feasibility and legal review |
| OD-07 | Account model and authentication provider. | Determines persistence, cross-device use, privacy obligations, and onboarding. | Product and technical specification |
| OD-08 | Whether a guest or local-only mode is offered, and how migration to an account would work. | Affects accessibility of first use and data-loss risk. | Product decision and technical design |
| OD-09 | How personal lists and watched status persist and synchronize across devices. | Defines the core promise of a reliable personal record. | Architecture and product decision |
| OD-10 | Progress granularity: title-level only, or episode-level for series. | Changes the MVP data model and user effort. | User research and scope decision |
| OD-11 | Whether personal ratings, notes, or recommendations belong in the product. | Could add value but also complexity and trust risks. | User research and product validation |
| OD-12 | How the user's region is determined or selected, and how travel or relocation is handled. | Availability is region-dependent and cannot be guessed safely. | Product and provider research |
| OD-13 | Artwork licensing, caching, and display rules. | Artwork is prominent in entertainment experiences but may be restricted. | Legal and provider terms review |
| OD-14 | Monetization model, if any. | Must not compromise availability honesty or recommendation integrity. | Business validation |
| OD-15 | Product success metrics and the research plan for validating the problem. | The current problem statement is a hypothesis. | User research and product analytics planning |
| OD-16 | Whether languages beyond English and Spanish are supported after MVP. | Affects localization architecture and provider metadata expectations. | Product decision |

### 12.1 Recorded Decisions

- **OD-02 — Content metadata provider (resolved 2026-11-22)**: TMDB is approved as the initial content metadata provider for the entertainment catalog feature. Commercial and legal terms review, artwork licensing, caching, and attribution requirements remain release dependencies. Streaming availability provider selection (OD-03) remains open.

- **OD-03 — Streaming availability provider (resolved 2026-11-23 for planning)**: TMDB's documented movie and TV watch-provider operations are the initial availability source, subject to the release gates recorded in ADR-0006. The capability remains behind disabled backend and frontend flags until attribution, commercial terms, and Colombian coverage are approved. A provider-neutral backend boundary allows a different source to replace TMDB without a client rewrite.

- **OD-04 — Authorized external destinations (resolved 2026-11-23 for planning)**: Walplay may link only to one aggregate, source-supplied availability page per result, opened in a new tab with `noopener noreferrer` and a visible leaving notice. Provider entries are never links, and Walplay never constructs provider URLs, offers playback, or performs rental, purchase, or subscription actions. Exact per-provider linking remains out of scope for the initial release.

- **OD-12 — Region selection (resolved 2026-11-23)**: The initial supported region is Colombia (`CO`), selected explicitly by the visitor and remembered on the device through a versioned local preference. The backend owns the allowlist; a valid stored region outside it is preserved and shown as unsupported rather than silently replaced. There is no geolocation, travel inference, or region-bypass affordance.

- **Availability release gates**: Production enablement requires the resolved decisions in ADR-0006: attribution and logo permission (OD-SA4), commercial and licensing terms (OD-SA5), representative Colombian coverage validation (OD-SA7), and the ad-supported category decision (OD-SA8). Episode-level availability (OD-SA9) remains future scope.

## Consistency With the Constitution

- This document defines product behavior; the constitution defines engineering standards. Neither overrides the other in its own domain.
- No technology, provider, database schema, authentication strategy, hosting model, or API contract is selected here.
- No feature specification may treat Live TV or in-app playback as a guaranteed capability. Both remain deferred and require separate feasibility, authorization, and legal validation.
- No provider data may be presented in a way that contradicts the constitution's rules on attribution, untrusted external input, resilience, and legal authorization.
- The Walday reference material under `docs/reference/walday/` is binding where the constitution adopts it. Guidance that the references explicitly mark as variable is not a Walplay requirement unless this overview or the constitution confirms it.
- Any future feature that conflicts with this overview or the constitution must identify the conflict explicitly rather than reinterpreting either document.

**Change control**: Product scope, business rules, and target-user definitions may change only through an explicit update to this document. Significant changes should be reviewed against the constitution and existing feature specifications before implementation.
