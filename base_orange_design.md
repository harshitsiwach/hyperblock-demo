# Neon Orange — Style Reference
> Blueprint globe, neon-orange pulse.

**Theme:** light

This redesign retains the original wireframe-atlas layout, typography, spacing grid, and nearly monochrome composition. It replaces the system's primary electric blue with a deliberately bright neon orange: `#FF5F1F`. Orange is still rationed as sharp punctuation rather than decoration: it carries identity, primary actions, interactive states, and selected data points against white, carbon, and cool-gray structure.

## Redesign intent

The original blue-led system becomes warmer and more energetic without turning into a broadly orange interface. Use bright neon orange only where an action, state, or brand focal point needs emphasis. Keep all text, structural lines, surfaces, and most data visualization bars neutral.

### Primary color decision

| Role | Value | Token | Usage |
|---|---:|---|---|
| Bright Neon Orange | `#FF5F1F` | `--color-neon-orange` | Primary brand and CTA color: logo block, filled buttons, active/hover states, selected map points, “Start Here” dot |
| Orange Pressed | `#D94A12` | `--color-neon-orange-pressed` | Pressed/active state for filled primary buttons |
| Orange Soft | `#FFF0EA` | `--color-neon-orange-soft` | Optional subtle active/selected background; never use as a large page surface |
| Orange Focus Ring | `#FF7F50` | `--color-neon-orange-focus` | Focus-visible outline; use at 2px with an offset |

`#FF5F1F` is the single replacement for every original primary `#0000ff` use. Do not use it as normal body text, a full-page background, broad chart fill, or decorative flourish.

## Tokens — Colors

| Name | Value | Token | Role |
|---|---:|---|---|
| Bright Neon Orange | `#FF5F1F` | `--color-neon-orange` | Primary brand surface, CTA fill, interactive accent, selected world-map node |
| Orange Pressed | `#D94A12` | `--color-neon-orange-pressed` | Pressed primary action state |
| Orange Soft | `#FFF0EA` | `--color-neon-orange-soft` | Restrained selected/hover background treatment |
| Orange Focus | `#FF7F50` | `--color-neon-orange-focus` | Keyboard focus outline |
| Wireframe Green | `#098551` | `--color-wireframe-green` | Secondary data-point accent on world-map visualizations; keep distinct from primary action states |
| Carbon | `#000000` | `--color-carbon` | Primary text, headlines, structural lines, iconography |
| Pure White | `#FFFFFF` | `--color-pure-white` | Page canvas, card surfaces, button text on dark/chromatic fills |
| Ash | `#F2F2F2` | `--color-ash` | Hairline borders, dividers, input outlines, card edges on light surfaces |
| Graphite | `#323232` | `--color-graphite` | Sidebar borders, strong secondary structural lines |
| Slate | `#717886` | `--color-slate` | Body text, subhead descriptions, secondary labels |
| Fog | `#999999` | `--color-fog` | Tertiary text, disabled states, low-priority metadata |
| Mist | `#B1B7C3` | `--color-mist` | Hairline borders, sidebar dividers, subtle icon outlines, nav separators |

## Typography

Keep the typography exactly as in the source design.

- **Doto:** display headline face; 115px, weight 400, letter spacing `-0.025em`, line-height `0.70`. Substitute Space Grotesk or Outfit.
- **Coinbase Sans:** headings and UI text; 400/500 weight. Substitute Inter.
- **Coinbase Display:** navigation and body text at 14–16px. Substitute Inter or system UI.
- **Coinbase Mono:** uppercase category labels and metadata at 12–14px, `0.073em` tracking. Substitute JetBrains Mono or IBM Plex Mono.
- **Base Sans:** 18px lead/subhead text. Substitute Inter.

| Role | Size | Line height | Letter spacing |
|---|---:|---:|---:|
| caption | 12px | 1.43 | 0.876px |
| body-sm | 14px | 1.43 | — |
| body | 16px | 1.5 | — |
| body-lg | 18px | 1.3 | -0.252px |
| subheading | 32px | 1.3 | -0.32px |
| heading | 80px | 1 | -2.4px |
| heading-lg | 110px | 0.7 | -5.5px |
| display | 115px | 0.7 | -2.875px |

## Spacing, shapes, and layout

**Base unit:** 4px  
**Density:** compact

| Token | Value |
|---|---:|
| `--spacing-4` | 4px |
| `--spacing-8` | 8px |
| `--spacing-12` | 12px |
| `--spacing-16` | 16px |
| `--spacing-24` | 24px |
| `--spacing-32` | 32px |
| `--spacing-40` | 40px |
| `--spacing-48` | 48px |
| `--spacing-80` | 80px |

- Tags: 2px radius.
- Cards, panels, and buttons: 8px radius.
- Section gap: 48px.
- Card padding: 24px.
- Element gap: 8px.
- Maintain the fixed ~200px left sidebar and fluid main content.
- Do not add shadows, gradients, photography, or 3D renders.

## Component redesign

### Sidebar navigation

Use a white fixed left rail. Replace the former blue 40×40px logo block with a solid **Bright Neon Orange** block (`#FF5F1F`), no radius. Nav labels stay Carbon. On hover or active state, shift only the text and/or chevron to `#FF5F1F`; do not color the whole row. Preserve the bottom panel separator in Mist.

### Logo block

- Background: `#FF5F1F`.
- Size: ~40×40px.
- Radius: 0.
- No shadow or border.
- This is one of the only large-scale uses of orange before user action.

### Primary filled button

- Default background: `#FF5F1F`.
- Text and arrow: `#FFFFFF`.
- Typography: Coinbase Sans, 16px, 500.
- Padding: 12px 16px; radius: 8px.
- Hover: retain `#FF5F1F`; optionally darken subtlely only if the UI needs a hover distinction.
- Pressed: `#D94A12`.
- Focus-visible: 2px `#FF7F50` outline with 2px offset.
- No border or shadow.

### Ghost button

Keep the original neutral ghost-button treatment: white or Ash fill, Carbon label, 1px Mist border, 8px radius, 12px 16px padding. On hover, use `#FFF0EA` background and `#FF5F1F` label/border. It must remain visibly secondary to the filled orange CTA.

### Start Here panel

Replace the former 6px blue dot with `#FF5F1F`. Keep the “START HERE” mono label Slate and the panel divider Mist. Its ghost buttons follow the orange-hover treatment above.

### Product cards

Keep cards white, flat, subtly rounded (8px), with 24px padding. Category labels remain Slate. Product illustrations may retain their differentiated green, pink, blue, and dark-blue treatments because these are content/illustration colors, not the primary system accent. Do not automatically recolor every artwork element orange.

If a product-card illustration previously uses the original primary blue as an interactive or brand-level marker, change only that marker to `#FF5F1F`.

### World map visualization

Continue to render the map using hundreds of thin vertical bars in Ash through Mist on the white canvas. Change every former primary blue data point to `#FF5F1F`. Retain Wireframe Green (`#098551`) as a second, semantically distinct data-node color. Limit orange points so they indicate selected, primary, or active nodes—not all nodes.

### Inputs, tags, and focus

- Default input borders/dividers: Ash or Mist.
- Focused input border/outline: `#FF7F50`.
- Active selected-chip/tag outline: `#FF5F1F`.
- Tags retain a 2px radius.
- Avoid orange text on white for small text; use it for icons, strokes, or larger labels only. Use Carbon text when legibility is important.

## Do and don't

### Do

- Reserve `#FF5F1F` for the logo block, primary filled buttons, interaction states, selected map data points, and the Start Here indicator.
- Use white text on orange-filled controls.
- Preserve the original white canvas, Carbon typography, cool-gray structural palette, spacing scale, and no-shadow elevation model.
- Use Orange Soft (`#FFF0EA`) only as a restrained selection/hover surface.
- Keep Wireframe Green semantic and separate from the orange brand/action system.
- Keep massive tight-tracked display headlines, mono labels, and a fixed sidebar-plus-fluid-content layout.

### Don't

- Do not leave `#0000FF` as a primary brand, CTA, nav-hover, map-point, or focus color.
- Do not apply orange to body copy, all icons, structural lines, or every chart/data point.
- Do not use orange for disabled states; use Fog and reduced contrast instead.
- Do not add gradients, drop shadows, glowing effects, or warm-tinted large backgrounds.
- Do not change the established 8px component radius / 2px tag radius system.
- Do not change content-illustration colors merely because they include blue; only replace blue when it functions as the old global primary accent.

## Surfaces and elevation

| Level | Name | Value | Purpose |
|---|---|---:|---|
| 0 | Page Canvas | `#FFFFFF` | Base background for all content |
| 1 | Panel Fill | `#F2F2F2` | Secondary panels, ghost-button fills, subtle elevation |
| 2 | Brand Surface | `#FF5F1F` | Logo block and primary action fill |

No shadows are used. Communicate elevation through white canvas → Ash panel fill → neon-orange brand surface, plus spacing, borders, and type scale.

## CSS custom properties

```css
:root {
  /* Primary color system */
  --color-neon-orange: #FF5F1F;
  --color-neon-orange-pressed: #D94A12;
  --color-neon-orange-soft: #FFF0EA;
  --color-neon-orange-focus: #FF7F50;

  /* Neutral and data colors */
  --color-wireframe-green: #098551;
  --color-carbon: #000000;
  --color-pure-white: #FFFFFF;
  --color-ash: #F2F2F2;
  --color-graphite: #323232;
  --color-slate: #717886;
  --color-fog: #999999;
  --color-mist: #B1B7C3;

  /* Typography */
  --font-doto: 'Doto', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-coinbase-sans: 'Coinbase Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-coinbase-display: 'Coinbase Display', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-coinbase-mono: 'Coinbase Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --font-base-sans: 'Base Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* Type scale */
  --text-caption: 12px;
  --leading-caption: 1.43;
  --tracking-caption: 0.876px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.43;
  --text-body: 16px;
  --leading-body: 1.5;
  --text-body-lg: 18px;
  --leading-body-lg: 1.3;
  --tracking-body-lg: -0.252px;
  --text-subheading: 32px;
  --leading-subheading: 1.3;
  --tracking-subheading: -0.32px;
  --text-heading: 80px;
  --leading-heading: 1;
  --tracking-heading: -2.4px;
  --text-heading-lg: 110px;
  --leading-heading-lg: 0.7;
  --tracking-heading-lg: -5.5px;
  --text-display: 115px;
  --leading-display: 0.7;
  --tracking-display: -2.875px;

  /* Spacing, radii, and surfaces */
  --spacing-unit: 4px;
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-80: 80px;
  --radius-sm: 2px;
  --radius-lg: 8px;
  --surface-page-canvas: #FFFFFF;
  --surface-panel-fill: #F2F2F2;
  --surface-brand-surface: #FF5F1F;
}
```

## Tailwind v4 theme snippet

```css
@theme {
  --color-neon-orange: #FF5F1F;
  --color-neon-orange-pressed: #D94A12;
  --color-neon-orange-soft: #FFF0EA;
  --color-neon-orange-focus: #FF7F50;
  --color-wireframe-green: #098551;
  --color-carbon: #000000;
  --color-pure-white: #FFFFFF;
  --color-ash: #F2F2F2;
  --color-graphite: #323232;
  --color-slate: #717886;
  --color-fog: #999999;
  --color-mist: #B1B7C3;
  --radius-sm: 2px;
  --radius-lg: 8px;
}
```

## Implementation migration checklist

1. Replace direct primary color usages: `#0000ff` → `#FF5F1F` where they represent the global primary accent.
2. Rename semantic token `--color-electric-blue` → `--color-neon-orange`; migrate all consumers.
3. Update brand surface `--surface-brand-surface` to `#FF5F1F`.
4. Update interaction states: nav hover, active chevrons, primary button fill, Start Here dot, selected map points, and focus-visible outlines.
5. Preserve non-primary artwork colors and Wireframe Green unless the blue is explicitly the system primary.
6. Add `--color-neon-orange-pressed`, `--color-neon-orange-soft`, and `--color-neon-orange-focus` for a complete interaction system.
7. Audit contrast: use white text only on the orange fill and retain Carbon for readable text over white/pale surfaces.
