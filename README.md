# BARMO Lounge V2 — 3D lounge + community

Open the site, pick a name and avatar, walk around a shared 3D lounge, and meet people live.
No sign-up. Real-time uses Supabase Realtime only (no database tables).

## What is new in V2: a cleaner, easier interface

- **One layout system.** Before, every feature placed its own floating card, so they overlapped at the top of the screen. Now there is a top area (`.hudtop`) that stacks everything in order, with no overlaps: private-circle bar, then "big screen / pinned / hands" on the left and "now playing" on the right, then the stage panels (trivia, cinema, AI lab, video meeting). Hints, captions, notifications and the Talk button share one bottom area (`.hudbottom`) above the dock.
- **Actions in four tabs** instead of one long list: Talk, Play, Media, Me.
- **Simpler chat.** One "⋯" menu per message (reply, react, translate, suggest replies, pin) and one "＋" tray for emoji, quick replies and dictation, instead of a row of tiny buttons.
- **Welcome guide** for first-time visitors (reopen from Menu, "Welcome guide").
- **Touch friendly.** Bigger buttons on phones and 16px inputs (no zoom on iPhone).
- Code: layout is in `components/WorldView.tsx` (return block) and the "V2" section of `app/globals.css`.

## What is new in V1.3: Trivia night

- **Trivia night in every world.** Actions, then pick a category (Mixed, AI and tech, Space, World, Music and fun) and press *Start 5 questions*, or *AI questions* for fresh questions written by Nova (needs the AI key; falls back to the built-in 40-question bank). Everyone in that world sees the same question at the same moment, answers in 15 seconds (faster = up to 150 points), sees the reveal and a live leaderboard, and the winner is announced. Anyone can end it; people who join mid-game catch up automatically.
- Two new achievements (Quiz night, Quiz champ). Questions from the network and from the AI are strictly validated before use. Code: `lib/world/quiz.ts`, `components/QuizPanel.tsx`.
- Scoring is computed on each player's own device from the answers everyone broadcasts, so it is for fun, not for prizes.

## What is new in V1.2: communication

- **Live captions.** Actions, then *Share my live captions*: your speech becomes text that everyone in the world sees as subtitles. Off by default; uses the browser's speech service (Chrome/Edge). *Transcript* downloads everything captioned, and *AI meeting notes* asks Nova to summarize it into key points and action items.
- **Raise hand.** Everyone sees who has a hand up (also floats above the avatar).
- **Pinned message.** Pin any chat message to the whole room (shown top-left, late joiners see it too).
- **Faster replying.** Voice dictation in the chat box, one-tap quick replies, and AI reply suggestions on any message.
- **Accessibility.** Read new messages aloud, live captions, and everything keyboard-usable.
- Code: `lib/world/speech.ts`, chat extras in `components/WorldView.tsx`, `/api/nova` task `reply`.

## What is new in V1.1

- **New:** achievements (11 goals, +10 tokens each, shown on Profile; `lib/world/achievements.ts`), photo mode (Actions, Take a photo), 10 code lab challenges with a daily one, a cheaper-to-run world.
- **Speed and mobile:** weak devices start on Low graphics, phones draw fewer pixels, and the world switches itself to Low if it stays under about 26 fps for 8 seconds.
- **Safety:** Report on a player's card (`/api/report`: logged on the server, and sent to `REPORT_WEBHOOK_URL` if you set a Discord or Slack webhook), plus automatic muting of spammers.
- **Polish:** cleanups found in an audit of V1.

## What is in V1 (everything, in one release)

- **Big screens that work in every world.** Open Actions, paste a YouTube, Vimeo or direct .mp4/.webm link, press Play: the video plays **on the 3D screen** for everyone in that world, whether they are sitting or standing. A video bar gives each viewer Controls (pause/volume), Hide and Stop. Lounge, Meeting Hall, Party Hall (west wall cinema), AI Lab and Cosmos all have a screen. Code: `lib/world/videoWall.ts`.
- **AI Lab code lab.** Sit at a workstation, open the *Code lab* tab: six JavaScript challenges (hello, sum, FizzBuzz, sigmoid, one neuron, teach a perceptron the AND gate) that really run, with tests, hints and *Ask Nova to review my code*. Code runs in a sandboxed Web Worker with the network switched off and a 3 second limit. Solving a challenge announces it in chat. Code: `lib/world/codeLab.ts`.
- **Cosmos specials.** Astronauts (Cmdr. Vega, Astro Kit) float in zero gravity and chat in character. A comet crosses the sky every 50 seconds at the same moment for everyone; Actions shows a countdown and lets you make a wish.
- **AI crew, Nova assistant, smarter chat, drinks, cinema seats, AI class, music-linked rooms, video meetings, realistic avatars and shadows** from the earlier builds (see the sections below).
- Login is off (`AUTH_ENABLED` in `lib/config.ts`); everything is saved on the device.

## Build history

### V1.2: smarter chat and AI

- **Talk to the crew with real AI.** Open any NPC (Marco, Lena, Dr. Nova, Ravi, the dancers) and type to them. They answer in character. The personas live on the server (`lib/world/novaKnowledge.ts`), so the browser only sends an id. Without an AI key they still answer from built-in lines.
- **Nova assistant chat.** The Nova panel is now a conversation that remembers what you said (saved on your device), knows how the whole app works, and offers suggestions that match the world you are in. Share any answer to the room with one tap. Clear it with the bin button.
- **Smarter world chat.** Reply to a message (↩), react with emoji (☺), translate a message (🌐), see who is typing, @mention people (highlighted, and shown in the ticker), emoji picker, and save the chat as a text file (⬇). Slash commands: `/nova question` (Nova answers in the room), `/me action`, `/roll`.
- **Crew greets you** with a line as you walk up to them.
- **Server.** `/api/nova` has new tasks: `chat`, `npc`, `translate`. Rate limit is 24 requests per minute per visitor. Default Anthropic model is `claude-haiku-5-5` (override with `NOVA_MODEL`). Translation needs an AI key; everything else works without one.

## V1.1: a living world

- **Realistic people.** New avatar builder (switch back in `lib/config.ts`, `AVATAR_REALISTIC`): natural body proportions, flatter torso, jointed arms and legs, hands, a shaped face (jaw, nose, lips, brow, eyelids), natural eyes, matte cloth and soft skin shading. All the same customisation options still work.
- **A crew that lives there** (`lib/world/npcs.ts`): Marco the barista (lounge coffee bar) and Lena (Party Hall juice bar) polish glasses, shake drinks and wipe the counter; four dancers who dance to the beat of whatever song is playing; Dr. Nova (AI scientist) who walks the lab and explains the hologram; Ravi at the server racks. Walk up and press **Talk**, or tap them.
- **Drinks.** Order from the menu (all zero-alcohol). You hold the drink, sip it now and then, and other players see it. It disappears after two minutes.
- **Party cinema.** Sit in the cinema seats (west side of the Party Hall), paste a YouTube, Vimeo or direct .mp4/.webm link, and everyone seated watches it. Late joiners start near the same point. Only https links to those sources are accepted. Each person controls pause/seek in their own player.
- **AI class.** Sit at a lab workstation: five lessons (what AI is, neural networks, chatbots, prompting, building an AI app), shared slides, and **Ask Nova**. Nova uses your OpenRouter/Anthropic key if set (same server setup as the existing `/api/nova` route) and otherwise answers from the class notes.
- **Live AI screens.** Lab workstations now show a model training: streaming output, a falling loss curve and neuron activations.

## V1: realism pass

- **Look:** filmic tone mapping, soft real-time shadows (the avatars and furniture now cast them), studio reflections on glossy surfaces, grain on big floors.
- **More 3D:** every world except Cosmos gets ceiling beams, night-city windows on both side walls, framed art and glowing floor lamps. Lounge, Meeting, Party and Lab all get shadows and reflections.
- **Graphics setting:** "Low" turns off shadows, reflections, tone mapping and glow, for slow phones. Code: `lib/world/realism.ts`. Version number: `lib/version.ts`.

## What's new in v20 (music-linked rooms, video meetings, login off)

- **Login is switched off.** One flag in `lib/config.ts` (`AUTH_ENABLED = false`). Everyone plays as a guest; profile, quests, friends, tokens and shop items are saved on the device. Nothing was deleted: set it to `true` later and the whole sign-in / Google / cloud-backup system is back exactly as in v19. (Supabase keys are still needed for live multiplayer; that is not a login.)
- **Songs change the room.** 8 songs now (4 new: *Sunset Drive*, *Lo-fi Rain*, *Techno Pulse*, *Fiesta*). Every song has a scene (`lib/world/scenes.ts`): its own colours, background tint, dance-floor pattern, laser count and how hard it punches. A beat clock follows the real audio, so the glow, camera and lights hit on the kick. Party Hall gets a live club screen with the song name and equaliser, sweeping lasers and a palette-coloured floor. Every world gets beat ripples, and people groove when music plays. A "Now playing" chip shows the song and mood.
- **Smoother 3D.** The camera swoops in when you arrive and eases closer when you sit. Slight zoom and glow pulse on the beat. Zoom-and-fade when you travel between worlds. "Reduce motion" in the device settings turns off pulses, lasers, ripples and the swoop.
- **Video meetings (Meeting Hall).** Sit at the table and a Meet-style panel offers *Join with camera* / *Audio only*: tiles with names, speaking highlight, mic, camera, screen share (desktop), click a tile to enlarge, shrink button, leave. Standing up leaves the call. Blocked people are hidden and muted people are silenced. The Meeting Hall console no longer offers music, confetti or dance party (it is now "Lights" and "Announce").
- **Needs LiveKit for video.** Same three variables as the v19 circle voice: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (free at cloud.livekit.io), then redeploy. The same `/api/livekit/token` route now also issues meeting tickets (`meet: true`, Meeting Hall only, camera and screen share allowed). Without them the panel explains what to add; everything else keeps working.

## What's new in v7
- **Lumen Orb** (centre of the lounge, tap it or walk up and press "Use the Orb"): music for the whole room (4 generated tracks with a live equaliser), 4 light themes, confetti / fireworks / bubbles, a dance party for everyone, a shout board above the orb, and "Find a friend" teleport. Late joiners are brought in sync. Everyone can turn room music off for themselves.
- **Avatar studio** (Profile): live 3D preview with hairstyles, expressions, hoodies / jackets / suits, colours, height and build, accessories (visor, antenna and more) and back items (wings, cape, jetpack, backpack). Avatars now blink and wings, capes and flames animate.
- **Design refresh**: glass panels, gradients, smoother buttons, tabs and chat bubbles; the XP bar now shows.
- Avatars are merged into a few draw calls, so more people can share the lounge smoothly on phones.

## What's new in v15 (everyone sees your gear)
- **Auras are now visible to other players** (Attention Halo, Token Stream, Latent Space), and your **shop pet follows you around the lounge**, and other players' pets follow them. Gear travels with the live presence data and is checked against the item catalog on arrival, so unknown or mismatched items are ignored.
- Performance: auras more than ~16 units away are hidden and not animated, so rooms with many people stay smooth on phones.
- Still personal: the rooftop hoverboard skin and the rooftop's roaming pet (others do not see you ride). Gear is cosmetic and not verified against purchases, so someone with a modified browser could show an item they did not buy; it grants nothing.

## What's new in v14 (tokens, shop and leaderboard - built for tech / AI people)
- **Tokens (⬡)**: earned by finishing quests (each quest pays once, tokens = its XP) and a **+10 daily login**. A toast shows what you earned. Balances live on the server and can only change through database functions, so they cannot be edited from the browser.
- **Shop** (new nav item): 9 items with a terminal look. Hoverboards: *Terminal*, *Gradient Descent*, *Tensor Core*. Pets: *Byte* (robo-pup), *Glitch*, *Neuron* (floating hologram). Auras: *Attention Halo* (nodes linked by pulsing lines), *Token Stream*, *Latent Space*. Buy once, equip or remove any time; gear appears on your avatar, pet and hoverboard when you enter the lounge.
- **Leaderboard**: top 20 by lifetime tokens, showing display name and avatar only. Opt-out toggle on the Shop page.
- **Setup:** run `supabase/migrations/003_token_economy.sql` (after 001 and 002).
- Honest limits: quest completion is reported by the app, so the server can only guarantee each quest pays once (total from quests is capped at 345 tokens) plus 10 a day. Gear is visible only on your own screen for now; showing it to other players needs a small presence upgrade.

## What's new in v13 (cloud friends + private messages, step 2)
- **Friends, blocked and muted lists** are backed up with your account and come back when you sign in on a new phone or browser.
- **Private messages between two signed-in friends** are also stored in the cloud: they arrive even if the sender has gone offline, and your history follows you to other devices. Messages are only readable by the two people (row-level security) and are capped at 500 characters and 30 per minute.
- **Guests keep working exactly as before.** Guests cannot read the database, so a message to a guest uses the existing live/queued path; cloud storage is used only when both people have accounts. Each message has one id, so nothing shows twice.
- **Setup:** run `supabase/migrations/002_cloud_messages.sql` in the Supabase SQL Editor (after 001).
- Not end-to-end encrypted (the site owner can read the database). Group chat and community rooms are still live-only.

## What's new in v12 (Continue with Google + cleaner sign-in)
- **Continue with Google**: one tap, no password. A tidier account card with Sign in / Create account tabs, show-password toggle and a signed-in view with your email, a backup status pill and Sign out.
- **Turn Google on (one time, ~5 min):**
  1. Google Cloud Console -> APIs & Services -> Credentials -> Create credentials -> OAuth client ID -> Web application.
  2. Under Authorized redirect URIs add `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` (Supabase shows this exact address on its Google provider page).
  3. Copy the Client ID and Client secret into Supabase -> Authentication -> Providers -> Google -> Enable -> Save.
  4. Supabase -> Authentication -> URL Configuration: Site URL = your Vercel URL, and add `https://YOUR-SITE/profile` (and `http://localhost:3000/profile` for testing) under Redirect URLs.
  Until Google is enabled the button shows a clear message and email sign-in keeps working.

## What's new in v11 (optional accounts, step 1)
- **Sign in / create account** on the Profile page. Guests keep working exactly as before.
- Signed-in users get a private cloud backup of their **profile and quest progress**, saved automatically a couple of seconds after any change. Sign in on a new phone or browser and your lounge identity, profile and progress come back; if you progressed on two devices, progress is merged so nothing is lost.
- Security: one table, `lounge_profiles`, with row-level security so each person can only read and write their own row.
- **Setup (one time):** Supabase -> SQL Editor -> run `supabase/migrations/001_lounge_profiles.sql`. Then Authentication -> Providers: keep Email on. Authentication -> URL Configuration: set Site URL to your Vercel URL and add `https://YOUR-SITE/profile` as a redirect URL. (Switch "Confirm email" off while testing if you want instant sign-up.)
- Friends and private messages are still stored per device; syncing those is step 2.

## What's new in v10 (day/night + joystick)
- **Day / night**: the round button at the bottom-left switches the whole lounge and rooftop between a bright day sky with a sun and a night sky with a moon and stars. It starts from your local time and remembers your choice. It works with every Lumen Orb theme.
- **Joystick**: on phones and tablets an analog joystick replaces the arrow pad (smooth speed, small dead zone). Keyboard and desktop pad are unchanged.

## What's new in v9 (rooftop terrace)
- **Rooftop terrace** south of the lounge gate: wooden deck, brass rail, night skyline with lit windows, string lights, seating and planters. Walk through the gate, or use the new "Rooftop" spot in Things to do. New quest: Visit the Rooftop.
- **Pet**: a small companion wanders the deck and trots over to sit near you.
- **Hoverboard**: step on the glowing board to lift off and ride at 1.5x speed; leave the terrace and it returns to its spot.
- Pet and hoverboard are local (not synced to other players yet). Connection arcs also work on the rooftop.

## What's new in v8 (connection web)
- **Connection web**: glowing arcs with travelling light pulses link people who are near each other (gold = you, green = others) and link anyone standing near the Lumen Orb or a zone (blue). Links fade in and out smoothly, are capped at 14 for phones, and switch to still pulses when "reduce motion" is on.
- Added as one new file (`lib/world/connect.ts`) plus a few guarded lines in `world.ts`; nothing in the lounge, avatars, presence or chat was changed.

## What's new in v6
- **Fix: players now see each other in the 3D lounge.** Each browser tab gets its own lounge id (so two tabs of the same person also see each other), and the realtime connection no longer depends on the exact upper/lower-case of the status value that supabase-js reports.
- **Mini-games** (Games page): Dice Duel, Quick Quiz, Reaction Race. Create a room, share the 4-8 character code, play with friends.
- **Polish**: accessories (cap, crown, headphones, shades, halo), outfit colours, new Clap and Jump emotes, sound effects (on/off switch).
- **Safety**: Mute, Block and Report on player cards and profiles; a blocked/muted list on your profile.

## What's inside (v5)
- **3D lounge** (original) + glowing zone beacons, floating dust, avatar halos. Drag to look, tap a player for their card.
- **Responsive navigation**: left sidebar on PC, bottom tab bar on phones.
- **Community**: rooms (General, Games, Ideas, Help) with live chat and an online list.
- **Profiles**: name, avatar, status, bio, interests, shareable profile link.
- **Friend requests + notifications**: send/accept/decline, bell badge, optional browser alerts.
  Requests and messages to someone offline are queued and delivered when you are both online.
- **Direct messages** between friends.
- **Groups**: create, join by code, invite friends, group chat.
- **Trainer**: quests, XP, levels and a daily streak that teach the whole app.

## Setup
1. Create a free project at https://supabase.com. Project Settings -> API: copy the Project URL and the publishable (anon) key.
2. Copy `.env.example` to `.env.local` and paste both values.
3. `npm install` then `npm run dev` and open http://localhost:3000. Open a second window to see another visitor.

## Deploy on Vercel
Use the same two variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) under
Settings -> Environment Variables, then redeploy. No new keys are needed for v5.

## Notes
- Friends, messages and quests are stored in each visitor's browser (localStorage) and travel over Realtime.
  Clearing browser data resets them.
- Messages are live and not end-to-end encrypted. For private, permanent accounts and history, the next step is
  Supabase Auth + tables with row-level security.

## Worlds, circles and controls (v17)

- **Worlds:** The Lounge, Meeting Hall, Party Hall, AI Lab and Cosmos Deck. Each world is its own realtime room, so people only see who is in the same world. Switch from the bottom bar (🌐 Worlds) or walk into a big glowing ring.
- **Private circles:** stand inside a green circle on the floor and your chat messages go only to people standing in the same circle.
- **Connect me:** matches you with someone here who shares your interests or what you are open to.
- **Controls:** tap the floor to walk, joystick or W A S D, drag to look, tap a chair or press E to sit and stand.
- **Profile:** headline, what you are here for, communication style, languages, ask-me-about and a "what makes you unique" line. These live in the existing profile JSON, so there is nothing new to run in Supabase.

## Tech / AI upgrade (v18)

- **Glow:** a bloom pass makes neon, holograms and light strips shine. Menu → "Glow" turns it off on slow phones.
- **Scan-in:** a ring sweeps up an avatar when someone arrives. Name tags show the profile headline and glow green while that person talks.
- **Voice circles:** stand in a green circle, tap "Join voice". Direct browser-to-browser audio, up to 4 people. Uses public STUN servers; a few strict networks may not connect.
- **Reactions** (😀 React), **quick polls** (Actions → Quick poll, live tally on the room screen).
- **Nova:** icebreakers, chat summaries and idea feedback. Works with built-in templates out of the box. For real AI answers add `OPENROUTER_API_KEY` (or `ANTHROPIC_API_KEY`) in Vercel → Settings → Environment Variables, then redeploy. Keys stay on the server.

## LiveKit voice (v19)

Private-circle voice now uses LiveKit when these are set in Vercel (Settings → Environment Variables), then redeploy:
`LIVEKIT_URL` (wss://…livekit.cloud), `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
Without them the app falls back to direct browser-to-browser voice. The ticket route is `/api/livekit/token`; it only issues tickets for real circles and keeps the secret on the server.
