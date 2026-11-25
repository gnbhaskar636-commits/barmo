# BARMO GAMING UNIVERSE — TECHNICAL ARCHITECTURE

## System Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                     |
|                                                                                       |
|   +------------------------------------+   +--------------------------------------+   |
|   |         Next.js 15 App Shell       |   |          Three.js 3D Engine          |   |
|   |  * Gaming OS Navigation & HUD      |   |  * 7 Immersive Anti-Gravity Worlds   |   |
|   |  * Discovery, Squads, Tournaments  |   |  * Physics, Shaders, PBR Materials  |   |
|   |  * Player Progression & Profiles   |   |  * Dual-touch Analog Touch Joystick  |   |
|   +-----------------+------------------+   +-------------------+------------------+   |
|                     |                                          |                      |
+---------------------|------------------------------------------|----------------------+
                      |                                          |
                      v                                          v
+---------------------------------------------------------------------------------------+
|                                BACKEND & REAL-TIME CLOUD                              |
|                                                                                       |
|   +------------------------------------+   +--------------------------------------+   |
|   |          Supabase Cloud            |   |             LiveKit SFU              |   |
|   |  * Auth (OAuth, Email, Magic Link) |   |  * High-fidelity Spatial Audio       |   |
|   |  * PostgreSQL (Wallets, Quests)    |   |  * Real-time Video Feeds             |   |
|   |  * Realtime Broadcast (10Hz World) |   |  * Squad Voice Channels              |   |
|   +------------------------------------+   +--------------------------------------+   |
|                                                                                       |
|   +------------------------------------+   +--------------------------------------+   |
|   |          AI Nova Gateway           |   |       Generative Audio Engine        |   |
|   |  * Claude/Gemini AI Companion      |   |  * In-browser WebAudio Synthesizer   |   |
|   |  * Game Rules, Coaching, Chat      |   |  * Zero Network Latency or Download  |   |
|   +------------------------------------+   +--------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

## Security & Data Integrity Rules
1. **Zero Client Secret Exposure**: All sensitive service tokens (Supabase Service Role, LiveKit Secret) remain strictly on Edge / Node server endpoints.
2. **Server-Validated Economy**: Token disbursements and quest completions require backend verification; client mutations are idempotent and guarded.
3. **Multiplayer Rate Limiting**: Broadcast coordinates are throttled to 10Hz with dead-reckoning interpolation to preserve bandwidth.
