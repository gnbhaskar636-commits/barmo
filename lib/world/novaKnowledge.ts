/**
 * What Nova knows about the app, and how each NPC talks. Pure text, no three.js.
 * The server uses it for AI answers; the browser uses the same data as an offline fallback,
 * so Nova and the crew always reply even when no AI key is set up.
 */
export const APP_KNOWLEDGE = `BARMO Lounge is a 3D social space where people walk around as avatars, chat, and hang out. Facts you can rely on:
- Worlds: Lounge (coffee bar with barista Marco, rooftop terrace, orb), Meeting Hall (a table you can sit at for a video meeting), Party Hall (DJ deck, dance floor, juice bar with Lena, cinema seats on the west side), AI Lab (neural-network hologram, workstations, AI class, Dr. Nova and Ravi), Cosmos (a calm space world). Switch worlds with the Worlds button.
- Moving: tap or click the floor to walk, drag to look around, tap a chair to sit, press the Talk button (or E) next to a person or the glowing orb.
- Music: use the orb or the DJ deck to pick a song. There are 8 songs and the whole room changes colours, lights, lasers and floor with the song.
- Drinks: talk to Marco or Lena and pick from the menu. All drinks are zero-alcohol. You hold it for two minutes.
- Cinema: in the Party Hall sit in the west seats, paste a YouTube, Vimeo or direct .mp4/.webm link, press play. Everyone seated watches.
- AI class: in the AI Lab sit at a workstation to open lessons and slides. Whoever turns a slide moves the class. Ask Nova questions there.
- Video meetings: in the Meeting Hall sit at the table, choose Join with camera or Audio only. Standing up leaves the call. The site owner must have set up LiveKit for video.
- Chat: the Chat button. You can reply to a message, react with emoji, use @name to mention someone, translate a message, and see who is typing. Slash commands: /nova question, /me action, /roll.
- Private circles: stand in a glowing circle on the floor for a private chat and voice.
- Profile and avatar: Menu, then Profile. Avatars are customisable. Quests give tokens, and tokens buy pets, auras and hoverboards in the Shop.
- Shared screen: every world has a big screen. Open Actions, paste a YouTube, Vimeo or direct .mp4/.webm link and press Play: the video plays right on the screen for everyone in that world, sitting or standing. Use Controls on the video bar to pause or change volume, Hide to turn it off just for you.
- Code lab: in the AI Lab sit at a workstation, open the Code lab tab, pick a challenge, write JavaScript and press Run. Tests check your answer and Nova can review your code.
- Cosmos: astronauts (Cmdr. Vega, Astro Kit) float around the deck, and a comet crosses the sky every 50 seconds. Open Actions to see the countdown and make a wish.
- Photos: Actions, then Take a photo, saves a picture of the world you are in (the video on the big screen is not included).
- Achievements: small goals unlock as you explore (first chat, a drink, a song, a video, a code challenge, a comet wish, all five worlds). Each gives 10 tokens and they show on your Profile.
- Safety: tap a person, then Mute, Block or Report. Spammers are muted automatically. Reports go to the site owner.
- Graphics: the app starts on Low graphics for weak devices and switches to Low by itself if it runs slowly.
- Sign-in is switched off for now: everything is saved on this device.
- Graphics: Menu has a Low graphics option for slow phones. Turning on Reduce motion in the device settings softens the effects.`;

const FAQ: { k: string[]; a: string }[] = [
  { k: ["world", "room", "where", "travel", "teleport"], a: "There are five worlds: Lounge, Meeting Hall, Party Hall, AI Lab and Cosmos. Open the Worlds button (🌐) at the bottom and tap one to travel." },
  { k: ["walk", "move", "control", "sit", "chair", "talk", "press"], a: "Tap or click the floor to walk, drag to look around, tap a chair to sit, and use the Talk button (or press E) next to a person or the orb." },
  { k: ["music", "song", "dj", "orb", "dance", "party"], a: "Open the orb (Lounge) or the DJ deck (Party Hall) and pick a song. There are 8, and the colours, lasers and floor of the whole room follow the song. Try Surprise me." },
  { k: ["drink", "coffee", "bar", "marco", "lena", "juice"], a: "Walk up to Marco (Lounge coffee bar) or Lena (Party Hall juice bar), press Talk, and pick a drink. Everything is zero-alcohol, and you hold the drink for two minutes." },
  { k: ["cinema", "movie", "video", "youtube", "watch"], a: "Party Hall, west side: sit in a cinema seat, paste a YouTube, Vimeo or direct .mp4/.webm link and press Play. Everyone seated in the cinema watches it." },
  { k: ["class", "lesson", "learn", "teach", "slide", "lab"], a: "Go to the AI Lab and sit at a workstation on the east side. Pick a lesson, turn the slides, and ask Nova questions. Dr. Nova can also start a class when you talk to her." },
  { k: ["meeting", "call", "camera", "screen share", "zoom", "meet"], a: "Go to the Meeting Hall and sit at the table. Choose Join with camera or Audio only. You can mute, turn the camera off, and share your screen on desktop. Standing up leaves the call. The site owner needs LiveKit set up for video." },
  { k: ["chat", "reply", "react", "mention", "translate", "typing", "message"], a: "In Chat you can reply to a message (↩), react with emoji, translate a message (🌐), and mention someone with @name. Slash commands: /nova question, /me action, /roll." },
  { k: ["screen", "share a link", "tv", "paste"], a: "Every world has a big screen. Open Actions, paste a YouTube, Vimeo or direct .mp4/.webm link and press Play. It plays right on the screen for everyone there, sitting or standing. Use Controls on the video bar for volume and pause." },
  { k: ["code", "program", "javascript", "challenge", "editor", "run"], a: "In the AI Lab sit at a workstation and open the Code lab tab. Pick a challenge, write JavaScript, press Run, and the tests tell you if it works. Ask Nova to review your code if you get stuck." },
  { k: ["comet", "astronaut", "cosmos", "space", "wish"], a: "In the Cosmos a comet crosses the sky every 50 seconds. Open Actions to see the countdown and make a wish. Cmdr. Vega and Astro Kit float around the deck and love to talk about space." },
  { k: ["private", "circle", "voice", "huddle"], a: "Stand in a glowing circle on the floor to start a private chat and voice with whoever is in it." },
  { k: ["token", "shop", "pet", "aura", "hoverboard", "quest", "buy"], a: "Quests give tokens (Menu, then Profile). Spend tokens in the Shop on pets, auras and hoverboards, then equip them. Right now tokens are saved on this device." },
  { k: ["login", "sign", "account", "password", "google"], a: "Sign-in is switched off for now, so you can just play. Your profile and progress are saved on this device." },
  { k: ["slow", "lag", "fps", "low", "graphics", "phone", "battery"], a: "Open Menu and switch to Low graphics. It turns off shadows, reflections and glow. Turning on Reduce motion in your device settings also softens the effects." },
  { k: ["avatar", "look", "character", "profile", "name"], a: "Open Menu, then Profile, to change your name and avatar: skin, hair, clothes, face and accessories." },
];

export function answerApp(q: string): string {
  const t = q.toLowerCase();
  let best: { n: number; a: string } | null = null;
  FAQ.forEach((f) => {
    const n = f.k.reduce((a, w) => a + (t.includes(w) ? 1 : 0), 0);
    if (n > 0 && (!best || n > best.n)) best = { n, a: f.a };
  });
  const b = best as { n: number; a: string } | null;
  return b ? b.a : "I can help with the worlds, music, drinks, the cinema, AI class, video meetings, chat and your profile. What would you like to do? (Add an AI key on the server and I can answer anything.)";
}

/** How each NPC speaks. Server-side only: the browser sends an id, never the persona. */
export const NPC_PERSONA: Record<string, string> = {
  marco: "You are Marco, a friendly, calm barista at the BARMO Lounge coffee bar. You love coffee and chatting. You serve only coffee, tea and non-alcoholic drinks.",
  lena: "You are Lena, an upbeat bartender at the Party Hall juice bar. You serve only zero-alcohol drinks (berry fizz, virgin mojito, juice, cola, water) and love music.",
  nova: "You are Dr. Nova, a warm, clear AI scientist who runs the AI Lab and its classes. You explain AI simply, with small examples, and are honest about what AI cannot do.",
  ravi: "You are Ravi, a laid-back lab engineer who looks after the GPU racks. You joke a little about heat and noise, and explain how training works in plain words.",
  zoe: "You are Zoe, a cheerful dancer in the Party Hall. You are playful and talk about music and dancing.",
  dev: "You are Dev, a confident, friendly dancer in the Party Hall. You like showing off moves and talk about music.",
  mia: "You are Mia, an energetic dancer in the Party Hall who loves techno and colourful lights.",
  vega: "You are Commander Vega, a seasoned, calm astronaut floating on the BARMO Cosmos deck. You love sharing accurate, surprising space facts and encouraging curiosity.",
  kit: "You are Astro Kit, a young, excitable astronaut floating on the Cosmos deck. You love telescopes, planets and comets and keep explanations simple and fun.",
  kai: "You are Kai, a smooth, polite dancer in the Party Hall who loves a good groove.",
};
export const NPC_IDS = Object.keys(NPC_PERSONA);

const NPC_LOCAL: Record<string, { k: string[]; a: string }[]> = {
  marco: [
    { k: ["coffee", "drink", "menu", "order", "tea"], a: "A flat white is my favourite. Press the drink you want on the menu and it's yours." },
    { k: ["hello", "hi", "hey"], a: "Hey, welcome in! What can I get you?" },
    { k: ["work", "job", "busy"], a: "Busy mornings, quiet evenings. I like both." },
  ],
  lena: [
    { k: ["drink", "menu", "order", "juice", "fizz"], a: "Try the berry fizz. Everything here is zero-alcohol, so you can dance all night." },
    { k: ["music", "song", "dj", "dance"], a: "The DJ deck is in the middle. Pick a song and watch the whole room change!" },
    { k: ["hello", "hi", "hey"], a: "Hey you! Thirsty?" },
  ],
  nova: [
    { k: ["neural", "network", "learn"], a: "A neural network learns by nudging its weights to make fewer mistakes, millions of times. Sit at a workstation and I'll show you the slides." },
    { k: ["ai", "intelligence"], a: "AI is software that learns patterns from examples. It is powerful, but it can be confidently wrong, so always check important answers." },
    { k: ["class", "lesson", "teach"], a: "Press 'Start an AI class' and sit at a workstation on the east side." },
  ],
  vega: [
    { k: ["comet", "wish"], a: "The comet crosses every minute or so. When it does, make a wish. Open Actions to see the countdown." },
    { k: ["space", "star", "planet", "fact"], a: "Here's one: a day on Venus is longer than its year. It spins that slowly." },
  ],
  kit: [
    { k: ["telescope", "planet", "ring"], a: "That ringed planet in the distance looks tiny, but it is enormous. Rings are made of ice and rock." },
    { k: ["float", "gravity"], a: "Floating is the best part. Everything is a little bit slower and a lot more fun." },
  ],
  ravi: [
    { k: ["gpu", "rack", "server", "train"], a: "Those racks train the models. They run hot and loud, but the loss curve keeps falling, so I'm happy." },
    { k: ["screen", "workstation", "demo"], a: "Sit at any workstation: the screens show a model training live." },
  ],
};
export function npcLocal(id: string, text: string): string {
  const t = text.toLowerCase();
  const found = (NPC_LOCAL[id] || []).find((e) => e.k.some((w) => t.includes(w)));
  if (found) return found.a;
  const generic = ["Ha, good one. Tell me more.", "Interesting. What made you think of that?", "I like talking with you. What brings you here today?", "Hmm, let me think about that for a second."];
  return generic[(t.length + id.length) % generic.length];
}
