# ADR 0003: Search Query Identity, Address Semantics, and Detail Origin

- **Status**: Accepted
- **Date**: 2026-11-22
- **Feature**: `003-search-discovery`
- **Context**: `research.md`, `data-model.md`, and the plan's Complexity Tracking

## Context

Search must issue at most one provider request per settled query, language, and page; must never
show a superseded response; and must return the visitor from a title detail back to the search whose
results they were viewing. The approved stack adds no debounce, search, or state library, the backend
has no persistence, and the feature must reuse the feature 002 catalog item, cache, and detail
destination.

## Decision

1. **The address is the source of truth.** `/search?q=<text>` determines the active query.
   The controlled input owns only a draft. While typing a valid draft, the address is rewritten only
   after the input settles for `SEARCH_SETTLE_MS` (350 ms). Explicit submission cancels the timer and
   writes immediately. Clearing removes `q`. Invalid drafts (empty, fewer than two non-whitespace
   characters, more than 200 code points) are written immediately so guidance replaces results and no
   request can be issued. The first `q` occurrence wins; `+` decodes to a space.

2. **Identity is normalized; the provider query is not.** Identity is the trimmed draft with
   whitespace runs collapsed and case folded. It keys duplicate detection, the frontend infinite
   query, and the backend cache. The trimmed raw query with internal whitespace preserved is the only
   value sent to the provider, because the provider's relevance depends on the visitor's wording.
   Identity is never displayed and never sent to the provider.

3. **Settled searches use history `replace`.** Intermediate typing, settled rewriting, and clearing
   never add entries. Opening a result pushes the existing type-specific detail address once, so
   Back returns to the active search address rather than an intermediate query.

4. **Cancellation is logical supersession, not network abort.** Every identity and language has its
   own infinite-query key. A late response for a superseded key can only update that key's cache; the
   rendered state, counts, pagination, focus, and announcements read only the current key. Changing
   the address or language is therefore sufficient, and no second abort layer is added on top of the
   existing request timeout.

5. **No background refetching.** `retry: false`, `refetchOnWindowFocus: false`, and
   `refetchOnReconnect: false`. Provider requests happen only for a settled or submitted query, an
   explicit load more, an explicit retry, or a language change. Retries remain visible actions.

6. **Search-origin return with a media-landing fallback.** Result cards pass
   `/search?q=<encoded active query>` (never the draft) in router location state. The detail return
   resolver accepts only an internal `/search` path with a syntactically present `q`; malformed,
   foreign, or missing origins fall back to the media landing. The detail address and Browse current
   state are unchanged, so no second detail destination exists.

## Rejected Alternatives

- **Send normalized identity to the provider** — changes the visitor's query and provider relevance;
  identity exists for deduplication only.
- **Debounce without writing the address** — makes the address and visible results disagree, breaks
  direct links and reloads, and loses the active query on detail return.
- **Push a history entry per settled query** — fills history with intermediate searches and makes
  Back abandon the search surface.
- **AbortController per keystroke** — extra lifecycle complexity with no rendering benefit once keys
  isolate superseded responses.
- **Background refetch on focus/reconnect** — silently increases provider traffic and violates the
  request-count contract.
- **Merge per-type search results** — two provider calls, merged ordering, and a new pagination
  authority for no product gain over the documented unified operation.
- **A separate `entities/search` slice** — would import the sibling catalog entity, violating
  Feature-Sliced Design; search reuses the catalog item model and card instead.
- **A second detail route for search** — duplicates detail content and breaks the single destination
  contract; origin state plus a fallback preserves uniqueness.

## Consequences

- A direct open or reload can restore page one of the active query; deeper pages are intentionally
  not encoded.
- A direct or reloaded detail has no search state and falls back to the media landing without an
  error or fabricated state.
- Return-state failures degrade to a working catalog link, never to a broken action.
- Request-count, race, history, and origin behaviour are pinned by colocated tests on both sides of
  the JSON boundary.
