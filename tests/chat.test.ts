import { applyMention, firstLink, fmtTime, mentionQuery, showHead, slashQuery, suggestNames, suggestSlash, tokenize } from "@/lib/world/chatText";
import { gyroDelta } from "@/lib/world/controls";
import { check, near, section } from "./_t";

export async function run() {
  section("chat: links, mentions, commands, grouping");
  const t = tokenize("watch https://youtu.be/dQw4w9WgXcQ, then reply (see https://example.com/a?b=1).");
  check(t.filter((x) => x.t === "link").length === 2, "two links found");
  check(t.some((x) => x.t === "link" && x.href === "https://youtu.be/dQw4w9WgXcQ"), "trailing comma stripped from link");
  check(t.some((x) => x.t === "link" && x.href === "https://example.com/a?b=1"), "closing bracket and dot stripped");
  check(tokenize("no links here").length === 1, "plain text stays one piece");
  check(tokenize("javascript:alert(1) and ftp://x.com").every((x) => x.t === "text"), "only http(s) links are linked");
  check(tokenize("https://user:pw@evil.com/x").every((x) => x.t === "text"), "links with passwords are not linked");
  check(tokenize("<b>x</b> https://a.com").map((x) => x.s).join("").includes("<b>"), "html stays as plain text (rendered safely by React)");
  check(firstLink("hi https://vimeo.com/76979871 ok") === "https://vimeo.com/76979871" && firstLink("none") === null, "first link helper");
  check(tokenize("https://example.com/" + "a".repeat(100))[0].s.length <= 42, "long links are shortened for display");
  check(mentionQuery("hello @Sa") === "Sa" && mentionQuery("@") === "" && mentionQuery("hello @Sam there") === null && mentionQuery("mail me@x.com") === null, "mention being typed");
  check(slashQuery("/no") === "/no" && slashQuery("/nova hi") === null && slashQuery("hi /no") === null, "slash command being typed");
  check(suggestSlash("/n").some((s) => s.cmd === "/nova ") && suggestSlash("/z").length === 0, "slash suggestions");
  check(JSON.stringify(suggestNames("sa", ["Sam Lee", "Sara", "Bob", "sam lee", ""])) === JSON.stringify(["Sam Lee", "Sara"]), "name suggestions: prefix, de-duplicated");
  check(suggestNames("lee", ["Sam Lee"]).length === 0 && suggestNames("", ["A", "B"]).length === 2, "name suggestions match the start only");
  check(applyMention("hey @Sa", "Sam Lee") === "hey @Sam ", "mention inserts the first name");
  const base = 1_000_000;
  const msgs = [
    { who: "A", at: base },
    { who: "A", at: base + 30_000 },
    { who: "A", at: base + 5 * 60_000 },
    { who: "B", at: base + 5 * 60_000 + 1000 },
    { who: "B", at: base + 5 * 60_000 + 2000, sys: true },
    { who: "B", at: base + 5 * 60_000 + 3000 },
    { who: "B", at: base + 5 * 60_000 + 4000, reply: { who: "A" } },
  ];
  const heads = msgs.map((_, i) => showHead(msgs, i));
  check(JSON.stringify(heads) === JSON.stringify([true, false, true, true, true, true, true]), "grouping: same person within 3 minutes hides the name");
  check(typeof fmtTime(base) === "string" && fmtTime(base).length >= 4, "time formats");
  section("phone motion look");
  const d = gyroDelta({ a: 359, b: 90 }, { a: 1, b: 92 });
  check(near(d.dYaw, (2 * Math.PI) / 180) && near(d.dPitch, (2 * Math.PI) / 180), "compass wrap 359 to 1 is a 2 degree turn");
  check(gyroDelta(null, { a: 10, b: 10 }).dYaw === 0, "first reading gives no movement");
  check(gyroDelta({ a: 0, b: 90 }, { a: 170, b: 90 }).dYaw === 0, "sudden jumps are ignored");
  check(gyroDelta({ a: 100, b: 90 }, { a: 90, b: 90 }).dYaw < 0, "turning right makes the camera turn right (yaw decreases)");
}
