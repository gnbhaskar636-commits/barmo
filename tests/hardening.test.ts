import { check, near, section } from "./_t";
import {
  computeAdaptiveDPR,
  createInstanceBatch,
  estimateVRAM,
  shouldReduceQuality,
  computeLODLevel,
  throttleRenderLoop,
  AdaptiveRenderer,
} from "@/lib/performance/renderer";
import {
  ResourceTracker,
  estimateTextureMemory,
  isMemoryPressure,
  createRouteCleanupHook,
} from "@/lib/performance/memory";
import {
  sanitizeHTML,
  sanitizeUsername,
  sanitizeChatMessage,
  sanitizeSearchQuery,
  sanitizeProfileBio,
  escapeForAttribute,
  isValidEmail,
  containsXSSPattern,
} from "@/lib/security/sanitize";
import {
  RateLimiter,
  createChatLimiter,
  createSearchLimiter,
  createAPILimiter,
} from "@/lib/security/rateLimit";

export async function run() {
  // ── 1. Performance: Renderer ────────────────────────────────────────────
  section("Hardening — Performance: Renderer");

  // computeAdaptiveDPR (nativeDPR defaults to 1 in Node)
  check(computeAdaptiveDPR(60, 30) === 1, "computeAdaptiveDPR: high FPS caps at nativeDPR (1)");
  check(computeAdaptiveDPR(30, 30) === 1, "computeAdaptiveDPR: exact target FPS returns 1");
  check(computeAdaptiveDPR(0, 30) === 0.5, "computeAdaptiveDPR: 0 FPS returns min 0.5");
  check(computeAdaptiveDPR(-10, 30) === 0.5, "computeAdaptiveDPR: negative FPS returns min 0.5");
  check(computeAdaptiveDPR(NaN, 30) === 0.5, "computeAdaptiveDPR: NaN FPS returns min 0.5");
  check(computeAdaptiveDPR(15, 60) === 0.5, "computeAdaptiveDPR: 15/60 FPS scales DPR to 0.5");
  check(
    near(computeAdaptiveDPR(27, 30), 0.95, 0.01),
    "computeAdaptiveDPR: 27/30 FPS scales DPR smoothly (~0.95)",
  );

  // createInstanceBatch
  const singleBatch = createInstanceBatch(1, "table.glb");
  check(singleBatch.count === 1, "createInstanceBatch: count 1 preserved");
  check(singleBatch.useInstancing === false, "createInstanceBatch: count 1 disables instancing");
  check(singleBatch.maxInstances === 1, "createInstanceBatch: count 1 maxInstances is 1");

  const multiBatch = createInstanceBatch(5, "chair.glb");
  check(multiBatch.count === 5, "createInstanceBatch: count 5 preserved");
  check(multiBatch.templateGeometry === "chair.glb", "createInstanceBatch: templateGeometry preserved");
  check(multiBatch.useInstancing === true, "createInstanceBatch: count 5 enables instancing");
  check(multiBatch.maxInstances === 8, "createInstanceBatch: count 5 rounds up to pow2 (8)");

  const exactPow2 = createInstanceBatch(16, "lamp.glb");
  check(exactPow2.maxInstances === 16, "createInstanceBatch: exact pow2 stays 16");

  const invalidBatch = createInstanceBatch(-3, 123 as unknown as string);
  check(invalidBatch.count === 1 && invalidBatch.templateGeometry === "", "createInstanceBatch: invalid inputs sanitized");

  // estimateVRAM
  check(near(estimateVRAM(1920, 1080, 1), 7.91015625, 1e-4), "estimateVRAM: 1080p @ 1x DPR ~7.91 MB");
  check(near(estimateVRAM(1920, 1080, 2), 31.640625, 1e-4), "estimateVRAM: 1080p @ 2x DPR ~31.64 MB");
  check(estimateVRAM(0, 1080, 1) === 0, "estimateVRAM: zero width returns 0");
  check(estimateVRAM(-100, 1080, 1) === 0, "estimateVRAM: negative width returns 0");

  // shouldReduceQuality
  check(shouldReduceQuality(60, 128) === "ultra", "shouldReduceQuality: 60fps & 128MB -> ultra");
  check(shouldReduceQuality(60, 256) === "high", "shouldReduceQuality: 60fps & 256MB -> high");
  check(shouldReduceQuality(45, 300) === "high", "shouldReduceQuality: 45fps & 300MB -> high");
  check(shouldReduceQuality(60, 512) === "medium", "shouldReduceQuality: 60fps & 512MB -> medium");
  check(shouldReduceQuality(25, 900) === "medium", "shouldReduceQuality: 25fps & 900MB -> medium");
  check(shouldReduceQuality(20, 50) === "low", "shouldReduceQuality: 20fps -> low");
  check(shouldReduceQuality(60, NaN) === "medium", "shouldReduceQuality: NaN VRAM -> medium");

  // computeLODLevel
  check(computeLODLevel(0, 1000) === 0, "computeLODLevel: distance 0 -> LOD 0");
  check(computeLODLevel(249, 1000) === 0, "computeLODLevel: distance 249 -> LOD 0");
  check(computeLODLevel(250, 1000) === 1, "computeLODLevel: distance 250 -> LOD 1");
  check(computeLODLevel(500, 1000) === 2, "computeLODLevel: distance 500 -> LOD 2");
  check(computeLODLevel(750, 1000) === 3, "computeLODLevel: distance 750 -> LOD 3");
  check(computeLODLevel(5000, 1000) === 3, "computeLODLevel: beyond maxDistance -> LOD 3");
  check(computeLODLevel(-50, 1000) === 0, "computeLODLevel: negative distance -> LOD 0");

  // throttleRenderLoop
  const stopLoop = throttleRenderLoop(() => {
    /* noop */
  }, 60);
  check(typeof stopLoop === "function", "throttleRenderLoop: returns stop function");
  stopLoop();
  const stopNoop = throttleRenderLoop(null as unknown as () => void, 60);
  check(typeof stopNoop === "function", "throttleRenderLoop: non-function callback returns safe noop");
  stopNoop();

  // AdaptiveRenderer
  const renderer = new AdaptiveRenderer(30, 3);
  check(renderer.targetFPS === 30, "AdaptiveRenderer: initial targetFPS is 30");
  check(renderer.update(10) < 1, "AdaptiveRenderer: low FPS reduces DPR");
  renderer.targetFPS = 60;
  check(renderer.targetFPS === 60, "AdaptiveRenderer: targetFPS setter updates value");

  // ── 2. Performance: Memory ──────────────────────────────────────────────
  section("Hardening — Performance: Memory");

  const tracker = new ResourceTracker();
  let disposedA = 0;
  let disposedB = 0;
  const resA = { dispose: () => { disposedA++; } };
  const resB = { dispose: () => { disposedB++; } };
  const resThrows = {
    dispose: () => {
      throw new Error("already freed");
    },
  };

  check(tracker.track(resA) === resA, "ResourceTracker: track returns resource for chaining");
  tracker.track(resA); // duplicate track should deduplicate
  tracker.track(resB);
  check(tracker.getStats().tracked === 2, "ResourceTracker: tracks 2 unique resources");

  tracker.untrack(resB);
  check(tracker.getStats().tracked === 1, "ResourceTracker: untrack decrements tracked count");
  check(disposedB === 0, "ResourceTracker: untrack does not dispose resource");

  tracker.track(resThrows);
  tracker.disposeAll();
  check(disposedA === 1, "ResourceTracker: disposeAll calls dispose on tracked resource");
  check(tracker.getStats().tracked === 0, "ResourceTracker: disposeAll clears tracked set");
  check(tracker.getStats().totalDisposed === 2, "ResourceTracker: totalDisposed counts disposed resources");

  // Double-dispose check
  tracker.disposeAll();
  check(disposedA === 1, "ResourceTracker: double disposeAll does not re-dispose");
  check(tracker.getStats().totalDisposed === 2, "ResourceTracker: double disposeAll does not increment totalDisposed");

  // estimateTextureMemory
  check(estimateTextureMemory(1024, 1024, "RGBA") === 4194304, "estimateTextureMemory: 1024x1024 RGBA = 4MB");
  check(estimateTextureMemory(1024, 1024, "RGB") === 3145728, "estimateTextureMemory: 1024x1024 RGB = 3MB");
  check(estimateTextureMemory(512, 512, "RGBAFloat") === 4194304, "estimateTextureMemory: 512x512 RGBAFloat = 4MB");
  check(estimateTextureMemory(512, 512, "RGFloat") === 2097152, "estimateTextureMemory: 512x512 RGFloat = 2MB");
  check(estimateTextureMemory(256, 256, "Alpha") === 65536, "estimateTextureMemory: 256x256 Alpha = 64KB");
  check(estimateTextureMemory(256, 256, "Luminance") === 65536, "estimateTextureMemory: 256x256 Luminance = 64KB");
  check(estimateTextureMemory(100, 100, "UNKNOWN") === 40000, "estimateTextureMemory: unknown format defaults to RGBA (4 bpp)");
  check(estimateTextureMemory(100, 100, "__proto__") === 40000, "estimateTextureMemory: __proto__ format safely defaults to 4 bpp");
  check(estimateTextureMemory(-10, 100, "RGBA") === 0, "estimateTextureMemory: negative width returns 0");

  // isMemoryPressure
  check(isMemoryPressure(512) === true, "isMemoryPressure: 512MB >= 512MB default threshold");
  check(isMemoryPressure(511) === false, "isMemoryPressure: 511MB < 512MB default threshold");
  check(isMemoryPressure(256, 200) === true, "isMemoryPressure: custom threshold 200MB");
  check(isMemoryPressure(NaN) === false, "isMemoryPressure: NaN returns false");

  // createRouteCleanupHook
  const hookTracker = new ResourceTracker();
  let hookDisposed = false;
  hookTracker.track({ dispose: () => { hookDisposed = true; } });
  const cleanup = createRouteCleanupHook(hookTracker);
  cleanup();
  check(hookDisposed === true, "createRouteCleanupHook: invoking hook disposes tracker resources");
  const safeCleanup = createRouteCleanupHook(undefined);
  safeCleanup();
  check(typeof safeCleanup === "function", "createRouteCleanupHook: handles undefined tracker safely");

  // ── 3. Security: Sanitize ───────────────────────────────────────────────
  section("Hardening — Security: Sanitize");

  // sanitizeHTML
  check(sanitizeHTML("<b>Hello</b> <i>World</i>") === "Hello World", "sanitizeHTML: strips basic HTML tags");
  check(sanitizeHTML("&lt;script&gt;alert(1)&lt;/script&gt;hi") === "alert(1)hi", "sanitizeHTML: decodes named entities and strips tags");
  check(
    sanitizeHTML("&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;safe") === "alert(1)safe",
    "sanitizeHTML: strips hex-encoded script tags (&#x3C;script&#x3E;)",
  );
  check(sanitizeHTML(null as unknown as string) === "", "sanitizeHTML: null returns empty string");

  // sanitizeUsername
  check(sanitizeUsername("  Alice_99-ok!@#  ") === "Alice_99-ok", "sanitizeUsername: strips disallowed chars and trims");
  check(sanitizeUsername("a".repeat(50), 16).length === 16, "sanitizeUsername: enforces custom maxLen");
  check(sanitizeUsername("__proto__") === "__proto__", "sanitizeUsername: handles __proto__ safely as string");

  // sanitizeChatMessage
  check(
    sanitizeChatMessage("<b>hi</b>\x00\x07\nthere") === "hithere",
    "sanitizeChatMessage: strips HTML and control chars",
  );
  check(
    sanitizeChatMessage("&#x3c;img src=x onerror=alert(1)&#x3e;hello") === "hello",
    "sanitizeChatMessage: strips lowercase hex entity XSS tag",
  );
  check(sanitizeChatMessage("x".repeat(600)).length === 500, "sanitizeChatMessage: enforces default 500 char limit");

  // sanitizeSearchQuery
  check(sanitizeSearchQuery("jazz &lt;b&gt;lounge?!@#") === "jazz lounge?!", "sanitizeSearchQuery: keeps safe punctuation, strips HTML");
  check(sanitizeSearchQuery("q".repeat(150)).length === 100, "sanitizeSearchQuery: enforces default 100 char limit");

  // sanitizeProfileBio
  check(
    sanitizeProfileBio("Line 1\nLine 2\tTab\x00<b>bold</b>") === "Line 1\nLine 2\tTabbold",
    "sanitizeProfileBio: preserves newlines/tabs while stripping control chars and HTML",
  );
  check(sanitizeProfileBio("b".repeat(400)).length === 300, "sanitizeProfileBio: enforces default 300 char limit");

  // escapeForAttribute
  check(
    escapeForAttribute(`"hello" & <tag attr='1'>/`) === `&quot;hello&quot; &amp; &lt;tag attr=&#x27;1&#x27;&gt;&#x2F;`,
    "escapeForAttribute: escapes &, \", ', <, >, /",
  );

  // isValidEmail
  check(isValidEmail("player@barmo.gg") === true, "isValidEmail: valid email accepted");
  check(isValidEmail("not-an-email") === false, "isValidEmail: missing @ rejected");
  check(isValidEmail("@barmo.gg") === false, "isValidEmail: missing local part rejected");
  check(isValidEmail("a".repeat(250) + "@b.com") === false, "isValidEmail: >254 chars rejected");

  // containsXSSPattern
  check(containsXSSPattern("<script>alert(1)</script>") === true, "containsXSSPattern: detects <script>");
  check(containsXSSPattern("<img src=x onerror=alert(1)>") === true, "containsXSSPattern: detects onerror=");
  check(containsXSSPattern("javascript:alert(1)") === true, "containsXSSPattern: detects javascript: URI");
  check(containsXSSPattern("vbscript:msgbox(1)") === true, "containsXSSPattern: detects vbscript: URI");
  check(containsXSSPattern("data:text/html,<p>hi</p>") === true, "containsXSSPattern: detects data:text/html");
  check(containsXSSPattern("eval('1+1')") === true, "containsXSSPattern: detects eval(");
  check(containsXSSPattern("Hello, welcome to Barmo!") === false, "containsXSSPattern: clean text returns false");

  // ReDoS long-string resistance
  const t0 = Date.now();
  const longBad = "<".repeat(50_000) + "onmouseover" + " ".repeat(10_000) + "hello";
  sanitizeHTML(longBad);
  containsXSSPattern(longBad);
  const elapsedMs = Date.now() - t0;
  check(elapsedMs < 500, `ReDoS resistance: 60k-char adversarial string processed in ${elapsedMs}ms (<500ms)`);

  // ── 4. Security: Rate Limiter ───────────────────────────────────────────
  section("Hardening — Security: RateLimiter");

  const limiter = new RateLimiter(3, 10_000);
  check(limiter.tryConsume("user-1").allowed === true, "RateLimiter: 1st request allowed");
  check(limiter.tryConsume("user-1").allowed === true, "RateLimiter: 2nd request allowed");
  check(limiter.tryConsume("user-1").allowed === true, "RateLimiter: 3rd request allowed");
  const blocked = limiter.tryConsume("user-1");
  check(blocked.allowed === false, "RateLimiter: 4th request blocked");
  check(blocked.retryAfterMs > 0, "RateLimiter: blocked request provides retryAfterMs > 0");

  // Per-key isolation
  check(limiter.tryConsume("user-2").allowed === true, "RateLimiter: per-key isolation allows user-2");
  check(limiter.getStats("user-1").remaining === 0, "RateLimiter: user-1 remaining is 0");
  check(limiter.getStats("user-2").remaining === 2, "RateLimiter: user-2 remaining is 2");

  // Reset
  limiter.reset("user-1");
  check(limiter.getStats("user-1").remaining === 3, "RateLimiter: reset restores remaining to maxRequests");

  // Undefined key uses default bucket
  check(limiter.tryConsume(undefined).allowed === true, "RateLimiter: undefined key consumes default bucket");
  check(limiter.getStats(undefined).remaining === 2, "RateLimiter: undefined key stats reflect consumption");

  // 0 maxRequests blocks all requests
  const zeroLimiter = new RateLimiter(0, 10_000);
  check(zeroLimiter.tryConsume("any").allowed === false, "RateLimiter: maxRequests=0 blocks all requests");
  check(zeroLimiter.getStats("any").remaining === 0, "RateLimiter: maxRequests=0 has 0 remaining");

  // Prototype pollution key safety
  const protoBefore = ({} as Record<string, unknown>)["timestamps"];
  check(limiter.tryConsume("__proto__").allowed === true, "RateLimiter: __proto__ key handled safely");
  check(limiter.tryConsume("constructor").allowed === true, "RateLimiter: constructor key handled safely");
  check(({} as Record<string, unknown>)["timestamps"] === protoBefore, "RateLimiter: Object.prototype not polluted");

  // Factory helpers
  const chatLim = createChatLimiter();
  check(chatLim.getStats().remaining === 10, "createChatLimiter: 10 requests per window");
  const searchLim = createSearchLimiter();
  check(searchLim.getStats().remaining === 5, "createSearchLimiter: 5 requests per window");
  const apiLim = createAPILimiter();
  check(apiLim.getStats().remaining === 30, "createAPILimiter: 30 requests per window");

  // ── 5. Cross-Module Integration ─────────────────────────────────────────
  section("Hardening — Cross-Module Integration");

  // Sanitized chat + rate limiter workflow
  const chatGate = createChatLimiter();
  const sendChat = (userId: string, rawMsg: string): { ok: boolean; text?: string } => {
    const res = chatGate.tryConsume(userId);
    if (!res.allowed) return { ok: false };
    const clean = sanitizeChatMessage(rawMsg);
    if (!clean || containsXSSPattern(clean)) return { ok: false };
    return { ok: true, text: clean };
  };

  check(sendChat("p1", "<b>GG</b> wp!").text === "GG wp!", "Integration: sanitized chat + rate limit allows clean message");
  check(sendChat("p1", "javascript:alert(1)").ok === false, "Integration: XSS pattern rejected even when rate limit allows");

  // Memory tracker + quality tier integration
  const sceneTracker = new ResourceTracker();
  const texBytes = estimateTextureMemory(2048, 2048, "RGBA"); // 16 MB
  sceneTracker.track({ dispose: () => {} });
  const vramMB = estimateVRAM(1920, 1080, 2) + texBytes / (1024 * 1024);
  check(!isMemoryPressure(vramMB, 512), "Integration: combined framebuffer + texture VRAM under 512MB");
  check(shouldReduceQuality(60, vramMB) === "ultra", "Integration: 60fps + ~47MB VRAM selects ultra tier");
  const onLeave = createRouteCleanupHook(sceneTracker);
  onLeave();
  check(sceneTracker.getStats().tracked === 0, "Integration: route cleanup hook clears scene tracker");
}
