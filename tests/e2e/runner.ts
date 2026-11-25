/**
 * tests/e2e/runner.ts
 *
 * Central E2E Test Runner for Barmo Lounge.
 * Executes hierarchical test suites (Tiers 1-4) and Harness Self-Verification.
 *
 * Usage:
 *   npx tsx tests/e2e/runner.ts                # Run all available tiers and harness
 *   npx tsx tests/e2e/runner.ts --tier=1      # Run only Tier 1
 *   npx tsx tests/e2e/runner.ts --tier=2      # Run only Tier 2
 *   npx tsx tests/e2e/runner.ts --tier=3      # Run only Tier 3
 *   npx tsx tests/e2e/runner.ts --tier=4      # Run only Tier 4
 */

import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import { runHarnessTests } from "./harness.test";

export interface TierSuiteDefinition {
  id: number;
  name: string;
  file: string;
  description: string;
}

export const REGISTERED_TIERS: TierSuiteDefinition[] = [
  {
    id: 1,
    name: "Tier 1: Feature Coverage",
    file: "tier1_features.e2e.ts",
    description: "Equivalence partition happy-path tests (>=5 tests per feature)",
  },
  {
    id: 2,
    name: "Tier 2: Boundary & Corner Cases",
    file: "tier2_boundaries.e2e.ts",
    description: "Boundary value analysis, deadzones, extreme limits, context interrupts",
  },
  {
    id: 3,
    name: "Tier 3: Cross-Feature Interactions",
    file: "tier3_combinations.e2e.ts",
    description: "Pairwise combinatorial testing across distinct engine subsystems",
  },
  {
    id: 4,
    name: "Tier 4: Real-World Scenarios",
    file: "tier4_scenarios.e2e.ts",
    description: "Realistic multi-step end-user application workflows on desktop & mobile",
  },
];

export interface RunnerResult {
  passed: number;
  failed: number;
  total: number;
  planned: number;
  duration: number;
}

// Lightweight Test Definition Registry for Tier Test Files
type TestFn = () => void | Promise<void>;
interface TestCase {
  name: string;
  fn: TestFn;
}

const currentSuiteTests: TestCase[] = [];

export function test(name: string, fn: TestFn): void {
  currentSuiteTests.push({ name, fn });
}

export const it = test;

export function describe(suiteName: string, fn: () => void): void {
  // In simple sequential runner, describe immediately executes definition block
  console.log(`\n  --- ${suiteName} ---`);
  fn();
}

/**
 * Executes a dynamically imported test suite
 */
async function executeSuite(
  name: string,
  filePath: string
): Promise<{ passed: number; failed: number; total: number; duration: number }> {
  const start = Date.now();
  currentSuiteTests.length = 0;

  let passed = 0;
  let failed = 0;

  try {
    const fileUrl = pathToFileURL(filePath).href;
    const mod = await import(fileUrl);

    // If the suite provides its own custom run() method, delegate to it
    if (typeof mod.run === "function") {
      const res = await mod.run();
      return {
        passed: res?.passed ?? 0,
        failed: res?.failed ?? 0,
        total: res?.total ?? (res?.passed ?? 0) + (res?.failed ?? 0),
        duration: res?.duration ?? Date.now() - start,
      };
    }

    // Otherwise, execute registered test cases from describe/test calls
    for (const testCase of currentSuiteTests) {
      try {
        await testCase.fn();
        passed++;
        console.log(`    ✔ [PASS] ${testCase.name}`);
      } catch (err: any) {
        failed++;
        console.error(`    ✖ [FAIL] ${testCase.name}`);
        console.error(`       Error: ${err?.message || err}`);
      }
    }
  } catch (importErr: any) {
    failed++;
    console.error(`    ✖ [FAIL] Suite execution failed for ${name}:`, importErr?.message || importErr);
  }

  const duration = Date.now() - start;
  return { passed, failed, total: passed + failed, duration };
}

/**
 * Main E2E runner entrypoint
 */
export async function runE2E(options?: { tier?: number | string; silent?: boolean }): Promise<RunnerResult> {
  const startTime = Date.now();
  let totalPassed = 0;
  let totalFailed = 0;
  let totalPlanned = 0;

  console.log("\n" + "=".repeat(74));
  console.log("       BARMO LOUNGE OPAQUE-BOX E2E TEST RUNNER");
  console.log("=".repeat(74));

  // Determine requested tier filter
  let requestedTier: number | null = null;
  if (options?.tier !== undefined) {
    if (typeof options.tier === "number") {
      requestedTier = options.tier;
    } else if (typeof options.tier === "string" && options.tier.toLowerCase() !== "all") {
      const parsed = parseInt(options.tier, 10);
      if (!isNaN(parsed)) requestedTier = parsed;
    }
  }

  const suiteSummaries: Array<{
    name: string;
    status: "PASSED" | "FAILED" | "PLANNED";
    passed: number;
    failed: number;
    duration: string;
  }> = [];

  // 1. Run Harness Self-Verification Suite (unless a specific tier is filtered)
  if (requestedTier === null) {
    console.log("\n▶ Running Suite: Harness Self-Verification");
    const harnessResult = await runHarnessTests();
    totalPassed += harnessResult.passed;
    totalFailed += harnessResult.failed;
    suiteSummaries.push({
      name: "Harness Self-Verification",
      status: harnessResult.failed === 0 ? "PASSED" : "FAILED",
      passed: harnessResult.passed,
      failed: harnessResult.failed,
      duration: `${harnessResult.duration}ms`,
    });
  }

  // 2. Iterate Registered Tiers
  for (const tier of REGISTERED_TIERS) {
    if (requestedTier !== null && tier.id !== requestedTier) {
      continue;
    }

    console.log(`\n▶ Running Suite: ${tier.name}`);
    console.log(`  Scope: ${tier.description}`);

    const tierFilePath = path.join(__dirname, tier.file);

    if (!fs.existsSync(tierFilePath)) {
      console.log(`  ⚪ Status: PLANNED (File "${tier.file}" pending implementation)`);
      totalPlanned++;
      suiteSummaries.push({
        name: tier.name,
        status: "PLANNED",
        passed: 0,
        failed: 0,
        duration: "-",
      });
      continue;
    }

    const suiteResult = await executeSuite(tier.name, tierFilePath);
    totalPassed += suiteResult.passed;
    totalFailed += suiteResult.failed;

    suiteSummaries.push({
      name: tier.name,
      status: suiteResult.failed === 0 ? "PASSED" : "FAILED",
      passed: suiteResult.passed,
      failed: suiteResult.failed,
      duration: `${suiteResult.duration}ms`,
    });
  }

  const totalDuration = Date.now() - startTime;

  // Print Summary Table
  console.log("\n" + "=".repeat(74));
  console.log("                     E2E EXECUTION SUMMARY REPORT");
  console.log("=".repeat(74));
  console.log(
    "Suite".padEnd(40) +
      "Status".padEnd(12) +
      "Pass".padStart(6) +
      "Fail".padStart(6) +
      "Time".padStart(10)
  );
  console.log("-".repeat(74));

  for (const s of suiteSummaries) {
    console.log(
      s.name.padEnd(40) +
        s.status.padEnd(12) +
        (s.status === "PLANNED" ? "-" : String(s.passed)).padStart(6) +
        (s.status === "PLANNED" ? "-" : String(s.failed)).padStart(6) +
        s.duration.padStart(10)
    );
  }

  console.log("=".repeat(74));
  console.log(
    `Total Assertions: ${totalPassed + totalFailed} | Passed: ${totalPassed} | Failed: ${totalFailed} | Planned Tiers: ${totalPlanned}`
  );
  console.log(`Total Execution Time: ${(totalDuration / 1000).toFixed(2)}s`);

  if (totalFailed > 0) {
    console.log(`\n❌ RESULT: ${totalFailed} test(s) FAILED`);
  } else {
    console.log(`\n✔ RESULT: All executed suites passed cleanly!`);
  }
  console.log("=".repeat(74) + "\n");

  return {
    passed: totalPassed,
    failed: totalFailed,
    total: totalPassed + totalFailed,
    planned: totalPlanned,
    duration: totalDuration,
  };
}

// Standalone CLI execution detection
function isMainModule(): boolean {
  try {
    const mainArg = process.argv[1];
    if (!mainArg) return false;
    return path.resolve(mainArg).toLowerCase() === path.resolve(__filename).toLowerCase();
  } catch {
    return false;
  }
}

if (isMainModule()) {
  // Parse command line arguments (e.g., --tier=1 or -t 1)
  let tierArg: number | undefined;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--tier=")) {
      const val = parseInt(arg.split("=")[1], 10);
      if (!isNaN(val)) tierArg = val;
    } else if (arg === "-t" && i + 1 < process.argv.length) {
      const val = parseInt(process.argv[++i], 10);
      if (!isNaN(val)) tierArg = val;
    }
  }

  runE2E({ tier: tierArg })
    .then((result) => {
      if (result.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("Fatal runner error:", err);
      process.exit(1);
    });
}
