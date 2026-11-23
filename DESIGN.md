# DESIGN.md — Orbit Market Design System (Marathon Swiss Editorial)

## 1. Visual Direction & Philosophy
Adapted from Joseph Cross's **Swiss Graphic Realism** art direction for Bungie's ***Marathon* (2025)** for a glanceable mobile companion app (Impeccable **Operate** mode):
- **Editorial Clarity + Semantic Glanceability**: High-contrast, architectural dark surfaces (`#090A0F` / `#12141C` / `#1A1D28`) and crisp `1px` dividers paired with **restrained, high-signal semantic color** so players read vendor presence, planet day/night states, relic tiers, and guardian classes in under one second.
- **Strict Bans**:
  - No fake serial numbers (`VND-09`, `CYC-01`, `SL-01 // 372104`) or decorative eyebrows/kickers above headings.
  - No nested cards inside cards — expanded sections separate cleanly with `1px` horizontal dividers.
  - No colored `border-left` or `border-right` thicker than `1px` on cards, rows, or callouts.
  - No monospace for prose, descriptions, or navigation labels — `SpaceMono` is reserved **only** for countdowns, quantities, prices, latency, and stat values (always tabular).
  - No font size below `12px` anywhere in the interface.
  - No raw Bungie markup tokens (`[Solar]`, `[Void]`, `[Shield-Piercing]`) in rendered copy.

## 2. Color Palette & Semantic Tokens (`constants/Colors.ts`)

| Token | Hex | Contrast on `void` | Role |
|---|---|---|---|
| `void` | `#090A0F` | — | Primary deep carbon background |
| `surface` | `#12141C` | — | Primary card and row surface |
| `surfaceElevated` | `#1A1D28` | — | Selected / expanded / active header surface |
| `bone` | `#F4F2EA` | `17.2:1` | Primary headings, item names, primary ink |
| `inkSecondary` | `#C8CACE` | `11.8:1` | Readable body copy, perk descriptions, subtitles |
| `ash` | `#949AB0` | `6.7:1` | Metadata and secondary labels (WCAG AA+) |
| `border` | `#242836` | — | `1px` structural dividers |
| `borderActive` | `#3D4459` | — | Focused or expanded border |
| `acid` | `#C8FF00` | `16.4:1` | Active navigation tab, primary active emphasis |
| `emerald` | `#00E676` | `11.8:1` | Live / Online / Lith tier / positive status dot |
| `amber` | `#FFB800` | `11.5:1` | Exotic rarity, Ducats, Day cycle, Warlock, Axi tier, Snapshot state |
| `vermilion` | `#FF4411` | `6.3:1` | Warm / Fass / Grineer, Titan, Requiem, Error/Alert |
| `cyan` | `#00F0FF` | `13.9:1` | Cold / Night / Vome / Corpus, Hunter, Meso tier, Daily |
| `violet` | `#C259FF` | `6.4:1` | Legendary rarity, Duviri Spiral, Neo tier, Weekly |

Semantic pills use a restrained tinted surface (`withAlpha(color, 0.14)` fill + `withAlpha(color, 0.34)` `1px` border + crisp `color` text/icon) so color informs without shouting.

## 3. Typography Scale & Touch Targets
- **Screen Title**: `20px` System Sans, weight `800`, letter-spacing `-0.4px`, color `bone`.
- **Section Header**: `18px` System Sans, weight `800`, letter-spacing `-0.3px`, color `bone`.
- **Item / Zone Title**: `15px–17px` System Sans, weight `700`, line-height `20px–22px`, color `bone`.
- **Body / Perk Description**: `13.5px–14px` System Sans, weight `400`, line-height `20px`, color `inkSecondary`.
- **Metadata / Pill Label**: `12px–13px` System Sans, weight `600–700` (hard floor `12px`).
- **Numeric Telemetry**: `12px–16px` `SpaceMono`, `tabular-nums`.
- **Touch Targets**: Minimum `44px` height on all interactive pills, filter chips, tabs, and rows (`48px` on primary CTA buttons); dynamic safe-area bottom inset on the tab bar.

## 4. Interaction Patterns & States
- **Inline Item Expansion**: Tapping any vendor item expands perks, stats (when live/real stats exist), and lore inline within the card separated by `1px` dividers — zero modal popups, zero nested boxes.
- **Single-Glance Overview & Cycles**: Top 2-up status strip answers Xûr and Baro availability immediately above the fold; all 5 Warframe open-world cycles display color-coded semantic state pills and icons.
- **Complete UI States**: Every data view ships with loading skeletons (`SkeletonBlock`), inline retryable error banners (`ErrorBanner`), and helpful empty states (`EmptyStateCard`), plus full `accessibilityRole`, `accessibilityLabel`, and `accessibilityState` support.
