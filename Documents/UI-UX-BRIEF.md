# Camerlob — UI/UX Design Brief

## 1. Document Metadata

| Field | Value |
|-------|-------|
| Document Title | Camerlob UI/UX Design Brief |
| Product | Camerlob |
| Tagline | "Convert any image. Any format. Free. Forever." |
| Theme Name | **Deep Aqua** (Black + Aqua Blue, dark-mode-first) |
| Version | 1.0 (MVP) |
| Author | YYYY — Solo Developer |
| Date | YYYY-MM-DD |
| Status | Draft |
| Related Document | [`Documents/PRD.md`](./PRD.md) |
| Target Stack | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Lucide React |

---

## 2. Design Philosophy

Camerlob's interface is built on five principles. They resolve design disputes in a fixed order: speed, then privacy-legibility, then clarity, then motion, then restraint.

**Speed is a feature.** Every interaction must resolve in under 200ms. Latency in a conversion tool is indistinguishable from failure. No spinners without work to show, no artificial delay, no animation that gates the next action. The PRD's sub-2-second client-side target is a design constraint, not an engineering detail.

**Dark by default.** Photography and design work happens in dark editing environments; a white flash during a conversion workflow is a defect. Dark is the canonical theme and is authored first. Light mode is a derived token swap, never a separate design.

**Aqua guides the eye.** Aqua is the only accent permitted to mean "action" or "active." Because it is reserved, a single aqua element reads instantly as the primary path. Cyan is the quiet sibling used for supporting emphasis; it never competes for the primary action slot.

**Motion with meaning.** Animation exists to explain state change, direction, and causality. Nothing animates purely for decoration. Motion that delays the next action is removed, not shortened.

**Zero clutter.** No gradients on text, no drop shadows where a border would read more cleanly, no icon-plus-label redundancy, no empty space that carries no grouping purpose. Density is welcome; noise is not.

---

## 3. Color System

All values are authored for the **Deep Aqua** dark theme unless noted. Every token exists in `tokens.css` (see [Section 16](#16-design-tokens-css-variables)).

### 3.1 Primary Palette

| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Background Primary | `#0A0B0C` | rgb(10, 11, 12) | Page canvas, deepest layer. Never pure black. |
| Background Secondary | `#121416` | rgb(18, 20, 22) | Card surfaces, nav bar base, file preview cards. |
| Background Tertiary | `#1C2022` | rgb(28, 32, 34) | Elevated blocks, input fields, progress tracks, format cards. |
| Background Elevated | `#2E3336` | rgb(46, 51, 54) | Dropdown panels, popovers, tooltips, hover fills at high alpha. |
| Background Overlay | `#050506` | rgb(5, 5, 6) | Dialog backdrop base, deepest shadow wells. |
| Border Subtle | `#1C2022` | rgb(28, 32, 34) | Hairline dividers, default card borders at rest. |
| Border Default | `#2E3336` | rgb(46, 51, 54) | Input borders, secondary button outlines, card borders. |
| Border Muted | `#4A5155` | rgb(74, 81, 85) | Disabled borders, inactive tab underlines. |
| Border Strong | `#00E5FF` | rgb(0, 229, 255) | Focus outlines and active-state borders only. |
| Text Primary | `#F5F7F8` | rgb(245, 247, 248) | Off-white. Headings, body copy, file names. |
| Text Secondary | `#A1A9AF` | rgb(161, 169, 175) | Muted gray-blue. Supporting copy, metadata, labels. |
| Text Tertiary | `#7B858B` | rgb(123, 133, 139) | Very muted. Placeholders, hints, timestamps. |
| Text Disabled | `#4A5155` | rgb(74, 81, 85) | Disabled labels and inactive controls. Exempt from contrast minimums. |
| Text On Accent | `#0A0B0C` | rgb(10, 11, 12) | Text placed on aqua fills. Contrast 12.80:1. |
| Aqua Primary | `#00E5FF` | rgb(0, 229, 255) | Hero accent. Primary CTAs, active states, progress fill. |
| Aqua Hover | `#3DE5FF` | rgb(61, 229, 255) | Hover state for aqua surfaces. Brighter than primary. |
| Aqua Active | `#00B8CC` | rgb(0, 184, 204) | Pressed state for aqua surfaces. Darker, used with inner shadow. |
| Aqua Muted | `#002E33` | rgb(0, 46, 51) | Tinted surface behind aqua content; badge backgrounds at full opacity. |
| Aqua Glow | `#00E5FF` | rgb(0, 229, 255) | Referenced as `rgba(0, 229, 255, a)` in all shadows and glows. |
| Cyan Secondary | `#3EC5DE` | rgb(62, 197, 222) | Muted cyan. Subtle emphasis, secondary badge variant, info chips. |
| Cyan Hover | `#62D6EC` | rgb(98, 214, 236) | Hover for cyan-tinted elements. |

**Extended Aqua ramp** (used for gradients, tints, and light-mode derivation):

| Token | HEX | RGB |
|-------|-----|-----|
| Aqua 50 | `#E0FCFF` | rgb(224, 252, 255) |
| Aqua 100 | `#B8F8FF` | rgb(184, 248, 255) |
| Aqua 200 | `#7FF0FF` | rgb(127, 240, 255) |
| Aqua 300 | `#3DE5FF` | rgb(61, 229, 255) |
| Aqua 400 | `#00D9F5` | rgb(0, 217, 245) |
| Aqua 500 | `#00E5FF` | rgb(0, 229, 255) |
| Aqua 600 | `#00B8CC` | rgb(0, 184, 204) |
| Aqua 700 | `#008A99` | rgb(0, 138, 153) |
| Aqua 800 | `#005C66` | rgb(0, 92, 102) |
| Aqua 900 | `#002E33` | rgb(0, 46, 51) |

**Extended Black ramp:**

| Token | HEX | RGB |
|-------|-----|-----|
| Black 0 | `#FFFFFF` | rgb(255, 255, 255) |
| Black 50 | `#F5F7F8` | rgb(245, 247, 248) |
| Black 100 | `#E4E7E9` | rgb(228, 231, 233) |
| Black 200 | `#C7CDD1` | rgb(199, 205, 209) |
| Black 300 | `#A1A9AF` | rgb(161, 169, 175) |
| Black 400 | `#6B7378` | rgb(107, 115, 120) |
| Black 500 | `#4A5155` | rgb(74, 81, 85) |
| Black 600 | `#2E3336` | rgb(46, 51, 54) |
| Black 700 | `#1C2022` | rgb(28, 32, 34) |
| Black 800 | `#121416` | rgb(18, 20, 22) |
| Black 900 | `#0A0B0C` | rgb(10, 11, 12) |
| Black 950 | `#050506` | rgb(5, 5, 6) |

### 3.2 Semantic Palette

| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Success | `#00E5A0` | rgb(0, 229, 160) | Conversion succeeded, valid input, download complete. |
| Success Hover | `#00C98A` | rgb(0, 201, 138) | Hover on success surfaces. |
| Warning | `#FFB020` | rgb(255, 176, 32) | Approaching the 20-file limit, partial batch, deprecated format. |
| Warning Hover | `#E69A0A` | rgb(230, 154, 10) | Hover on warning surfaces. |
| Error | `#FF5C5C` | rgb(255, 92, 92) | Failed conversion, rejected file, destructive action. |
| Error Hover | `#E64A4A` | rgb(230, 74, 74) | Hover on error surfaces. |
| Info | `#38BDF8` | rgb(56, 189, 248) | Neutral notices, local-processing explanations. |
| Info Hover | `#1BA5E0` | rgb(27, 165, 224) | Hover on info surfaces. |

**Semantic pairing rule.** Red is reserved exclusively for error and destructive states. It never appears as a decorative accent, never for a neutral warning, and never for a "close" affordance that is not destructive.

### 3.3 Gradients

```css
/* Aqua Gradient — primary CTA fill, selected format card */
--gradient-aqua: linear-gradient(135deg, #00E5FF 0%, #00B8CC 100%);

/* Aqua Gradient Hover — 8% lighter at the leading edge */
--gradient-aqua-hover: linear-gradient(135deg, #3DE5FF 0%, #00D9F5 100%);

/* Aqua Glow Gradient — hero radial wash behind the headline */
--gradient-aqua-glow: radial-gradient(
  ellipse 60% 50% at 50% 40%,
  rgba(0, 229, 255, 0.18) 0%,
  rgba(0, 229, 255, 0.06) 45%,
  rgba(10, 11, 12, 0) 100%
);

/* Card Hover Gradient — format card and file card hover wash */
--gradient-card-hover: linear-gradient(
  180deg,
  rgba(0, 229, 255, 0.06) 0%,
  rgba(0, 229, 255, 0.02) 100%
);

/* Progress Fill Gradient — left-to-right aqua ramp */
--gradient-progress: linear-gradient(90deg, #00B8CC 0%, #00E5FF 60%, #7FF0FF 100%);
```

### 3.4 Color Usage Rules

- **Aqua** means "the primary action, the active selection, or the thing you are waiting on." It is used for the Convert CTA, the active step in the stepper, the selected format card, the progress fill, and focus rings. Nothing else.
- **Cyan** means "supporting emphasis that is not actionable." Format chips, secondary badges, "local processing" explanatory chips. Cyan never styles a button.
- **Semantic colors** carry status only. A green element is always a success, an amber element is always a caution, a red element is always a failure or a destructive intent.
- **Accent budget:** aqua must occupy **less than 10%** of any screen's visible surface area. The converter page's two-column layout is already the densest aqua surface; on the result page the ZIP CTA is the only aqua element.
- **Maximum two accent colors per screen.** Aqua plus one semantic color at a time. If a screen shows success and error simultaneously, the error wins for the accent slot and success drops to text-tier weight.

**Verified contrast ratios** (measured against Background Primary `#0A0B0C`):

| Pair | Ratio | WCAG |
|------|-------|------|
| Text Primary `#F5F7F8` on Background Primary | 18.33:1 | AAA |
| Text Secondary `#A1A9AF` on Background Primary | 8.26:1 | AAA |
| Text Tertiary `#7B858B` on Background Primary | 5.23:1 | AA |
| Aqua Primary `#00E5FF` on Background Primary | 12.80:1 | AAA |
| Text On Accent `#0A0B0C` on Aqua Primary `#00E5FF` | 12.80:1 | AAA |
| Error `#FF5C5C` on Background Primary | 6.51:1 | AA |
| Success `#00E5A0` on Background Primary | 11.93:1 | AAA |
| Warning `#FFB020` on Background Primary | 10.77:1 | AAA |
| Cyan Secondary `#3EC5DE` on Background Primary | 9.61:1 | AAA |
| Info `#38BDF8` on Background Primary | 9.19:1 | AAA |

**Minimums.** Body text and all UI labels: 4.5:1. Large text (24px+ or 18.66px bold and up) and non-text UI boundaries such as input borders and focus rings: 3:1. `Text Disabled` is exempt per WCAG 1.4.3.

---

## 4. Typography

**Inter** for all UI and body copy. **JetBrains Mono** for filenames, extensions, file sizes, and any format token. Both are self-hosted; no runtime network request to a font CDN, consistent with the PRD's zero-egress privacy constraint.

| Name | Size (px) | Size (rem) | Line Height | Weight | Letter Spacing | Usage | Text Color |
|------|-----------|------------|--------------|--------|-----------------|-------|-------------|
| Display | 64px | 4rem | 1.05 (67.2px) | 700 | -0.03em | Landing hero headline only. One per page. | Text Primary |
| H1 | 48px | 3rem | 1.10 (52.8px) | 700 | -0.02em | Page titles on Landing and Result. | Text Primary |
| H2 | 36px | 2.25rem | 1.20 (43.2px) | 600 | -0.02em | Section headings, "How It Works". | Text Primary |
| H3 | 28px | 1.75rem | 1.30 (36.4px) | 600 | -0.01em | Subsection headings, panel titles. | Text Primary |
| H4 | 22px | 1.375rem | 1.40 (30.8px) | 600 | -0.01em | Card group labels, step titles. | Text Primary |
| Body Large | 18px | 1.125rem | 1.60 (28.8px) | 400 | 0 | Hero subheadline, lead paragraphs. | Text Secondary |
| Body | 16px | 1rem | 1.60 (25.6px) | 400 | 0 | Default paragraph, feature copy. | Text Secondary |
| Body Small | 14px | 0.875rem | 1.50 (21px) | 400 | 0 | Metadata, helper text, error copy. | Text Secondary |
| Caption | 12px | 0.75rem | 1.40 (16.8px) | 500 | 0.02em | File sizes, counters, badges, legal. | Text Tertiary |
| Mono | 14px | 0.875rem | 1.50 (21px) | 500 | 0 | Filenames, extensions, byte sizes, format codes. | Text Primary |
| Button | 14px | 0.875rem | 1.00 (14px) | 600 | 0.01em | All button labels. | Per button variant |

**Rules.**

- Body copy never drops below 14px. Caption is the floor and is reserved for non-essential metadata.
- Filenames and format codes always use Mono, never Inter, so `.CR2` and `.cr2` are visually distinguishable from prose.
- Aqua text on Background Primary is permitted at any size; Aqua text on aqua-tinted surfaces uses `#7FF0FF` (Aqua 200) to preserve contrast.
- Tabular numerals are enabled for file sizes and counters via `font-variant-numeric: tabular-nums`.

---

## 5. Spacing & Layout

**Base unit: 4px.** Every spacing value is a multiple of 4. No one-off values.

| Token | px | rem | Typical Use |
|-------|----|-----|-------------|
| `space-1` | 4px | 0.25rem | Icon-to-label gaps, badge padding-y |
| `space-2` | 8px | 0.5rem | Gap between related controls, chip padding |
| `space-3` | 12px | 0.75rem | Gap between card internals, input padding-y (sm) |
| `space-4` | 16px | 1rem | Default component padding, gap between cards |
| `space-5` | 20px | 1.25rem | Card padding (lg), input padding-x (md) |
| `space-6` | 24px | 1.5rem | Section inner padding, grid gutter |
| `space-8` | 32px | 2rem | Gap between subsections |
| `space-10` | 40px | 2.5rem | Section padding, mobile/desktop page padding |
| `space-12` | 48px | 3rem | Section separation (lg) |
| `space-16` | 64px | 4rem | Section separation (xl) |
| `space-20` | 80px | 5rem | Major vertical rhythm between landing sections |
| `space-24` | 96px | 6rem | Hero top/bottom padding |
| `space-32` | 128px | 8rem | Reserved for full-bleed hero breathing room |

**Containers.**

| Token | Max Width | Use |
|-------|-----------|-----|
| `container-sm` | 640px | Single-column prose, empty states |
| `container-md` | 768px | How It Works, features strip |
| `container-lg` | 1024px | Converter content, format grids |
| `container-xl` | 1280px | Landing hero, result file grid |

**Grid and page padding.**

- Grid: **12 columns**, 24px gutter (`space-6`), 12px at mobile.
- Page padding: mobile **16px** (`space-4`), tablet **24px** (`space-6`), desktop **40px** (`space-10`).
- Content is centred with `margin-inline: auto`; no left-aligned full-bleed text.
- Vertical rhythm between landing sections is `space-24` (96px) desktop, `space-16` (64px) mobile.

---

## 6. Border Radius Scale

| Token | Value | Use |
|-------|-------|-----|
| `radius-none` | 0 | Progress bar track before radius collapse, full-bleed dividers |
| `radius-sm` | 4px | Caption chips, inline code, file size tags |
| `radius-md` | 8px | Buttons, inputs, dropdown panels, file preview cards |
| `radius-lg` | 12px | Format cards, large inputs, nav bar container |
| `radius-xl` | 16px | Dialog panels, dropzone, result cards, nav bar at mobile |
| `radius-2xl` | 24px | Hero CTA (extra large), large feature panels |
| `radius-full` | 9999px | Icon buttons, progress fills, numbered step circles, badges |

**Assignment rules.**

- Interactive controls use `radius-md`. Anything clickable never uses `radius-none`.
- Large containers the user drops into use `radius-xl` so the drop target reads as a zone, not a field.
- Only elements that are conceptually circular (icon buttons, step numbers, progress) use `radius-full`.

---

## 7. Shadow & Glow System

Dark-mode shadows rely on near-black alpha over near-black surfaces, so the effect comes from surface lightness contrast plus the glow. Shadows below are exact values.

```css
/* Elevation */
--shadow-sm:  0 1px 2px 0 rgba(0, 0, 0, 0.40);
--shadow-md:  0 4px 8px -2px rgba(0, 0, 0, 0.45), 0 2px 4px -2px rgba(0, 0, 0, 0.35);
--shadow-lg:  0 12px 24px -6px rgba(0, 0, 0, 0.50), 0 4px 8px -4px rgba(0, 0, 0, 0.40);
--shadow-xl:  0 24px 48px -12px rgba(0, 0, 0, 0.60), 0 8px 16px -8px rgba(0, 0, 0, 0.45);

/* Aqua Glow */
--glow-sm: 0 0 0 1px rgba(0, 229, 255, 0.30), 0 0 8px rgba(0, 229, 255, 0.25);
--glow-md: 0 0 0 1px rgba(0, 229, 255, 0.40), 0 0 16px rgba(0, 229, 255, 0.35),
           0 0 32px rgba(0, 229, 255, 0.20);
--glow-lg: 0 0 0 1px rgba(0, 229, 255, 0.50), 0 0 32px rgba(0, 229, 255, 0.45),
           0 0 64px rgba(0, 229, 255, 0.25);

/* Pressed */
--shadow-inset: inset 0 2px 4px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.06);

/* Card hover */
--shadow-card-hover: 0 12px 24px -8px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 229, 255, 0.20);
```

| Token | Applied To |
|-------|-----------|
| `shadow-sm` | Resting cards, nav bar, footer |
| `shadow-md` | Hovered cards, tooltips, badges on scroll |
| `shadow-lg` | Dropdown panels, popovers, sticky sub-nav |
| `shadow-xl` | Dialog panels, result file cards at hover |
| `glow-sm` | Focus-adjacent elements, selected format card at rest |
| `glow-md` | Primary CTA hover, drag-over dropzone, active step circle |
| `glow-lg` | Landing hero CTA, selected format card, success banner |
| `shadow-inset` | Any aqua or danger button in `active`/pressed state |

**Rules.** Shadows never stack beyond two layers. Glow is reserved for aqua and for destructive states only. No coloured shadow is used for cyan.

---

## 8. Component Library

Shared values used throughout: all transitions use `--transition-fast` (150ms) unless stated; focus is `--focus-ring` = `0 0 0 2px rgba(0, 229, 255, 0.55)` with `outline-offset: 2px`.

### 8.1 Primary Button (Aqua)

Base: `height: 40px`, `padding: 0 20px`, `radius-md`, `gap: 8px`, `font: Button`. Large hero variant: `height: 56px`, `padding: 0 32px`, `radius-2xl`.

| State | Background | Text | Border | Shadow | Transform |
|-------|-----------|------|--------|--------|-----------|
| Default | `linear-gradient(135deg, #00E5FF 0%, #00B8CC 100%)` | `#0A0B0C` (rgb(10, 11, 12)) | none | `shadow-md` | none |
| Hover | `linear-gradient(135deg, #3DE5FF 0%, #00D9F5 100%)` | `#0A0B0C` | none | `shadow-md, glow-md` | `scale(1.02)` |
| Active | `linear-gradient(135deg, #00B8CC 0%, #008A99 100%)` | `#0A0B0C` | none | `shadow-inset` | `scale(0.98)` |
| Focus | as Default | `#0A0B0C` | — | `0 0 0 2px rgba(0, 229, 255, 0.55)`, offset 2px | none |
| Disabled | `linear-gradient(135deg, #00E5FF 0%, #00B8CC 100%)` at `opacity: 0.40` | `#0A0B0C` | none | none | none |
| Loading | as Default at `opacity: 0.70` | `#0A0B0C` | none | `shadow-md` | none |

Loading spinner: 16px Lucide `LoaderCircle`, `stroke-width: 2`, `animation: spin 800ms linear infinite`, `color: #0A0B0C`. Label remains mounted for width stability; spinner sits to its left at `gap: 8px`.

### 8.2 Secondary Button (Ghost)

| State | Background | Text | Border | Transform |
|-------|-----------|------|--------|-----------|
| Default | `transparent` | `#00E5FF` | `1px solid #00B8CC` | none |
| Hover | `rgba(0, 229, 255, 0.10)` | `#3DE5FF` | `1px solid #00E5FF` | none |
| Active | `rgba(0, 229, 255, 0.20)` | `#7FF0FF` | `1px solid #00E5FF` | `scale(0.98)` |
| Focus | transparent | `#00E5FF` | `1px solid #00E5FF` | focus ring, offset 2px |
| Disabled | `transparent` | `#4A5155` | `1px solid #2E3336` | none |

Base metrics identical to 8.1. Disabled hover does not change appearance.

### 8.3 Tertiary Button (Text-only)

| State | Background | Text | Decoration |
|-------|-----------|------|------------|
| Default | `transparent` | `#A1A9AF` | none |
| Hover | `rgba(0, 229, 255, 0.05)` | `#00E5FF` | none |
| Active | `rgba(0, 229, 255, 0.10)` | `#3DE5FF` | none |
| Focus | `rgba(0, 229, 255, 0.05)` | `#00E5FF` | focus ring + `text-decoration: underline`, `text-underline-offset: 4px` |
| Disabled | `transparent` | `#4A5155` | none |

Padding: `8px 12px`. Radius `radius-sm`. No shadow in any state.

### 8.4 Danger Button

| State | Background | Text | Border | Shadow | Transform |
|-------|-----------|------|--------|--------|-----------|
| Default | `#FF5C5C` | `#0A0B0C` | none | `shadow-md` | none |
| Hover | `#E64A4A` | `#0A0B0C` | none | `shadow-md, 0 0 16px rgba(255, 92, 92, 0.30)` | `scale(1.02)` |
| Active | `#C23232` | `#0A0B0C` | none | `shadow-inset` | `scale(0.98)` |
| Focus | `#FF5C5C` | `#0A0B0C` | — | `0 0 0 2px rgba(255, 92, 92, 0.55)`, offset 2px | none |
| Disabled | `#FF5C5C` at `opacity: 0.40` | `#0A0B0C` | none | none | none |

Used only for destructive confirmation (for example, `Clear Results` confirmation). Never used as a page-level primary action.

### 8.5 Icon Button

`40x40px` fixed box, `radius-full`, `padding: 0`, icon `20px` centred, `transition: background-color 150ms, color 150ms, transform 100ms`.

| State | Background | Icon Color | Transform |
|-------|-----------|------------|-----------|
| Default | `transparent` | `#A1A9AF` | none |
| Hover | `rgba(0, 229, 255, 0.08)` | `#00E5FF` | none |
| Active | `rgba(0, 229, 255, 0.15)` | `#3DE5FF` | `scale(0.92)` |
| Focus | `rgba(0, 229, 255, 0.08)` | `#00E5FF` | focus ring, offset 2px |
| Disabled | `transparent` | `#4A5155` | none |

### 8.6 Input Fields

Base: `height: 40px`, `padding: 0 12px`, `radius-md`, `font: Body Small`, `transition: border-color 150ms, box-shadow 150ms, background-color 150ms`.

| State | Background | Text | Placeholder | Border | Shadow |
|-------|-----------|------|-------------|--------|--------|
| Default | `#1C2022` | `#F5F7F8` | `#7B858B` | `1px solid #2E3336` | none |
| Hover | `#1C2022` | `#F5F7F8` | `#7B858B` | `1px solid #4A5155` | none |
| Focus | `#1C2022` | `#F5F7F8` | `#7B858B` | `2px solid #00E5FF` | `0 0 0 3px rgba(0, 229, 255, 0.18)` |
| Filled | `#1C2022` | `#F5F7F8` | — | `1px solid #2E3336` | none |
| Error | `rgba(255, 92, 92, 0.06)` | `#F5F7F8` | `#7B858B` | `2px solid #FF5C5C` | `0 0 0 3px rgba(255, 92, 92, 0.18)` |
| Disabled | `#1C2022` | `#4A5155` | `#4A5155` | `1px solid #1C2022` | none; `cursor: not-allowed` |

Error copy sits below the field at `Body Small`, color `#FF5C5C`, prefixed with a 14px `AlertCircle` icon.

### 8.7 Dropdowns / Selects

Trigger uses the Input states from 8.6 verbatim, plus a 16px `ChevronDown` on the right at `gap: 8px`; the chevron rotates `180deg` over 150ms when open.

| Element | Spec |
|---------|------|
| Panel | Background `#2E3336`, `radius-md`, `padding: 8px`, `shadow-xl`, `border: 1px solid #4A5155`, `max-height: 320px`, `overflow-y: auto` |
| Option (default) | Text `#F5F7F8`, `padding: 8px 12px`, `radius-sm`, `font: Body Small` |
| Option (hover) | Background `rgba(0, 229, 255, 0.10)`, text `#F5F7F8` |
| Option (active/selected) | Background `rgba(0, 229, 255, 0.20)`, text `#7FF0FF`, 16px `Check` icon trailing at `gap: 8px` |
| Option (disabled) | Text `#4A5155`, `cursor: not-allowed`, no hover |
| Panel enter | `opacity 0→1`, `translateY(-4px)→0`, 150ms ease-out |

### 8.8 Format Grid Cards

The format picker from PRD 5.2. Base: `min-height: 88px`, `padding: 16px`, `radius-lg`, `display: flex`, `flex-direction: column`, `justify-content: space-between`, `gap: 8px`. Format code renders in **Mono**; format name in `Body Small`.

| State | Background | Border | Text | Shadow | Transform |
|-------|-----------|--------|------|--------|-----------|
| Default | `#1C2022` | `1px solid #1C2022` | Code `#F5F7F8`, Name `#A1A9AF` | `shadow-sm` | none |
| Hover | `linear-gradient(180deg, rgba(0, 229, 255, 0.06) 0%, rgba(0, 229, 255, 0.02) 100%)` over `#1C2022` | `1px solid #00E5FF` | Code `#7FF0FF`, Name `#3DE5FF` | `shadow-sm, glow-sm` | `scale(1.02)` |
| Selected | `linear-gradient(135deg, #00E5FF 0%, #00B8CC 100%)` | `1px solid #3DE5FF` | Code `#0A0B0C`, Name `rgba(10, 11, 12, 0.75)` | `shadow-md, glow-md` | `scale(1.0)` |
| Disabled | `#1C2022` at `opacity: 0.40` | `1px solid #1C2022` | `#4A5155` | none | none |
| Focus | as Default | `1px solid #00E5FF` | as Default | focus ring, offset 2px | none |

Transition: `150ms` ease-out across background, border-color, box-shadow, and transform.

### 8.9 Drag & Drop Upload Zone

Base: `min-height: 240px` desktop, `200px` mobile, `padding: 40px`, `radius-xl`, centered column, `gap: 12px`.

| State | Background | Border | Content | Shadow | Transform |
|-------|-----------|--------|---------|--------|-----------|
| Default | `#1C2022` | `2px dashed #00B8CC` | 32px `UploadCloud` in `#00E5FF`, heading `H3` `#F5F7F8`, hint `Body Small` `#7B858B` | `shadow-sm` | none |
| Drag over | `rgba(0, 229, 255, 0.08)` | `2px solid #00E5FF` | Icon `#3DE5FF`, hint text switches to `#7FF0FF` | `shadow-md, glow-md` | `scale(1.01)` |
| Active (file dropped) | flashes `rgba(0, 229, 255, 0.20)` for 150ms then returns to Default | — | — | — | — |
| Error | `rgba(255, 92, 92, 0.06)` | `2px dashed #FF5C5C` | Icon `#FF5C5C`, hint `#FF5C5C` | none | none |
| Disabled | `#1C2022` at `opacity: 0.40` | `2px dashed #2E3336` | `#4A5155` | none | none |

Border-color and background transitions run 200ms ease-in-out. The 20-file limit rejection reuses the Error border for 300ms, then restores Default, alongside an error toast.

### 8.10 File Preview Cards

Base: `min-height: 72px`, `padding: 12px`, `radius-md`, background `#121416`, `display: grid`, `grid-template-columns: 48px 1fr 40px`, `gap: 12px`, `align-items: center`.

| Element | Spec |
|---------|------|
| Thumbnail | `48x48px`, `radius-sm`, `object-fit: cover`, `border: 1px solid #2E3336`, background `#0A0B0C` |
| Info block | Filename in **Mono** `#F5F7F8`, truncated with ellipsis; size in `Caption` `#7B858B` below, `gap: 2px` |
| Remove button | Icon Button spec (8.5) with 16px `X` icon |

| State | Border | Shadow | Transform |
|-------|--------|--------|-----------|
| Default | `1px solid #1C2022` | `shadow-sm` | none |
| Hover | `1px solid #2E3336` | `shadow-md` | `translateY(-2px)` |
| Converting | `1px solid #00B8CC` | `shadow-sm, glow-sm` | none |
| Complete | `1px solid rgba(0, 229, 160, 0.40)` | `shadow-sm` | none |
| Failed | `1px solid #FF5C5C` | `shadow-sm` | none |

Remove button hover override: background `#FF5C5C`, icon `#FFFFFF` (rgb(255, 255, 255)), transition 150ms. The remove action is destructive and therefore uses the error hue.

### 8.11 Toast Notifications

Position: **bottom-right**, `right: 24px`, `bottom: 24px`, stacked vertically with `gap: 12px`, max 3 visible; the fourth pushes the oldest out. Width: `360px` max, `calc(100vw - 32px)` on mobile. Height: `min-height: 64px`, `padding: 16px`, `radius-md`, background `#1C2022`, `shadow-xl`, `border: 1px solid #2E3336`, `border-left-width: 4px`.

| Variant | Left Border | Icon | Icon Color | Title Color | Body Color |
|---------|------------|------|------------|-------------|------------|
| Success | `#00E5A0` | `CheckCircle2` 20px | `#00E5A0` | `#F5F7F8` | `#A1A9AF` |
| Error | `#FF5C5C` | `AlertCircle` 20px | `#FF5C5C` | `#F5F7F8` | `#A1A9AF` |
| Warning | `#FFB020` | `AlertTriangle` 20px | `#FFB020` | `#F5F7F8` | `#A1A9AF` |
| Info | `#00E5FF` | `Info` 20px | `#00E5FF` | `#F5F7F8` | `#A1A9AF` |

Title uses `Body Small` weight 600; body uses `Body Small` weight 400. A 16px icon-button close control sits top-right. Auto-dismiss: 4000ms for success and info, 7000ms for error and warning; all dismissible by click, `Escape`, or focus.

### 8.12 Progress Bar

| Element | Spec |
|---------|------|
| Track | `height: 6px`, `radius-full`, background `#1C2022`, `width: 100%`, `overflow: hidden` |
| Fill | `linear-gradient(90deg, #00B8CC 0%, #00E5FF 60%, #7FF0FF 100%)`, `radius-full`, `width` driven by progress value |
| Determinate | `transition: width 300ms cubic-bezier(0.16, 1, 0.3, 1)` |
| Indeterminate | Fill width 40%, `animation: shimmer 1200ms ease-in-out infinite`, translating `-100% → 200%` with a `linear-gradient` sheen |
| Complete | Fill becomes solid `#00E5A0` over 300ms |
| Failed | Fill becomes solid `#FF5C5C` over 300ms; track stays `#1C2022` |

```css
@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
```

Track border is `1px solid #1C2022`; the fill sits flush with no inner padding. At `4px` height the radius remains `full` so the bar reads as a pill at all sizes.

### 8.13 Modal / Dialog

Used only for destructive confirmation (for example, `Clear Results` on a batch with downloads in flight). PRD 11 mandates inline interaction for all other flows.

| Element | Spec |
|---------|------|
| Backdrop | Background `#050506` at `opacity: 0.70`, `backdrop-filter: blur(8px)` |
| Panel | Background `#2E3336`, `radius-xl`, `padding: 32px`, `shadow-xl`, `border: 1px solid #4A5155`, `max-width: 480px` |
| Title | `H3`, `#F5F7F8` |
| Body | `Body`, `#A1A9AF` |
| Close button | Icon Button spec (8.5), top-right at `16px` inset |
| Actions | Row, `gap: 12px`, right-aligned; Danger Button then Ghost Button |
| Enter | Backdrop `opacity 0→1` 200ms ease-out; panel `opacity 0→1`, `scale(0.96)→1`, 200ms ease-out |
| Exit | Reverse, 150ms ease-in |

Focus is trapped inside the panel; initial focus lands on the panel, `Escape` closes.

### 8.14 Navigation Bar

| Element | Spec |
|---------|------|
| Container | `position: sticky`, `top: 0`, `z-index: 50`, `background: rgba(10, 11, 12, 0.80)`, `backdrop-filter: blur(12px)`, `border-bottom: 1px solid #1C2022`, `height: 64px` desktop / `56px` mobile, `radius-lg` when floating at `space-4` inset |
| Logo | Camera aperture glyph 24px in `#00E5FF` + "Camerlob" wordmark `H4` weight 700 `#F5F7F8`; entire lockup hover sets glyph to `#3DE5FF` and applies `glow-sm`, 150ms |
| Links | `Body Small` `#A1A9AF`, `gap: 24px`; hover → `#00E5FF`; active page gets `2px` aqua underline at `text-underline-offset: 6px` |
| CTA | Primary Button spec (8.1) at `height: 36px`, `padding: 0 16px` |
| Theme toggle | Icon Button (8.5) with 20px `Sun` / `Moon`, `aria-label="Toggle color theme"` |
| Divider | `1px solid #1C2022` between link group and CTA at `gap: 16px` |
| Mobile | Links collapse into a 20px `Menu` Icon Button opening a full-width panel at `radius-xl`, background `#121416`, `shadow-xl` |

### 8.15 Footer

| Element | Spec |
|---------|------|
| Container | Background `#0A0B0C`, `border-top: 1px solid #1C2022`, `padding: 64px 40px 40px` |
| Layout | `container-xl`; 4-column at desktop, 2-column at tablet, single column stacked at mobile; `gap: 40px` |
| Column heading | `Caption` uppercase, `letter-spacing: 0.08em`, `#7B858B` |
| Text | `Body Small`, `#7B858B` |
| Links | `Body Small`, `#A1A9AF`; hover → `#00E5FF`; transition `color 150ms` |
| Legal row | `Caption`, `#4A5155`, `border-top: 1px solid #1C2022`, `padding-top: 24px`, `margin-top: 40px` |
| Logo mark | Aperture glyph 20px `#00E5FF` at 50% opacity |

### 8.16 Badge / Pill

Base: `height: 24px`, `padding: 0 10px`, `radius-full`, `font: Caption` weight 600, `display: inline-flex`, `gap: 6px`, icon 12px. Solid text colour on a 15%-alpha background of the same hue.

| Variant | Background | Text / Icon | Border |
|---------|-----------|-------------|--------|
| Aqua | `rgba(0, 229, 255, 0.15)` | `#7FF0FF` | `1px solid rgba(0, 229, 255, 0.30)` |
| Cyan | `rgba(62, 197, 222, 0.15)` | `#62D6EC` | `1px solid rgba(62, 197, 222, 0.30)` |
| Success | `rgba(0, 229, 160, 0.15)` | `#00E5A0` | `1px solid rgba(0, 229, 160, 0.30)` |
| Warning | `rgba(255, 176, 32, 0.15)` | `#FFB020` | `1px solid rgba(255, 176, 32, 0.30)` |
| Error | `rgba(255, 92, 92, 0.15)` | `#FF5C5C` | `1px solid rgba(255, 92, 92, 0.30)` |
| Neutral | `rgba(123, 133, 139, 0.15)` | `#A1A9AF` | `1px solid #2E3336` |

Used for format capability tags (e.g. `LOCAL` for server-path formats) and the live file counter.

### 8.17 Tooltip

| Element | Spec |
|---------|------|
| Background | `#2E3336` |
| Text | `#F5F7F8`, `font: Caption` weight 500 |
| Border | `1px solid #4A5155` |
| Radius | `radius-sm` (4px) |
| Shadow | `shadow-md` |
| Padding | `6px 8px` |
| Offset | `8px` from the trigger; flips to the opposite side at viewport edges |
| Max width | `240px`, wraps to two lines maximum |
| Enter | `opacity 0→1`, 100ms ease-out; delay `400ms` on hover, `0ms` on keyboard focus |
| Exit | `opacity 1→0`, 100ms ease-in; `0ms` delay |

---

## 9. Animation & Motion System

### 9.1 Timing Functions

| Name | Value | Use |
|------|-------|-----|
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances, reveals, anything arriving on screen |
| `ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Exits, dismissals, anything leaving |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | State changes that stay on screen, colour transitions |
| `spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful micro-interactions, selection confirmation |

### 9.2 Duration Scale

| Name | Value | Use |
|------|-------|-----|
| Instant | 100ms | Press feedback, tooltip fade, checkbox tick |
| Fast | 150ms | Default hover and focus transitions |
| Normal | 200ms | Dropdown panels, drag-over zone, modal enter |
| Slow | 300ms | Selection springs, file add, page transitions, progress width |
| Slower | 500ms | Success checkmark draw, hero glow pulse cycle |

### 9.3 Specific Animations

| Interaction | Animation | Duration / Easing |
|-------------|-----------|-------------------|
| Button hover | `scale(1.02)` | 150ms `ease-out` |
| Button press | `scale(0.98)` | 100ms `ease-out` |
| Card hover | `translateY(-2px)` + shadow swap | 200ms `ease-out` |
| Format card select | `scale(1.05)` → `1.0` | 300ms `spring` |
| Drag over upload zone | `border-color` and `background` fade | 200ms `ease-in-out` |
| File added to list | `translateY(12px) → 0` + `opacity 0→1` | 300ms `ease-out` |
| File removed | `translateY(0 → -8px)` + `opacity 1→0` | 200ms `ease-in` |
| Conversion progress | `width` transition | 300ms `ease-out` |
| Success checkmark | SVG `stroke-dashoffset` draw, `pathLength: 24` → `0` | 500ms `ease-out` |
| Toast enter | `translateX(100%) → 0` + `opacity 0→1` | 300ms `ease-out` |
| Toast exit | `translateX(0) → 100%` + `opacity 1→0` | 200ms `ease-in` |
| Page transition | `opacity 0→1` + `translateY(8px) → 0` | 300ms `ease-out` |
| Aqua glow pulse on hero CTA | `box-shadow` opacity `0.45 → 0.75 → 0.45` | 3000ms `ease-in-out`, infinite |
| Dropdown panel | `opacity 0→1` + `translateY(-4px) → 0` | 150ms `ease-out` |
| Modal enter | backdrop 200ms; panel `scale(0.96) → 1` | 200ms `ease-out` |

```css
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 0 1px rgba(0, 229, 255, 0.50),
                         0 0 24px rgba(0, 229, 255, 0.35); }
  50%      { box-shadow: 0 0 0 1px rgba(0, 229, 255, 0.50),
                         0 0 40px rgba(0, 229, 255, 0.60); }
}
```

**Rule.** No animation delays a user action. The glow pulse is the only infinite animation in the product, and it is applied to exactly one element: the landing hero CTA. It is disabled once the user scrolls past the hero.

### 9.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Under reduced motion: all transforms collapse to `none`, the glow pulse stops, the shimmer stops and the progress fill updates discretely, and toasts appear and disappear with an `opacity` fade of 100ms only. No information is communicated by motion alone anywhere in the product.

---

## 10. Iconography

- **Library:** Lucide React. Consistent 24x24 grid, 1.5px default stroke, round caps and joins.
- **Stroke width:** `1.5` default; `2` for emphasis (primary button spinner, step-number circles, active step indicator, success checkmark).
- **Icon color** inherits the surrounding text colour via `currentColor`. Aqua `#00E5FF` is applied only for active and hover states.
- **Size scale:** `16` (inline with Body Small, badge icons), `20` (nav, buttons, toasts, icon-button content), `24` (section markers, logo glyph), `32` (dropzone, empty states), `48` (landing empty state only).

**Icon set used per PRD surface.** Landing: `ArrowRight`, `UploadCloud`, `Download`, `ShieldCheck`, `Zap`, `Infinity`. Converter: `Search`, `UploadCloud`, `X`, `ArrowRight`, `Check`, `ChevronDown`, `LoaderCircle`, `FileImage`. Result: `CheckCircle2`, `Download`, `Archive`, `RotateCcw`, `Trash2`, `AlertCircle`. Shared: `Sun`, `Moon`, `Menu`, `Info`, `AlertTriangle`, `ArrowLeft`.

No icon is used as the sole label for a primary action. Icon-only controls require an `aria-label` (see [Section 13](#13-accessibility)).

---

## 11. Imagery & Illustration

- **No stock photography.** No photographs of people, devices, or stock "working" imagery anywhere in the product.
- **Hero visual:** abstract aqua-on-black geometry only. A single `radial-gradient` wash (`--gradient-aqua-glow`) behind the headline, plus one thin concentric-aperture line motif at 8% opacity, drawn in CSS or inline SVG. No bitmap asset is loaded.
- **Format grid** uses **monospace text labels** (`.CR2`, `.WEBP`) with no icons, as specified in the PRD. A 16px capability badge (`LOCAL` or `CLIENT`) is the only permitted glyph.
- **Logo:** "Camerlob" wordmark in aqua `#00E5FF` set in Inter Bold at 24px, paired with a minimal camera aperture glyph — six straight blades forming a hexagonal opening, `stroke-width: 2`, `currentColor`, 24px. Delivered as `/public/logo.svg` and a 32px `favicon.ico`.
- **Empty state** (Result page, no conversions yet): a 48px `ImageOff` icon in `#4A5155` with `Body` text `#7B858B`. No illustration artwork is commissioned.
- **All decorative art** is `aria-hidden="true"` and `pointer-events: none`.

---

## 12. Page-by-Page Visual Spec

### 12.1 Landing Page

| Region | Spec |
|--------|------|
| Nav | Per 8.14 |
| Hero | `min-height: 100vh` (use `100svh` on mobile), centred flex column, `padding: 96px 40px`, `--gradient-aqua-glow` behind the headline |
| Headline | `Display`, `#F5F7F8`, `max-width: 800px`, centred. The phrase **"any format"** renders in `#00E5FF` with `glow-sm` |
| Subheadline | `Body Large`, `#A1A9AF`, `max-width: 560px`, centred, `margin-top: 24px` |
| Hero CTA | Primary Button, **extra large** (`height: 56px`, `padding: 0 32px`, `radius-2xl`), label "Convert images free", `ArrowRight` 20px trailing, `--glow-lg` + `glow-pulse` |
| Format grid | `section` with `padding: 96px 0`, heading `H2` centred; responsive grid `repeat(auto-fill, minmax(140px, 1fr))`, `gap: 16px`; cards use 8.8 at reduced `min-height: 72px`; hover reveals a `FROM / TO` caption row sliding in from `translateY(8px) → 0` over 200ms `ease-out` |
| How it works | 3-column grid (`space-md` container), `gap: 40px`; each column centres a `40px` `radius-full` circle filled `#002E33` with a 20px aqua numeral (`H4`, `stroke-width: 2` equivalent via font weight 700), title `H4`, copy `Body Small`; collapses to stacked at mobile with `gap: 32px` |
| Features strip | Horizontal scroll-snap on mobile (`scroll-snap-type: x mandatory`, each item `min-width: 240px`), 6-column grid at desktop; each item `Card Hover Gradient` on `#121416`, `radius-lg`, `padding: 24px`, 24px icon in `#00E5FF`, title `Body` `#F5F7F8`, copy `Body Small` `#A1A9AF` |
| Footer | Per 8.15 |

### 12.2 Converter Page

| Region | Spec |
|--------|------|
| Layout | Desktop `grid-template-columns: 1fr 1fr`, `gap: 40px`, `container-lg`. Mobile and tablet: single column, `gap: 32px` |
| Step indicator | Sticky under nav, `height: 56px`; three steps "1. Formats → 2. Upload → 3. Convert" separated by 16px `ArrowRight` `#4A5155`; active step text `#00E5FF` with a `2px` aqua underline at `text-underline-offset: 6px`; completed steps show a 16px `Check` `#00E5A0`; upcoming steps `#4A5155` |
| Source picker (left) | `H4` label, then search input (8.6) with a leading 16px `Search` icon, then format card grid |
| Target picker (left) | Appears below source with `margin-top: 40px` on selection, `opacity 0→1` + `translateY(12px) → 0` over 300ms `ease-out`; heading "Convert to"; grid is **filtered** by the source per PRD 5.2; a `Badge` (8.16) shows the count of available targets |
| Upload zone (right) | Per 8.9, occupying the full right column at `min-height: 240px` |
| File list (right) | Below the upload zone with `margin-top: 24px`; `gap: 12px`; counter rendered above the list as a `Badge` (8.16) in Aqua, mono-font numerals, e.g. `7 / 20 FILES` |
| Convert button | Desktop: inline at the bottom of the right column, `width: 100%`, `height: 48px`. Mobile: fixed to the bottom as a bar with `padding: 16px`, page `padding-bottom: 96px` to clear it; background `rgba(10, 11, 12, 0.90)` with `backdrop-filter: blur(12px)`, `border-top: 1px solid #1C2022` |
| Disabled logic | Button disabled until source, target, and at least one valid file are present, per PRD 5.2; the disabled button is paired with `Body Small` hint text naming the next missing step |
| Redirect | On batch completion, route to `/result` after the last progress bar settles — no artificial delay |

### 12.3 Result Page

| Region | Spec |
|--------|------|
| Header | Centred block, `padding: 64px 40px 40px`; `CheckCircle2` 48px `#00E5A0` with the 500ms stroke draw; `H1` "X of Y converted" in `#F5F7F8`, where X renders in aqua `#00E5FF` on a full success run |
| Action bar | Centred row, `gap: 12px`, `margin-top: 32px`, wraps at mobile; "Download All as ZIP" is Primary Button with `Archive` 20px; "Convert More" is Ghost Button with `RotateCcw` 20px |
| File grid | `container-xl`; `repeat(auto-fill, minmax(280px, 1fr))`, `gap: 16px`; each card `radius-xl`, `padding: 16px`, background `#121416`, `border: 1px solid #1C2022` |
| File card content | Thumbnail `100% x 140px`, `radius-md`, `object-fit: contain` on a `#0A0B0C` inset; filename in **Mono** `#F5F7F8` with extension highlighted in `#00E5FF`; size line `Caption` showing "2.4 MB → 480 KB" with the delta in `#00E5A0` when smaller, `#FFB020` when larger; 40px Icon Button `Download` trailing |
| Failed files | Full-width section below the grid, `margin-top: 40px`, `border: 1px solid #FF5C5C`, `radius-xl`, `background: rgba(255, 92, 92, 0.04)`, `padding: 24px`; heading `H4` `#FF5C5C` with `AlertCircle` 20px; each row lists the filename in **Mono** and the reason in `Body Small` `#A1A9AF` |
| Empty state | `min-height: 60vh`, centred column, `gap: 16px`; 48px `ImageOff` in `#4A5155`; `H3` "No conversions yet"; `Body` `#7B858B`; Ghost Button "Start a conversion" |

---

## 13. Accessibility

- **Keyboard access.** Every interactive element is reachable and operable by keyboard in a logical order. Format card grids use roving `tabindex` with arrow-key navigation; `Enter` or `Space` selects.
- **Focus ring.** `outline: 2px solid #00E5FF` with `outline-offset: 2px` on every focusable element, never removed. Applied to dark and light themes alike. Focus rings on aqua surfaces use `#7FF0FF` to stay visible.
- **Focus visibility in motion.** Focus changes are instant (no transition on `outline-color`); a focused element that scrolls into view uses `scroll-margin-block: 96px` so it is never hidden behind the sticky nav.
- **Skip to content.** A visually hidden link, revealed on focus, reading "Skip to main content", targeting `#main`. Positioned top-left, `padding: 12px 16px`, background `#1C2022`, text `#00E5FF`, `radius-md`, `z-index: 100`.
- **ARIA.** Icon-only controls carry `aria-label` (e.g. `aria-label="Remove IMG_4821.CR2 from batch"`). The dropzone is a labelled `button` with `aria-describedby` pointing at its hint text. Progress bars use `role="progressbar"` with `aria-valuenow`, `aria-valuemin: 0`, `aria-valuemax: 100`, and an `aria-label` naming the file. Toasts use `role="status"` for success and info and `role="alert"` for error and warning. The step indicator uses `aria-current="step"`.
- **Colour is never the only signal.** Success carries a `CheckCircle2` icon plus the word "converted". Error carries an `AlertCircle` plus a text reason. The 20-file limit produces a warning toast with an `AlertTriangle` and the literal text "Maximum 20 files reached", not just a border colour change.
- **Tap targets.** Minimum `44x44px` on touch. The 40px icon button is expanded with a transparent `::after` hit area of `44x44px` on coarse pointers.
- **Contrast.** AA minimum (`4.5:1` body, `3:1` large text and UI boundaries); AAA is met for text primary, secondary, aqua, success, warning, cyan, and info against background primary. Values are recorded in [Section 3.4](#34-color-usage-rules).
- **Zoom and reflow.** Content is usable at `200%` browser zoom and at `320px` width with no horizontal scrolling. No content is conveyed by an image alone.

---

## 14. Responsive Breakpoints

| Breakpoint | Range | Key Layout Changes |
|------------|-------|--------------------|
| Mobile | 320–639px | Single column everywhere. Page padding 16px. Grid 4 columns, 12px gutter. Nav collapses to the `Menu` panel. Display drops to H1 (48px); Hero min-height 100svh. Step indicator truncates to numerals. Convert button fixed to a bottom bar. Result file grid becomes 1 column. Toast width `calc(100vw - 32px)`, inset 16px. Format grid 2 columns. Features strip horizontal scroll-snap. |
| Tablet | 640–1023px | Page padding 24px. Grid 8 columns, 24px gutter. Nav links visible, no menu panel. Format grid 3 columns. How It Works stays 3 columns but tightens to `gap: 24px`. Result file grid 2 columns. Converter remains single column. |
| Desktop | 1024–1439px | Page padding 40px. Grid 12 columns, 24px gutter. Converter becomes the two-column `1fr 1fr` layout with `gap: 40px`. Format grid 4 columns. Result file grid 3 columns. Hero min-height 100vh. |
| Wide | 1440px+ | Containers clamp at `container-xl` (1280px) and centre; content width stops growing. Type scale unchanged — no fluid scaling above 1280px. Grid stays 12 columns. |

Layout is built mobile-first with Tailwind default breakpoints. The converter's two-column split is the only structural change above 1024px; everything else is column count and container width.

---

## 15. Dark Mode vs Light Mode

**Dark is the default.** The theme is applied at the root with no flash of the wrong theme on first paint; the stored preference is read from a blocking inline script in the document head, and absent a stored preference the root carries `class="dark"`.

**Light mode derivation rules.**

- Background Primary becomes off-white `#F5F7F8`; cards invert to white `#FFFFFF` so they still separate from the canvas.
- Text inverts to near-black `#0A0B0C`; secondary and tertiary steps map down the black ramp to maintain the same three-tier hierarchy.
- Aqua remains the accent hue but darkens for text use: **Aqua 800 `#005C66`** (7.71:1 on white). Aqua 500 is retained as a **fill** colour only, always paired with `#0A0B0C` text, which preserves the 12.80:1 button contrast in both themes.
- Glows are reduced to 30% of their dark-mode alpha and are reserved for the primary CTA; borders carry the emphasis in light mode instead.
- Shadows are lightened to `rgba(0, 0, 0, 0.10)`-based values and gain a `border` for separation.

| Token | Light HEX | Light RGB | Dark HEX (reference) |
|-------|-----------|----------|----------------------|
| Background Primary | `#F5F7F8` | rgb(245, 247, 248) | `#0A0B0C` |
| Background Secondary | `#FFFFFF` | rgb(255, 255, 255) | `#121416` |
| Background Tertiary | `#E4E7E9` | rgb(228, 231, 233) | `#1C2022` |
| Background Elevated | `#FFFFFF` | rgb(255, 255, 255) | `#2E3336` |
| Background Overlay | `rgba(74, 81, 85, 0.50)` | rgb(74, 81, 85) | `#050506` |
| Border Subtle | `#E4E7E9` | rgb(228, 231, 233) | `#1C2022` |
| Border Default | `#C7CDD1` | rgb(199, 205, 209) | `#2E3336` |
| Border Muted | `#E4E7E9` | rgb(228, 231, 233) | `#4A5155` |
| Border Strong | `#008A99` | rgb(0, 138, 153) | `#00E5FF` |
| Text Primary | `#0A0B0C` | rgb(10, 11, 12) | `#F5F7F8` |
| Text Secondary | `#2E3336` | rgb(46, 51, 54) | `#A1A9AF` |
| Text Tertiary | `#4A5155` | rgb(74, 81, 85) | `#7B858B` |
| Text Disabled | `#A1A9AF` | rgb(161, 169, 175) | `#4A5155` |
| Text On Accent | `#0A0B0C` | rgb(10, 11, 12) | `#0A0B0C` |
| Accent (text use) | `#005C66` | rgb(0, 92, 102) | `#00E5FF` |
| Accent (fill use) | `#00E5FF` | rgb(0, 229, 255) | `#00E5FF` |
| Accent Hover | `#002E33` | rgb(0, 46, 51) | `#3DE5FF` |
| Accent Active | `#008A99` | rgb(0, 138, 153) | `#00B8CC` |
| Accent Muted | `#E0FCFF` | rgb(224, 252, 255) | `#002E33` |
| Cyan Secondary | `#006D80` | rgb(0, 109, 128) | `#3EC5DE` |
| Success | `#00875E` | rgb(0, 135, 94) | `#00E5A0` |
| Success Hover | `#006B4A` | rgb(0, 107, 74) | `#00C98A` |
| Warning | `#8A5A00` | rgb(138, 90, 0) | `#FFB020` |
| Warning Hover | `#6B4600` | rgb(107, 70, 0) | `#E69A0A` |
| Error | `#C23232` | rgb(194, 50, 50) | `#FF5C5C` |
| Error Hover | `#A02727` | rgb(160, 39, 39) | `#E64A4A` |
| Info | `#0369A1` | rgb(3, 105, 161) | `#38BDF8` |

**Light mode verification.** Text Primary 18.33:1, Text Secondary 9.71:1, Accent 7.71:1, Success 4.54:1, Warning 5.93:1, Error 5.53:1, Info 5.93:1 — all AA or better on `#F5F7F8`.

**Toggle.** 40px Icon Button in the nav, `Moon` icon in dark mode and `Sun` in light mode, `aria-label="Toggle color theme"`, `aria-pressed` reflecting state. The choice persists to `localStorage` under `camerlob-theme`. The toggle does not reset on navigation and never reverts to system preference once the user has chosen.

---

## 16. Design Tokens (CSS Variables)

Imported once in `styles/globals.css`. Every value in this brief is defined here; no component hardcodes a hex value.

```css
:root {
  /* ---- Color: Black scale ---- */
  --color-black-0:   #FFFFFF;
  --color-black-50:  #F5F7F8;
  --color-black-100: #E4E7E9;
  --color-black-200: #C7CDD1;
  --color-black-300: #A1A9AF;
  --color-black-400: #6B7378;
  --color-black-500: #4A5155;
  --color-black-600: #2E3336;
  --color-black-700: #1C2022;
  --color-black-800: #121416;
  --color-black-900: #0A0B0C;
  --color-black-950: #050506;

  /* ---- Color: Aqua scale ---- */
  --color-aqua-50:  #E0FCFF;
  --color-aqua-100: #B8F8FF;
  --color-aqua-200: #7FF0FF;
  --color-aqua-300: #3DE5FF;
  --color-aqua-400: #00D9F5;
  --color-aqua-500: #00E5FF;
  --color-aqua-600: #00B8CC;
  --color-aqua-700: #008A99;
  --color-aqua-800: #005C66;
  --color-aqua-900: #002E33;

  /* ---- Color: Semantic ---- */
  --color-success:       #00E5A0;
  --color-success-hover: #00C98A;
  --color-warning:       #FFB020;
  --color-warning-hover: #E69A0A;
  --color-error:         #FF5C5C;
  --color-error-hover:   #E64A4A;
  --color-info:          #38BDF8;
  --color-info-hover:    #1BA5E0;
  --color-cyan:          #3EC5DE;
  --color-cyan-hover:    #62D6EC;

  /* ---- Color: Surfaces ---- */
  --color-bg-primary:   var(--color-black-900);
  --color-bg-secondary: var(--color-black-800);
  --color-bg-tertiary:  var(--color-black-700);
  --color-bg-elevated:  var(--color-black-600);
  --color-bg-overlay:   var(--color-black-950);

  /* ---- Color: Borders ---- */
  --color-border-subtle: var(--color-black-700);
  --color-border-default: var(--color-black-600);
  --color-border-muted:  var(--color-black-500);
  --color-border-strong: var(--color-aqua-500);

  /* ---- Color: Text ---- */
  --color-text-primary:   var(--color-black-50);
  --color-text-secondary: var(--color-black-300);
  --color-text-tertiary:  #7B858B;
  --color-text-disabled:  var(--color-black-500);
  --color-text-on-accent: var(--color-black-900);

  /* ---- Color: Accents ---- */
  --color-aqua-primary: var(--color-aqua-500);
  --color-aqua-hover:   var(--color-aqua-300);
  --color-aqua-active:  var(--color-aqua-600);
  --color-aqua-muted:   var(--color-aqua-900);
  --color-aqua-glow:    rgba(0, 229, 255, 1);

  /* ---- Spacing (4px base) ---- */
  --space-1:  0.25rem;  /*  4px */
  --space-2:  0.5rem;   /*  8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-5:  1.25rem;  /* 20px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
  --space-32: 8rem;     /* 128px */

  /* ---- Containers ---- */
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1280px;
  --grid-gutter:  1.5rem;  /* 24px */
  --grid-columns: 12;

  /* ---- Radius ---- */
  --radius-none: 0;
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-2xl:  24px;
  --radius-full: 9999px;

  /* ---- Elevation ---- */
  --shadow-sm:  0 1px 2px 0 rgba(0, 0, 0, 0.40);
  --shadow-md:  0 4px 8px -2px rgba(0, 0, 0, 0.45), 0 2px 4px -2px rgba(0, 0, 0, 0.35);
  --shadow-lg:  0 12px 24px -6px rgba(0, 0, 0, 0.50), 0 4px 8px -4px rgba(0, 0, 0, 0.40);
  --shadow-xl:  0 24px 48px -12px rgba(0, 0, 0, 0.60), 0 8px 16px -8px rgba(0, 0, 0, 0.45);

  /* ---- Glow ---- */
  --glow-sm: 0 0 0 1px rgba(0, 229, 255, 0.30), 0 0 8px rgba(0, 229, 255, 0.25);
  --glow-md: 0 0 0 1px rgba(0, 229, 255, 0.40), 0 0 16px rgba(0, 229, 255, 0.35),
             0 0 32px rgba(0, 229, 255, 0.20);
  --glow-lg: 0 0 0 1px rgba(0, 229, 255, 0.50), 0 0 32px rgba(0, 229, 255, 0.45),
             0 0 64px rgba(0, 229, 255, 0.25);
  --shadow-inset: inset 0 2px 4px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.06);
  --shadow-card-hover: 0 12px 24px -8px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 229, 255, 0.20);
  --focus-ring: 0 0 0 2px rgba(0, 229, 255, 0.55);

  /* ---- Gradients ---- */
  --gradient-aqua: linear-gradient(135deg, #00E5FF 0%, #00B8CC 100%);
  --gradient-aqua-hover: linear-gradient(135deg, #3DE5FF 0%, #00D9F5 100%);
  --gradient-aqua-glow: radial-gradient(ellipse 60% 50% at 50% 40%,
                       rgba(0, 229, 255, 0.18) 0%, rgba(0, 229, 255, 0.06) 45%,
                       rgba(10, 11, 12, 0) 100%);
  --gradient-card-hover: linear-gradient(180deg, rgba(0, 229, 255, 0.06) 0%,
                         rgba(0, 229, 255, 0.02) 100%);
  --gradient-progress: linear-gradient(90deg, #00B8CC 0%, #00E5FF 60%, #7FF0FF 100%);

  /* ---- Typography ---- */
  --font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;
  --text-display: 4rem;      --lh-display: 1.05;   --ls-display: -0.03em;
  --text-h1: 3rem;           --lh-h1: 1.10;        --ls-h1: -0.02em;
  --text-h2: 2.25rem;        --lh-h2: 1.20;        --ls-h2: -0.02em;
  --text-h3: 1.75rem;        --lh-h3: 1.30;        --ls-h3: -0.01em;
  --text-h4: 1.375rem;       --lh-h4: 1.40;        --ls-h4: -0.01em;
  --text-body-lg: 1.125rem;  --lh-body-lg: 1.60;   --ls-body-lg: 0;
  --text-body: 1rem;         --lh-body: 1.60;      --ls-body: 0;
  --text-body-sm: 0.875rem;  --lh-body-sm: 1.50;   --ls-body-sm: 0;
  --text-caption: 0.75rem;   --lh-caption: 1.40;   --ls-caption: 0.02em;
  --text-mono: 0.875rem;     --lh-mono: 1.50;      --ls-mono: 0;
  --text-button: 0.875rem;   --lh-button: 1.00;    --ls-button: 0.01em;

  /* ---- Motion ---- */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;
  --transition-fast: 150ms var(--ease-in-out);
  --transition-base: 200ms var(--ease-out);
  --transition-slow: 300ms var(--ease-out);

  /* ---- Layout ---- */
  --nav-height: 64px;
  --page-pad-mobile:  1rem;
  --page-pad-tablet:  1.5rem;
  --page-pad-desktop: 2.5rem;
  --toast-width: 360px;
}

.dark {
  color-scheme: dark;
}

.light {
  color-scheme: light;
  --color-bg-primary:   #F5F7F8;
  --color-bg-secondary: #FFFFFF;
  --color-bg-tertiary:  #E4E7E9;
  --color-bg-elevated:  #FFFFFF;
  --color-bg-overlay:   #4A5155;
  --color-border-subtle: #E4E7E9;
  --color-border-default: #C7CDD1;
  --color-border-muted:  #E4E7E9;
  --color-border-strong: #008A99;
  --color-text-primary:   #0A0B0C;
  --color-text-secondary: #2E3336;
  --color-text-tertiary:  #4A5155;
  --color-text-disabled:  #A1A9AF;
  --color-aqua-primary: #005C66;
  --color-aqua-hover:   #002E33;
  --color-aqua-active:  #008A99;
  --color-aqua-muted:   #E0FCFF;
  --color-cyan:         #006D80;
  --color-success:      #00875E;
  --color-success-hover:#006B4A;
  --color-warning:      #8A5A00;
  --color-warning-hover:#6B4600;
  --color-error:        #C23232;
  --color-error-hover:  #A02727;
  --color-info:         #0369A1;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.10);
  --shadow-md: 0 4px 8px -2px rgba(0, 0, 0, 0.10), 0 2px 4px -2px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 12px 24px -6px rgba(0, 0, 0, 0.12), 0 4px 8px -4px rgba(0, 0, 0, 0.08);
  --shadow-xl: 0 24px 48px -12px rgba(0, 0, 0, 0.16), 0 8px 16px -8px rgba(0, 0, 0, 0.10);
}
```

---

## 17. Component Showcase (Reference Code)

### 17.1 Primary Button

```tsx
<button
  className="inline-flex h-10 items-center gap-2 rounded-[8px] px-5
             bg-[linear-gradient(135deg,#00E5FF_0%,#00B8CC_100%)]
             text-sm font-semibold tracking-[0.01em] text-[#0A0B0C]
             shadow-[0_4px_8px_-2px_rgba(0,0,0,0.45),0_2px_4px_-2px_rgba(0,0,0,0.35)]
             transition-all duration-150 ease-in-out
             hover:scale-[1.02] hover:bg-[linear-gradient(135deg,#3DE5FF_0%,#00D9F5_100%)]
             hover:shadow-[0_4px_8px_-2px_rgba(0,0,0,0.45),0_0_16px_rgba(0,229,255,0.35)]
             active:scale-[0.98] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.35)]
             focus-visible:outline-none focus-visible:ring-2
             focus-visible:ring-[#00E5FF] focus-visible:ring-offset-2
             focus-visible:ring-offset-[#0A0B0C]
             disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
>
  <ArrowRight className="h-4 w-4" strokeWidth={2} />
  Convert images free
</button>
```

### 17.2 Ghost (Secondary) Button

```tsx
<button
  className="inline-flex h-10 items-center gap-2 rounded-[8px] px-5
             border border-[#00B8CC] bg-transparent text-sm font-semibold
             tracking-[0.01em] text-[#00E5FF]
             transition-all duration-150 ease-in-out
             hover:border-[#00E5FF] hover:bg-[rgba(0,229,255,0.10)] hover:text-[#3DE5FF]
             active:scale-[0.98] active:bg-[rgba(0,229,255,0.20)] active:text-[#7FF0FF]
             focus-visible:outline-none focus-visible:ring-2
             focus-visible:ring-[#00E5FF] focus-visible:ring-offset-2
             focus-visible:ring-offset-[#0A0B0C]
             disabled:pointer-events-none disabled:border-[#2E3336] disabled:text-[#4A5155]"
>
  Convert More
</button>
```

### 17.3 Format Card

```tsx
// Default
<div
  role="option"
  aria-selected={false}
  tabIndex={0}
  className="flex min-h-[88px] flex-col justify-between gap-2 rounded-[12px] p-4
             border border-[#1C2022] bg-[#1C2022]
             shadow-[0_1px_2px_0_rgba(0,0,0,0.40)]
             transition-all duration-150 ease-out
             hover:scale-[1.02] hover:border-[#00E5FF]
             hover:bg-[linear-gradient(180deg,rgba(0,229,255,0.06)_0%,rgba(0,229,255,0.02)_100%)]
             hover:shadow-[0_0_0_1px_rgba(0,229,255,0.30),0_0_8px_rgba(0,229,255,0.25)]
             focus-visible:outline-none focus-visible:ring-2
             focus-visible:ring-[#00E5FF] focus-visible:ring-offset-2
             focus-visible:ring-offset-[#0A0B0C]"
>
  <span className="font-mono text-sm font-medium text-[#F5F7F8] group-hover:text-[#7FF0FF]">
    .CR2
  </span>
  <span className="text-sm text-[#A1A9AF] group-hover:text-[#3DE5FF]">Canon RAW</span>
</div>

// Selected
<div
  role="option"
  aria-selected
  tabIndex={0}
  className="flex min-h-[88px] flex-col justify-between gap-2 rounded-[12px] p-4
             border border-[#3DE5FF]
             bg-[linear-gradient(135deg,#00E5FF_0%,#00B8CC_100%)]
             shadow-[0_0_0_1px_rgba(0,229,255,0.40),0_0_16px_rgba(0,229,255,0.35),0_0_32px_rgba(0,229,255,0.20)]
             transition-transform duration-300"
  style={{ animation: 'none' }}
>
  <span className="flex items-center justify-between font-mono text-sm font-medium text-[#0A0B0C]">
    .CR2
    <Check className="h-4 w-4" strokeWidth={2} />
  </span>
  <span className="text-sm text-[rgba(10,11,12,0.75)]">Canon RAW</span>
</div>
```

### 17.4 Upload Zone

```tsx
// Default
<div
  role="button"
  tabIndex={0}
  aria-label="Upload up to 20 images"
  aria-describedby="dropzone-hint"
  onDragOver={(e) => e.preventDefault()}
  className="flex min-h-[240px] cursor-pointer flex-col items-center
             justify-center gap-3 rounded-[16px] border-2 border-dashed
             border-[#00B8CC] bg-[#1C2022] p-10 text-center
             shadow-[0_1px_2px_0_rgba(0,0,0,0.40)]
             transition-all duration-200 ease-in-out
             hover:border-[#00E5FF] hover:bg-[rgba(0,229,255,0.08)]
             focus-visible:outline-none focus-visible:ring-2
             focus-visible:ring-[#00E5FF] focus-visible:ring-offset-2
             focus-visible:ring-offset-[#0A0B0C]"
>
  <UploadCloud className="h-8 w-8 text-[#00E5FF]" strokeWidth={1.5} />
  <p className="text-lg font-semibold text-[#F5F7F8]">Drop images here</p>
  <p id="dropzone-hint" className="text-sm text-[#7B858B]">
    or click to browse — up to 20 files
  </p>
</div>

// Drag over
<div
  className="flex min-h-[240px] flex-col items-center justify-center gap-3
             rounded-[16px] border-2 border-solid border-[#00E5FF]
             bg-[rgba(0,229,255,0.08)] p-10 text-center scale-[1.01]
             shadow-[0_0_0_1px_rgba(0,229,255,0.40),0_0_16px_rgba(0,229,255,0.35),0_0_32px_rgba(0,229,255,0.20)]
             transition-all duration-200 ease-in-out"
  aria-hidden
>
  <UploadCloud className="h-8 w-8 text-[#3DE5FF]" strokeWidth={1.5} />
  <p className="text-lg font-semibold text-[#F5F7F8]">Release to add files</p>
  <p className="text-sm text-[#7FF0FF]">Maximum 20 files per batch</p>
</div>
```

### 17.5 File Card

```tsx
<div
  className="grid min-h-[72px] grid-cols-[48px_1fr_40px] items-center gap-3
             rounded-[8px] border border-[#1C2022] bg-[#121416] p-3
             shadow-[0_1px_2px_0_rgba(0,0,0,0.40)]
             transition-all duration-200 ease-out
             hover:-translate-y-0.5 hover:border-[#2E3336]
             hover:shadow-[0_4px_8px_-2px_rgba(0,0,0,0.45)]"
>
  <img
    src={thumb}
    alt=""
    className="h-12 w-12 rounded-[4px] border border-[#2E3336]
               bg-[#0A0B0C] object-cover"
  />

  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="truncate font-mono text-sm font-medium text-[#F5F7F8]">
      IMG_4821.CR2
    </span>
    <span className="text-xs font-medium tracking-[0.02em] text-[#7B858B] tabular-nums">
      24.8 MB
    </span>
  </div>

  <button
    aria-label="Remove IMG_4821.CR2 from batch"
    className="flex h-10 w-10 items-center justify-center rounded-full
               bg-transparent text-[#A1A9AF]
               transition-colors duration-150 ease-in-out
               hover:bg-[#FF5C5C] hover:text-white
               focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-[#00E5FF] focus-visible:ring-offset-2
               focus-visible:ring-offset-[#121416]
               active:scale-90"
  >
    <X className="h-4 w-4" strokeWidth={1.5} />
  </button>
</div>
```

### 17.6 Toast

```tsx
<div
  role="alert"
  className="pointer-events-auto flex min-h-16 w-[360px] items-start gap-3
             rounded-[8px] border border-[#2E3336] border-l-4 border-l-[#FF5C5C]
             bg-[#1C2022] p-4
             shadow-[0_24px_48px_-12px_rgba(0,0,0,0.60),0_8px_16px_-8px_rgba(0,0,0,0.45)]"
  style={{ animation: 'toast-in 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}
>
  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#FF5C5C]" strokeWidth={1.5} />

  <div className="flex min-w-0 flex-1 flex-col gap-1">
    <p className="text-sm font-semibold text-[#F5F7F8]">Could not convert 1 file</p>
    <p className="text-sm text-[#A1A9AF]">
      IMG_4821.CR2 failed: unsupported or corrupt file.
    </p>
  </div>

  <button
    aria-label="Dismiss notification"
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
               text-[#A1A9AF] transition-colors duration-150
               hover:bg-[rgba(0,229,255,0.08)] hover:text-[#00E5FF]
               focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-[#00E5FF] focus-visible:ring-offset-2
               focus-visible:ring-offset-[#1C2022]"
  >
    <X className="h-4 w-4" strokeWidth={1.5} />
  </button>
</div>
```

```css
@keyframes toast-in  { from { opacity: 0; transform: translateX(100%); }
                       to   { opacity: 1; transform: translateX(0); } }
@keyframes toast-out { from { opacity: 1; transform: translateX(0); }
                       to   { opacity: 0; transform: translateX(100%); } }
```

### 17.7 Progress Bar

```tsx
<div className="flex w-full flex-col gap-2">
  <div className="flex items-center justify-between">
    <span className="truncate font-mono text-sm text-[#F5F7F8]">IMG_4821.CR2</span>
    <span className="text-xs font-medium tracking-[0.02em] text-[#7B858B] tabular-nums">
      Converting…
    </span>
  </div>

  <div
    role="progressbar"
    aria-label="Converting IMG_4821.CR2"
    aria-valuenow={64}
    aria-valuemin={0}
    aria-valuemax={100}
    className="h-1.5 w-full overflow-hidden rounded-full border
               border-[#1C2022] bg-[#1C2022]"
  >
    <div
      className="h-full rounded-full
                 bg-[linear-gradient(90deg,#00B8CC_0%,#00E5FF_60%,#7FF0FF_100%)]"
      style={{
        width: '64%',
        transition: 'width 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    />
  </div>
</div>
```

---

## 18. Do's and Don'ts

**Do**

- Use aqua **sparingly** — one primary action and one active state per viewport; keep aqua under 10% of visible surface.
- Use `#0A0B0C`, never `#000000`. Pure black on an OLED panel causes smearing on scroll and harsh edges against aqua glow.
- Respect `prefers-reduced-motion`; verify with the OS setting on before shipping any animation.
- Keep contrast at AA minimum, AAA wherever the text is on the background primary layer.
- Use the 4px spacing scale exclusively; if a value is not on the scale, it is a design bug.
- Pair every icon-only control with an `aria-label`, and every status colour with an icon and text.
- Keep the focus ring visible on every interactive element in both themes.
- Let the glow do the emphasis work instead of adding borders, so a card reads as one object.

**Don't**

- Do not use pure black `#000000` as a background anywhere.
- Do not use more than **two accent colors** on a single screen. Aqua plus one semantic colour, maximum.
- Do not use red for anything other than errors and destructive actions. Never for a "close" button, never as a hover accent.
- Do not animate on scroll. No parallax, no scroll-triggered reveals, no counters that tick as the user scrolls.
- Do not add a second infinite animation. The hero CTA glow pulse is the only one.
- Do not stack more than two shadow layers, and do not tint shadows with cyan.
- Do not use gradients on text other than the single aqua emphasis on the landing headline.
- Do not raise the file counter above 20 or soften the hard limit with a warning state — per PRD, it is a hard block with an error toast.
- Do not introduce a crop, rotate, or filter affordance; image editing is a documented non-goal in the PRD.

---

## 19. File & Folder Structure (Design Assets)

```text
/public/
  logo.svg                 # Aperture glyph + "Camerlob" wordmark in #00E5FF
  favicon.ico              # 32px aperture glyph, #00E5FF on #0A0B0C
  og-image.png             # 1200x630, --gradient-aqua-glow + wordmark

/styles/
  tokens.css               # All CSS custom properties (Section 16)
  globals.css              # @import 'tokens.css', base resets, font-face,
                           # color-scheme, reduced-motion block

/components/ui/            # shadcn components, restyled with Deep Aqua tokens
  button.tsx               # Variants: primary | ghost | text | danger | icon
  input.tsx                # States incl. error + focus glow
  select.tsx               # Trigger + panel + option states (8.7)
  dialog.tsx               # Backdrop blur(8px), radius-xl panel
  progress.tsx             # Determinate + indeterminate shimmer
  toast.tsx                # Stacked bottom-right, 4 semantic variants
  badge.tsx                # 6 variants at 15% alpha (8.16)
  tooltip.tsx              # 100ms fade, 400ms hover delay
  format-card.tsx          # Default | hover | selected | disabled
  file-card.tsx            # Thumbnail + info + remove + progress
  dropzone.tsx             # Default | drag-over | active | error
  step-indicator.tsx       # 1 Formats -> 2 Upload -> 3 Convert

/components/layout/
  nav.tsx                  # 80% bg + 12px backdrop blur (8.14)
  footer.tsx               # Tertiary text, 4-column desktop (8.15)
  theme-toggle.tsx         # Sun / Moon icon button
  skip-link.tsx            # Skip to main content

/lib/
  theme.ts                 # localStorage 'camerlob-theme' + no-flash script
  cn.ts                    # Tailwind class merge helper

/tailwind.config.ts        # theme.extend maps CSS variables to utility names
```

---

## 20. Appendix

### 20.1 Related Documents

- [`Documents/PRD.md`](./PRD.md) — Product Requirements Document v1.0. This brief implements the interface described there and adds no features beyond it. Section references in this document (for example PRD 5.2 for the format picker) point to that document.

### 20.2 Inspiration References

These are directional references for tone, density, and motion quality — not sources to copy from. Camerlob's own palette, spacing, and component behaviour are defined in this document.

| Reference | What is borrowed |
|-----------|------------------|
| **Vercel** | Minimal near-black canvas, hairline borders, high-contrast type, restraint in accent use |
| **Linear** | Fast state transitions, `ease-out` motion curve, dense information layout, keyboard-first interaction |
| **Raycast** | Aqua-on-black accent energy, glow as emphasis rather than decoration, command-palette-grade speed |
| **Supabase dashboard** | Status colour discipline, badge and pill restraint, dark-surface elevation ladder |
| **Resend** | Aqua-cyan gradient identity, large-type landing hero, high-contrast light/dark pairing discipline |

### 20.3 Version History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | YYYY-MM-DD | YYYY | Initial Deep Aqua design brief for the Camerlob MVP |

---

*End of document.*
