# ORBIT MARKET // UESC TELEMETRY TERMINAL (v2.0.0)

> **Tactical Multi-Game Vendor & WorldState Companion for Destiny 2 and Warframe**  
> Designed in the **Graphic Realism / Cyber-Brutalist** art direction inspired by Bungie's ***Marathon* (2025)**.

---

## 01 // OVERVIEW

**Orbit Market** is a standalone cross-platform companion app (**Android APK**, **iOS**, **Web**) built with **Expo SDK 53 / React Native 0.79 (TypeScript)** and an optional **FastAPI (Python)** backend. It unifies real-time vendor inventories, exotic roll telemetry, and open-world cycle tracking for **Destiny 2** and **Warframe** inside a cohesive, zero-bloat industrial terminal interface.

### Architectural Highlights for Recruiters & Engineers
- **100% Autonomous Client Mode**: Queries the **Bungie.net Platform API** (`/Destiny2/Vendors/?components=400,402`) and **WarframeStat.us WorldState API** (`https://api.warframestat.us/pc`) directly from the mobile device—requiring **zero backend server maintenance** to run in production.
- **Embedded Manifest Snapshot + Live Fallback**: Ships with a pre-indexed Destiny 2 Manifest dictionary (`constants/ManifestSnapshot.json`) of Exotic weapons, armor, perks, and vendor pools for **0ms item resolution**, automatically falling back to live `DestinyInventoryItemDefinition` lookups and resilient offline snapshots when upstream APIs are undergoing maintenance.
- **Graphic Realism UI System**: Built from custom *Marathon*-inspired primitives (`components/MarathonPrimitives.tsx`)—1px exposed structural hairlines, corner registration marks, dot-matrix pixel indicators, hazard stripes, and tabular `SpaceMono` telemetry counters.

---

## 02 // FEATURES

### DESTINY 2 // VENDOR ARMORY (`app/(tabs)/xur.tsx`)
- **5 Playable Vendor Channels**:
  - **Xûr, Agent of the Nine** (`2190858386`) — Live public sales (`components=400,402`), exotic weapon & armor rolls, Strange Coin costs, and live arrival/departure countdown.
  - **Banshee-44, Tower Gunsmith** (`672118013`) — Featured Foundry & Masterwork Weapons.
  - **Ada-1, Armor Synthesis** (`350061650`) — Synthweave Bounties & Legacy Raid Shaders.
  - **Saint-14, Trials of Osiris** (`765357505`) — Adept Weapons & Flawless Osirian Gear.
  - **Valus Saladin, Iron Banner** (`895295461`) — Iron Lord Armory & Multimach/Tusk Weapons.
- **Tactical Item Inspection Modal (`components/XurItemModal.tsx`)**:
  - Full ballistic/armor stat telemetry with segmented 20-cell bars (`SegmentedStatBar`).
  - Socketed Exotic Trait & Intrinsic Perk breakdown with live Bungie icon badges.
  - Class filter (`ALL`, `HUNTER`, `TITAN`, `WARLOCK`).

### WARFRAME // ORIGIN SYSTEM TELEMETRY (`app/(tabs)/warframe.tsx`)
- **5 Live Open-World Synchronizers** (with 1Hz real-time countdowns):
  - **Plains of Eidolon (Cetus)** — Day / Night cycle.
  - **Orb Vallis (Venus)** — Warm / Cold cycle.
  - **Cambion Drift (Deimos)** — Fass / Vome cycle.
  - **Zariman Ten Zero** — Corpus / Grineer occupation cycle.
  - **Duviri Paradox** — Joy / Anger / Envy / Sorrow / Fear spiral + active Warframe circuit choices.
- **Baro Ki'Teer // Void Trader**:
  - Live arrival/departure countdown, relay node location, and full Ducat + Credit inventory manifest.
- **Void Fissures, Invasions & Tactical Alerts**:
  - Active Lith / Meso / Neo / Axi / Omnia Void Fissures, faction Invasions with progress bars, Daily Sortie boss/modifier brief, Weekly Archon Hunt, and Nightwave acts.

---

## 03 // ART DIRECTION & DESIGN SYSTEM (`DESIGN.md`)

Inspired by Joseph Cross's **Graphic Realism** art direction for Bungie's ***Marathon* (2025)**:

| Token | Hex | Role |
| :--- | :--- | :--- |
| `void` | `#060608` | Primary OLED carbon canvas |
| `surface` | `#0D0E12` | Exposed 1px modular grid cells |
| `bone` | `#F2F0E8` | High-contrast silkscreen primary typography |
| `acid` | `#C8FF00` | UESC primary active state & live telemetry |
| `vermilion` | `#FF3B00` | Alert state, Solar/Fass cycle, critical timers |
| `cyan` | `#00F0FF` | Biometric cold state, Vallis Cold, Void Trader |
| `amber` | `#FFB800` | Destiny 2 Exotic tier & Ducat currency |

See [`DESIGN.md`](./DESIGN.md) and [`PRODUCT.md`](./PRODUCT.md) for the complete specification.

---

## 04 // QUICK START & ANDROID APK BUILD

### Prerequisites
- **Node.js 18+** & **npm**
- *(For local Android APK compilation)* **OpenJDK 17** and **Android SDK Build-Tools 35.0.0**

### 1. Install & Run Development Server
```bash
npm install
npx expo start
```
- Press `w` to open in Web browser
- Press `a` to open on Android Emulator / connected device

### 2. Automated Android APK Build & GitHub Releases (CI/CD)

Every push to `main` (or tag `v*`) automatically triggers the GitHub Actions pipeline ([`.github/workflows/release-apk.yml`](./.github/workflows/release-apk.yml)):
1. Provisions **Node.js 20**, **Java 17 (Temurin)**, and the **Android SDK** on an Ubuntu runner.
2. Runs TypeScript verification (`tsc --noEmit`) and `npx expo prebuild --platform android`.
3. Compiles the standalone signed release APK (`./gradlew assembleRelease`).
4. Publishes **`orbit-market-v2.0.0.apk`** directly to **GitHub Releases** (and as a downloadable workflow artifact).

#### Manual Alternative (Local or EAS Cloud)
```bash
# Local Gradle Release Build
npm run build:apk

# Expo Cloud Build (EAS)
npm run build:apk:eas
```

---

## 05 // PROJECT STRUCTURE

```text
Orbit-Market/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx        # ORBIT // HUB (Cross-game executive telemetry)
│   │   ├── xur.tsx          # DESTINY 2 (5-Vendor Armory & Exotic roll inspector)
│   │   ├── warframe.tsx     # WARFRAME (5 Open-World cycles, Baro, Fissures, Sortie)
│   │   └── settings.tsx     # SYSTEM (API key override, diagnostics, cache flush)
│   ├── _layout.tsx          # Root dark theme & font hydration
│   └── +html.tsx            # Web industrial scrollbar & selection styling
├── components/
│   ├── MarathonPrimitives.tsx # PixelDotMatrix, HazardStripeBar, TelemetryFrame, SegmentedStatBar
│   ├── XurItemCard.tsx      # Tactical vendor item card with perk chips & stat preview
│   └── XurItemModal.tsx     # Deep item telemetry sheet
├── constants/
│   ├── Colors.ts            # Marathon 2025 color tokens
│   └── ManifestSnapshot.json # Pre-indexed Bungie Manifest definitions (48 items & perks)
├── hooks/
│   ├── useXur.ts            # Multi-vendor Destiny 2 state & 1Hz countdown hook
│   └── useWarframe.ts       # Warframe WorldState & 1Hz cycle countdown hook
├── services/
│   ├── api.ts               # Autonomous Bungie.net Platform client + Manifest resolver
│   └── warframe.ts          # Autonomous WarframeStat.us WorldState client
└── backend/                 # Optional FastAPI server + SQLite Manifest decoder
```
