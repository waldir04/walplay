# Contract: Trailer Player Activation and Section Behavior

**Feature**: `008-trailers-video-content` | **Type**: UI and third-party player contract

This contract defines the observable behavior of the trailer section. It is not an implementation
guide; component boundaries and file names live in [plan.md](../plan.md).

## Section placement and structure

- The section is a secondary region of the existing movie or TV detail destination. No new route,
  navigation entry, or per-video address exists.
- It renders when both capability flags are enabled, regardless of whether inventory has videos,
  because the labeled no-video state is required (spec Clarification 2026-11-24).
- It is omitted entirely when the capability is disabled, unconfigured, or unauthorized: no section,
  disabled control, placeholder, explanatory teaser, or "coming soon" copy.
- Placement: after the detail action area and before the availability section. Existing sections are
  not reordered, hidden, duplicated, or merged.
- One localized heading at the correct level beneath the page heading. The video list uses list
  semantics; the section is a labelled region.
- Entry point: an in-page anchor in the detail action area, shown only when the loaded inventory has at
  least one eligible video. Activation moves focus to the section heading (`tabIndex={-1}`). No second
  trailer entry point exists.

## Section states

| State | Requirements |
|---|---|
| Loading | Skeleton closely matching the final cover/list layout; `aria-busy` on the region; decorative shapes hidden; no bare spinner or "Loading…" text |
| Available | One selected video, the disclosure, the ranked list, the player area, and the external option |
| No video | Localized calm statement; no player frame, play control, disabled control, spinner, or future-content promise; not styled or announced as an error |
| Error | Localized inline error with a retry action; distinct from no-video and from detail not-found; retry affects only the inventory surface |
| Stale | Cached list with a visible last-checked label; never presented as current; beyond retention the error state replaces it |
| Playing | One active player, status text, adjacent external option, no overlay |
| Unavailable | Localized explanation plus external option; frame unmounted |

Retry is single-flight: a pending retry cannot start a duplicate; repeated failure produces the same
stable localized state. Trailer loading, emptiness, or failure never blocks detail identity, overview,
seasons, credits, related titles, availability, or personal-list actions.

## Pre-activation cover and disclosure

Before any activation the section:

- makes zero requests to the video platform: no iframe, script, image, font, style, preconnect, DNS
  prefetch, preload, prefetch, cookie, or storage write;
- uses title artwork already authorized and loaded by the detail feature, or a Walplay-owned treatment;
- names the platform;
- states that activating the video loads third-party content;
- links to the platform's terms of service and privacy policy;
- repeats the disclosure adjacent to the list and play actions, so every activation is preceded by it;
- does not claim that the privacy-enhanced host eliminates third-party processing;
- does not imply partnership, endorsement, or control over the platform's content, ads, or
  recommendations.

The cover is never rendered on top of a loaded player. Once a player is active, the cover is replaced,
not overlaid.

## Selection and ordering

- The highest-ranked eligible video is selected by default on first successful render.
- Default selection never starts playback and is not announced as activation.
- Selecting a video is explicit activation: it stops and unmounts any current frame, updates selected
  state, shows the new identity, and starts the new video as one coherent change.
- Only one frame may exist. Replacing a video unmounts the previous frame before mounting the next.
- Rapid choices: only the newest activation may produce a frame; late results from older choices are
  ignored.
- Ordering follows the API order with the interface-language refinement: matching language first
  within a type/official step. The interface never claims quality, popularity, freshness, editorial
  judgment, or recommendation.
- A language change re-ranks and relabels for the next render, preserves the current selection, and
  does not restart, stop, or remount an active player.
- Up to six videos are visible initially; an in-place control reveals additional eligible videos from
  the same response. Expansion never issues a new request.

## Per-item content

Every item states, in visible and accessible text:

- localized promotional type;
- provider-supplied title, as supplied;
- source platform name when usable;
- video language, labeled in the interface language, when a usable code exists;
- official indication only when the provider explicitly marks that record official;
- publication date in localized form only when valid and not future-dated;
- playback mode: plays inside Walplay, or opens an external destination and names it;
- selected/playing state in text or accessible state, never color alone.

A video with no explicit official flag shows no official claim. A video in another language is not
presented as localized. Very long titles, long platform names, and non-Latin scripts remain
identifiable; truncation is not the only way to read the title; controls remain usable.

## Retrieval and click-to-load

Choosing a listed video is the activation that starts that specific video. Activation may begin
playback. Playback must not begin on page load, scroll, hover, focus, default selection, interface
language change, or without an explicit activation of that specific video.

On activation:

1. the previous frame, if any, is unmounted;
2. exactly one iframe is created for the chosen identifier;
3. the frame uses the privacy-enhanced host from the API response;
4. the section announces the choice and loading once;
5. the frame's `load` event announces player readiness once;
6. if `load` does not fire within the configured timeout (15 s), the frame is unmounted, the
   unavailable state replaces it, and the external option remains available.

The only playback parameters permitted in the frame address are the platform's documented `autoplay`
and `playsinline` parameters, and they apply only to an explicitly activated frame. No
personalization, advertising, tracking, or Walplay-identifier parameter is added (FR-072).

The platform's own controls, branding, notices, and fullscreen control remain intact. Walplay does not
hide, replace, overlay, frame, gradient, watermark, or disable any part of the player, and does not
present its own controls as controlling the video. No hover- or touch-initiated action acts on the
visitor's behalf over the player. Walplay does not force fullscreen, trap focus, or prevent leaving
fullscreen.

## Iframe attributes

| Attribute | Value and reason |
|---|---|
| `src` | Server-supplied `embedUrl` only; never client-edited |
| `title` | Localized string containing the video title and the platform name |
| `referrerPolicy` | `strict-origin-when-cross-origin`; never `noreferrer` or `no-referrer` |
| `allow` | Minimal documented set needed for playback, including `autoplay; encrypted-media; picture-in-picture` |
| `allowFullScreen` | Present; fullscreen remains platform-controlled |
| `loading` | `eager`; the frame exists only after activation |
| Sandbox | Not used; a sandbox that strips referrer, scripts, or same-origin needs breaks the authorized player |

No overlay, wrapper, or decorative element is placed over the frame. The player area reserves its final
16:9 dimensions before activation, so no layout shift occurs. A localized `title` attribute update
during a language change must not replace or remount the iframe; the element identity stays bound to
the active video identifier.

## Sizing rule

- Reserving: the player area uses a 16:9 aspect ratio and reserves height before activation.
- Measuring: available content width is measured, not assumed from the viewport.
- Embedding is allowed only when the measured width is at least `356` CSS px, which yields a 16:9
  viewport at least `356 × 200.25` CSS px. This satisfies the platform's 200 × 200 minimum and keeps a
  16:9 presentation.
- Below the threshold, no iframe is rendered. The interface states that a compliant player cannot be
  shown at this width and offers the canonical external destination. It never renders an undersized
  player, and it never distorts or crops the video.
- If no authorized external destination exists (not expected for eligible YouTube records), the video
  is omitted and the reason is stated; other videos remain usable.

## External option

- Available for every eligible video with an authorized canonical destination, and always rendered
  adjacent to the player area — in cover/selected, loading, ready, and unavailable states —
  regardless of whether a failure was detected.
- Opens the canonical watch destination for the same identifier in a new context without navigating
  the detail page away from its state; selection, list position, and active player remain on return.
- Labelled in localized text, states that the visitor is leaving Walplay, names the destination, and
  exposes that warning in the accessible name.
- Never preloaded, prefetched, previewed, or opened on hover/focus.
- Never described as playback inside Walplay and never merged with the embedded action into one
  ambiguous control.
- Never promises regional availability or unrestricted playback, and never implies Walplay controls the
  destination.

## Failure and restriction handling

The only host-observable failure signal is the load timeout. The unavailable state:

- is localized and non-technical;
- names the possible causes the platform may be applying: embedding not permitted by the owner;
  private, deleted, or otherwise unavailable video; age or sign-in restriction; region restriction;
  network, browser, extension, or content-policy block;
- asserts none of those causes because the cross-origin frame does not expose one;
- keeps the video identifiable in the list and offers the external option;
- does not retry automatically; an explicit retry may be offered;
- never claims the title has no promotional material, is unreleased, or had its video deleted by the
  platform unless the platform explicitly states it;
- never exposes raw player or platform error codes.

## Accessibility and localization

- All essential controls are keyboard operable in a logical order with visible focus; no keyboard trap.
- Focus remains visible when the player loads and after the player is replaced.
- Interactive targets meet the design system minimum; primary controls meet its primary-control size.
- Each state change is announced once through a live region: inventory loaded, no video, inventory
  error, choice and loading, player ready, unavailable, external-only fallback, retry outcome.
- Captions and subtitles are platform- and owner-controlled. The interface states that caption
  availability is determined by the platform and the video, makes no caption promise, and does not call
  a video accessible solely because it exists.
- Selection, type, official status, playback mode, and unavailability are never communicated by color,
  hover, icon shape, animation, or position alone.
- Works at 360, 768, 1024, and 1440 px and at 200 % zoom without horizontal scrolling, clipped
  controls, overlapping content, or lost information.
- Meets WCAG 2.2 AA contrast and target size; remains usable with text resizing and text-spacing
  overrides.
- Decorative motion is minimal and respects `prefers-reduced-motion`.
- All Walplay-owned copy exists in English and Spanish; missing translations fall back to English and
  never display a raw key. Provider titles and platform names are never machine-translated.

## Privacy checklist (verifiable)

Before any activation, a clean browser profile records:

- zero requests to `youtube.com`, `www.youtube.com`, `youtube-nocookie.com`, `www.youtube-nocookie.com`,
  `googlevideo.com`, or any Google/YouTube asset host;
- zero cookies and zero local/session storage writes associated with the platform;
- zero preconnect, DNS-prefetch, preload, or prefetch hints for those hosts;
- no iframe element in the DOM.

After activation, exactly one iframe request is made to the configured privacy-enhanced host, carrying
no Walplay identifiers, session tokens, analytics, advertising, or personalization parameters.

## Out of scope in this contract

Hosting, downloading, recording, proxying, mirroring, transcoding, stream extraction, DRM or region
bypass, player SDKs, postMessage control, playback telemetry, viewing history, deep links, shareable
per-video addresses, autoplay on load, picture-in-picture control, downloads, and platforms other than
YouTube.
