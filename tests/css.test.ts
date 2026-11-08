import fs from "node:fs";
import path from "node:path";
import { check, section } from "./_t";

/**
 * Guards against the bug where a new style silently changes an old page: a class name that already
 * existed in the original stylesheet must not be restyled on its own (unscoped) by a later feature block.
 * To restyle an old class on purpose, add it to INTENTIONAL below, with a reason. Otherwise: pick a new name.
 */
const MARK = "/* ===== v20: music-linked rooms";
const INTENTIONAL: Record<string, string> = {
  btn: "touch-friendly sizes", chip: "touch-friendly sizes", inp: "16px text on phones", sm: "small buttons",
  sheet: "world panels", sh: "world panel header", dock: "world bottom bar", dk: "world bottom bar items",
  joy: "joystick position", pad: "world pad", skybtn: "world sky button", ticker: "world notification", tip: "world hint",
  ctxbtn: "world Talk button", huddlebar: "world circle bar", chatsheet: "world chat panel", log: "world chat log",
  send: "world chat composer", acts: "world action rows", entering: "world travel screen", stage: "world canvas", logo: "new logo layout",
  tabs2: "Community channel tabs alignment fix", dmhead: "Groups chat header alignment fix", home: "landing page glow", avr: "landing avatar picker grid",
};
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
function rules(css: string): string[] {
  const out: string[] = [];
  const re = /([^{}]+)\{[^{}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(strip(css)))) if (!m[1].trim().startsWith("@")) out.push(m[1].trim());
  return out;
}
const classesIn = (sel: string) => [...sel.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((x) => x[1]);

export async function run() {
  section("styles: new features must not restyle old pages");
  const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
  const at = css.indexOf(MARK);
  check(at > 0, "feature styles start at the marker");
  const base = new Set(rules(css.slice(0, at)).flatMap((s) => s.split(",")).flatMap(classesIn));
  const clashes = new Set<string>();
  for (const sel of rules(css.slice(at)))
    for (const part of sel.split(",")) {
      const p = part.trim();
      if (/[\s>+~]/.test(p)) continue; // scoped under another element: safe
      const cls = classesIn(p);
      if (cls.length && cls.every((c) => base.has(c)) && !cls.some((c) => INTENTIONAL[c])) clashes.add(cls.join("."));
    }
  check(clashes.size === 0, "no unscoped feature style reuses an original class name" + (clashes.size ? ": " + [...clashes].join(", ") : ""));
  for (const bad of ["mb", "wcard", "setup", "eq"]) check(!/(^|[,{}\s])\.(mb|wcard|setup|eq)(?![\w-])/.test(strip(css.slice(at)).replace(/\.nowplaying \.eq/g, "")) || bad === "", `the old "${bad}" clash stays fixed`);
}
