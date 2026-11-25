# BARMO 4.0 — COMPLETE REDESIGN ROADMAP

## Roadmap Phases

### Phase 1: Codebase Audit & Architectural Foundations
- Full technical critique and gap analysis against AAA gaming client benchmarks.
- Definition of `--b4-*` design tokens, obsidian surfaces, and component hierarchy.

### Phase 2: Application Shell & Unified Navigation
- Implement permanent left rail `.b4-sidebar` with Play, Metaverse, Social, and Economy categories.
- Implement master command bar `.b4-topbar` with currency counter, search, presence beacon.
- Implement responsive console dock `.b4-mobile-dock` for mobile and handheld screens.

### Phase 3: Public Portal Transformation
- 11-section cinematic gaming portal on `/`:
  1. Hero with WebGL 3D canvas and live 3D character rig station.
  2. Featured Game Showcase (*Quantum Warp Grand Prix*).
  3. Trending Games Catalog.
  4. Live Squad Radar (active battle rooms).
  5. Season 4 Roadmap (*Quantum Resonance*).
  6. Competitive Esports Tournaments (*Apex Championship*).
  7. Elite Syndicates & Clans.
  8. Hall of Champions (Top 3 seasonal podium).
  9. Spatial Metaverse Worlds (Lounge, Meeting, Party, Cosmos, Lab).
  10. Daily Bounty Board.
  11. Native Client & PWA download.

### Phase 4: Dedicated Gaming Dashboard Control Centre
- Create `/dashboard` with:
  - Welcome banner with Player Rank, Level 18, and XP progress bar.
  - "Continue Playing" quick resume card for last active title.
  - Recently Played carousel & recommended titles.
  - Active Friends & Squads activity panel.
  - Upcoming Tournaments widget.
  - Daily Bounties and Season 4 Battle Pass tracker.

### Phase 5: Master Game Library & Launcher
- Polish `/games` with dedicated vector SVG cover art, category filtering (`All`, `Competitive`, `Arcade`, `Skill`, `Casual`), search, and detailed Game Protocol Specs modal.

### Phase 6: Multiplayer Engine & AI Bot Rivals
- Intelligent bot simulation in `useGame.ts` (`Nova [AI]`, `Viper [Bot]`, `Echo [Bot]`, `Apex [Bot]`).
- Quantum Warp Grand Prix reflex raceway with connected slipstream drafting.

### Phase 7: Horizontal Cyber Armory & Virtual Economy
- Horizontal 3D Inspect Bay with real-time stat meters and 3-slot combat loadout ribbon on `/shop`.

### Phase 8: Tournament Bracket Engine & Persistence
- Registration state persistence across sessions and interactive 8-team esports bracket view on `/tournaments`.

### Phase 9: Player Identity & Social Features
- Overhauled `/profile` with Gamer ID card, match history, unlocked achievements, and 3D equipment loadout.

### Phase 10: Production Verification & Build Packaging
- Full test pass (`npm test`, 122/122 checks).
- Full typecheck (`tsc --noEmit`, 0 errors).
- Full production build (`next build`, 24 static routes).
- Clean zip distribution package creation.
