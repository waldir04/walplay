# Contract: Shared UI Foundations

**Feature**: `001-app-foundation` | **Type**: component public API contract

Shared UI is presentation-only: it fetches nothing, contains no entertainment business rules, and
depends on no feature or page (FR-035, Principle III). All components are arrow functions, use
semantic tokens only, and are exported through `shared/ui/index.ts`.

Every interactive element has the shared `:focus-visible` treatment (2 px `focus` outline, 2 px
offset) and meets the target-size rules: ≥ 24×24 CSS px for all interactive targets, ≥ 44×44 CSS px
for primary controls and navigation destinations.

## `WalplayLogo`

```ts
interface WalplayLogoProps {
  className?: string;
  showText?: boolean; // default true
}
```

**Contract**:

- Inline SVG `0 0 32 32` viewBox, path `M5 10 L11 22 L16 13 L21 22 L27 10`, rendered 28×28,
  `fill="none"`, `strokeWidth="3.6"`, round caps/joins.
- `stroke="currentColor"` with the `primary` token applied through the SVG class; no literal hex.
- Monogram is `aria-hidden="true"` and carries no accessible name.
- Wordmark is live HTML text `Walplay` using the `text` token, `text-xl font-semibold
  tracking-tight`.
- Horizontal `inline-flex`, 10 px gap, vertically centered; monogram `shrink-0`.
- `showText={false}` yields the 28×28 icon-only mark.
- No per-state recoloring, animation, tagline, `<img>`, or external asset.
- The accessible application name is provided by the wrapping link (`app.name`), not this component.

## `PageContainer`

```ts
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}
```

Renders the centered maximum content width with `px-4` page padding and `sm:px-6`. Used by every
page so layout stays consistent.

## `SkipLink`

```ts
interface SkipLinkProps {
  label: string;
  targetId: string; // expected: "main-content"
}
```

- Rendered as an `<a>` and is the first focusable element in the document.
- Visually hidden until focused, then visible with the shared card surface and shadow.
- Activating it moves focus to the target main region, which carries `tabIndex={-1}`.

## `Button`

```ts
type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; // default 'primary'
}
```

- `primary`: `bg-primary` with `text-text-inverse`; hover `primary-strong`.
- `secondary`: `bg-surface` with `border-border-strong` and `text-text`; hover `surface-raised`.
- `ghost`: `text-primary`; hover `surface-raised`; requires an accessible name when icon-only.
- 8 px radius (`rounded-control`), ≥ 44 px min height for primary/secondary.
- Native `<button>` semantics are preserved; no ARIA role overrides.

## `Link`

```ts
interface LinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}
```

- Presentation-only wrapper over the router link; no data access or business rules.
- Uses `text-primary` and the shared 2 px `focus` outline with 2 px offset.
- Preserves native link semantics and a meaningful accessible name from its content.
- Used for the brand link and navigation destinations so link treatment is not duplicated.
- No raw hex, palette classes, non-functional `href`, or `onClick`-only link behavior.

## `Skeleton`

```ts
interface SkeletonProps {
  className?: string;
}
```

- `bg-surface-subtle` block with the appropriate radius and no animation that shifts layout.
- Always `aria-hidden="true"`; the surrounding loading region communicates the busy state.
- Optional opacity pulse must be disabled under `prefers-reduced-motion: reduce`.

## `RouteLoadingState`

```ts
interface RouteLoadingStateProps {
  heading: string;      // localized, visually rendered
  busyLabel: string;    // localized accessible label
}
```

- Renders inside `<main>` before page content and mirrors the final layout closely enough that the
  content swap produces no visible jump.
- The container has `aria-busy="true"` and an accessible label (`role="status"` may be used with a
  polite live region, but must not double-announce).
- Contains no spinner and does not rely on the text "Loading…".
- Skeleton bars are hidden from assistive technology.
- Completion is announced politely once by the route layer, not by this component.

## `EmptyState`

```ts
interface EmptyStateProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void } | undefined;
  icon?: React.ReactNode;
}
```

- Renders a calm dark card (`surface`, `border`, 16 px radius) with a subtle mint icon.
- Heading is a real heading below the page `h1` (e.g. `h2`).
- **If no meaningful action exists, `action` is omitted and no button or link is rendered** (FR-014).
- An action, when present, must actually work; no placeholder callbacks.

## `ErrorState`

```ts
interface ErrorStateProps {
  title: string;
  description: string;
  retry?: { label: string; onRetry: () => void } | undefined;
  homeAction: { label: string; href: string };
}
```

- Announced as an alert (`role="alert"`) exactly once per failure.
- Heading receives focus when the state replaces route content, and is focusable
  (`tabIndex={-1}`).
- `retry` is present only when retrying can genuinely re-attempt the failed preparation.
- `homeAction` is always present and points to `/`.
- Never renders stack traces, module names, internal identifiers, or provider details.
- Visually distinct from the not-found state.

## `LiveRegion`

```ts
interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive'; // default 'polite'
}
```

- Renders a visually hidden `aria-live` region.
- The announcement surface is a single shared instance at the shell level so rapid changes produce
  one announcement, not duplicates.
- The message is cleared before a new value is set, preventing stale-language announcements.
- Error surfaces use `assertive`/`role="alert"`; loading and status use `polite`.

## `PrimaryNavigation` (widget-internal, exported by `widgets/app-shell`)

```ts
interface PrimaryNavigationProps {
  items: readonly { to: string; label: string }[];
  ariaLabel: string;
  onNavigate?: () => void;
}
```

- `<nav aria-label={ariaLabel}>` with a list of links.
- Active link gets `aria-current="page"` plus two non-color visual cues.
- Every destination is ≥ 44 px in the primary direction.
- Used by both the wide presentation and the compact `<dialog>`.

## `CompactMenu` (widget-internal, exported by `widgets/app-shell`)

```ts
interface CompactMenuProps {
  triggerLabel: string;
  closeLabel: string;
  title: string;
  children: React.ReactNode;
}
```

- Trigger is a `<button>` with `aria-expanded` and `aria-controls`.
- Opens a native `<dialog>` with `showModal()`; dialog is `aria-labelledby` the title.
- Focus moves into the dialog, Tab/Shift+Tab remain inside (native), Escape closes it, and focus
  returns to the trigger.
- Closes on route change and when `matchMedia('(min-width: 768px)')` matches.
- Entrance motion ≤ 160 ms `ease-out`, suppressed under reduced motion.
- At most one instance can be open.

## `LanguageSwitcher` (feature, exported by `features/switch-language`)

```ts
interface LanguageSwitcherProps {
  groupLabel: string;
  helperText?: string;
}
```

- Native radio group (`<fieldset>`/`<legend>` or `role="radiogroup"` with an accessible name) with
  one option per supported locale.
- Each option is named in its own language (`English`, `Español`).
- Current selection is programmatically indicated (checked state).
- Changing selection updates the interface without reload, persists when possible, and produces one
  polite confirmation.
- No version, environment, or diagnostic content is rendered by this feature.

## Cross-component rules

- No component reads configuration, storage, browser locale, or network.
- No component contains literal user-facing text; text arrives as props or from `useTranslation`.
- No raw hex, Tailwind palette classes, inline styles, or `!important`.
- No component imports from `pages`, `features`, or `widgets` when it lives in `shared`.
- Failure containment: a rendering error in a page must not unmount the shell. The `errorElement` is attached to a pathless child route inside `<main>`, never to the shell layout route.
