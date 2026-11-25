# BARMO GAMING UNIVERSE — PRODUCT VISION & ARCHITECTURAL FOUNDATION

> **Tagline**: *"PLAY BEYOND LIMITS."*  
> **Brand Identity**: AAA Spatial Gaming Platform, Metaverse & Competitive Esports Ecosystem.  
> **Target Experience**: Seamless fusion of Steam, Roblox, Epic Games, and Discord wrapped in an original cyberpunk/space-odyssey anti-gravity 3D operating system.

---

## 1. Executive Summary & Strategic Pillars

BARMO transforms from a 3D social lounge into a premier **multiplayer gaming universe**. It operates across three tightly integrated layers:

1. **The Gaming Web OS (UI/UX)**:
   - Floating spatial dock & collapsible sidebar with persistent Gamer HUD.
   - Live Player Level, XP Bar, Token Balance, Global Search, and Squad Status.
   - Game Discovery Portal with category filtering, ratings, active player counts, and instant launch.

2. **The 3D Metaverse (WebGL / Three.js)**:
   - Seven signature gaming worlds (*Cyber Arena, Neon City, Space Station, Fantasy Kingdom, Gravity Lab, Racing Universe, Social Gaming Hub*).
   - High-fidelity physical materials, volumetric lighting, anti-gravity particle motes, dynamic camera parallax, and real-time multiplayer presence.

3. **Competitive & Social Multiplayer Ecosystem (LiveKit & Supabase Realtime)**:
   - Modular game instances with instant matchmaking, private lobbies, and spectator mode.
   - Competitive tournament brackets, daily bounties, and global/seasonal leaderboards.
   - Real-time squad audio/video communications, text channels, and AI Gaming Companion (*Nova*).

---

## 2. Visual Identity & Brand System

- **Background Colors**: Deep Space Black (`#030712`), Void Graphite (`#0b0f19`), Midnight Obsidian (`#0f172a`).
- **Brand Accents**: Electric Violet (`#8b5cf6`), Hyper Neon Cyan (`#06b6d4`), Supercharged Amber (`#f59e0b`), Laser Emerald (`#10b981`).
- **Surface Materials**: Apple Vision-inspired ultra-thin glassmorphism (`backdrop-filter: blur(24px)`), frosted obsidian borders (`rgba(255, 255, 255, 0.08)`), and reactive neon glow states.
- **Typography**:
  - Display/HUD: `Space Grotesk` (futuristic, structural, monospace-inspired).
  - Body/Interaction: `Instrument Sans` (ergonomic, high-legibility at 60fps).
  - Accents: `Fraunces` for prestige medals, trophies, and tournament headings.

---

## 3. Technology Stack & Architecture

- **Frontend Core**: Next.js 15 (App Router, Turbopack/Webpack fallback, SWC WASM mode), React 19.
- **3D Graphics Engine**: Three.js r174, custom WebGL shader passes, instanced meshes, LOD geometry management, 3-tier adaptive graphics (`performance`, `balanced`, `ultra`).
- **Multiplayer State**: Supabase Realtime Channels (10Hz position broadcast, ephemeral room sync, presence clustering).
- **Voice / Video Communications**: LiveKit 2.x WebRTC SFU engine.
- **Persistent Data**: Supabase PostgreSQL (Profiles, Wallets, Inventories, Achievements, Tournaments, Matches).
- **Sound & Audio**: Pure WebAudio generative procedural synthesizer with zero network payload.
