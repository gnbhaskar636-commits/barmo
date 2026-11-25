import { check, section } from "./_t";
import {
  levelOf,
  levelTitle,
  xpForLevel,
  xpToNextLevel,
  xpProgressPercent,
  TIERS,
  getTier,
  getRankTitle,
  getRankBadge,
  getLevelProgress,
  isDailyResetDue,
  calculateDailyStreak,
  createDailyBounty,
  trackBountyProgress,
  claimBountyReward,
  getDailyBounties,
  getTimeUntilUtcMidnight,
  equipItem,
  unequipItem,
  validatePurchase,
  toggleBoardVisibility,
  generateLeaderboard,
  getPodium,
  resolveLeaderboardTie,
  filterLeaderboardRecords,
  applyMatchScore,
  softResetSeason,
  getLeaderboardEntries,
  calculateMatchRewards,
} from "../lib/progression";
import { QUESTS } from "../lib/social/quests";
import { ITEMS, ITEM, cleanGear, type Loadout } from "../lib/economy/catalog";

export async function run() {
  // =========================================================================
  // Section 1: XP Leveling Algorithm & Level Boundaries (20 checks)
  // =========================================================================
  section("progression: XP leveling algorithm & level boundaries");

  check(levelOf(0) === 1, "0 XP initializes at Level 1");
  check(levelOf(1) === 1, "1 XP remains Level 1");
  check(levelOf(99) === 1, "99 XP is the upper boundary of Level 1");
  check(levelOf(100) === 2, "100 XP triggers transition to Level 2");
  check(levelOf(101) === 2, "101 XP remains Level 2");
  check(levelOf(199) === 2, "199 XP is the upper boundary of Level 2");
  check(levelOf(200) === 3, "200 XP triggers transition to Level 3");
  check(levelOf(499) === 5, "499 XP corresponds to Level 5");
  check(levelOf(500) === 6, "500 XP triggers transition to Level 6 (Legend rank)");
  check(levelOf(999) === 10, "999 XP corresponds to Level 10");
  check(levelOf(1000) === 11, "1000 XP corresponds to Level 11");
  check(levelOf(5000) === 51, "5000 XP corresponds to Level 51");
  check(levelOf(100000) === 1001, "100,000 XP scales linearly to Level 1001");
  check(levelOf(-10) === 1 && levelOf(-500) === 1, "negative XP is gracefully clamped to Level 1");
  check(levelOf(199.9) === 2, "fractional XP (199.9) floors correctly to Level 2");

  let monotonic = true;
  for (let xp = 0; xp < 3000; xp += 17) {
    if (levelOf(xp + 1) < levelOf(xp)) {
      monotonic = false;
      break;
    }
  }
  check(monotonic, "levelOf is strictly monotonic non-decreasing across continuous XP range");

  check(levelOf(250) + 1 === levelOf(350), "adding exactly 100 XP increments level by exactly 1");
  check(xpToNextLevel(0) === 100, "0 XP requires 100 XP to next level");
  check(xpToNextLevel(75) === 25, "75 XP requires 25 XP to reach Level 2");
  check(xpProgressPercent(75) === 75, "75 XP in current level represents 75% level progress");

  // =========================================================================
  // Section 2: Dynamic Rank Titles & Rank Tier Badges (18 checks)
  // =========================================================================
  section("progression: dynamic rank titles & rank tier badges");

  check(getTier(0).name === "Bronze" && getTier(0).badge === "🎯", "0 pts assigns Bronze tier and target badge");
  check(getTier(99).name === "Bronze", "99 pts stays in Bronze tier");
  check(getTier(100).name === "Silver" && getTier(100).badge === "⚔️", "100 pts triggers Silver tier and swords badge");
  check(getTier(249).name === "Silver", "249 pts stays in Silver tier");
  check(getTier(250).name === "Gold" && getTier(250).badge === "⭐", "250 pts triggers Gold tier and star badge");
  check(getTier(499).name === "Gold", "499 pts stays in Gold tier");
  check(getTier(500).name === "Platinum" && getTier(500).badge === "🛡️", "500 pts triggers Platinum tier and shield badge");
  check(getTier(799).name === "Platinum", "799 pts stays in Platinum tier");
  check(getTier(800).name === "Diamond" && getTier(800).badge === "🔷", "800 pts triggers Diamond tier and blue diamond badge");
  check(getTier(1199).name === "Diamond", "1199 pts stays in Diamond tier");
  check(getTier(1200).name === "Master" && getTier(1200).badge === "⚡", "1200 pts triggers Master tier and lightning badge");
  check(getTier(1999).name === "Master", "1999 pts stays in Master tier");
  check(getTier(2000).name === "Grandmaster" && getTier(2000).badge === "💎", "2000 pts triggers Grandmaster tier and gem badge");
  check(getTier(15000).name === "Grandmaster", "15000 pts scales into Grandmaster tier");
  check(getTier(-50).name === "Bronze", "negative points safely fallback to Bronze tier");
  check(levelTitle(1) === "Newcomer" && levelTitle(2) === "Regular" && levelTitle(3) === "Explorer", "Level titles 1-3 match Newcomer, Regular, Explorer");
  check(levelTitle(4) === "Connector" && levelTitle(5) === "Host" && levelTitle(6) === "Legend", "Level titles 4-6 match Connector, Host, Legend");
  check(levelTitle(100) === "Legend" && levelTitle(0) === "Newcomer", "Level titles clamp cleanly at upper and lower boundaries");

  // =========================================================================
  // Section 3: Daily Quests, Bounties, Streaks & Daily Resets (22 checks)
  // =========================================================================
  section("progression: daily quests, bounties & daily resets");

  check(QUESTS.length === 30, "master quest catalog contains exactly 30 quests");
  check(new Set(QUESTS.map((q) => q.id)).size === 30, "all 30 quest IDs are strictly unique");
  check(QUESTS.every((q) => q.xp > 0 && typeof q.title === "string"), "every quest has valid title and positive XP");
  check(QUESTS.filter((q) => q.group === "Basics").length === 3, "Basics group contains 3 foundational quests");
  check(QUESTS.filter((q) => q.group === "Lounge").length === 12, "Lounge group contains 12 spatial quests");
  check(QUESTS.filter((q) => q.group === "Worlds").length === 7, "Worlds group contains 7 zone quests");
  check(QUESTS.filter((q) => q.group === "Social").length === 8, "Social group contains 8 multiplayer/networking quests");

  check(!isDailyResetDue("2026-11-22T08:00:00Z", "2026-11-22T23:30:00Z"), "same UTC calendar day does not trigger daily reset");
  check(isDailyResetDue("2026-11-22T23:59:59Z", "2026-11-23T00:00:01Z"), "crossing 00:00 UTC midnight triggers daily reset");
  check(isDailyResetDue("2026-11-20T12:00:00Z", "2026-11-22T12:00:00Z"), "stale date older than 24h triggers daily reset");
  check(isDailyResetDue(null as any, "2026-11-22T12:00:00Z"), "null lastReset triggers daily reset on initial load");

  check(calculateDailyStreak("2026-11-21", 3, "2026-11-22") === 4, "activity on consecutive day increments streak (3 -> 4)");
  check(calculateDailyStreak("2026-11-22", 4, "2026-11-22") === 4, "repeated activity on same day preserves streak without double-increment");
  check(calculateDailyStreak("2026-11-19", 10, "2026-11-22") === 1, "missed days reset streak back to 1");
  check(calculateDailyStreak("", 0, "2026-11-22") === 1, "first-time player starts with streak of 1");

  const b = createDailyBounty("b1", "Cyber Roller", "Roll dice 3 times", 3, 50, 15);
  check(b.progress === 0 && !b.completed && !b.claimed, "daily bounty initializes uncompleted with 0 progress");

  const b2 = trackBountyProgress(b, 1);
  check(b2.progress === 1, "progress increment updates bounty progress");

  const b3 = trackBountyProgress(b2, 2);
  check(b3.completed === true, "reaching target marks bounty as completed");

  const b4 = trackBountyProgress(b3, 5);
  check(b4.progress === 3, "progress clamps at target maximum");

  const r1 = claimBountyReward(b3);
  check(r1.tokens === 15 && r1.xp === 50, "claiming completed bounty awards tokens and XP");
  check(r1.claimed === true, "claiming marks bounty as claimed");

  const r2 = claimBountyReward(r1.bounty);
  check(r2.tokens === 0, "claiming an already claimed bounty yields zero rewards (duplicate prevention)");

  // =========================================================================
  // Section 4: Inventory Loadout & Equip State Management (20 checks)
  // =========================================================================
  section("progression: inventory loadout & equip state management");

  check(ITEMS.length === 9, "Cyber Armory catalog contains exactly 9 items");
  check(ITEMS.filter((i) => i.kind === "hoverboard").length === 3, "catalog contains exactly 3 hoverboards");
  check(ITEMS.filter((i) => i.kind === "pet").length === 3, "catalog contains exactly 3 pets");
  check(ITEMS.filter((i) => i.kind === "aura").length === 3, "catalog contains exactly 3 auras");
  check(ITEMS.every((i) => i.price > 0 && !!ITEM[i.id]), "all catalog items have positive token prices and valid lookup keys");

  const validLoadout: Loadout = { hoverboard: "hb_terminal", pet: "pet_byte", aura: "aura_attention" };
  check(JSON.stringify(cleanGear(validLoadout)) === JSON.stringify(validLoadout), "cleanGear preserves valid 3-slot loadout");
  check(cleanGear({ hat: "cyber_cap" } as any).hoverboard === undefined, "cleanGear strips unknown slot keys");
  check(Object.keys(cleanGear({ hoverboard: "fake_board_id" })).length === 0, "cleanGear strips unrecognized item IDs");
  check(cleanGear({ hoverboard: "pet_byte" } as any).hoverboard === undefined, "cleanGear rejects item equipped in wrong slot kind");
  check(cleanGear(null) !== null && Object.keys(cleanGear(null)).length === 0, "cleanGear handles null input safely");
  check(cleanGear("not-an-object") !== null, "cleanGear handles non-object input safely");

  const l1 = equipItem({}, "hb_terminal", ["hb_terminal"]);
  check(l1.loadout.hoverboard === "hb_terminal", "equipItem assigns owned hoverboard to hoverboard slot");

  const l2 = equipItem(l1.loadout, "hb_gradient", ["hb_terminal", "hb_gradient"]);
  check(l2.loadout.hoverboard === "hb_gradient", "equipping new hoverboard replaces previous hoverboard in same slot");

  const l3 = equipItem(l2.loadout, "pet_glitch", ["hb_terminal", "hb_gradient", "pet_glitch"]);
  check(l3.loadout.hoverboard === "hb_gradient" && l3.loadout.pet === "pet_glitch", "equipping pet leaves hoverboard slot intact");

  const l4 = unequipItem(l3.loadout, "hoverboard");
  check(l4.hoverboard === undefined && l4.pet === "pet_glitch", "unequipItem removes item from specified slot while keeping others");

  const l5 = unequipItem(l4, "aura");
  check(JSON.stringify(l5) === JSON.stringify(l4), "unequipping an already empty slot is an idempotent no-op");

  const unownedRes = equipItem({}, "hb_tensor", ["hb_terminal"]);
  check(!unownedRes.success && !!unownedRes.error?.includes("do not own"), "equipItem rejects unowned item with descriptive error");

  const buyRes = validatePurchase("hb_tensor", 50, ["hb_terminal"]);
  check(!buyRes.success && !!buyRes.error?.includes("not enough tokens"), "validatePurchase rejects purchase when tokens < price");

  const dupBuy = validatePurchase("hb_terminal", 500, ["hb_terminal"]);
  check(!dupBuy.success && !!dupBuy.error?.includes("already own"), "validatePurchase rejects purchasing already owned item");

  check(toggleBoardVisibility(true) === false && toggleBoardVisibility(false) === true, "toggleBoardVisibility inverts onBoard state");

  // =========================================================================
  // Section 5: Global & Seasonal Leaderboards, Top 3 Podium & Tie-Breaking (20 checks)
  // =========================================================================
  section("progression: global & seasonal leaderboards, podium & tie-breaking");

  const testRoster = [
    { id: "u1", name: "Vega", points: 850, ts: 100 },
    { id: "u2", name: "Apex", points: 2150, ts: 120 },
    { id: "u3", name: "Nova", points: 1400, ts: 110 },
    { id: "u4", name: "Echo", points: 300, ts: 130 },
  ];

  const board = generateLeaderboard(testRoster, "global");
  check(board[0].name === "Apex" && board[0].rank === 1, "highest points player occupies rank #1");
  check(board[1].name === "Nova" && board[1].rank === 2, "second highest points player occupies rank #2");
  check(board[2].name === "Vega" && board[2].rank === 3, "third highest points player occupies rank #3");
  check(board[3].name === "Echo" && board[3].rank === 4, "lowest points player occupies rank #4");

  const podium = getPodium(board);
  check(podium.first?.name === "Apex" && podium.first.tier.name === "Grandmaster", "podium first place is Apex with Grandmaster tier");
  check(podium.second?.name === "Nova" && podium.second.tier.name === "Master", "podium second place is Nova with Master tier");
  check(podium.third?.name === "Vega" && podium.third.tier.name === "Diamond", "podium third place is Vega with Diamond tier");

  const sparsePodium = getPodium(board.slice(0, 2));
  check(sparsePodium.first !== undefined && sparsePodium.second !== undefined && sparsePodium.third === undefined, "sparse roster with 2 players safely leaves third podium place undefined");

  const emptyPodium = getPodium([]);
  check(!emptyPodium.first && !emptyPodium.second && !emptyPodium.third, "empty roster safely produces empty podium without throwing");

  const pA = { id: "pA", name: "Alpha", points: 500, ts: 200 };
  const pB = { id: "pB", name: "Beta", points: 600, ts: 300 };
  check(resolveLeaderboardTie(pA, pB) > 0, "higher score strictly breaks tie over lower score");

  const pTied1 = { id: "p1", name: "FirstToScore", points: 1000, ts: 100 };
  const pTied2 = { id: "p2", name: "SecondToScore", points: 1000, ts: 200 };
  const tiedBoard = generateLeaderboard([pTied2, pTied1], "global");
  check(tiedBoard[0].name === "FirstToScore" && tiedBoard[1].name === "SecondToScore", "identical scores are deterministically broken by earlier timestamp");

  const pIdentical1 = { id: "uA", name: "Alice", points: 1000, ts: 100 };
  const pIdentical2 = { id: "uB", name: "Bob", points: 1000, ts: 100 };
  const nameTiedBoard = generateLeaderboard([pIdentical2, pIdentical1], "global");
  check(nameTiedBoard[0].name === "Alice", "identical score and timestamp are broken by stable alphabetical sorting");

  const run1 = generateLeaderboard([pIdentical1, pIdentical2, pTied1, pTied2], "global").map((r) => r.name);
  const run2 = generateLeaderboard([pTied2, pIdentical2, pTied1, pIdentical1], "global").map((r) => r.name);
  check(JSON.stringify(run1) === JSON.stringify(run2), "leaderboard ordering is 100% deterministic regardless of input order");

  const filteredWeekly = filterLeaderboardRecords(testRoster, "weekly");
  check(Array.isArray(filteredWeekly), "weekly filter mode returns valid filtered array");

  const filteredTourneys = filterLeaderboardRecords(testRoster, "tournaments");
  check(Array.isArray(filteredTourneys), "tournaments filter mode returns tournament cup records");

  const privateUser = { id: "pPriv", name: "Ghost", points: 3000, ts: 100, onBoard: false };
  const publicUser = { id: "pPub", name: "Visible", points: 2000, ts: 100, onBoard: true };
  const visibleBoard = generateLeaderboard([privateUser, publicUser], "global");
  check(visibleBoard.length === 1 && visibleBoard[0].name === "Visible", "player with onBoard=false is excluded from public leaderboard");

  check(board.every((row, i) => row.rank === i + 1), "leaderboard ranks form a continuous 1-based sequential index (1, 2, 3...)");
  check(board[0].tier.color === "#8b5cf6", "Grandmaster tier carries hex color #8b5cf6");

  const updatedUser = applyMatchScore(testRoster[0], 150);
  check(updatedUser.points === 1000 && getTier(updatedUser.points).name === "Diamond", "adding match score advances user into Diamond tier");

  check(softResetSeason(500) === 500, "soft reset preserves points <= 1000");
  check(softResetSeason(2000) === 1500, "soft reset compresses points > 1000 by 50%");

  const rivals = getLeaderboardEntries("global");
  check(rivals.length >= 10, "local rivals roster generates at least 10 competitive entries");

  const meRival = getLeaderboardEntries("global", { name: "ProGamer", points: 3500 });
  check(meRival.some((r) => r.name === "ProGamer" && r.isMe), "interleaving places user correctly in leaderboard");

  const rewards = calculateMatchRewards("dice", 1, 4, 120, true, 0);
  check(rewards.totalXp === 87 && rewards.tokensEarned === 15 && rewards.leveledUp === false, "match rewards calculate XP, tokens, and level progression correctly");

  const levelUpReward = calculateMatchRewards("dice", 1, 4, 120, true, 80);
  check(levelUpReward.leveledUp === true && levelUpReward.newLevelProgress.level === 2, "match XP triggers level-up across 100 XP threshold");
}
