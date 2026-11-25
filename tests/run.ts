import { summary } from "./_t";
import { runE2E } from "./e2e/runner";

/** Runs every test file. `npm test` */
const files = [
  "./quiz.test",
  "./controls.test",
  "./screens.test",
  "./codelab.test",
  "./health.test",
  "./chat.test",
  "./css.test",
  "./character.test",
  "./games.test",
  "./tournaments.test",
  "./progression.test",
  "./social.test",
  "./worlds.test",
  "./platform.test",
  "./hardening.test",
];
(async () => {
  for (const f of files) {
    const m = (await import(f)) as { run: () => Promise<void> };
    await m.run();
  }
  summary();

  const e2eResult = await runE2E();
  if (e2eResult.failed > 0) {
    process.exit(1);
  }
})();
