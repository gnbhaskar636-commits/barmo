import { answerLocal, LESSONS, parseVideoUrl } from "@/lib/world/screens";
import { answerApp, npcLocal } from "@/lib/world/novaKnowledge";
import { check, section } from "./_t";

export async function run() {
  section("big screen: only safe video links");
  const yt = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", 42);
  check(!!yt && yt.kind === "embed" && yt.src.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ") && yt.src.includes("start=42"), "YouTube link becomes a privacy-friendly embed with a start time");
  check(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")?.kind === "embed", "youtu.be short link");
  check(parseVideoUrl("https://youtube.com/shorts/dQw4w9WgXcQ")?.kind === "embed", "YouTube shorts link");
  check(parseVideoUrl("https://vimeo.com/76979871")?.src.includes("player.vimeo.com/video/76979871") === true, "Vimeo link");
  check(parseVideoUrl("https://example.com/clip.mp4")?.kind === "file", "direct .mp4 link");
  check(parseVideoUrl("http://youtube.com/watch?v=dQw4w9WgXcQ") === null, "non-secure link rejected");
  check(parseVideoUrl("javascript:alert(1)") === null, "javascript: link rejected");
  check(parseVideoUrl("https://evil.com/watch?v=dQw4w9WgXcQ") === null, "other sites rejected");
  check(parseVideoUrl("https://user:pw@youtube.com/watch?v=dQw4w9WgXcQ") === null, "link with a password rejected");
  check(parseVideoUrl("https://youtube.com/watch?v=short") === null, "bad video id rejected");
  check(parseVideoUrl("") === null && parseVideoUrl(42) === null, "empty and non-text rejected");
  section("Nova notes and offline answers");
  check(LESSONS.length === 5 && LESSONS.every((l) => l.slides.length >= 3), "five lessons with slides");
  check(answerLocal("what is a token?").toLowerCase().includes("token"), "lesson search answers a question");
  check(answerApp("how do I watch a youtube video together?").includes("big screen") || answerApp("how do I watch a youtube video together?").includes("cinema"), "app FAQ: video");
  check(answerApp("blah blah").length > 20, "app FAQ always answers");
  check(npcLocal("marco", "can I get a coffee?").length > 5, "crew answer offline");
}
