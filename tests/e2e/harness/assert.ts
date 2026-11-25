/**
 * tests/e2e/harness/assert.ts
 *
 * Lightweight, type-safe assertion library for Barmo Lounge E2E tests.
 * Supports expect matchers, numeric precision comparisons, deep equality,
 * exception assertions, and inverted `.not` matchers.
 */

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

export function assert(cond: boolean, msg?: string): asserts cond {
  if (!cond) {
    throw new AssertionError(msg || "Assertion failed: condition is falsy");
  }
}

function deepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a !== "object") return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const item of Array.from(a)) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of Array.from(a.entries())) {
      if (!b.has(key) || !deepEqual(val, b.get(key))) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

function formatValue(v: any): string {
  try {
    if (typeof v === "function") return `[Function: ${v.name || "anonymous"}]`;
    if (typeof v === "symbol") return v.toString();
    if (v instanceof Error) return `${v.name}: ${v.message}`;
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export interface Matchers<T = any> {
  toBe(expected: T): void;
  toBeCloseTo(expected: number, precision?: number): void;
  toEqual(expected: any): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toContain(item: any): void;
  toThrow(expectedError?: string | RegExp | ErrorConstructor): void;
}

class Expectation<T = any> implements Matchers<T> {
  private isNot: boolean;

  constructor(
    private actual: T,
    isNot = false
  ) {
    this.isNot = isNot;
  }

  get not(): Matchers<T> {
    return new Expectation(this.actual, !this.isNot);
  }

  toBe(expected: T): void {
    const pass = Object.is(this.actual, expected);
    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected ${formatValue(this.actual)} ${this.isNot ? "NOT to be" : "to be"} ${formatValue(expected)}`
      );
    }
  }

  toBeCloseTo(expected: number, precision = 2): void {
    const actualNum = Number(this.actual);
    const expectedDiff = Math.pow(10, -precision) / 2;
    const diff = Math.abs(actualNum - expected);
    const pass = !isNaN(actualNum) && diff <= expectedDiff;

    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected ${actualNum} ${this.isNot ? "NOT to be close to" : "to be close to"} ${expected} (within precision ${precision}, diff: ${diff})`
      );
    }
  }

  toEqual(expected: any): void {
    const pass = deepEqual(this.actual, expected);
    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected ${formatValue(this.actual)} ${this.isNot ? "NOT to equal" : "to deeply equal"} ${formatValue(expected)}`
      );
    }
  }

  toBeDefined(): void {
    const pass = this.actual !== undefined;
    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected value ${this.isNot ? "NOT to be defined" : "to be defined"}, but got ${formatValue(this.actual)}`
      );
    }
  }

  toBeUndefined(): void {
    const pass = this.actual === undefined;
    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected value ${this.isNot ? "NOT to be undefined" : "to be undefined"}, but got ${formatValue(this.actual)}`
      );
    }
  }

  toBeNull(): void {
    const pass = this.actual === null;
    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected value ${this.isNot ? "NOT to be null" : "to be null"}, but got ${formatValue(this.actual)}`
      );
    }
  }

  toBeTruthy(): void {
    const pass = Boolean(this.actual);
    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected ${formatValue(this.actual)} ${this.isNot ? "NOT to be truthy" : "to be truthy"}`
      );
    }
  }

  toBeFalsy(): void {
    const pass = !this.actual;
    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected ${formatValue(this.actual)} ${this.isNot ? "NOT to be falsy" : "to be falsy"}`
      );
    }
  }

  toBeGreaterThan(expected: number): void {
    const pass = (this.actual as unknown as number) > expected;
    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected ${this.actual} ${this.isNot ? "NOT to be >" : "to be >"} ${expected}`
      );
    }
  }

  toBeGreaterThanOrEqual(expected: number): void {
    const pass = (this.actual as unknown as number) >= expected;
    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected ${this.actual} ${this.isNot ? "NOT to be >=" : "to be >="} ${expected}`
      );
    }
  }

  toBeLessThan(expected: number): void {
    const pass = (this.actual as unknown as number) < expected;
    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected ${this.actual} ${this.isNot ? "NOT to be <" : "to be <"} ${expected}`
      );
    }
  }

  toBeLessThanOrEqual(expected: number): void {
    const pass = (this.actual as unknown as number) <= expected;
    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected ${this.actual} ${this.isNot ? "NOT to be <=" : "to be <="} ${expected}`
      );
    }
  }

  toContain(item: any): void {
    let pass = false;
    if (typeof this.actual === "string") {
      pass = this.actual.includes(String(item));
    } else if (Array.isArray(this.actual)) {
      pass = this.actual.some((x) => deepEqual(x, item));
    } else if (this.actual instanceof Set) {
      pass = this.actual.has(item);
    } else if (typeof this.actual === "object" && this.actual !== null) {
      pass = item in (this.actual as object);
    }

    if (this.isNot ? pass : !pass) {
      throw new AssertionError(
        `Expected ${formatValue(this.actual)} ${this.isNot ? "NOT to contain" : "to contain"} ${formatValue(item)}`
      );
    }
  }

  toThrow(expectedError?: string | RegExp | ErrorConstructor): void {
    if (typeof this.actual !== "function") {
      throw new AssertionError("expect(fn).toThrow() requires a function input");
    }

    let threw = false;
    let error: any = null;

    try {
      (this.actual as Function)();
    } catch (e) {
      threw = true;
      error = e;
    }

    if (!this.isNot) {
      if (!threw) {
        throw new AssertionError("Expected function to throw, but it did not throw.");
      }
      if (expectedError) {
        if (typeof expectedError === "string") {
          const msg = error instanceof Error ? error.message : String(error);
          if (!msg.includes(expectedError)) {
            throw new AssertionError(
              `Expected thrown error message to include "${expectedError}", but got "${msg}"`
            );
          }
        } else if (expectedError instanceof RegExp) {
          const msg = error instanceof Error ? error.message : String(error);
          if (!expectedError.test(msg)) {
            throw new AssertionError(
              `Expected thrown error message to match ${expectedError}, but got "${msg}"`
            );
          }
        } else if (typeof expectedError === "function") {
          if (!(error instanceof expectedError)) {
            throw new AssertionError(
              `Expected thrown error to be instance of ${expectedError.name}, but got ${error?.constructor?.name || typeof error}`
            );
          }
        }
      }
    } else {
      if (threw) {
        throw new AssertionError(
          `Expected function NOT to throw, but it threw: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
}

export function expect<T = any>(actual: T): Expectation<T> {
  return new Expectation(actual);
}
