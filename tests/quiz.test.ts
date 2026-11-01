import { CATS, Q_TIME, SLOT, parseQuizJson, phaseAt, pickQuestions, points, scores, validateQs, type QuizState } from "@/lib/world/quiz";
import { check, section } from "./_t";

export async function run() {
  section("trivia: questions, validation, timing, scoring");
  for (const cat of Object.keys(CATS)) {
    const qs = pickQuestions(cat, 8);
    check(qs.length >= 5 && qs.every((q) => q.o.length === 4 && new Set(q.o).size === 4 && q.a >= 0 && q.a <= 3), `category ${cat} gives valid questions`);
  }
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) for (const q of pickQuestions("space", 8)) if (q.q === "Which planet is known as the Red Planet?") seen.add(q.o[q.a]);
  check(seen.size === 1 && seen.has("Mars"), "shuffling keeps the right answer");
  check(validateQs([{ q: "What is 2+2?", o: ["3", "4", "5", "6"], a: 1 }])?.length === 1, "valid question accepted");
  check(validateQs([{ q: "x", o: ["3", "4", "5", "6"], a: 1 }]) === null, "too-short question rejected");
  check(validateQs([{ q: "What is 2+2?", o: ["3", "4", "4", "6"], a: 1 }]) === null, "duplicate options rejected");
  check(validateQs([{ q: "What is 2+2?", o: ["3", "4", "5", "6"], a: 9 }]) === null, "bad answer index rejected");
  check(validateQs("nope") === null && validateQs([]) === null, "non-array and empty rejected");
  const clean = validateQs([{ q: "<b>Hi</b> there?", o: ["<i>a</i>", "b", "c", "d"], a: 0 }]);
  check(!!clean && !clean[0].q.includes("<"), "angle brackets stripped");
  check(parseQuizJson('Sure! ```json\n[{"q":"Capital of Japan?","o":["Tokyo","Osaka","Kyoto","Nara"],"a":0}]\n```')?.[0].o[0] === "Tokyo", "AI reply wrapped in text parsed");
  check(parseQuizJson("no json here") === null, "garbage AI reply gives null");
  const st: QuizState = { qs: pickQuestions("ai", 3), t0: 1_000_000, by: "A", cat: "ai" };
  check(phaseAt(st, 999_000).phase === "lobby", "lobby before the start");
  check(phaseAt(st, 1_000_000).phase === "question" && phaseAt(st, 1_000_000).i === 0, "question 1 at the start");
  check(phaseAt(st, 1_000_000 + Q_TIME).phase === "reveal", "reveal after the answer time");
  check(phaseAt(st, 1_000_000 + SLOT).i === 1, "question 2 follows");
  check(phaseAt(st, 1_000_000 + 3 * SLOT).phase === "done", "done after the last reveal");
  check(points(0) === 150 && points(Q_TIME) === 100, "points: 150 instant, 100 at the buzzer");
  const q0 = st.qs[0].a;
  const q1 = st.qs[1].a;
  const sc = scores(st, { a: { 0: { c: q0, at: 1000 }, 1: { c: (q1 + 1) % 4, at: 2000 } }, b: { 0: { c: q0, at: 9000 }, 1: { c: q1, at: 3000 }, 2: { c: st.qs[2].a, at: Q_TIME + 500 } } }, { a: "Ana", b: "Ben" });
  check(sc[0].id === "b" && sc[0].right === 2 && sc[1].right === 1, "scoring: late answers ignored, winner first");
}
