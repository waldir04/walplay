# Contract: Routes and Navigation

**Feature**: `001-app-foundation` | **Type**: SPA route contract

This is the public interface the foundation exposes to the browser. Any implementation must satisfy
it exactly; later feature pages may add routes but must not change the shell contract.

## Route table

| Path | Page kind | In primary navigation | Default | Document title key | Loads on demand |
|---|---|---|---|---|---|
| `/` | home | yes | yes | `meta.title.home` | yes |
| `/settings` | settings | yes | no | `meta.title.settings` | yes |
| `*` (including nested) | not-found | no | no | `meta.title.notFound` | yes |

- Exactly one default route exists.
- No other top-level destination exists (FR-007).
- The brand link targets `/`.
- The not-found route never redirects (FR-009).

## Shell contract

Every route renders inside one layout that provides, exactly once:

| Region | Semantic element | Requirements |
|---|---|---|
| Skip link | `<a href="#main-content">` | First focusable element; visually hidden until focused; moves focus to main |
| Header | `<header>` | Contains the brand link and the navigation control |
| Brand link | `<a href="/">` | Accessible name from `app.name`; wraps the logo lockup |
| Logo | `WalplayLogo` | Monogram `aria-hidden`; live-text `Walplay` wordmark |
| Primary navigation | `<nav aria-label>` | Labelled by `navigation.label` |
| Menu trigger (narrow only) | `<button>` | Meaningful name, `aria-expanded`, `aria-controls` |
| Main | `<main id="main-content">` | Single per document; contains the route page |
| Page heading | `<h1>` | Exactly one per route; `tabIndex={-1}` for programmatic focus |

No footer, legal-link region, or persistent header language shortcut is rendered (FR-006, RD-05).

## Navigation behavior

| Event | Required behavior |
|---|---|
| Select a destination | Address updates, route content loads, page heading receives focus, one polite announcement |
| Browser back / forward | Corresponding route and content are restored |
| Direct address to a known route | Full shell renders that route; **no** focus move; skip link remains first Tab stop |
| Direct address to an unknown or nested-unknown path | Not-found page renders inside the shell with a working home link |
| Brand link activation | Home route renders |
| Route change with compact menu open | Menu closes before/with navigation |
| Rapid navigation before a previous load settles | Final route wins; no stale content, duplicate headings, or stale announcements |

## Active destination contract

The current destination must be:

- exposed as `aria-current="page"` on the matching link;
- visually distinct through **at least two** non-color cues — implemented as a background surface
  change plus a 2 px primary indicator/underline plus medium font weight.

## Route loading contract

| Aspect | Requirement |
|---|---|
| Trigger | First navigation to a route invokes that route's dynamic import |
| Loading UI | Layout-matching skeleton inside the shell, before page content |
| Timing | No artificial delay, no network request |
| Assistive tech | `aria-busy="true"` on the loading container; skeleton shapes `aria-hidden="true"` |
| Prohibited | Spinner-only indication; bare "Loading…" as the only indication |
| Failure UI | Localized `ErrorState` with retry and home actions; no stack trace, module name, or identifier |
| Retry | Re-invokes the failed import; a second failure shows the error again |
| Rendering failure | Contained to a pathless child route inside `<main>` whose `errorElement` replaces only the content area; the shell (header, navigation, skip link) remains usable; fallback heading receives focus |

## Not-found contract

- Visually and semantically distinct from an error.
- Explains that the requested page does not exist.
- Offers a functional link to `/`.
- Sets the localized not-found document title.
- Preserves the requested address.

## Out of scope

- Server response status codes and host rewrite/fallback configuration (deployment dependency).
- Route-level authorization, data loaders, and search parameters.
