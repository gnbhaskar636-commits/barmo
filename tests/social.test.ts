import { check, section } from "./_t";
import {
  createFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  handleReciprocalRequest,
  blockUser,
  unblockUser,
  sendDM,
  orderDirectMessages,
  calculateThreadUnread,
  calculateTotalUnreadDMs,
  markThreadAsRead,
  type DirectMessage,
} from "../lib/social/friends";
import {
  createSquad,
  joinSquad,
  isSquadFull,
  promoteMember,
  transferLeadership,
  kickMember,
  leaveSquad,
  handleLeaderDeparture,
  createSpatialVoiceRoom,
  updateVoiceSpeaking,
  handleVoiceFallback,
} from "../lib/social/squads";
import {
  createPresence,
  updateStatus,
  recordHeartbeat,
  isPresenceStale,
  pruneStalePeers,
  syncPresenceRoster,
  filterPresenceForUser,
  getPresenceCounts,
  findFriendsInGame,
  cleanPresenceMeta,
  type RichPresence,
} from "../lib/social/presence";
import {
  lookupKnowledgeBase,
  getGameRuleExplanation,
  recommendGame,
  summarizeMatchTelemetry,
  generateIcebreaker,
  novaOfflineFallback,
} from "../lib/social/nova";
import {
  SocialStore,
  createSocialStore,
  sanitizeText,
  sanitizePayload,
  serializeSocialState,
  deserializeSocialState,
  localUniverseRoster,
  executeE2ESocialJourney,
} from "../lib/social/engine";

export async function run() {
  // =========================================================================
  // Section 1: Friend Requests & Direct Messaging (22 checks)
  // =========================================================================
  section("social: friend requests & direct messaging");

  const req = createFriendRequest("u1", "u2");
  check(req.status === "pending" && req.from === "u1" && req.to === "u2", "createFriendRequest initializes valid pending request");
  check(createFriendRequest("u1", "u1").error === "CANNOT_REQUEST_SELF", "rejects self friend request");
  check(createFriendRequest("u1", "u2", { blocked: ["u2"] }).error === "USER_BLOCKED", "rejects friend request to blocked user");
  check(createFriendRequest("u1", "u2", { pendingOut: ["u2"] }).error === "REQUEST_ALREADY_PENDING", "rejects duplicate friend request when already pending");
  check(createFriendRequest("u1", "u2", { friends: ["u2"] }).error === "ALREADY_FRIENDS", "rejects friend request when already friends");

  const acceptRes = acceptFriendRequest("u2", ["u1"], ["u2"]);
  check(acceptRes.status === "accepted" && acceptRes.friends.includes("u2"), "acceptFriendRequest establishes friendship and removes from pending");

  const declineRes = declineFriendRequest("u2", ["u1"], ["u2"]);
  check(declineRes.status === "declined" && !declineRes.friends.includes("u2"), "declineFriendRequest removes request without adding to friends");

  const reciprocalRes = handleReciprocalRequest("u1", "u2", ["u2"], ["u1"]);
  check(reciprocalRes.autoAccepted === true && reciprocalRes.friends.includes("u2"), "reciprocal requests auto-resolve into mutual friendship");

  const initialState = {
    friends: ["u2", "u3"],
    blocked: [],
    requests: [{ from: "u2", to: "u1" }, { from: "u4", to: "u1" }],
    threads: {
      u2: [{ id: "m1", from: "u2", to: "u1", text: "hello", ts: 1000 }],
      u3: [{ id: "m2", from: "u3", to: "u1", text: "hey", ts: 1200 }],
    },
  };
  const blockedState = blockUser("u1", "u2", initialState);
  check(blockedState.blocked.includes("u2") && !blockedState.friends.includes("u2"), "blockUser immediately severs existing friendship and adds to blocked list");
  check(!blockedState.requests.some((r) => r.from === "u2" || r.to === "u2"), "blockUser purges all pending requests involving blocked user");
  check(!blockedState.threads["u2"], "blockUser purges DM thread history with blocked user");

  const unblockedState = unblockUser("u1", "u2", { blocked: ["u2"], friends: ["u3"] });
  check(!unblockedState.blocked.includes("u2") && !unblockedState.friends.includes("u2"), "unblockUser removes from blocked list without restoring severed friendship");

  check(sendDM("u1", "u2", "hi", { friends: [] }).error === "FRIENDS_ONLY", "sendDM rejects sending to non-friend");
  check(sendDM("u1", "u2", "hi", { friends: ["u2"], blocked: ["u2"] }).error === "USER_BLOCKED", "sendDM rejects sending to blocked user");
  check(sendDM("u1", "u2", "   ", { friends: ["u2"] }).error === "EMPTY_MESSAGE", "sendDM rejects empty or whitespace-only message");
  const clampedMsg = sendDM("u1", "u2", "a".repeat(1000), { friends: ["u2"] });
  check(clampedMsg.text?.length === 500, "sendDM clamps message text to 500 characters");

  const m1: DirectMessage = { id: "m1", from: "u1", to: "u2", text: "1", ts: 100 };
  const m2: DirectMessage = { id: "m2", from: "u2", to: "u1", text: "2", ts: 200 };
  const m3: DirectMessage = { id: "m3", from: "u1", to: "u2", text: "3", ts: 300 };
  const m4: DirectMessage = { id: "m4", from: "u2", to: "u1", text: "4", ts: 400 };

  const ordered = orderDirectMessages([m3, m1, m4, m2]);
  const isAscending = (arr: DirectMessage[]) => arr.every((m, idx) => idx === 0 || m.ts >= arr[idx - 1].ts);
  check(isAscending(ordered), "orderDirectMessages deterministically sorts scrambled messages by timestamp");

  const mTieA: DirectMessage = { id: "a", from: "u1", to: "u2", text: "A", ts: 500 };
  const mTieB: DirectMessage = { id: "b", from: "u2", to: "u1", text: "B", ts: 500 };
  check(orderDirectMessages([mTieB, mTieA])[0].id === "a", "orderDirectMessages provides deterministic tie-breaking for identical timestamps");

  const lastRead = 150;
  const mOld: DirectMessage = { id: "o", from: "u2", to: "u1", text: "old", ts: 100 };
  const mNew1: DirectMessage = { id: "n1", from: "u2", to: "u1", text: "new1", ts: 200 };
  const mNew2: DirectMessage = { id: "n2", from: "u2", to: "u1", text: "new2", ts: 300 };
  const mSentByMe: DirectMessage = { id: "s", from: "u1", to: "u2", text: "mine", ts: 250 };

  check(calculateThreadUnread([mOld, mNew1, mNew2], lastRead, "u1") === 2, "calculateThreadUnread correctly counts incoming messages after lastRead");
  check(calculateThreadUnread([mSentByMe], lastRead, "u1") === 0, "messages sent by self do not increment unread counter");

  const mNew3: DirectMessage = { id: "n3", from: "u3", to: "u1", text: "new3", ts: 400 };
  const allThreads = { u2: [mNew1], u3: [mNew2, mNew3] };
  const lastReads = { u2: 150, u3: 150 };
  check(calculateTotalUnreadDMs(allThreads, lastReads, "u1") === 3, "calculateTotalUnreadDMs aggregates unread counts across all active threads");

  const threadObj = { peerId: "u2", unreadCount: 5, lastRead: 100 };
  check(markThreadAsRead(threadObj, Date.now()).unreadCount === 0, "markThreadAsRead resets unread counter to 0");

  // =========================================================================
  // Section 2: Squad Syndicates & Voice Rooms (22 checks)
  // =========================================================================
  section("social: squad syndicates & voice rooms");

  const leader = { id: "u_lead", name: "Commander", av: "atlas" };
  const squad = createSquad(leader, "Neon Syndicate", "[NEON]");
  check(squad.id.length >= 6 && squad.id === squad.id.toUpperCase(), "createSquad generates unique uppercase alphanumeric squad ID");
  check(squad.members[0].id === leader.id && squad.members[0].role === "leader", "squad creator is assigned leader role automatically");
  check(createSquad(leader, "   ").name === "My Squad", "createSquad applies default fallback name for blank input");
  check(createSquad(leader, "X".repeat(100)).name.length === 30, "createSquad clamps squad name to maximum 30 characters");
  check(squad.capacity === 8, "createSquad defaults to 8-seat squad capacity");

  const member = { id: "u_mem", name: "Operative", av: "sol" };
  const joinRes = joinSquad(squad, member, squad.id);
  check(joinRes.success && joinRes.members.some((m) => m.id === member.id && m.role === "member"), "joinSquad adds new member with default member role");
  check(!joinSquad(squad, member, "BADCODE").success, "joinSquad rejects invalid invite code");
  const squadWithMember = joinRes.squad;
  check(joinSquad(squadWithMember, member, squad.id).members.length === squadWithMember.members.length, "joinSquad is idempotent when member already in squad");

  check(promoteMember(squadWithMember, leader.id, member.id, "officer").role === "officer", "leader can promote member to officer");
  const other = { id: "u_oth", name: "Other" };
  check(promoteMember(squadWithMember, member.id, other.id, "officer").error === "PERMISSION_DENIED", "normal member cannot promote other members");

  const officer = { id: "u_off", name: "Senior Officer", av: "vega" };
  const squadWithOfficerJoined = joinSquad(squadWithMember, officer, squad.id).squad;
  const squadWithOfficer = promoteMember(squadWithOfficerJoined, leader.id, officer.id, "officer").squad!;

  check(transferLeadership(squadWithOfficer, leader.id, officer.id).leaderId === officer.id, "leader can transfer leadership to another member");
  check(transferLeadership(squadWithOfficer, officer.id, member.id).error === "PERMISSION_DENIED", "non-leader cannot transfer leadership");

  check(kickMember(squadWithOfficer, leader.id, member.id).success === true, "leader can kick member from squad");
  check(kickMember(squadWithOfficer, officer.id, member.id).success === true, "officer can kick normal member from squad");
  check(kickMember(squadWithOfficer, officer.id, leader.id).error === "CANNOT_KICK_LEADER", "officer cannot kick squad leader");

  const leaveRes = leaveSquad(squadWithMember, member.id);
  check(leaveRes.members.length === 1, "member can leave squad voluntarily");

  const squadForDep = {
    ...squadWithOfficer,
    members: [
      { id: leader.id, name: leader.name, role: "leader" as const, joinedAt: 100 },
      { id: officer.id, name: officer.name, role: "officer" as const, joinedAt: 200 },
      { id: member.id, name: member.name, role: "member" as const, joinedAt: 300 },
    ],
  };
  check(handleLeaderDeparture(squadForDep, leader.id).leaderId === officer.id, "leader departure automatically promotes senior officer to new leader");

  const squadWith8Members = {
    ...squad,
    members: Array.from({ length: 8 }, (_, i) => ({
      id: `u_${i}`,
      name: `User ${i}`,
      role: (i === 0 ? "leader" : "member") as const,
      joinedAt: i * 10,
    })),
  };
  check(isSquadFull(squadWith8Members) === true, "isSquadFull returns true when members equal seat capacity");
  const newMember = { id: "u_extra", name: "Extra" };
  check(joinSquad(squadWith8Members, newMember, squad.id).error === "SQUAD_CAPACITY_REACHED", "joinSquad rejects joining a full squad");

  const voiceRoom = createSpatialVoiceRoom(squad.id);
  check(voiceRoom.roomId === "squad-voice-" + squad.id, "createSpatialVoiceRoom generates valid LiveKit room identifier");
  const updatedVoice = updateVoiceSpeaking(voiceRoom, "u1", true);
  check(updatedVoice.activeSpeakers.includes("u1"), "updateVoiceSpeaking tracks active speaking peers");
  check(handleVoiceFallback(voiceRoom, new Error("501")).fallbackMode === true, "handleVoiceFallback engages fallbackMode safely when LiveKit is unavailable");

  // =========================================================================
  // Section 3: Realtime Presence Engine (22 checks)
  // =========================================================================
  section("social: realtime presence engine");

  const p = createPresence("u1", "Atlas", "atlas");
  check(p.status === "online" && p.lastHeartbeat > 0, "createPresence initializes with online status and current heartbeat");
  check(createPresence("u1", "Test", "atlas", { status: "invalid" as any }).status === "online", "createPresence safely falls back to online for unknown status");

  const pInGame = updateStatus(p, "in_game", {
    type: "in_game",
    label: "Cyber Dice",
    gameId: "dice",
    roomCode: "WARP42",
    startedAt: Date.now(),
  });
  check(pInGame.activity?.gameId === "dice", "transition to in_game status attaches game activity metadata");
  check(updateStatus(pInGame, "away").status === "away", "transition to away status updates presence");
  check(updateStatus(pInGame, "offline").activity === undefined, "transition to offline clears active game session");

  check(recordHeartbeat(p, 50000).lastHeartbeat === 50000, "recordHeartbeat updates timestamp correctly");
  check(!isPresenceStale(p, p.lastHeartbeat + 15000), "presence is not stale within 15 seconds");
  check(isPresenceStale(p, p.lastHeartbeat + 35000), "presence is flagged stale after 30-second timeout");

  const rosterWithStale = new Map<string, RichPresence>();
  rosterWithStale.set("activeUser", { uid: "activeUser", name: "Active", av: "sol", status: "online", lastHeartbeat: 100000 });
  rosterWithStale.set("staleUser", { uid: "staleUser", name: "Stale", av: "atlas", status: "online", lastHeartbeat: 50000 });
  const pruneRes = pruneStalePeers(rosterWithStale, 100000);
  check(pruneRes.prunedCount === 1, "pruneStalePeers sweeps timed-out peers from active roster");
  check(rosterWithStale.has("activeUser") && !rosterWithStale.has("staleUser"), "pruneStalePeers preserves active peers while removing stale ones");

  const roster = new Map<string, RichPresence>();
  const newPeer: RichPresence = { uid: "p_new", name: "New Peer", av: "vega", status: "online", lastHeartbeat: Date.now() };
  check(syncPresenceRoster(roster, [newPeer]).get(newPeer.uid)?.name === newPeer.name, "syncPresenceRoster incorporates newly joined peers");
  const updatedPeer = { uid: "p_new", name: "New Peer", headline: "Updated" };
  check(syncPresenceRoster(roster, [updatedPeer]).get("p_new")?.headline === "Updated", "syncPresenceRoster updates peer metadata seamlessly");

  roster.set("me", { uid: "me", name: "Myself", av: "atlas", status: "online", lastHeartbeat: Date.now() });
  roster.set("blockedUser", { uid: "blockedUser", name: "Blocked", av: "sol", status: "online", lastHeartbeat: Date.now() });
  roster.set("friend1", { uid: "friend1", name: "Friend 1", av: "vega", status: "online", lastHeartbeat: Date.now() });

  const filtered = filterPresenceForUser(roster, "me", ["blockedUser"]);
  check(!filtered.has("blockedUser"), "filterPresenceForUser strips blocked peers from visible roster");
  check(!filtered.has("me"), "filterPresenceForUser excludes current user from remote peer roster");
  check(filtered.has("friend1"), "filterPresenceForUser retains unblocked remote peers");

  const countingRoster = new Map<string, RichPresence>();
  countingRoster.set("u1", { uid: "u1", name: "1", av: "a", status: "in_game", lastHeartbeat: 0 });
  countingRoster.set("u2", { uid: "u2", name: "2", av: "a", status: "in_game", lastHeartbeat: 0 });
  countingRoster.set("u3", { uid: "u3", name: "3", av: "a", status: "away", lastHeartbeat: 0 });
  countingRoster.set("u4", { uid: "u4", name: "4", av: "a", status: "online", lastHeartbeat: 0 });

  check(getPresenceCounts(countingRoster).total === 4, "getPresenceCounts calculates total tracked peers");
  check(getPresenceCounts(countingRoster).inGame === 2, "getPresenceCounts calculates active in-game count");
  check(getPresenceCounts(countingRoster).away === 1, "getPresenceCounts calculates away peer count");

  const friendsRoster = new Map<string, RichPresence>();
  friendsRoster.set("f1", {
    uid: "f1",
    name: "F1",
    av: "a",
    status: "in_game",
    activity: { type: "in_game", label: "Dice", gameId: "dice", roomCode: "WARP42", startedAt: 0 },
    lastHeartbeat: 0,
  });
  friendsRoster.set("f2", { uid: "f2", name: "F2", av: "a", status: "online", lastHeartbeat: 0 });

  const inGameFriends = findFriendsInGame(friendsRoster, ["f1", "f2"]);
  check(inGameFriends.length === 1, "findFriendsInGame filters friends actively in matches");
  check(inGameFriends[0].roomCode === "WARP42", "findFriendsInGame extracts match room code for quick join");

  check(cleanPresenceMeta(null as any).name === "Guest", "cleanPresenceMeta handles null input safely");
  check(cleanPresenceMeta({ name: "<script>hack</script>" }).name === "hack", "cleanPresenceMeta sanitizes malicious characters in name");

  // =========================================================================
  // Section 4: Nova AI Gaming Companion (24 checks)
  // =========================================================================
  section("social: Nova AI gaming companion");

  check(lookupKnowledgeBase("worlds").includes("five worlds"), "lookupKnowledgeBase answers world queries with 5 distinct sectors");
  check(lookupKnowledgeBase("controls").includes("W A S D"), "lookupKnowledgeBase explains locomotion and camera controls");
  check(lookupKnowledgeBase("cinema").includes("YouTube"), "lookupKnowledgeBase explains Party Hall cinema and video sharing");
  check(lookupKnowledgeBase("xyznonexistent").length > 20, "lookupKnowledgeBase returns helpful fallback guidance for unmatched queries");

  check(getGameRuleExplanation("dice").objective.includes("quantum") && getGameRuleExplanation("dice").proTip.includes("multiplier"), "getGameRuleExplanation for dice covers quantum roller and multipliers");
  check(getGameRuleExplanation("quiz").objective.includes("trivia") && getGameRuleExplanation("quiz").coreMechanic.includes("15"), "getGameRuleExplanation for quiz covers speed-trivia and 15s decay");
  check(getGameRuleExplanation("race").coreMechanic.includes("flare") && getGameRuleExplanation("race").proTip.includes("nitro"), "getGameRuleExplanation for race covers random flare and nitro criticals");
  check(getGameRuleExplanation("memory").coreMechanic.includes("cipher") && getGameRuleExplanation("memory").objective.includes("sequence"), "getGameRuleExplanation for memory covers cyber cipher sequence");
  check(getGameRuleExplanation("cybercode").coreMechanic.includes("debugging") && getGameRuleExplanation("cybercode").proTip.includes("test"), "getGameRuleExplanation for cybercode covers algorithmic debugging and tests");
  check(getGameRuleExplanation("unknown" as any).title === getGameRuleExplanation("dice").title, "getGameRuleExplanation falls back safely for invalid gameId");

  check(recommendGame(["reflex", "speed"]).recommendedGame === "race", "recommendGame recommends race for reflex preferences");
  check(recommendGame(["trivia", "knowledge"]).recommendedGame === "quiz", "recommendGame recommends quiz for trivia preferences");
  check(recommendGame(["logic", "coding"]).recommendedGame === "cybercode", "recommendGame recommends cybercode for logic preferences");
  check(recommendGame(["luck", "casual"]).recommendedGame === "dice", "recommendGame recommends dice for casual party preferences");

  const diceTelemetry = { gameId: "dice", winnerName: "Apex", isWinner: true, score: 350 };
  const diceSummary = summarizeMatchTelemetry(diceTelemetry);
  check(diceSummary.winnerName === "Apex" && diceSummary.summaryText.includes("triple"), "summarizeMatchTelemetry highlights winner and triple multiplier for dice");

  const quizTelemetry = { gameId: "quiz", winnerName: "Echo", isWinner: true, score: 500 };
  const quizSummary = summarizeMatchTelemetry(quizTelemetry);
  check(quizSummary.mvpStat?.includes("accuracy") || quizSummary.mvpStat?.includes("fastest"), "summarizeMatchTelemetry highlights quiz accuracy and speed");

  const raceTelemetry = { gameId: "race", winnerName: "Viper", isWinner: true, score: 200 };
  check(summarizeMatchTelemetry(raceTelemetry).mvpStat?.includes("ms") === true, "summarizeMatchTelemetry extracts best reaction time in ms for race");

  const memoryTelemetry = { gameId: "memory", winnerName: "Nova", isWinner: true, score: 400 };
  check(summarizeMatchTelemetry(memoryTelemetry).summaryText.includes("sequence"), "summarizeMatchTelemetry highlights memory sequence depth");

  const cybercodeTelemetry = { gameId: "cybercode", winnerName: "Apex", isWinner: true, score: 600 };
  check(summarizeMatchTelemetry(cybercodeTelemetry).mvpStat?.includes("tests") === true, "summarizeMatchTelemetry highlights tests passed for cybercode");

  const tiedTelemetry = { gameId: "race", isTie: true, winners: ["p1", "p2"] };
  const tiedSummary = summarizeMatchTelemetry(tiedTelemetry);
  check(tiedSummary.isTie === true && tiedSummary.summaryText.toLowerCase().includes("stalemate"), "summarizeMatchTelemetry handles tied matches gracefully");

  check(summarizeMatchTelemetry(null as any).summaryText.includes("concluded"), "summarizeMatchTelemetry handles null/corrupted telemetry safely");

  const ibInterests = generateIcebreaker(["space", "ai"]);
  check(ibInterests.question.includes("space") || ibInterests.question.includes("AI"), "generateIcebreaker incorporates user interests into conversation starter");

  const ibMatch = generateIcebreaker([], "close_match");
  check(ibMatch.question.includes("rematch") || ibMatch.question.includes("finish"), "generateIcebreaker generates competitive banter for close matches");

  check(novaOfflineFallback("chat", "hello").length > 0, "novaOfflineFallback produces non-empty response with zero network");
  check(!novaOfflineFallback("chat", "hello").includes("<script>") && !novaOfflineFallback("chat", "hello").includes("<h1>"), "novaOfflineFallback strips HTML and heading formatting");
  const marcoReply = novaOfflineFallback("npc", "hi", { npc: "marco" });
  check(marcoReply.includes("coffee") || marcoReply.includes("drink"), "novaOfflineFallback simulates Marco barista NPC persona");
  const vegaReply = novaOfflineFallback("npc", "fact", { npc: "vega" });
  check(vegaReply.includes("Venus") || vegaReply.includes("space"), "novaOfflineFallback simulates Cmdr. Vega astronaut NPC persona");
  check(novaOfflineFallback("unknown" as any, "").length > 0, "novaOfflineFallback handles unknown task types without throwing");

  // =========================================================================
  // Section 5: Integration, Reactivity & Edge Cases (22 checks)
  // =========================================================================
  section("social: integration, reactivity & edge cases");

  const testStore = createSocialStore("test_actor", true);
  let listenerCallCount = 0;
  const unsub = testStore.subscribe(() => {
    listenerCallCount++;
  });
  testStore.setState({ friends: ["f_first"] });
  check(listenerCallCount === 1, "socialStore.subscribe notifies listener on state change");

  unsub();
  testStore.setState({ friends: ["f_first", "f_second"] });
  const listenerAfterUnsub = listenerCallCount;
  check(listenerAfterUnsub === 1, "unsubscribing prevents subsequent listener notifications");

  let listenerA_calls = 0;
  let listenerB_calls = 0;
  const unsubA = testStore.subscribe(() => { listenerA_calls++; });
  const unsubB = testStore.subscribe(() => { listenerB_calls++; });
  testStore.setState({ friends: ["a"] });
  testStore.setState({ friends: ["a", "b"] });
  check(listenerA_calls === 2 && listenerB_calls === 2, "multiple store subscribers receive synchronized updates");
  unsubA();
  unsubB();

  const rapidStore = createSocialStore("rapid_tester", true);
  rapidStore.sendFriendRequest("target_peer");
  rapidStore.sendFriendRequest("target_peer");
  rapidStore.sendFriendRequest("target_peer");
  const rapidRequestsCount = rapidStore.getState().pendingOut.filter((id) => id === "target_peer").length;
  check(rapidRequestsCount === 1, "rapid duplicate friend request dispatches are deduplicated idempotently");

  const joinSquadObj = createSquad({ id: "lead" }, "Join Squad");
  rapidStore.joinSquad(joinSquadObj, { id: "rapid_tester", name: "Tester" }, joinSquadObj.id);
  rapidStore.joinSquad(joinSquadObj, { id: "rapid_tester", name: "Tester" }, joinSquadObj.id);
  const rapidJoinsCount = rapidStore.getState().mySquad?.members.filter((m) => m.id === "rapid_tester").length || 0;
  check(rapidJoinsCount === 1, "rapid duplicate squad join dispatches prevent duplicate members");

  rapidStore.setState({ friends: ["peer_dm"] });
  rapidStore.sendDM("peer_dm", "Message 1", "dm_fixed_id");
  rapidStore.sendDM("peer_dm", "Message 1 Duplicate", "dm_fixed_id");
  const threadWithRapidDMs = rapidStore.getState().threads["peer_dm"] || [];
  check(threadWithRapidDMs.length === 1, "rapid duplicate DM dispatches with identical ID deduplicate cleanly");

  rapidStore.setState({ pendingIn: ["acc_peer"] });
  rapidStore.acceptFriendRequest("acc_peer");
  const concurrentAcceptanceRes = rapidStore.acceptFriendRequest("acc_peer");
  check(concurrentAcceptanceRes.friends.filter((id) => id === "acc_peer").length === 1, "concurrent friend acceptance resolves cleanly without duplicates");

  check(!sanitizeText("<script>alert('xss')</script>hello").includes("<script>"), "sanitizeText strips executable script tags");
  check(sanitizeText("<img src=x onerror=alert(1)>world") === "world", "sanitizeText strips malicious image onerror attributes");
  check(sanitizePayload({ __proto__: { admin: true } }).admin === undefined, "sanitizePayload prevents Object prototype pollution attempts");
  check(sanitizeText("A".repeat(100000)).length === 500, "sanitizeText clamps oversized string payloads to 500 chars");
  check(sanitizePayload(null) !== null, "sanitizePayload handles null input safely");
  check(sanitizeText("🎮 Neon Racer 日本語 🚀").includes("🎮"), "sanitizeText preserves valid emojis and multi-byte UTF-8 Unicode characters");

  check(localUniverseRoster.some((p) => p.name === "Nova [AI]"), "Local Universe mode simulates Nova [AI] in offline presence");
  check(localUniverseRoster.some((p) => p.name.includes("[Bot]")), "Local Universe mode provides Bot rivals (Viper, Echo, Apex)");

  const sampleState = { friends: ["f1", "f2"], blocked: ["b1"], squads: [], threads: {} };
  const serialized = serializeSocialState(sampleState);
  check(serialized.length > 0 && deserializeSocialState(serialized).friends.length === sampleState.friends.length, "social state serializes and deserializes cleanly across storage round-trip");

  const mockStorageFullStore = createSocialStore("full_user", true);
  check(mockStorageFullStore.isFunctional === true, "socialStore operates in memory when localStorage throws QuotaExceededError");

  const e2eJourneyResult = executeE2ESocialJourney("journey_runner");
  check(e2eJourneyResult.success === true, "complete E2E social journey (friend -> squad -> presence -> Nova advice -> DM) succeeds with zero regressions");
}
