# Walday Design System

Reference documentation for the Walday "Calm Tech Dark" interface. It records the values and
patterns that exist in the repository today, so other products in the Wal product family can use
Walday as a baseline.

- **Authoritative engineering rules**: [`.specify/memory/constitution.md`](../../../.specify/memory/constitution.md)
  — Principles VI and XIII plus the *Visual Identity and Design System (Walday Dark UI)* section.
- **Authoritative product context**: [`docs/product-overview.md`](../../product-overview.md).
- **Authoritative implementation**: [`frontend/src/index.css`](../../../frontend/src/index.css)
  (`@theme` tokens) and the components under [`frontend/src/shared/ui/`](../../../frontend/src/shared/ui/).

A component pattern is marked **Implemented** when it exists in source, and **Guideline** when it is
required by the constitution but not yet expressed as a dedicated component. Discrepancies between
these sources are recorded in [Known discrepancies](#known-discrepancies) instead of being resolved
silently.

---

## 1. Design Philosophy

### Visual direction

The constitution mandates a calm, refined dark mode ("Calm Tech Dark"), inspired by Linear, Raycast,
and deep slate developer dashboards (`constitution.md`, *Visual Identity and Design System*, §1). The
product overview describes the same intent as calm, friendly, minimalist, modern, clear, and practical
(`docs/product-overview.md` §10).

| Intent | Implementation evidence |
|---|---|
| Low-glare, restful dark canvas | `--color-canvas: #0B1215` applied to `<body>` and the application shell |
| Crisp but never pure black | `#000000` is not used; `html { color-scheme: dark }` |
| Elevated, soft-bordered surfaces | Cards use `bg-surface` + `border-border` + `rounded-2xl` |
| Highly scannable rows | 20px card padding, 12px inter-row gaps, three primary data points per row |
| Minimal decorative effects | Borders preferred over shadows; no gradients except weather semantic tones; one drawer animation |
| Explicit system-generated content | Smart Suggestions use a high-contrast mint surface distinct from user content |

### Design principles

1. **Calm over spectacle.** No heavy shadows, glossy effects, decorative gradients, or decorative
   animation (`constitution.md`, *Visual Identity*, §1).
2. **One dark theme.** Dark is the default and the only approved theme until a constitutional
   amendment introduces another (`constitution.md`, Principle VI).
3. **Semantic tokens only.** Components must not contain raw hex colors; colors resolve through the
   Tailwind v4 `@theme` block (`constitution.md`, Principle VI).
4. **Borders first, shadows second.** `border-border` defines surface separation; shadows are limited
   to `--shadow-card` on dialogs and select forms (`constitution.md`, *Visual Identity*, §4).
5. **Text carries meaning; color only reinforces it.** Status, category, conflict, and weather states
   always include a label or icon (`constitution.md`, Principle XIII and *Visual Identity*, §2).
6. **Restrained motion.** The only component transition is a 150ms opacity fade for row actions, plus
   a 160ms drawer entrance; all motion is suppressed under `prefers-reduced-motion`.
7. **Accessible by construction.** WCAG 2.2 AA targets, visible `focus-visible`, 44px minimum targets on
   primary controls, and live-region announcements are built into the shared primitives.

### Dark theme approach

The theme is applied unconditionally, not via a `dark:` variant or a runtime class toggle:

- [`frontend/src/index.css`](../../../frontend/src/index.css) sets `html { color-scheme: dark }` and
  `body { background-color: var(--color-canvas); color: var(--color-text) }`.
- [`AppShell.tsx`](../../../frontend/src/widgets/AppShell.tsx) renders `bg-canvas text-text` on the
  root element and `bg-canvas` on `<main>`.
- [`frontend/index.html`](../../../frontend/index.html) declares `theme-color` `#0B1215`.
- [`frontend/tests/dark-surfaces.test.tsx`](../../../frontend/tests/dark-surfaces.test.tsx) asserts
  that `/`, `/tasks`, `/commitments`, and `/settings` render on `bg-canvas`, contain one `<main>`,
  one `<h1>`, and no `bg-white`, `text-black`, `bg-slate-50`, or `text-gray-900` classes.

---

## 2. Color System

### Token source

Every color is declared once in the `@theme` block of
[`frontend/src/index.css`](../../../frontend/src/index.css). Tailwind CSS 4 is configured through
`@tailwindcss/vite` ([`frontend/vite.config.ts`](../../../frontend/vite.config.ts)); there is no
`tailwind.config.ts` (removed in [ADR 0002](../../adr/0002-design-token-consolidation.md)).

Naming convention: `--color-<name>` generates `bg-<name>`, `text-<name>`, `border-<name>`, and
`ring-<name>` utilities.

### Background and surface colors

| Token | Value | Utilities | Implemented use |
|---|---|---|---|
| `--color-canvas` | `#0B1215` | `bg-canvas` | Application background, sticky header (`bg-canvas/80`), dialog backdrop (`backdrop:bg-canvas/80`), error pages, drawer (`bg-canvas/95`) |
| `--color-surface` | `#131D22` | `bg-surface` | Cards, list rows, forms, weather block, dialogs, navigation hover/active |
| `--color-surface-raised` | `#152026` | `bg-surface-raised` | Hourly forecast cards, hover surfaces, error/validation summaries, secondary button hover |
| `--color-surface-subtle` | `#152026` | `bg-surface-subtle` | `Skeleton` primitive bars (same value as `surface-raised`) |
| `--color-suggestion-surface` | `#A7F3D0` | `bg-suggestion-surface` | Smart Suggestions container background |
| `--color-suggestion-surface-strong` | `#6EE7B7` | `bg-suggestion-surface-strong` | Suggestion accent, hover, and translucent card surface (`/40`) |
| `--color-suggestion-cta` | `#0F172A` | `bg-suggestion-cta` | Suggestion primary action background |

### Primary and accent colors

| Token | Value | Utilities | Implemented use |
|---|---|---|---|
| `--color-primary` | `#34D399` | `text-primary`, `bg-primary` | Logo monogram, primary buttons, active navigation, focused/active accents, empty-state icon, weather icon |
| `--color-primary-hover` | `#10B981` | `hover:bg-primary-hover`, `hover:text-primary-hover` | Primary button and inline link hover |
| `--color-primary-strong` | `#10B981` | — | Constitution alias for primary active/hover; defined but not referenced in components |
| `--color-warm` | `#FBBF24` | `text-warm`, `border-warm/50` | Clear and partly-cloudy weather badge |
| `--color-cool` | `#38BDF8` | `text-cool`, `border-cool/50` | Rain, snow, storm, and fog weather badge |

### Text colors

| Token | Value | Utilities | Implemented use |
|---|---|---|---|
| `--color-text` | `#F3F4F6` | `text-text` | Headings, row titles, body content, wordmark, dialog text |
| `--color-text-muted` | `#8B9BA3` | `text-text-muted` | Timestamps, metadata, descriptions, inactive navigation, helper text, attribution |
| `--color-text-inverse` | `#0B1215` | `text-text-inverse` | Label text on `primary` and `danger` buttons |
| `--color-muted` | `#8B9BA3` | `text-muted` | Constitution-level alias of `text-muted`; no component currently uses it |

### Border colors

| Token | Value | Utilities | Implemented use |
|---|---|---|---|
| `--color-border` | `#23323A` | `border-border` | Decorative 1px separation for every card, row, header, and dialog |
| `--color-border-strong` | `#5B6B73` | `border-border-strong` | Form controls, secondary buttons, radio/checkbox borders, compact action disclosure |
| `--color-tag-border` | `#2A3B44` | `border-tag-border` | Category, priority, status, and commitment-type pills |
| `--color-tag-text` | `#9CA3AF` | `text-tag-text` | Label text inside those pills |

`border-border` is intentionally decorative and does not reach 3:1 against `surface`; interactive
control boundaries use `border-border-strong`, which does. This split is asserted in
[`frontend/tests/a11y-tokens.test.tsx`](../../../frontend/tests/a11y-tokens.test.tsx).

### Semantic colors

The constitution requires at least `primary`, `surface`, `muted`, `border`, `danger`, `success`,
`warning`, and `focus` (Principle VI). All are defined:

| Token | Value | Utilities | Implemented use |
|---|---|---|---|
| `--color-danger` | `#F87171` | `text-danger`, `border-danger`, `bg-danger` | Error headings, field errors, destructive buttons, danger row actions, error state border |
| `--color-success` | `#34D399` | `text-success` | Success notices (`SuccessState`, save confirmations) |
| `--color-warning` | `#FBBF24` | `text-warning`, `border-warning` | Storage warnings, outdated weather, schedule conflicts, overlap acknowledgement, unsaved-draft notice |
| `--color-focus` | `#34D399` | `ring-focus`, `outline-focus` | Global `:focus-visible` outline and explicit focus rings |
| `--color-suggestion-text` | `#064E3B` | `text-suggestion-text`, `border-suggestion-text` | All text and outlines inside the suggestion surface |

Semantic usage rules observed in the implementation:

- Status is never color-only: every warning, error, conflict, or success message includes text.
- Weather state is conveyed by icon + text label + tinted badge (`conditionPresentation.ts`).
- The suggestion surface uses deep slate text on mint; its CTA is dark slate with white text.
  Two components use the Tailwind `text-white` utility inside that CTA
  (`SuggestionActions.tsx`, `SuggestionSurfaceStates.tsx`); see
  [Known discrepancies](#known-discrepancies).

### Contrast

[`frontend/tests/a11y-tokens.test.tsx`](../../../frontend/tests/a11y-tokens.test.tsx) enforces:

- `text`, `text-muted`, `primary`, `danger`, `success`, and `warning` ≥ 4.5:1 on `surface`.
- `border-strong` and `focus` ≥ 3:1 on `surface`.
- `border` < 3:1 on `surface` (accepted because it is decorative).
- `suggestion-text` ≥ 4.5:1 on `suggestion-surface`.
- `text` ≥ 4.5:1 on `suggestion-cta`.

---

## 3. Typography

### Font families

| Role | Implemented value |
|---|---|
| Interface family | `Inter Variable`, then `Inter`, `system-ui`, `ui-sans-serif`, `-apple-system`, `Segoe UI`, `Roboto`, `Helvetica`, `Arial`, `sans-serif` (`--font-sans`) |
| Font loading | `@fontsource-variable/inter` imported in [`frontend/src/app/bootstrap.tsx`](../../../frontend/src/app/bootstrap.tsx); bundled locally, no third-party font request |
| Display typeface | None. A second display family is prohibited by the constitution |

The primary typeface is Inter with a system fallback, as required by the constitution (*Visual
Identity*, §3). See [Known discrepancies](#known-discrepancies) for the README claim that no webfont
is loaded.

### Type scale

| Token | Size / line height | Token weight | Utilities | Implemented use |
|---|---|---|---|---|
| `--text-display` | `2.25rem` / `2.5rem` | `700` | `text-display font-bold` | Home page `<h1>`, current temperature |
| `--text-title` | `1.5rem` / `2rem` | `600` | `text-title font-semibold` | Page `<h1>`s, section `<h2>`s, dialog headings, empty/error headings |
| `--text-body` | `1rem` / `1.5rem` | — | `text-body` | Body copy, buttons, inputs, row titles, dialog text |
| `--text-caption` | `0.875rem` / `1.25rem` | — | `text-caption` | Metadata, labels, nav links, pills, helper text, error text, timestamps |

`--text-body` and `--text-caption` intentionally carry no default weight. Components apply
`font-medium` or `font-semibold` explicitly where emphasis is needed; the constitution names the
hierarchy display → title → body → caption (Principle VI).

### Hierarchy conventions

| Element | Convention |
|---|---|
| Page heading | One `<h1>` per route, `text-title font-semibold text-text`, `tabIndex={-1}` for route focus; Home uses `text-display font-bold` |
| Section heading | `<h2>` with `text-title font-semibold text-text`; nested weather forecast heading is `<h3>` with `text-body font-semibold` |
| Row title | `<h3>` with `text-body font-semibold text-text` (agenda, commitments); tasks use `<p>` with `text-body` |
| Eyebrow / date label | `text-caption font-medium uppercase tracking-wide text-primary` (Home date) |
| Supporting copy | `text-body text-text-muted` or `text-caption text-text-muted` |
| Controls and labels | Labels `text-caption font-medium`; inputs `text-body`; buttons `text-body font-medium` |
| Numerals | `tabular-nums` on every time, temperature, percentage, and duration (see below) |

### Numerals

`tabular-nums` is applied to:

- Agenda entry time ranges and availability (`AgendaEntryRow`, `AgendaAvailability`).
- Task metadata durations and due dates are formatted through `Intl`; commitment date/time cells use
  `tabular-nums` explicitly (`CommitmentItem`).
- Weather temperature, feels-like, wind, humidity, precipitation, update time, and observation age
  (`WeatherCard`).
- Hourly forecast time and temperature (`HourlyForecastCard`).
- Suggestion current/proposed times (`SuggestionCard`) and schedule dialog times.

This satisfies the constitution requirement that timestamps and temperatures align vertically
(*Visual Identity*, §3).

---

## 4. Design Tokens

### Spacing

| Token | Value | Utilities | Implemented use |
|---|---|---|---|
| `--spacing-page` | `1rem` | `px-page`, `py-page` | Page-level horizontal/vertical padding (mobile) |
| `--spacing-page-wide` | `1.5rem` | `sm:px-page-wide`, `sm:py-page-wide` | Page padding from the `sm` breakpoint up |
| `--spacing-section` | `1.5rem` | `space-y-section` | Vertical rhythm between major page sections |
| `--spacing-stack` | `0.5rem` | `space-y-stack`, `gap-stack` | Compact stacking inside forms and field groups |
| `--spacing-control` | `0.75rem` | `px-control` | Horizontal padding for compact controls |
| `--spacing-forecast-card` | `6rem` | `w-forecast-card` | Fixed width of hourly forecast cards and their skeleton |
| `--spacing-density-compact` | `0.25rem` | — | Defined density scale; not referenced by components |
| `--spacing-density-comfortable` | `0.5rem` | — | Defined density scale; not referenced by components |
| `--spacing-density-roomy` | `0.75rem` | — | Defined density scale; not referenced by components |

The implementation also relies on the default Tailwind spacing scale for common steps: `gap-2` (8px),
`gap-3` (12px), `space-y-3` (12px), `p-3` (12px), `p-4` (16px), `p-5` (20px), `mt-4` (16px). The
`max-w-6xl`, `max-w-md`, `max-w-xl`, and `max-w-2xl` constraints are framework defaults as well, not
Walday tokens.

### Border radius

| Token | Value | Utilities | Implemented use |
|---|---|---|---|
| `--radius-card` | `1rem` | `rounded-card` | Defined for cards; **not referenced** — components use `rounded-2xl`, which is also `1rem` |
| `--radius-control` | `0.5rem` | `rounded-control` | Buttons, links used as controls, inputs, selects, compact action disclosure, focusable forecast scroller |
| Tailwind `rounded-2xl` | `1rem` | `rounded-2xl` | Cards, rows, forms, dialogs, the suggestions container, the mobile drawer's bottom corners |
| Tailwind `rounded-full` | `9999px` | `rounded-full` | Category, priority, status, and condition pills; active navigation indicator |

### Shadows and elevation

| Token | Value | Utilities | Implemented use |
|---|---|---|---|
| `--shadow-card` | `0 1px 2px rgb(0 0 0 / 0.4), 0 8px 24px rgb(0 0 0 / 0.3)` | `shadow-card` | Confirmation dialog, mobile navigation drawer, skip link when focused, commitment form |
| `--shadow-focus` | `0 0 0 2px var(--color-canvas), 0 0 0 4px var(--color-focus)` | `shadow-focus` | Defined but not referenced; focus uses the global outline or explicit rings instead |

Elevation is expressed primarily by surface color steps (`canvas` → `surface` →
`surface-raised`) and 1px borders. Shadows never provide the only separation between surfaces
(*Visual Identity*, §4).

### Borders

| Pattern | Classes | Where |
|---|---|---|
| Standard card/row boundary | `border border-border` | Task items, commitment items, agenda entries, weather card, dialogs, forms, empty/error states |
| Interactive control boundary | `border border-border-strong` | Buttons (secondary), inputs, selects, radio/checkbox outlines, compact action disclosure |
| Status boundary | `border-danger` / `border-warning` | Error states, validation summaries, storage warnings, overlap acknowledgement |
| Suggestion boundary | `border-suggestion-surface-strong` | Suggestions container and suggestion cards |
| Header boundary | `border-b border-border` | Sticky application header |

### Layout constraints

| Constraint | Implemented value |
|---|---|
| Main content width | `max-w-6xl` (`72rem` / 1152px) via [`Container.tsx`](../../../frontend/src/shared/ui/Container.tsx) |
| Page padding | `px-page` (16px), `sm:px-page-wide` (24px) |
| Header | `sticky top-0 z-40`, `border-b`, `bg-canvas/80`, `backdrop-blur-md` |
| Main region | `<main id="main-content">` with `flex-1`, `py-page sm:py-page-wide` |
| Dialog width | `max-w-md` (`28rem`) |
| Preferences form | `max-w-xl` (`36rem`) |
| Error / route-error pages | `max-w-2xl` (`42rem`), `min-h-screen` |
| Content rhythm | `space-y-section` between page sections; `space-y-3` between list rows |

### Breakpoints

No custom breakpoints are declared. The implementation uses the Tailwind CSS 4 defaults and only
`sm` and `md` in practice:

| Prefix | Default min-width | Implemented use |
|---|---|---|
| `sm` | `40rem` (640px) | Wider page padding, three-column task form grid, two-column commitment date/time grid |
| `md` | `48rem` (768px) | Desktop navigation shown / mobile menu hidden |
| `lg`, `xl`, `2xl` | Tailwind defaults | Not used in the current source |

One explicit media query exists in [`frontend/src/index.css`](../../../frontend/src/index.css):
`(min-width: 768px) and (hover: hover) and (pointer: fine)` selects the row-action reveal mode. The
mobile drawer also observes `(min-width: 768px)` to close itself
([`MobileNavigationDrawer.tsx`](../../../frontend/src/widgets/MobileNavigationDrawer.tsx)).

Verification widths mandated by the constitution are 360, 768, 1024, and 1440 CSS pixels, plus 200%
browser zoom (*Visual Identity*, §6; Principle VI).

---

## 5. Component Guidelines

All shared primitives live in [`frontend/src/shared/ui/`](../../../frontend/src/shared/ui/) and are
exported through their own files. They contain no data fetching or business rules (README, *How to
add a shared primitive*).

### Buttons

**Implemented** — [`Button.tsx`](../../../frontend/src/shared/ui/Button.tsx).

Base classes:

```
inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-4 py-2
text-body font-medium disabled:cursor-not-allowed disabled:opacity-50
```

| Variant | Classes | Intended use |
|---|---|---|
| `primary` (default) | `bg-primary text-text-inverse hover:bg-primary-hover` | Main action: submit, create, confirm, retry |
| `secondary` | `border border-border-strong bg-surface text-text hover:bg-surface-raised` | Alternative and cancel actions, date navigation, weather refresh/retry |
| `danger` | `bg-danger text-text-inverse hover:opacity-90` | Destructive confirmation |
| `ghost` | `text-primary hover:bg-surface-raised` | Icon-only shell controls (menu open/close, drawer close) |

Notes:

- Minimum target is 44×44 CSS pixels (`min-h-11 min-w-11`), above the constitutional 24px minimum
  and matching the 44px recommendation.
- There are no size variants; the default is the only size.
- Pending state is expressed with `disabled` plus a localized label change (for example
  "Saving…", "Refreshing…"), not a spinner.
- The suggestion surface does not reuse `Button`; it uses its own action classes bound to
  `suggestion-cta` / `suggestion-text` (see *Suggestion card* below).

### Inputs and form controls

**Implemented** in feature forms. Two field recipes exist; they differ only in horizontal padding
utility.

| Pattern | Classes | Where |
|---|---|---|
| Full-width field | `mt-1 min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 py-2 text-body text-text` | [`TaskForm.tsx`](../../../frontend/src/features/tasks/ui/TaskForm.tsx), [`TaskEditForm.tsx`](../../../frontend/src/features/tasks/ui/TaskEditForm.tsx) |
| Inline field | `min-h-11 rounded-control border border-border-strong bg-surface px-control py-2 text-body text-text` | [`CommitmentForm.tsx`](../../../frontend/src/features/commitments/ui/CommitmentForm.tsx), [`DateNav.tsx`](../../../frontend/src/shared/ui/DateNav.tsx) |
| Label | `text-caption font-medium text-text` (TaskForm adds `block`) | All forms |
| Field error | `text-caption text-danger`, linked through `aria-describedby`, input marked `aria-invalid` | All forms |
| Validation summary | `rounded-2xl border border-danger bg-surface-raised p-3`/`p-5`, `role="alert"` | Shown when more than one error exists |
| Radio / checkbox | `h-5 w-5` (commitment type, overlap acknowledgement) or `h-6 w-6` (language, task completion), `border border-border-strong`, `text-primary` | Forms, task rows, language field |
| Group container | `fieldset` with `rounded-2xl border border-border bg-surface p-5` (`LanguageField`) | Preference groups |
| Native date/time inputs | Same inline field recipe; `DateNav` and commitment forms use `type="date"` / `type="time"` | Date navigation, commitments |
| Disabled state | `disabled` attribute plus reduced opacity on buttons; inputs rely on native disabled styling within the same token classes | All forms |

Form behavior conventions (implemented):

- Forms are controlled and validated by Zod-derived domain validators.
- Submissions are guarded while pending; no duplicate submission.
- Draft changes are reported to a parent controller so navigation can be blocked and a
  `beforeunload` warning raised (`PreferencesForm`, `CommitmentsPage`).
- Focus moves to the first invalid field and/or the validation summary.

### Cards

**Implemented** as a repeated utility recipe, not as a `Card` component:

```
rounded-2xl border border-border bg-surface p-5
```

| Surface | Recipe | Examples |
|---|---|---|
| Task row | `group rounded-2xl border border-border bg-surface p-5` | [`TaskItem.tsx`](../../../frontend/src/features/tasks/ui/TaskItem.tsx) |
| Commitment row | Same recipe | [`CommitmentItem.tsx`](../../../frontend/src/features/commitments/ui/CommitmentItem.tsx) |
| Agenda entry | Same recipe | [`AgendaEntryRow.tsx`](../../../frontend/src/features/agenda/ui/AgendaEntryRow.tsx) |
| Weather block | `space-y-3 rounded-2xl border border-border bg-surface p-5` | [`WeatherCard.tsx`](../../../frontend/src/widgets/WeatherCard.tsx) |
| Hourly forecast card | `w-forecast-card ... rounded-2xl border border-border bg-surface-raised p-3` | [`HourlyForecastCard.tsx`](../../../frontend/src/widgets/HourlyForecastCard.tsx) |
| Form card | `space-y-stack rounded-2xl border border-border bg-surface p-5` | [`TaskForm.tsx`](../../../frontend/src/features/tasks/ui/TaskForm.tsx) |
| Commitment form | `rounded-2xl border border-border bg-surface p-5 shadow-card` | [`CommitmentForm.tsx`](../../../frontend/src/features/commitments/ui/CommitmentForm.tsx) |

Padding is 20px (`p-5`) for lists and weather, 16px (`p-4`) for suggestion items, and 12px (`p-3`)
for forecast cards. The constitution's 20–24px card padding is satisfied for main cards.

List spacing: `<ul className="space-y-3">` (12px), matching the lower bound of the constitutional
12–16px row gap.

Row density (constitution, *Visual Identity*, §4):

- Status control on the left, title with time in the middle, category/status pill at the right.
- Secondary actions are hidden on wide fine-pointer screens and revealed on row hover or keyboard
  focus without layout shift; narrow or coarse-pointer contexts get a persistent compact
  disclosure (see *Row actions* below).

### Modals and dialogs

**Implemented** — [`ConfirmDialog.tsx`](../../../frontend/src/shared/ui/ConfirmDialog.tsx) and
feature dialogs built on the same pattern:

- `ConfirmDialog` (generic confirm / cancel, optional `danger`)
- `DeleteTaskDialog`, `DeleteCommitmentDialog`
- `ScheduleTaskDialog`, `RemoveScheduleDialog`
- `SuggestionAdjustDialog`
- `DiscardDraftDialog`
- `MobileNavigationDrawer` (a native `<dialog>` used as a full-width drawer)

Shared modal recipe:

```
w-full max-w-md rounded-2xl border border-border bg-surface p-5 text-text
shadow-card backdrop:bg-canvas/80
```

Behavior ([`useDialogFocusTrap.ts`](../../../frontend/src/shared/lib/useDialogFocusTrap.ts)):

| Behavior | Implementation |
|---|---|
| Semantics | Native `<dialog>` with `aria-modal="true"`, `aria-labelledby`, optional `aria-describedby` |
| Opening | `showModal()` when available, otherwise the `open` attribute |
| Initial focus | Explicit `initialFocusRef` (for example the cancel button, or the first time field) |
| Tab handling | Tab and Shift+Tab wrap within the dialog's focusable elements |
| Escape | Prevented native cancel; routed through `onClose` |
| Close | Focus returns to the previously focused element if it is still connected |
| Background scroll | Locked for the mobile drawer (`lockScroll: true`) |
| Drawer entrance | `.drawer-panel` animation: 160ms `ease-out`, 8px rise + fade |
| Danger dialogs | Confirm button uses `variant="danger"`; cancel remains `secondary` |

### Navigation

**Implemented** — [`Navigation.tsx`](../../../frontend/src/widgets/Navigation.tsx),
[`MobileNavigationDrawer.tsx`](../../../frontend/src/widgets/MobileNavigationDrawer.tsx),
[`navigationItems.ts`](../../../frontend/src/widgets/navigationItems.ts).

- Four destinations: `/` Home, `/tasks`, `/commitments`, `/settings`.
- Desktop (`md` and up): inline row of `NavLink`s with
  `min-h-11 min-w-11 rounded-control px-3 text-caption font-medium`.
- Inactive: `text-text-muted hover:bg-surface hover:text-primary`.
- Active: `bg-surface text-primary underline underline-offset-4` plus a 16px-wide, 2px-tall mint indicator bar.
  Activity is conveyed by more than color (background, underline, indicator).
- Mobile (below `md`): the row is hidden and a ghost icon button opens the drawer. The button exposes
  `aria-expanded` and `aria-controls` and swaps between menu and close icons with an accessible name.
- Drawer: full-width top sheet with `rounded-b-2xl border-b border-border bg-canvas/95 p-4
  shadow-card backdrop-blur-lg`; items are `min-h-11 rounded-2xl p-4 text-body font-medium`.
- Header: sticky, translucent canvas, blur, bottom border.
- Skip link: visually hidden until focused, then `focus:absolute focus:left-4 focus:top-4
  focus:z-50 focus:bg-surface focus:shadow-card`, targeting `#main-content`.
- Route changes move focus to the page heading and announce through a polite live region
  (`RouteAnnouncer`).

### Badges and tags

**Implemented** as a repeated recipe:

```
inline-flex items-center rounded-full border border-tag-border px-2 py-0.5 text-caption text-tag-text
```

| Badge | Content | Source |
|---|---|---|
| Task priority | Localized priority label | [`TaskMetadata.tsx`](../../../frontend/src/features/tasks/ui/TaskMetadata.tsx) |
| Task status | Pending / completed | `TaskMetadata.tsx` |
| Commitment type | Fixed / flexible | [`CommitmentItem.tsx`](../../../frontend/src/features/commitments/ui/CommitmentItem.tsx) |
| Agenda category | Task / commitment category | [`AgendaEntryRow.tsx`](../../../frontend/src/features/agenda/ui/AgendaEntryRow.tsx) |
| Suggestion category | Conflict / slot / flexible | [`SuggestionCard.tsx`](../../../frontend/src/features/suggestions/ui/SuggestionCard.tsx) (adds `px-3 py-1`) |
| Weather condition | Localized condition label | [`WeatherCard.tsx`](../../../frontend/src/widgets/WeatherCard.tsx), tinted `border-warm/50 text-warm` or `border-cool/50 text-cool` |

Pills always carry text; color is supplementary. They never use arbitrary hex values.

### Feedback and loading states

| Primitive | File | Recipe and behavior |
|---|---|---|
| `Skeleton` | [`Skeleton.tsx`](../../../frontend/src/shared/ui/Skeleton.tsx) | `aria-hidden="true"`; bars `h-4 animate-pulse rounded-control bg-surface-subtle`; `lines` prop repeats rows |
| `Loading` | [`Loading.tsx`](../../../frontend/src/shared/ui/Loading.tsx) | Wrapper `aria-busy="true" aria-live="polite"`; visible skeleton plus `sr-only` label |
| Page skeletons | `TasksPageSkeleton`, `CommitmentsPageSkeleton`, `PreferencesPageSkeleton`, `AgendaSkeleton`, `SuggestionSurfaceSkeleton` | Match the final layout region-by-region; skeletons hidden from AT, busy state announced |
| `EmptyState` | [`EmptyState.tsx`](../../../frontend/src/shared/ui/EmptyState.tsx) | Centered card, mint `Inbox` icon, `text-title` heading, muted description, optional primary action |
| `ErrorState` | [`ErrorState.tsx`](../../../frontend/src/shared/ui/ErrorState.tsx) | `role="alert"`, `border-danger`, danger heading, optional action |
| `SuccessState` | [`SuccessState.tsx`](../../../frontend/src/shared/ui/SuccessState.tsx) | `role="status" aria-live="polite"`, `text-success` message, optional description |
| `ErrorBoundary` | [`ErrorBoundary.tsx`](../../../frontend/src/shared/ui/ErrorBoundary.tsx) | Full-page fallback inside `<main>`; focuses the heading; retry, reload, and home actions |
| Route error | [`RouteError.tsx`](../../../frontend/src/app/RouteError.tsx) | `role="alert"`, danger heading, chunk-specific copy, retry and home |
| Notice region | `TasksPage`, `PreferencesForm`, `HomePage` | `role="status" aria-live="polite" aria-atomic="true"`; message color by kind (`text-success`, `text-warning`, `text-danger`, `text-text-muted`) |
| Storage warning | [`StorageWarning.tsx`](../../../frontend/src/features/tasks/ui/StorageWarning.tsx) | `role="alert"`, `border-warning bg-surface`, warning heading, retry action |
| Empty agenda | [`AgendaEmptyState.tsx`](../../../frontend/src/features/agenda/ui/AgendaEmptyState.tsx) | Calm dark card, two secondary actions, no illustration |
| Weather loading | [`WeatherCard.tsx`](../../../frontend/src/widgets/WeatherCard.tsx) | `aria-busy`, four forecast-card skeletons, `sr-only` loading label |
| Weather unavailable / stale | `WeatherCard` | Explicit text, retry button, `text-warning` outdated notice; never blocks the page |
| Suggestion states | [`SuggestionSurfaceStates.tsx`](../../../frontend/src/features/suggestions/ui/SuggestionSurfaceStates.tsx) | Skeleton, unavailable (incomplete/error) with retry, and no-results states on the mint surface |

The constitution requires a layout-matching skeleton, an empty state with a CTA when actionable, an
error state with retry when meaningful, and success feedback after mutations (Principle VI). The
current primitives implement that contract.

### Row actions

**Implemented** — [`RowActions.tsx`](../../../frontend/src/shared/ui/RowActions.tsx).

| Context | Behavior |
|---|---|
| Wide, fine pointer (`min-width: 768px` + `hover: hover` + `pointer: fine`) | Inline edit/delete buttons, `opacity-0`, `transition-opacity duration-150 ease-out`, revealed by `group-hover` or `group-focus-within` |
| Narrow or coarse pointer | Persistent compact disclosure (`details`/`summary`) with a `MoreHorizontal` icon and `sr-only` menu label; actions mount only while open |
| Target size | Every action is `min-h-11 min-w-11` |
| Danger tone | `text-danger` |
| Layout shift | Hidden by opacity (not `display`), so revealing actions does not move the row |

---

## 6. Responsive Design

### Breakpoint conventions

- Mobile-first: base classes target the smallest supported width; `sm:` and `md:` add refinements.
- `sm` (640px) widens page padding and switches form grids to 2 or 3 columns.
- `md` (768px) switches navigation from drawer to inline row and enables hover-reveal row actions.
- No layout depends on `lg` or larger; content is capped by `max-w-6xl` instead.
- The mobile drawer force-closes when the viewport crosses 768px.

### Behavior by viewport

| Range | Layout behavior |
|---|---|
| < 640px (mobile, verified from 360px) | Single column; page padding 16px; nav collapsed to a menu button and full-width drawer; row actions use the compact disclosure; forms stack; weather forecast scrolls horizontally inside its card |
| 640–767px (large mobile / small tablet) | Same single-column stack with 24px page padding; task form fields become 3 columns; commitment date/time becomes 2 columns |
| ≥ 768px (tablet / desktop, verified at 1024 and 1440) | Inline horizontal navigation; hover/focus row actions; content still single-column but capped at 1152px and centered |
| ≥ 1440px | Same as desktop; extra width becomes outer margin because of `max-w-6xl` |

### Responsive principles observed

- Horizontal overflow is contained to the hourly forecast list, which
  is keyboard-scrollable (`ArrowLeft`, `ArrowRight`, `Home`, `End`) and shows a scroll hint when it
  overflows ([`WeatherForecastList.tsx`](../../../frontend/src/widgets/WeatherForecastList.tsx),
  [ADR 0012](../../adr/0012-hourly-forecast-contained-horizontal-scroll.md)).
- Touch targets stay at least 44×44 CSS pixels regardless of viewport.
- Hover is never the only way to reach an action.
- Text wraps with `break-words` in titles, descriptions, locations, and badges.
- Forms reflow from stacked to multi-column without changing field order.

---

## 7. Accessibility and Interaction

### Standards

Target: **WCAG 2.2 Level AA** (constitution Principle XIII). The implementation adds concrete
guarantees:

| Area | Implementation |
|---|---|
| Landmarks | One `<header>`, one `<main id="main-content">`, one `<nav>` with an accessible label, one `<h1>` per route |
| Skip link | First focusable element in the shell; target is `<main tabIndex={-1}>` |
| Headings | Logical hierarchy: page `h1` → section `h2` → row/forecast `h3` |
| Document language | `<html lang>` updated by `applyLanguage` when the locale changes |
| Focus on route change | Page heading receives `tabIndex={-1}` and focus; a polite live region announces the route |
| Forms | Visible labels, `aria-invalid`, `aria-describedby`, error summary with `role="alert"` for multiple errors |
| Live regions | Save notices, route announcements, agenda summaries, weather freshness, and suggestion outcomes are announced politely; errors use `alert` |
| Screen-reader text | Skeleton and icon-only controls carry `sr-only` labels; decorative icons use `aria-hidden="true"` |
| Non-color status | Priority, status, category, conflicts, weather, and errors always include text |
| Tabular numerals | Applied to all times, temperatures, percentages, and durations |

### Focus states

Global focus styling in [`frontend/src/index.css`](../../../frontend/src/index.css):

```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

- Every interactive element inherits this outline. Two elements suppress it in favor of an explicit
  ring: the hourly forecast scroller (`outline-none` + `focus-visible:ring-2 ring-focus ring-offset-2
  ring-offset-surface`) and the Open-Meteo attribution link (`focus-visible:outline-none` +
  `focus-visible:ring-2 focus-visible:ring-focus`).
- Task completion checkboxes and several form controls declare explicit
  `focus-visible:outline-2 outline-offset-2 outline-focus`.
- Row actions become visible on `group-focus-within`, so keyboard users see them before focusing them.

### Keyboard interaction

| Surface | Keys and behavior |
|---|---|
| Navigation and links | Native tab order; active destination exposed via `aria-current` where applicable |
| Dialogs and drawer | Tab/Shift+Tab trapped; Escape closes; focus enters at a defined element and returns to the invoker |
| Row actions (compact) | Native `summary`/`details` disclosure, toggleable by Enter/Space |
| Hourly forecast | `ArrowLeft` / `ArrowRight` scroll one card; `Home` / `End` jump to the ends |
| Forms | Enter submits; validation focus moves to the first invalid field or summary |
| Language and type selectors | Native radio groups inside `fieldset`/`legend` |

### Hover and active states

- Hover: secondary/ghost buttons and nav links gain `bg-surface` or `bg-surface-raised`; primary
  buttons switch to `primary-hover`; inline links switch to `primary-hover`; weather badges use
  `warm`/`cool` tones.
- Active navigation: `bg-surface`, `text-primary`, underline, and an indicator bar.
- No `active:` utility variants exist in the source; pressed feedback comes from native button
  behavior and, in suggestion actions, a pending label change.
- Disabled controls use `disabled:opacity-50` (buttons), `disabled:opacity-60` (suggestion actions),
  `disabled:cursor-not-allowed`, and native disabled semantics.

### Motion and animation

| Motion | Values | Source |
|---|---|---|
| Row action reveal | `transition-opacity`, `duration-150`, `ease-out` | `RowActions.tsx` |
| Mobile drawer entrance | `drawer-in` keyframes, 160ms `ease-out`, 8px translate + fade | `index.css` |
| Forecast scrolling | `smooth` by default, `auto` when reduced motion is preferred | `WeatherForecastList.tsx` |
| Skeletons | `animate-pulse` | `Skeleton.tsx`, page skeletons |
| Reduced motion | Global override sets animation/transition duration to `0.01ms`, iteration count to 1, and `scroll-behavior: auto` | `index.css` |

No motion animates layout-affecting properties; the row-action fade uses opacity only.

---

## 8. Known Discrepancies

These conflicts exist in the repository and are documented rather than resolved. The constitution is
the governing document where it conflicts with the product overview or README.

| # | Source A | Source B | Current state |
|---|---|---|---|
| 1 | `docs/product-overview.md` §10: "The default visual theme should be light." | Constitution v3.0.0 Principle VI and *Visual Identity*: dark is the default and only approved theme | The implementation and constitution use dark. The product overview statement is stale and was not updated with the theme amendment. |
| 2 | `frontend/README.md` *Design tokens and styling*: "The typography uses a system font stack … No third-party font is loaded." ADR 0002 repeats "system fonts". | `index.css` declares `Inter Variable` first; `bootstrap.tsx` imports `@fontsource-variable/inter`; constitution requires Inter | Inter is loaded and used. The README and ADR 0002 text is stale. |
| 3 | Constitution: cards use 16px radius (`rounded-2xl`); buttons use 8px (`rounded-lg`). | Tokens `--radius-card: 1rem` and `--radius-control: 0.5rem` exist; components use `rounded-2xl` and `rounded-control` | Values match (1rem / 0.5rem). `rounded-card` is unused, so `--radius-card` is a defined-but-unused token. |
| 4 | Constitution palette table lists 16 canonical tokens. | `index.css` defines 25 color tokens, adding `surface-subtle`, `border-strong`, `text-inverse`, `danger`, `success`, `warning`, `focus`, `primary-hover`, and `muted`. | The extra tokens are required by Principle VI or support implemented states; the constitution table is not exhaustive. |
| 5 | Constitution requires `focus-visible` styling. | `--shadow-focus` token is defined. | Focus is implemented through the global outline and explicit rings; `--shadow-focus` is unused. |
| 6 | Constitution defines density scales. | `--spacing-density-*` tokens exist. | No component references them; density is expressed through fixed padding utilities. |
| 7 | Constitution: components must not contain raw hex colors and must use semantic tokens. | `SuggestionActions.tsx` and `SuggestionSurfaceStates.tsx` use `text-white` on `bg-suggestion-cta`. | No hex values exist in components, but `text-white` is a framework color rather than a semantic token. Minor deviation. |
| 8 | `frontend/README.md` *Known follow-up debt*: forms use legacy utility colors; commitment deletion uses a native confirm dialog. | Forms use `border-border-strong`/`bg-surface`; deletion uses `ConfirmDialog`. | README debt list is stale. |
| 9 | Constitution: card padding 20–24px; row gaps 12–16px. | Implemented `p-5` (20px) and `space-y-3` (12px). | Compliant at the lower bounds. |
| 10 | Constitution describes the monogram as "two smooth, rounded wave/check strokes". | `WaldayLogo.tsx` uses a polyline with round caps/joins; the favicon uses curved Bézier strokes and a different stroke width. | Visual intent matches; geometry differs between the inline logo and the favicon. See [`branding.md`](branding.md). |

---

## 9. Source References

| Concern | File |
|---|---|
| Token definitions, base styles, motion | [`frontend/src/index.css`](../../../frontend/src/index.css) |
| Tailwind integration | [`frontend/vite.config.ts`](../../../frontend/vite.config.ts) |
| Shell, header, skip link | [`frontend/src/widgets/AppShell.tsx`](../../../frontend/src/widgets/AppShell.tsx) |
| Shared primitives | [`frontend/src/shared/ui/`](../../../frontend/src/shared/ui/) |
| Dialog behavior | [`frontend/src/shared/lib/useDialogFocusTrap.ts`](../../../frontend/src/shared/lib/useDialogFocusTrap.ts) |
| Reduced motion hook | [`frontend/src/shared/lib/usePrefersReducedMotion.ts`](../../../frontend/src/shared/lib/usePrefersReducedMotion.ts) |
| Brand logo | [`frontend/src/shared/ui/WaldayLogo.tsx`](../../../frontend/src/shared/ui/WaldayLogo.tsx) |
| Token and contrast tests | [`frontend/tests/a11y-tokens.test.tsx`](../../../frontend/tests/a11y-tokens.test.tsx), [`frontend/tests/dark-surfaces.test.tsx`](../../../frontend/tests/dark-surfaces.test.tsx) |
| Token consolidation decision | [`docs/adr/0002-design-token-consolidation.md`](../../adr/0002-design-token-consolidation.md) |
| Calm Tech Dark feature spec | [`specs/005-calm-tech-dark-ui/spec.md`](../../../specs/005-calm-tech-dark-ui/spec.md) |
