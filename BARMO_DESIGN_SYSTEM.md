# BARMO 4.0 — DESIGN SYSTEM SPECIFICATION

## Design Tokens & Palette

### Core Surfaces
- `--b4-bg-deep`: `#06090e` (Primary canvas background)
- `--b4-bg-surface`: `#0b101a` (Elevated panel, sidebar, and container background)
- `--b4-bg-elevated`: `#111827` (Card hover and active popover background)
- `--b4-bg-hover`: `#172033` (Tactile hover interactive background)

### Accent Lighting
- `--b4-accent`: `#8b5cf6` (Electric Violet — primary interactive brand color)
- `--b4-accent-hover`: `#7c3aed` (Deep violet hover state)
- `--b4-cyan`: `#06b6d4` (Controlled Cyan — telemetry, status indicators, secondary actions)
- `--b4-green`: `#10b981` (Online presence, victory, success states)
- `--b4-gold`: `#f59e0b` (Champion ranks, prize pool counters, rating stars)
- `--b4-rose`: `#f43f5e` (Live broadcast alerts, critical warp boosts)

### Borders & Glass
- `--b4-border`: `rgba(255, 255, 255, 0.09)` (Structural dark surface separator)
- `--b4-border-glow`: `rgba(139, 92, 246, 0.4)` (Active card and modal focal highlight)

---

## Typography Hierarchy
- **Brand Title:** Space Grotesk / Inter Black (900 weight, uppercase, tracking +0.5px)
- **Section Headers:** 26px - 38px, font-weight 900, tracking -0.5px
- **Telemetry & Badges:** Monospace, 10px - 11px, font-weight 800, tracking 1px - 1.5px
- **Body & Prose:** 14px - 15px, color `#94a3b8`, line-height 1.6

---

## Reusable Components
1. `.b4-shell`: Persistent flex wrapper housing desktop sidebar, topbar HUD, and main scroll body.
2. `.b4-sidebar`: Permanent left rail with categorized groups and user level indicator.
3. `.b4-topbar`: Sticky frosted command bar with quick search, token vault, and notifications.
4. `.b4-mobile-dock`: Fixed bottom bar with 5 ergonomic thumb navigation targets.
5. `.b4-game-card`: Interactive tactical card with full-bleed vector artwork thumbnail, genre badge, rating, and launch action.
6. `.b4-hero-banner`: Cinematic full-bleed billboard with radial spotlight gradients and call-to-action clusters.
