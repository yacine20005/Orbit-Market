# PRODUCT.md — Orbit Market

## Product Overview
**Orbit Market** is a standalone cross-platform companion app uniting real-time vendor inventories, open-world cycles, and daily/weekly activities for **Destiny 2** and **Warframe**.

## Platform
`adaptive` (Android APK, iOS, and Web via Expo / React Native)

## Target Audience
- Active Destiny 2 and Warframe players checking live vendor inventories (Xûr, Banshee-44, Ada-1, Saint-14, Saladin, Baro Ki'Teer), open-world environmental cycles (Cetus, Orb Vallis, Cambion Drift, Zariman, Duviri), and active missions (Void Fissures, Invasions, Sortie, Archon Hunt, Nightwave).
- Tech recruiters and engineering leads evaluating the portfolio of `yacine20005` through an installable Android APK and full-stack repository.

## Core Architecture
- **100% Autonomous Client**: Calls the official **Bungie.net Platform API** and **WarframeStat.us API** directly from the device, backed by an embedded Destiny 2 Manifest snapshot (`constants/ManifestSnapshot.json`) and offline fallback cache.
- **FastAPI Backend Companion**: Maintained in `/backend` for optional server-side SQLite manifest indexing.

## Visual Identity & Product Principles
- **Bungie *Marathon* (2025) Swiss Editorial Graphic Realism**: Bold, high-contrast Swiss graphic design on deep carbon (`#090A0E`) and warm bone (`#F2F0E8`) surfaces with UESC acid-lime (`#C8FF00`), vermilion (`#FF3B00`), cyan (`#00F0FF`), and exotic amber (`#FFB800`) accents.
- **Readability First (Zero Fake Terminal Clutter)**: No fake serial codes (`CYC-01`, `SL-01`), no numbered section kickers (`01 / 02`), no nested boxes inside boxes, and no tiny all-caps monospace labels. System sans-serif carries all headings, names, and descriptions at comfortable reading sizes (`14px–22px`); `SpaceMono` is reserved strictly for tabular numbers, timers, and stat values.
