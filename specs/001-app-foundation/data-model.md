# Phase 1 Data Model: Initial App Foundation

**Feature**: `001-app-foundation` | **Date**: 2026-11-20

The foundation has no database and no server data. This document defines the conceptual entities
from the specification, their runtime TypeScript shapes, validation rules, and the state machines
that govern loading, failure, and language selection. It is the source of truth for the contracts in
`contracts/`.

---

## 1. Supported Locale

A language the interface can present.

| Attribute | Type | Rules |
|---|---|---|
| `code` | `'en' \| 'es'` | Canonical base subtag; literal union |
| `endonym` | `string` | Name of the language **in that language** (`English`, `Español`); rendered from translation resources, never hardcoded |
| `direction` | `'ltr'` | Both initial locales are left-to-right; the field exists so a future RTL locale needs no structural change |
| `isCanonicalFallback` | `boolean` | Exactly one locale is `true` (`en`) |

**Invariant**: The set of supported locales is exactly the set that has complete resources; adding a
locale requires resources and registration only, not a shell change (spec Key Entities).

**Runtime shape**:

```ts
type SupportedLocaleCode = 'en' | 'es';

interface SupportedLocale {
  readonly code: SupportedLocaleCode;
  readonly direction: 'ltr';
  readonly isCanonicalFallback: boolean;
}
```

The endonym is not stored in the model; it is read from `languages.<code>` in the translation
resources so it is localized and externalized (FR-017, FR-023).

---

## 2. Language Preference

The visitor's selected locale and how it was established.

| Attribute | Type | Rules |
|---|---|---|
| `locale` | `SupportedLocaleCode` | Must be a supported code |
| `origin` | `'explicit' \| 'detected' \| 'fallback'` | `explicit` = visitor chose it; `detected` = browser preference matched; `fallback` = no supported browser preference |
| `persistence` | `'stored' \| 'absent' \| 'invalid' \| 'unavailable'` | Result of the last storage read/write attempt |
| `sessionValue` | `SupportedLocaleCode` | Always defined after bootstrap, even when storage is unavailable |

**Validation rules**:

- A stored value is accepted only if it parses against the versioned schema in
  `contracts/language-preference.md` and its locale is in the supported set.
- An invalid, outdated, missing, or unreadable stored value never throws and never blocks startup
  (FR-020).
- `sessionValue` is always usable, so the visitor can change language for the current session even
  when persistence fails.

**State transitions**:

```text
                 ┌──────────── invalid / absent / unavailable ────────────┐
                 ▼                                                        │
  [resolve] ─► detected ──visitor chooses──► explicit ──storage ok──► stored
                 │                              │
                 └── no supported browser pref ─┴── storage fails ──► unavailable
                 ▼
             fallback (en)
```

Every transition updates `sessionValue` immediately and notifies i18n. Persistence failure changes
only `persistence`, never `sessionValue`.

---

## 3. Application Route

A navigable destination in the foundation.

| Attribute | Type | Rules |
|---|---|---|
| `path` | `'/' \| '/settings' \| '*'` | Exactly one default route (`/`); `*` is the not-found catch-all |
| `kind` | `'home' \| 'settings' \| 'not-found'` | Drives the page component and title resource |
| `navigationLabelKey` | `string \| null` | `null` for not-found (not in navigation) |
| `titleKey` | `string` | Translation key for the localized document title |
| `isDefault` | `boolean` | Exactly one `true` (`/`) |
| `isNavigable` | `boolean` | Visible in primary navigation; `true` for home and settings only |
| `loadsOnDemand` | `boolean` | `true` for every route; drives the route-content state machine |

**Route table (authoritative)**:

| Path | Kind | Navigation | Default | Title key |
|---|---|---|---|---|
| `/` | home | yes | yes | `meta.title.home` |
| `/settings` | settings | yes | no | `meta.title.settings` |
| `*` | not-found | no | no | `meta.title.notFound` |

**Invariants**:

- Every visible navigation target resolves to a route that renders inside the shell (FR-008).
- Unknown nested paths match `*` and render inside the shell (FR-009).
- No route fabricates entertainment content (FR-044).

---

## 4. Application Configuration

The validated set of values required for the application to start.

| Attribute | Env variable | Required | Default | Validation |
|---|---|---|---|---|
| `environmentName` | `VITE_APP_ENV` | yes | none | Enum: `local`, `development`, `staging`, `production` |
| `applicationVersion` | `VITE_APP_VERSION` | no | `'0.0.0'` | Non-empty string matching a version-like pattern; never rendered |

**Derived attributes**:

| Attribute | Type | Meaning |
|---|---|---|
| `validity` | `'valid' \| 'invalid-required' \| 'invalid-optional'` | Result of parsing at startup |
| `warnings` | `readonly string[]` | Developer-visible field names for defaulted/invalid optional values; no values, no secrets |

**Validation rules**:

- Parsing happens once at bootstrap, before the router renders (FR-038).
- `invalid-required` renders `AppConfigError` and nothing else.
- `invalid-optional` applies the documented default, emits a developer warning, and leaves the
  visitor-facing experience unchanged (FR-041).
- Only public values are read; no secret, credential, endpoint, or provider key exists in the
  inventory (FR-039, FR-040).

**Type shape**:

```ts
type EnvironmentName = 'local' | 'development' | 'staging' | 'production';

interface AppConfig {
  readonly environmentName: EnvironmentName;
  readonly applicationVersion: string;
}

type ConfigResult =
  | { readonly status: 'valid'; readonly config: AppConfig; readonly warnings: readonly string[] }
  | { readonly status: 'invalid-required'; readonly warnings: readonly string[] };
```

---

## 5. Runtime Model: Route Content State

This is not a persisted entity; it is the state machine that makes FR-012 and FR-013 testable.

| State | Trigger | Rendered output | Assistive behavior |
|---|---|---|---|
| `loading` | Route mounted, importer pending | `RouteLoadingState` with layout-matching skeleton | Container `aria-busy="true"`; decorative bars `aria-hidden`; no spinner; no bare "Loading…" |
| `ready` | Importer resolved | The page component | `aria-busy` removed; polite completion announcement |
| `error` | Importer rejected | `ErrorState` with localized explanation, retry, home action | Announced as an alert once; no stack trace or identifier |

**Allowed transitions**: `loading → ready`, `loading → error`, `error → loading` (retry only),
`error → error` (retry fails again). `ready` is terminal for the current mount.

**Guarantees**:

- The shell is already painted before `loading` appears, because the loader lives inside the layout
  route's `<Outlet />`.
- The importer is invoked only from the loader effect — never during render — so no render-phase
  side effect occurs.
- A settled attempt from an unmounted route is ignored (rapid navigation edge case).

---

## 6. Runtime Model: Menu and Language Feedback

| Concern | State | Rules |
|---|---|---|
| Compact menu | `closed \| open` | At most one open; closes on route change, Escape, and viewport ≥ 768 px; focus returns to trigger |
| Language feedback | `idle \| changed` | A completed change produces one polite announcement; message cleared before reuse so no stale language remains |
| Route announcement | `idle \| announced` | One polite announcement per in-app route change; none on initial document load |

---

## 7. Relational Summary

```text
SupportedLocale 1 ──── * LanguagePreference        (selected locale is supported)
ApplicationRoute  * ── 1 LocaleResource set        (titles/labels resolve per active locale)
ApplicationConfiguration 1 ── 1 boot result        (valid → render; invalid-required → fatal screen)
RouteContentState 1 ── 1 ApplicationRoute instance (per mounted route)
```

No entity has a database representation. No identifier is exposed in any user-facing message.
