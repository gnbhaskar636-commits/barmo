/** The AI Lab code lab: beginner JavaScript challenges that really run, with tests. Pure logic, no three.js. */
export interface Challenge {
  id: string;
  title: string;
  brief: string;
  hint: string;
  starter: string;
  /** Lines of test code. Use T("label", () => condition). __logs holds everything printed with console.log. */
  tests: string[];
}

export const CHALLENGES: Challenge[] = [
  {
    id: "hello", title: "Say hello", brief: "Print exactly: Hello, BARMO!", hint: "console.log(\"...\") prints a line.",
    starter: '// Print the greeting with console.log\n',
    tests: ['T("prints exactly: Hello, BARMO!", () => __logs.includes("Hello, BARMO!"));'],
  },
  {
    id: "sum", title: "Add it up", brief: "Write sum(numbers) that returns the total of an array.", hint: "Start with let total = 0, loop over the array, add each number.",
    starter: 'function sum(numbers) {\n  // return the total of all the numbers\n}\n\nconsole.log(sum([1, 2, 3]));\n',
    tests: ['T("sum([1, 2, 3]) is 6", () => sum([1, 2, 3]) === 6);', 'T("sum([]) is 0", () => sum([]) === 0);', 'T("sum([-5, 5, 10]) is 10", () => sum([-5, 5, 10]) === 10);'],
  },
  {
    id: "fizz", title: "FizzBuzz", brief: 'Write fizzbuzz(n): "Fizz" if n divides by 3, "Buzz" if by 5, "FizzBuzz" if both, otherwise return n.', hint: "Check the divisible-by-both case first. n % 3 === 0 tests divisibility.",
    starter: 'function fizzbuzz(n) {\n  // your code here\n}\n\nfor (let i = 1; i <= 15; i++) console.log(fizzbuzz(i));\n',
    tests: ['T("3 gives Fizz", () => fizzbuzz(3) === "Fizz");', 'T("5 gives Buzz", () => fizzbuzz(5) === "Buzz");', 'T("15 gives FizzBuzz", () => fizzbuzz(15) === "FizzBuzz");', 'T("7 gives 7", () => fizzbuzz(7) === 7);'],
  },
  {
    id: "reverse", title: "Flip a word", brief: "Write reverse(text) that returns the text backwards. reverse(\"BARMO\") is \"OMRAB\".", hint: "Turn the text into an array with split(\"\"), reverse the array, then join(\"\") it back.",
    starter: 'function reverse(text) {\n  // return the text backwards\n}\n\nconsole.log(reverse("BARMO"));\n',
    tests: ['T("BARMO becomes OMRAB", () => reverse("BARMO") === "OMRAB");', 'T("empty text stays empty", () => reverse("") === "");', 'T("a b becomes b a", () => reverse("a b") === "b a");'],
  },
  {
    id: "palin", title: "Palindrome?", brief: "Write isPalindrome(text): true if it reads the same backwards (ignore capital letters).", hint: "Lowercase the text, reverse it, and compare it with the lowercase original.",
    starter: 'function isPalindrome(text) {\n  // return true or false\n}\n\nconsole.log(isPalindrome("Level"));\n',
    tests: ['T("Level is a palindrome", () => isPalindrome("Level") === true);', 'T("BARMO is not", () => isPalindrome("BARMO") === false);', 'T("a is a palindrome", () => isPalindrome("a") === true);'],
  },
  {
    id: "max", title: "Find the biggest", brief: "Write biggest(numbers) that returns the largest number in the array (no Math.max).", hint: "Keep a variable best = numbers[0], loop through, and replace it whenever you see a bigger number.",
    starter: 'function biggest(numbers) {\n  // return the largest number\n}\n\nconsole.log(biggest([3, 9, 2]));\n',
    tests: ['T("biggest([3, 9, 2]) is 9", () => biggest([3, 9, 2]) === 9);', 'T("works with negatives", () => biggest([-8, -3, -20]) === -3);', 'T("one item", () => biggest([5]) === 5);'],
  },
  {
    id: "vowels", title: "Count the vowels", brief: "Write countVowels(text): how many of a, e, i, o, u are in it (upper or lower case).", hint: "Loop over the lowercase text and add one each time the letter is in \"aeiou\".",
    starter: 'function countVowels(text) {\n  // return the number of vowels\n}\n\nconsole.log(countVowels("Hello BARMO"));\n',
    tests: ['T("Hello BARMO has 4", () => countVowels("Hello BARMO") === 4);', 'T("xyz has 0", () => countVowels("xyz") === 0);', 'T("AEIOU has 5", () => countVowels("AEIOU") === 5);'],
  },
  {
    id: "sigmoid", title: "Squash it (AI)", brief: "Write sigmoid(x) = 1 / (1 + e^-x). Neural networks use it to squash any number into 0..1.", hint: "Math.exp(-x) is e to the power of minus x.",
    starter: 'function sigmoid(x) {\n  // return 1 / (1 + e^-x)\n}\n\nconsole.log(sigmoid(0)); // should print 0.5\n',
    tests: ["T(\"sigmoid(0) is 0.5\", () => near(sigmoid(0), 0.5));", 'T("sigmoid(2) is about 0.8808", () => near(sigmoid(2), 0.8807971, 1e-5));', 'T("sigmoid(-2) is about 0.1192", () => near(sigmoid(-2), 0.1192029, 1e-5));'],
  },
  {
    id: "neuron", title: "One neuron (AI)", brief: "A neuron multiplies each input by its weight, adds a bias, then squashes with sigmoid. Write neuron(inputs, weights, bias).", hint: "Sum inputs[i] * weights[i] in a loop, add the bias, then call sigmoid.",
    starter: 'function sigmoid(x) {\n  return 1 / (1 + Math.exp(-x));\n}\n\nfunction neuron(inputs, weights, bias) {\n  // weighted sum + bias, then sigmoid\n}\n\nconsole.log(neuron([1, 2], [0.5, -0.25], 0.1));\n',
    tests: ['T("neuron([1,2],[0.5,-0.25],0.1) is about 0.525", () => near(neuron([1, 2], [0.5, -0.25], 0.1), 0.5249792, 1e-5));', 'T("neuron([1,1],[1,1],-2) is 0.5", () => near(neuron([1, 1], [1, 1], -2), 0.5));'],
  },
  {
    id: "perceptron", title: "Teach a perceptron (AI)", brief: "Finish the learning step so the perceptron learns the AND gate: output 1 only when both inputs are 1.", hint: "After computing error = target - out, do w1 += lr * error * x1, the same for w2 with x2, and b += lr * error.",
    starter: 'function trainAND() {\n  const data = [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]];\n  let w1 = 0, w2 = 0, b = 0;\n  const lr = 0.1;\n  for (let epoch = 0; epoch < 50; epoch++) {\n    for (const [x1, x2, target] of data) {\n      const out = w1 * x1 + w2 * x2 + b > 0 ? 1 : 0;\n      const error = target - out;\n      // TODO: nudge w1, w2 and b using error and lr\n    }\n  }\n  return { w1, w2, b };\n}\n\nconsole.log(trainAND());\n',
    tests: [
      'const __m = (() => { try { return trainAND(); } catch (e) { return null; } })();',
      'const __p = (a, c) => (__m && __m.w1 * a + __m.w2 * c + __m.b > 0 ? 1 : 0);',
      'T("0 AND 0 = 0", () => __p(0, 0) === 0);', 'T("0 AND 1 = 0", () => __p(0, 1) === 0);', 'T("1 AND 0 = 0", () => __p(1, 0) === 0);', 'T("1 AND 1 = 1", () => __p(1, 1) === 1);',
    ],
  },
];

export interface TestResult { label: string; ok: boolean; err?: string }
export interface RunResult { logs: string[]; tests: TestResult[]; error?: string; timeout?: boolean; ms: number }

/**
 * Runs in a Web Worker: no page access, network functions switched off, killed after a few seconds.
 * The student's code and the tests are evaluated together at global scope so `let`/`const` work too.
 */
export const WORKER_SRC = `
self.onmessage = (e) => {
  const { code, tests } = e.data;
  const logs = [];
  const fmt = (a) => { if (typeof a === "string") return a; try { const j = JSON.stringify(a); return j === undefined ? String(a) : j; } catch (_) { return String(a); } };
  const push = (p, a) => { if (logs.length < 60) logs.push((p + a.map(fmt).join(" ")).slice(0, 300)); };
  self.console = { log: (...a) => push("", a), info: (...a) => push("", a), warn: (...a) => push("warn: ", a), error: (...a) => push("error: ", a) };
  ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches", "BroadcastChannel"].forEach((k) => { try { self[k] = undefined; } catch (_) {} });
  self.__logs = logs;
  self.near = (a, b, eps) => Math.abs(a - b) < (eps || 1e-6);
  const harness = "\\n;(function(){ const __t = []; const T = (label, f) => { try { __t.push({ label, ok: !!f() }); } catch (err) { __t.push({ label, ok: false, err: String(err && err.message || err) }); } };\\n" + tests.join("\\n") + "\\nreturn __t; })()";
  let out;
  try { out = (0, eval)(code + harness); } catch (err) { postMessage({ logs, tests: [], error: String(err && err.message || err) }); return; }
  postMessage({ logs, tests: Array.isArray(out) ? out : [] });
};
`;

export function runCode(code: string, ch: Challenge, timeoutMs = 3000): Promise<RunResult> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    let w: Worker;
    let url = "";
    try {
      url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
      w = new Worker(url);
    } catch {
      if (url) URL.revokeObjectURL(url);
      return resolve({ logs: [], tests: [], error: "Your browser could not start the code runner.", ms: 0 });
    }
    const done = (r: Omit<RunResult, "ms">) => {
      window.clearTimeout(timer);
      w.terminate();
      URL.revokeObjectURL(url);
      resolve({ ...r, ms: Math.round(performance.now() - t0) });
    };
    const timer = window.setTimeout(() => done({ logs: [], tests: [], timeout: true, error: "Your code ran too long (over 3 seconds). Check for a loop that never ends." }), timeoutMs);
    w.onmessage = (e: MessageEvent<{ logs: string[]; tests: TestResult[]; error?: string }>) => done(e.data);
    w.onerror = (e) => done({ logs: [], tests: [], error: e.message || "Something went wrong running your code." });
    w.postMessage({ code: code.slice(0, 8000), tests: ch.tests });
  });
}

/** One challenge is highlighted each day (the same one for everybody). */
export const dailyChallengeId = (now = Date.now()) => CHALLENGES[Math.floor(now / 86_400_000) % CHALLENGES.length].id;

const KEY = "barmo-code-solved";
export function loadSolved(): string[] {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "[]") as unknown;
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string" && CHALLENGES.some((c) => c.id === x)) : [];
  } catch {
    return [];
  }
}
export function saveSolved(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}
