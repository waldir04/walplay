# Walday Branding

Reference documentation for the Walday brand identity as it exists in the repository. It covers the
logo implementation, brand colors, and the visual elements that other products in the Wal product
family can reuse.

- **Authoritative brand rules**: [`.specify/memory/constitution.md`](../../../.specify/memory/constitution.md),
  *Visual Identity and Design System (Walday Dark UI)*.
- **Authoritative implementation**: [`frontend/src/shared/ui/WaldayLogo.tsx`](../../../frontend/src/shared/ui/WaldayLogo.tsx),
  [`frontend/public/logo.svg`](../../../frontend/public/logo.svg),
  [`frontend/index.html`](../../../frontend/index.html).
- **Design system values**: [`design-system.md`](design-system.md).

Anything under *Product Family Consistency* marked **Guidance** is a reference baseline derived from
Walday's implementation. It is not a codified specification for other products; adopting it is a
separate product decision.

---

## 1. Brand Identity

### Position within the Wal product family

The Walday repository contains **no reference to a "Wal" parent brand, to Walplay, or to a shared
family identity**. Searches across `docs/`, `.specify/`, `specs/`, `frontend/README.md`, and
`frontend/src/` return no occurrences of those names. The only documented and implemented identity is
**Walday**, described in [`docs/product-overview.md`](../../product-overview.md) as a personal daily
planning application.

Consequences for this document:

- Walday's relationship to a parent Wal brand is **not defined in this repository**. Any such
  relationship would have to be established outside it.
- All brand rules below describe Walday itself.
- The family-level consistency matrix in §5 is explicitly guidance, not an existing rule.

### Brand personality and visual direction

| Attribute | Evidence |
|---|---|
| Calm | Dark, low-glare slate canvas; no pure black; borders instead of heavy shadows |
| Refined | Inter typography, generous 20px card padding, consistent 16px radii |
| Practical | Dense but scannable rows, tabular numerals, clear status text |
| Friendly | Mint accent, rounded geometry, plain-language empty and error states |
| Modern | Restrained micro-interactions, translucent sticky header, inline SVG mark |

The constitution calls the identity **"Calm Tech Dark"** and cites Linear, Raycast, and deep slate
developer dashboards as inspiration. The product overview describes the visual direction as calm,
friendly, minimalist, modern, clear, and practical.

The brand is intentionally quiet: there are no gradients, glossy effects, decorative illustrations,
or mascots. The mint monogram is the single expressive element in the shell.

### Name and copy

| Element | Implemented value |
|---|---|
| Product name | `Walday` (one word, capital W, lowercase remainder) |
| Wordmark casing | `Walday` |
| HTML document title | `Walday` (`frontend/index.html`), plus localized per-route titles |
| Meta description | "Walday helps you plan tasks, commitments, and your day." |
| Accessible application name | `t('app.name')` on the home link wrapping the logo |
| Language / tone | Calm, direct, plain language; all user-facing copy is localized in English and Spanish |

---

## 2. Logo

### Implementation

The logo is a single React component that renders an inline SVG monogram plus an HTML wordmark
([`WaldayLogo.tsx`](../../../frontend/src/shared/ui/WaldayLogo.tsx)):

```tsx
const WALDAY_MONOGRAM_PATH = 'M5 10 L11 22 L16 13 L21 22 L27 10'

export interface WaldayLogoProps {
  className?: string
  showText?: boolean
}

export function WaldayLogo({ className = '', showText = true }: WaldayLogoProps) {
  return (
    <span className={`inline-flex select-none items-center gap-2.5 ${className}`}>
      <svg
        width="28" height="28" viewBox="0 0 32 32" fill="none"
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor" strokeWidth="3.6"
        strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true" className="shrink-0 text-primary"
      >
        <path d={WALDAY_MONOGRAM_PATH} />
      </svg>
      {showText ? (
        <span className="text-xl font-semibold tracking-tight text-text">Walday</span>
      ) : null}
    </span>
  )
}
```

The constitution mandates exactly this approach: an inline vector SVG component named
`WaldayLogo.tsx` under `frontend/src/shared/ui/`, rendering a minimalist geometric "W" monogram
formed by two rounded wave/check strokes in mint, paired with the off-white `Walday` wordmark.
Raster logos and externally loaded logo images are prohibited.

### Geometric W monogram

| Property | Value |
|---|---|
| Shape | A five-point open polyline forming a "W": `M5 10 L11 22 L16 13 L21 22 L27 10` |
| Structure | Two adjacent V strokes sharing a central raised peak; the outer strokes descend from y=10 to y=22, the middle point rises to y=13 |
| ViewBox | `0 0 32 32` |
| Rendered size | `28 × 28` CSS pixels (`width`/`height` attributes) |
| Stroke | `stroke="currentColor"`, `strokeWidth="3.6"` |
| Fill | `none` (outline mark, not a solid glyph) |
| Line caps / joins | Round (`strokeLinecap="round"`, `strokeLinejoin="round"`) |
| Color | `text-primary` → `--color-primary` `#34D399` (mint) |
| Accessibility | `aria-hidden="true"`; the mark never carries its own accessible name |
| Sizing behavior | `shrink-0` so the mark never compresses beside the wordmark |

The constitution describes the strokes as "smooth, rounded wave/check strokes." In the inline
component the geometry is a polyline with round caps and joins rather than Bézier curves; the
favicon asset uses curved strokes instead. This is a documented difference, not a functional defect.

### Wordmark

| Property | Value |
|---|---|
| Content | The text `Walday` |
| Rendering | HTML `<span>` inside the logo lockup, not SVG text and not an image |
| Size | `text-xl` (1.25rem / 20px) |
| Weight | `font-semibold` (600) |
| Tracking | `tracking-tight` (negative letter spacing) |
| Color | `text-text` → `--color-text` `#F3F4F6` (off-white) |
| Casing | Title case: capital W, lowercase remainder |
| Selection | Disabled on the whole lockup (`select-none`) |

Typography inherits the interface family (`Inter Variable` with system fallback) because the wordmark
does not set a font family.

### Logo composition and proportions

| Property | Value |
|---|---|
| Orientation | Horizontal lockup: monogram left, wordmark right |
| Container | `inline-flex items-center` |
| Gap between mark and wordmark | `gap-2.5` (10px) |
| Mark box | 28 × 28 px |
| Wordmark line box | 20px font size with the default 1.75rem line height; the flex row is centered vertically |
| Approximate total width | ~28px + 10px + wordmark width (roughly 90px for "Walday" in Inter 600 at 20px) |
| Vertical alignment | Centers of the mark and text line are aligned |
| Vertical lockup | Not implemented |
| Icon-only mode | Implemented through `showText={false}` |

### Existing logo assets

| Asset | Location | Description |
|---|---|---|
| Inline horizontal logo | [`frontend/src/shared/ui/WaldayLogo.tsx`](../../../frontend/src/shared/ui/WaldayLogo.tsx) | Canonical logo used in the application shell |
| Favicon | [`frontend/public/logo.svg`](../../../frontend/public/logo.svg) | 32 × 32 SVG: `rect` `#0B1215` with `rx="8"`, plus a mint `#34D399` curved W path, `stroke-width="3.4"`, round caps/joins |
| Browser theme color | [`frontend/index.html`](../../../frontend/index.html) | `<meta name="theme-color" content="#0B1215">` |
| Raster logo | — | None. Tests assert the component renders no `<img>` |

The favicon is a **separate evolution of the mark**, not a downsample of the inline component:

| Property | Inline component | Favicon |
|---|---|---|
| ViewBox | `0 0 32 32` | `0 0 32 32` |
| Rendered size | 28 × 28 | 32 × 32 |
| Background | None (transparent on the header canvas) | Rounded square `#0B1215`, `rx=8` |
| Path geometry | Straight polyline segments | Curved Bézier wave path |
| Stroke width | `3.6` | `3.4` |
| Color | `currentColor` resolved to `--color-primary` | Hardcoded `#34D399` |
| Accessibility | `aria-hidden` | Decorative favicon |

Both use the same mint hue and rounded stroke language. Any alignment between them must be an
explicit decision, because neither is generated from the other.

---

## 3. Logo Usage

### Horizontal logo (default)

- Render `<WaldayLogo />` with the default `showText={true}`.
- Use it in the application shell inside the home `NavLink`:

  ```tsx
  <NavLink to="/" className="inline-flex min-h-11 items-center rounded-control px-1"
           aria-label={t('app.name')}>
    <WaldayLogo />
  </NavLink>
  ```

- The wrapping link supplies the accessible name; the SVG remains `aria-hidden`.
- The horizontal lockup is the only brand presentation currently in the product.

### Icon-only usage

- Render `<WaldayLogo showText={false} />`.
- This keeps the 28 × 28 monogram and removes the wordmark; the flex gap has no visible effect.
- The component is not currently used in icon-only mode anywhere in the application. It exists as a
  supported prop, not as an established placement pattern.
- When used without visible text, the surrounding control must still provide an accessible name.

### Wordmark usage

- The wordmark is implemented as live text inside the lockup, so it inherits the interface font
  rather than being a fixed vector outline.
- There is no standalone wordmark component and no implementation that renders the wordmark without
  the monogram.
- Because it is text, it participates in text scaling and localization of surrounding copy; the
  string `Walday` itself is a brand name and is not translated.

### Minimum visual consistency requirements

These requirements follow directly from the implementation and the constitution:

1. **Inline SVG only.** No raster logo, no `<img>`, no externally hosted logo file.
2. **Token-driven color.** The monogram resolves through `text-primary` (`#34D399`) and the wordmark
   through `text-text` (`#F3F4F6`). No other colors are implemented.
3. **Preserve geometry.** Path, viewBox, stroke width 3.6, round caps, round joins, and no fill.
4. **Preserve the lockup.** Monogram left, wordmark right, 10px gap, vertically centered,
   `font-semibold`, `tracking-tight`.
5. **Do not place the mark on a light surface.** The palette is dark-only; the logo assumes the
   canvas or surface background.
6. **Keep the mark decorative.** `aria-hidden="true"` on the SVG; the interactive parent owns the
   accessible name.
7. **Do not recolor per state.** No hover, active, or disabled color variant of the logo exists.

### Variations supported by the implementation

| Variation | Supported | How |
|---|---|---|
| Horizontal lockup (mark + wordmark) | Yes | Default `<WaldayLogo />` |
| Icon-only monogram | Yes | `showText={false}` |
| Custom outer layout | Yes | `className` is appended to the lockup container (for example margins or alignment) |
| Custom monogram color | Not as an API | Color is fixed by `text-primary` on the SVG; changing it would require editing the component |
| Custom wordmark color or size | Not as an API | Fixed by `text-text`, `text-xl`, `font-semibold`, `tracking-tight` |
| Vertical / stacked lockup | No | Not implemented |
| Monochrome or white-only mark | No | Not implemented |
| Animated logo | No | No animation is applied; decorative animation is prohibited |
| Logo with tagline | No | Not implemented |

### Sizing and clear space

The repository does **not** codify a minimum logo size, a minimum clear-space rule, or a
"do not scale below X" threshold. The only fixed facts are:

- The monogram box is 28 × 28 CSS pixels in the shell.
- The lockup sits inside a home link with `min-h-11` (44px) and `px-1`.
- The favicon is authored at 32 × 32.

Any minimum-size or clear-space rule for other products would be a new branding decision, not an
extraction from Walday.

---

## 4. Brand Colors

### Core brand palette

| Role | Value | Design token | Where it appears |
|---|---|---|---|
| Walday mint (primary brand accent) | `#34D399` | `--color-primary` → `text-primary`, `bg-primary` | Monogram stroke, primary buttons, active navigation, focus ring, empty-state and weather icons |
| Deep slate canvas (brand background) | `#0B1215` | `--color-canvas` → `bg-canvas` | Application background, favicon tile, `theme-color` meta, text on primary buttons |
| Off-white (brand foreground) | `#F3F4F6` | `--color-text` → `text-text` | Wordmark, headings, primary content |
| Mint hover | `#10B981` | `--color-primary-hover` / `--color-primary-strong` | Primary button and link hover |
| Deep suggestion slate | `#0F172A` | `--color-suggestion-cta` → `bg-suggestion-cta` | Smart Suggestions primary action background |
| Soft mint surface | `#A7F3D0` | `--color-suggestion-surface` → `bg-suggestion-surface` | Smart Suggestions container |
| Mint emphasis | `#6EE7B7` | `--color-suggestion-surface-strong` | Suggestion card accents and hover |
| Deep mint text | `#064E3B` | `--color-suggestion-text` → `text-suggestion-text` | Text inside the suggestion surface |

### Relationship with the application design system

The brand colors **are** design-system tokens; there is no separate brand palette file or hardcoded
brand hex set in components.

| Brand role | Token family | Reuse rule |
|---|---|---|
| Accent | `primary`, `primary-hover`, `primary-strong` | Mint is reserved for brand mark, primary actions, focus, active navigation, and affirmative accents. It is not a decorative fill for arbitrary surfaces. |
| Canvas | `canvas` | The brand's dark backdrop. Never replaced with `#000000`. |
| Foreground | `text` | Off-white, not pure white. |
| Distinct system voice | `suggestion-*` | The mint-on-mint suggestion family is a product-specific surface for system-generated guidance, intentionally brighter than the rest of the interface. |

Hardcoded brand values exist in exactly two non-token locations:

1. [`frontend/public/logo.svg`](../../../frontend/public/logo.svg) — `#0B1215` and `#34D399` as SVG
   attributes (a standalone static asset cannot consume CSS variables).
2. [`frontend/index.html`](../../../frontend/index.html) — `theme-color` `#0B1215`.

Every React component resolves brand color through tokens.

### Color usage rules

- Mint is an accent, not a background wash: it appears as strokes, text, focus rings, and button
  fills, never as a large page surface except the deliberate suggestion panel.
- Status colors are separate from brand color even when the hex value coincides: `--color-success`
  and `--color-focus` both equal `#34D399`, but they are used for different semantics.
- Color is never the sole signal. The logo is the only place where color alone identifies the brand;
  all functional states include text or an icon.
- The suggestion surface is the single high-contrast "light" moment in the product. It exists to
  separate system guidance from user-owned content, not as a general-purpose light theme.

---

## 5. Product Family Consistency

This section defines a reference baseline for other Wal products using Walday as the initial
reference. **Implemented** items exist in Walday today. **Guidance** items are recommendations for
consistency, not a specification that has been approved for any other product.

### Should remain consistent across products (Guidance)

| Element | Reference value from Walday | Rationale |
|---|---|---|
| Accent hue | Mint `#34D399` with `#10B981` hover | The accent is the strongest family signal after the name |
| Canvas | Deep slate `#0B1215`, never pure black | Shared "Calm Tech Dark" character |
| Surface steps | `surface #131D22`, `surface-raised #152026` | Consistent elevation model across products |
| Foreground | Off-white `#F3F4F6`; muted `#8B9BA3` | Shared contrast behavior and reading tone |
| Typography | Inter with system fallback; display/title/body/caption hierarchy | Keeps the family voice and numeral alignment consistent |
| Shape language | 16px cards, 8px controls, fully rounded pills | The geometric signature of the family |
| Border-first separation | 1px `border` token, minimal shadows | Preserves the calm, flat character |
| Focus treatment | 2px mint outline with 2px offset | Consistent, accessible keyboard affordance |
| Numerals | `tabular-nums` for times, temperatures, percentages, durations | Shared data-density convention |
| Accessibility floor | WCAG 2.2 AA, 44px targets, text-not-color status | Non-negotiable family baseline |
| Logo construction | Inline vector monogram with rounded strokes, plus a text wordmark | Keeps marks crisp, themeable, and asset-free |
| Token architecture | Semantic tokens in a Tailwind v4 `@theme` block; no raw hex in components | Makes cross-product theming and audits tractable |

### May vary between products (Guidance)

| Element | Why it can vary |
|---|---|
| Product name and wordmark text | Each product has its own name; the lockup construction can stay shared |
| Monogram path | Each product needs a distinct geometric mark; stroke language and color can remain shared |
| Product-specific accent surfaces | Walday uses a mint suggestion panel; another product may need a different "system voice" surface, still tokenized |
| Density defaults | Walday is a personal planning tool; a denser product may use the defined density scale differently |
| Illustration and iconography scope | Walday uses line icons from `lucide-react`; other products may choose a different icon set while keeping stroke weight and sizing consistent |
| Domain color semantics | Weather uses warm/cool tokens in Walday; other domains may map semantic tokens differently |
| Navigation model | Walday has four top-level destinations and a mobile drawer; information architecture is product-specific |
| Copy tone details | All products can share calm, plain language while adapting terminology to their domain |

### Must not vary (Guidance)

- Do not replace the dark canvas with pure black or a light canvas.
- Do not introduce a second display typeface.
- Do not reintroduce heavy shadows, glossy effects, or decorative gradients.
- Do not use color alone to carry status, category, or error meaning.
- Do not ship raster or externally hosted logos.
- Do not hardcode brand hex values in components; extend the token source instead.

### Current gaps for family-level adoption

- The repository has no shared package, design-token export, or branding asset library that another
  product could consume. Walday's tokens live in its own `frontend/src/index.css`.
- There is no documented parent-brand architecture, naming convention, or approval process for new
  product marks.
- The inline logo and the favicon are not generated from a single source, so any family-level asset
  pipeline would need to unify them first.

---

## 6. Source References

| Concern | File |
|---|---|
| Brand rules | [`.specify/memory/constitution.md`](../../../.specify/memory/constitution.md), *Visual Identity and Design System (Walday Dark UI)* |
| Product context | [`docs/product-overview.md`](../../product-overview.md) |
| Inline logo component | [`frontend/src/shared/ui/WaldayLogo.tsx`](../../../frontend/src/shared/ui/WaldayLogo.tsx) |
| Logo behavior tests | [`frontend/tests/walday-logo.test.tsx`](../../../frontend/tests/walday-logo.test.tsx) |
| Favicon | [`frontend/public/logo.svg`](../../../frontend/public/logo.svg) |
| Document head and theme color | [`frontend/index.html`](../../../frontend/index.html) |
| Brand tokens | [`frontend/src/index.css`](../../../frontend/src/index.css) |
| Shell placement | [`frontend/src/widgets/AppShell.tsx`](../../../frontend/src/widgets/AppShell.tsx) |
| Design system reference | [`design-system.md`](design-system.md) |
