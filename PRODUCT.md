# PRODUCT.md — Orbit Market

## Product Overview
**Orbit Market** is a standalone cross-platform companion app uniting real-time vendor inventories, open-world cycles, and daily/weekly activities for **Destiny 2** and **Warframe**.

## Platform
adaptive

## Target Audience
- Active Destiny 2 and Warframe players checking live vendor inventories (Xûr, Banshee-44, Ada-1, Saint-14, Saladin, Baro Ki'Teer), open-world environmental cycles (Cetus, Orb Vallis, Cambion Drift, Zariman, Duviri), and active missions (Void Fissures, Invasions, Sortie, Archon Hunt, Nightwave).
- Tech recruiters and engineering leads evaluating the portfolio of `yacine20005` through an installable Android APK, iOS build, web build, and full-stack repository.

## Core Architecture
- **Cross-Platform Delivery**: Ships to Android APK, iOS, and Web via Expo / React Native.
- **100% Autonomous Client**: Calls the official **Bungie.net Platform API** and **WarframeStat.us API** directly from the device, backed by an embedded Destiny 2 Manifest snapshot (`constants/ManifestSnapshot.json`) and offline fallback cache.
- **FastAPI Backend Companion**: Maintained in `/backend` for optional server-side SQLite manifest indexing.

## Visual Identity & Product Principles
- **Bungie *Marathon* (2025) Swiss Editorial Graphic Realism**: High-contrast architectural surfaces on deep carbon (`#090A0F`) and silkscreen bone (`#F4F2EA`) with restrained, high-signal semantic color (`#C8FF00` acid volt for active state, `#FFB800` exotic amber, `#FF4411` vermilion, `#00F0FF` cyan, `#C259FF` violet, `#00E676` emerald) for <1-second mobile glanceability.
- **Readability & Native Craft First**: No fake serial codes (`CYC-01`, `SL-01`), no numbered section kickers (`01 / 02`), no nested cards inside cards, no sub-12px micro-text, and >=44px touch targets everywhere. System sans-serif carries headings, names, and descriptions (`12px–22px`); `SpaceMono` is reserved strictly for tabular numbers, timers, prices, and stat values.
