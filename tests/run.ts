import { summary } from "./_t";

/** Runs every test file. `npm test` */
const files = ["./quiz.test", "./controls.test", "./screens.test", "./codelab.test", "./health.test"];
(async () => {
  for (const f of files) {
    const m = (await import(f)) as { run: () => Promise<void> };
    await m.run();
  }
  summary();
})();
