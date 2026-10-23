export interface Quest {
  id: string;
  title: string;
  hint: string;
  xp: number;
  group: "Basics" | "Lounge" | "Worlds" | "Social";
}

export const QUESTS: Quest[] = [
  { id: "profile", title: "Complete your profile", hint: "Add a bio and at least one interest on the Profile page.", xp: 20, group: "Basics" },
  { id: "walk", title: "Take your first steps", hint: "Walk around the lounge (W A S D, arrows, or the on-screen pad).", xp: 10, group: "Basics" },
  { id: "zone_coffee", title: "Visit the Coffee bar", hint: "Open Things to do and tap Go there.", xp: 10, group: "Lounge" },
  { id: "zone_games", title: "Visit the Game table", hint: "Walk up to the Game table.", xp: 10, group: "Lounge" },
  { id: "zone_ideas", title: "Visit the Idea wall", hint: "Head to the back wall.", xp: 10, group: "Lounge" },
  { id: "zone_chill", title: "Visit the Chill zone", hint: "Find the sofas.", xp: 10, group: "Lounge" },
  { id: "zone_orb", title: "Visit the Lumen Orb", hint: "The glowing orb in the middle of the lounge.", xp: 10, group: "Lounge" },
  { id: "orb", title: "Use the Lumen Orb", hint: "Tap the orb: play music, change the lights or fire an effect.", xp: 20, group: "Lounge" },
  { id: "zone_pod", title: "Visit the Meeting pod", hint: "The glass room in the corner.", xp: 10, group: "Lounge" },
  { id: "zone_roof", title: "Visit the Rooftop", hint: "Walk through the south gate onto the terrace.", xp: 10, group: "Lounge" },
  { id: "wave", title: "Wave hello", hint: "Tap Wave in the lounge chat panel.", xp: 10, group: "Lounge" },
  { id: "dance", title: "Show your moves", hint: "Tap Dance in the lounge chat panel.", xp: 10, group: "Lounge" },
  { id: "dice", title: "Roll the dice", hint: "Things to do → Roll the dice.", xp: 10, group: "Lounge" },
  { id: "idea", title: "Post an idea", hint: "Things to do → Post an idea to the wall.", xp: 15, group: "Lounge" },
  { id: "world_meeting", title: "Visit the Meeting Hall", hint: "Open Worlds and enter the Meeting Hall, or walk into its portal in the lounge.", xp: 15, group: "Worlds" },
  { id: "world_party", title: "Visit the Party Hall", hint: "Open Worlds and enter the Party Hall.", xp: 15, group: "Worlds" },
  { id: "world_lab", title: "Visit the AI Lab", hint: "Open Worlds and enter the AI Lab.", xp: 15, group: "Worlds" },
  { id: "world_cosmos", title: "Visit the Cosmos Deck", hint: "Open Worlds and enter the Cosmos Deck.", xp: 15, group: "Worlds" },
  { id: "huddle", title: "Join a private circle", hint: "Stand inside a glowing green circle on the floor.", xp: 15, group: "Worlds" },
  { id: "sit", title: "Take a seat", hint: "In the Meeting Hall or AI Lab, tap a chair or press Sit down.", xp: 15, group: "Worlds" },
  { id: "topic", title: "Set a meeting topic", hint: "In the Meeting Hall: Actions → Set topic.", xp: 15, group: "Worlds" },
  { id: "chat", title: "Say something in the lounge", hint: "Type a message in the lounge chat.", xp: 10, group: "Social" },
  { id: "community", title: "Post in the Community", hint: "Open Community and write in any room.", xp: 15, group: "Social" },
  { id: "request", title: "Send a friend request", hint: "Tap a player in the lounge, or use People → Online.", xp: 20, group: "Social" },
  { id: "friend", title: "Make a friend", hint: "Get a request accepted (or accept one).", xp: 30, group: "Social" },
  { id: "dm", title: "Send a direct message", hint: "People → Friends → pick someone.", xp: 15, group: "Social" },
  { id: "game", title: "Play a mini-game", hint: "Open Games, create a room and start (solo is fine).", xp: 20, group: "Social" },
  { id: "win", title: "Win a mini-game", hint: "Finish first in any game.", xp: 30, group: "Social" },
  { id: "style", title: "Style your avatar", hint: "Pick an accessory or outfit colour on the Profile page.", xp: 15, group: "Basics" },
  { id: "group", title: "Create or join a group", hint: "Groups → make one or paste a code.", xp: 25, group: "Social" },
];

export const levelOf = (xp: number) => Math.floor(xp / 100) + 1;
export const levelTitle = (lvl: number) =>
  ["Newcomer", "Regular", "Explorer", "Connector", "Host", "Legend"][Math.min(5, lvl - 1)] || "Legend";

export const EMPTY_QUESTS = { done: {}, xp: 0, visited: [], streak: 0, last: "" };
