// ---------------------------------------------------------------------------
// lib/security/sanitize.ts — Input Sanitization & XSS Prevention
// Phase 19 – Performance & Security Hardening
// ---------------------------------------------------------------------------

// ── internal helpers -------------------------------------------------------

/** Safely coerce any value to a string, returning "" for null / undefined. */
function toString(input: unknown): string {
  if (input === null || input === undefined) return "";
  if (typeof input !== "string") return "";
  return input;
}

/** Strip all HTML tags in linear time without regex backtracking. */
function stripTags(s: string): string {
  let out = "";
  let pos = 0;
  while (pos < s.length) {
    const start = s.indexOf("<", pos);
    if (start === -1) {
      out += s.slice(pos);
      break;
    }
    out += s.slice(pos, start);
    const end = s.indexOf(">", start + 1);
    if (end === -1) {
      out += s.slice(start);
      break;
    }
    pos = end + 1;
  }
  return out;
}

/** Decode common HTML entities into their literal characters. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_m, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

/** Remove ASCII control characters (0x00-0x1F) except \n and \t. */
function stripControlChars(s: string, keepNewlines = false): string {
  if (keepNewlines) {
    // Keep \n (0x0A) and \t (0x09)
    return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }
  return s.replace(/[\x00-\x1F]/g, "");
}

/** Truncate to `maxLen` characters. */
function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

// ── public API -------------------------------------------------------------

/**
 * Strip **all** HTML tags and entities, returning plain text.
 */
export function sanitizeHTML(input: string): string {
  let s = toString(input);
  s = stripTags(s);
  s = decodeEntities(s);
  // Second pass in case entities decoded into tags
  s = stripTags(s);
  return s.trim();
}

/**
 * Sanitize a username: allow alphanumeric, spaces, hyphens, and underscores.
 * Everything else is removed.
 */
export function sanitizeUsername(
  input: string,
  maxLen: number = 32,
): string {
  const s = toString(input);
  const len =
    typeof maxLen === "number" && Number.isFinite(maxLen) && maxLen > 0
      ? maxLen
      : 32;
  return truncate(
    s.replace(/[^a-zA-Z0-9 _-]/g, "").trim(),
    len,
  );
}

/**
 * Sanitize a chat message: strip HTML, control characters, and enforce a
 * max length.
 */
export function sanitizeChatMessage(
  input: string,
  maxLen: number = 500,
): string {
  let s = toString(input);
  const len =
    typeof maxLen === "number" && Number.isFinite(maxLen) && maxLen > 0
      ? maxLen
      : 500;
  s = stripTags(s);
  s = decodeEntities(s);
  s = stripTags(s); // second pass
  s = stripControlChars(s);
  return truncate(s.trim(), len);
}

/**
 * Sanitize a search query: strip special characters, HTML, and enforce a
 * max length.
 */
export function sanitizeSearchQuery(
  input: string,
  maxLen: number = 100,
): string {
  let s = toString(input);
  const len =
    typeof maxLen === "number" && Number.isFinite(maxLen) && maxLen > 0
      ? maxLen
      : 100;
  s = stripTags(s);
  s = decodeEntities(s);
  s = stripTags(s);
  // Keep only word chars, spaces, hyphens, and basic punctuation (., ?, !)
  s = s.replace(/[^\w\s\-.?!]/g, "");
  s = stripControlChars(s);
  return truncate(s.trim(), len);
}

/**
 * Sanitize a profile bio: strip HTML and control characters but allow
 * newlines.  Enforce max length.
 */
export function sanitizeProfileBio(
  input: string,
  maxLen: number = 300,
): string {
  let s = toString(input);
  const len =
    typeof maxLen === "number" && Number.isFinite(maxLen) && maxLen > 0
      ? maxLen
      : 300;
  s = stripTags(s);
  s = decodeEntities(s);
  s = stripTags(s);
  s = stripControlChars(s, /* keepNewlines */ true);
  return truncate(s.trim(), len);
}

/**
 * Escape a string so it can be safely inserted into an HTML attribute
 * (double-quoted).
 */
export function escapeForAttribute(input: string): string {
  const s = toString(input);
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Basic email format validation (not exhaustive RFC 5322, but covers the
 * vast majority of real-world addresses).
 */
export function isValidEmail(email: string): boolean {
  const s = toString(email);
  if (s.length === 0 || s.length > 254) return false;
  // Simple but practical pattern
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * Detect common XSS attack vectors in a string.
 *
 * Checks for:
 * - `<script` / `</script` tags
 * - Inline event handlers (`onerror=`, `onload=`, `onclick=`, …)
 * - `javascript:` / `vbscript:` / `data:` URIs
 * - `eval(`, `expression(`, `url(`
 */
export function containsXSSPattern(input: string): boolean {
  const s = toString(input).toLowerCase();
  if (s.length === 0) return false;

  const patterns: RegExp[] = [
    /<\s*script/i,
    /<\s*\/\s*script/i,
    /on(error|load|click|mouseover|mouseout|focus|blur|submit|change|input|keydown|keyup|keypress|abort|dblclick|drag|drop|mousedown|mouseup|resize|scroll|unload|beforeunload|pointerdown|pointerup|touchstart|touchend)\s*=/i,
    /javascript\s*:/i,
    /vbscript\s*:/i,
    /data\s*:\s*text\/html/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
    /url\s*\(/i,
  ];

  return patterns.some((p) => p.test(s));
}
