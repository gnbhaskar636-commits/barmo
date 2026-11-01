/** A tiny test helper (no extra libraries). Run everything with: npm test */
let total = 0;
let failed = 0;
export function check(cond: boolean, name: string) {
  total++;
  if (!cond) {
    failed++;
    console.error("  FAIL  " + name);
  }
}
export const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
export function section(name: string) {
  console.log("• " + name);
}
export function summary() {
  console.log(failed ? `\n${failed} of ${total} checks FAILED` : `\nAll ${total} checks passed`);
  if (failed) process.exit(1);
}
