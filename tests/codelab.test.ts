import vm from "node:vm";
import { CHALLENGES, WORKER_SRC, dailyChallengeId } from "@/lib/world/codeLab";
import { check, section } from "./_t";

interface Out { logs: string[]; tests: { ok: boolean }[]; error?: string }
/** Runs the real worker script inside a Node vm, the same code the browser runs in a Web Worker. */
function run1(code: string, id: string): Promise<Out> {
  const ch = CHALLENGES.find((c) => c.id === id);
  if (!ch) throw new Error("unknown challenge " + id);
  return new Promise((resolve) => {
    const ctx: Record<string, unknown> = { postMessage: (m: Out) => resolve(m), setTimeout, JSON, Math, Array, String, Error, Object };
    ctx.self = ctx;
    vm.createContext(ctx);
    vm.runInContext(WORKER_SRC, ctx);
    (ctx.onmessage as (e: { data: { code: string; tests: string[] } }) => void)({ data: { code, tests: ch.tests } });
  });
}
const pass = (r: Out) => !r.error && r.tests.length > 0 && r.tests.every((t) => t.ok);

const SOLUTIONS: Record<string, string> = {
  hello: 'console.log("Hello, BARMO!")',
  sum: "function sum(a){return a.reduce((x,y)=>x+y,0)}",
  fizz: 'function fizzbuzz(n){if(n%15===0)return "FizzBuzz";if(n%3===0)return "Fizz";if(n%5===0)return "Buzz";return n}',
  reverse: 'function reverse(t){return t.split("").reverse().join("")}',
  palin: 'function isPalindrome(t){const s=t.toLowerCase();return s===s.split("").reverse().join("")}',
  max: "function biggest(n){let b=n[0];for(const x of n) if(x>b) b=x;return b}",
  vowels: 'function countVowels(t){let c=0;for(const ch of t.toLowerCase()) if("aeiou".includes(ch)) c++;return c}',
  sigmoid: "function sigmoid(x){return 1/(1+Math.exp(-x))}",
  neuron: "function sigmoid(x){return 1/(1+Math.exp(-x))} function neuron(i,w,b){let s=b;for(let k=0;k<i.length;k++)s+=i[k]*w[k];return sigmoid(s)}",
};

export async function run() {
  section("code lab: every challenge fails on the starter and passes with a correct solution");
  check(CHALLENGES.length === 10, "ten challenges");
  const perceptron = CHALLENGES.find((c) => c.id === "perceptron")?.starter.replace("// TODO: nudge w1, w2 and b using error and lr", "w1 += lr*error*x1; w2 += lr*error*x2; b += lr*error;") || "";
  for (const c of CHALLENGES) {
    const sol = c.id === "perceptron" ? perceptron : SOLUTIONS[c.id];
    check(!!sol, `${c.id}: has a test solution`);
    check(!pass(await run1(c.starter, c.id)), `${c.id}: starter code does not pass`);
    check(pass(await run1(sol, c.id)), `${c.id}: correct solution passes`);
  }
  check(!!(await run1("function (", "sum")).error, "syntax error is reported");
  check(!!(await run1('fetch("https://x.com")', "hello")).error, "network access is blocked");
  check(CHALLENGES.some((c) => c.id === dailyChallengeId()), "daily challenge exists");
}
