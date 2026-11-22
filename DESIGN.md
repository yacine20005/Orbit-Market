# DESIGN.md — Orbit Market Design System (Marathon Swiss Editorial)

## 1. Visual Direction & Philosophy
Inspired by Joseph Cross's **Swiss Graphic Realism** art direction for Bungie's ***Marathon* (2025)**:
- **Editorial Clarity over Sci-Fi Clutter**: High-contrast, poster-grade typography paired with flat architectural surfaces and crisp `1px` dividers.
- **Strict Bans**:
  - No fake serial numbers (`VND-09`, `CYC-01`, `SL-01 // 372104`) or decorative eyebrows/kickers.
  - No nested cards inside cards.
  - No monospace for prose, descriptions, or navigation labels—`SpaceMono` is used **only** for countdowns, quantities, and numeric stats.
  - No font size below `12px` anywhere in the interface.

## 2. Color Palette & Tokens (`constants/Colors.ts`)

| Token | Hex | Contrast on `void` | Role |
|---|---|---|---|
| `void` | `#090A0F` | — | Primary deep carbon background |
| `surface` | `#12141C` | — | Card and row surface |
| `surfaceElevated` | `#1A1D28` | — | Selected / expanded row surface |
| `bone` | `#F4F2EA` | `17.2:1` | Primary headings and item names |
| `inkSecondary` | `#C8CACE` | `11.8:1` | Readable body copy, perk descriptions, and subtitles |
| `ash` | `#8E94A5` | `6.1:1` | Metadata and secondary labels (all ≥ 4.5:1 WCAG AA) |
| `border` | `#242836` | — | 1px structural dividers |
| `borderActive` | `#3D4459` | — | Focused or expanded border |
| `acid` | `#C8FF00` | `16.4:1` | Primary active accent (UESC Acid Volt) |
| `vermilion` | `#FF4411` | `6.3:1` | Alert / Warm / Fass / Titan accent |
| `cyan` | `#00F0FF` | `13.9:1` | Cold / Night / Hunter / Void accent |
| `amber` | `#FFB800` | `11.5:1` | Exotic tier / Ducats / Day / Warlock accent |
| `violet` | `#C259FF` | `6.4:1` | Legendary tier / Duviri accent |
| `emerald` | `#00E676` | `11.8:1` | Online status & positive completion |

## 3. Typography Scale
- **Screen Title**: `22px` System Sans, weight `800`, letter-spacing `-0.4px`, color `bone` (`#F4F2EA`).
- **Section Header**: `16px` System Sans, weight `700`, letter-spacing `-0.2px`, color `bone` (`#F4F2EA`).
- **Item / Zone Title**: `17px` System Sans, weight `700`, line-height `22px`, color `bone` (`#F4F2EA`).
- **Body / Perk Description**: `14px` System Sans, weight `400`, line-height `20px`, color `inkSecondary` (`#C8CACE`).
- **UI Pill / Tab Label**: `13px` System Sans, weight `600`, color `bone` or `#090A0F` on `acid`.
- **Numeric Telemetry (Timers, Prices, Stat Values)**: `14px–18px` `SpaceMono`, tabular numerals.

## 4. Interaction Patterns
- **Inline Item Expansion**: Tapping any vendor item expands its ballistic/armor stats, full exotic trait description, and lore inline within the list—no modal popups required.
- **Single-Glance World Cycles**: All 5 Warframe open-world cycles render in a unified 5-row board so the player never scrolls to check planet states.
