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

  section("milestone 3: responsive shell & app alignment guards");
  // 1. Verify AppShell does not add body.app
  const appShellSrc = fs.readFileSync(path.join(process.cwd(), "components/app/AppShell.tsx"), "utf8");
  check(!appShellSrc.includes('classList.add("app")'), "AppShell does not add legacy body.app class");

  // 2. Verify body:has(.b4-shell) resets left padding
  check(css.includes("body:has(.b4-shell)"), "globals.css guards body padding for .b4-shell");

  // 3. Verify breakpoint harmonization at 960px
  check(css.includes("@media(min-width:960px)"), "legacy body.app desktop media query harmonized to 960px");
  check(css.includes("@media (max-width: 960px)"), "modern shell sidebar and dock switch at 960px");

  // 4. Verify mobile topbar responsiveness (<=430px)
  check(css.includes("@media (max-width: 430px)"), "globals.css includes <=430px mobile topbar rules");
  check(/@media \(max-width: 430px\)[\s\S]*?\.b4-gfx-btn\s*\{\s*display:\s*none/.test(css), "GFX toggle collapsed on <=430px screens");
  check(/@media \(max-width: 560px\)[\s\S]*?\.b4-online-indicator\s*\{\s*display:\s*none/.test(css), "Online indicator collapsed on mobile");
  const gfxHasInlineDisplay = /className="b4-gfx-btn"[\s\S]*?style=\{\{[^}]*display:\s*["']flex["']/.test(appShellSrc);
  const gfxHasImportant = /@media\s*\(max-width:\s*430px\)[\s\S]*?\.b4-gfx-btn\s*\{[^}]*display:\s*none\s*!important/.test(css);
  check(!gfxHasInlineDisplay || gfxHasImportant, "GFX button display:none on <=430px is not overridden by inline style");

  // 5. Verify HomeView mobile header nav override fix
  const homeViewSrc = fs.readFileSync(path.join(process.cwd(), "components/HomeView.tsx"), "utf8");
  check(!/<div className="u3-header-nav"[^>]*style=\{\{[^}]*display:\s*["']flex["']/.test(homeViewSrc), "HomeView nav does not have inline display:flex overriding mobile hiding");

  // 6. Verify games modal maxHeight and overflow guard
  const gamesPageSrc = fs.readFileSync(path.join(process.cwd(), "app/games/page.tsx"), "utf8");
  check(gamesPageSrc.includes('maxHeight: "85vh"') && gamesPageSrc.includes('overflowY: "auto"'), "Games modal has maxHeight 85vh and overflowY auto guard");

  // 7. Verify wide content responsive padding
  check(css.includes(".b4-content.b4-content-wide"), "globals.css includes .b4-content.b4-content-wide definition");
  check(/@media \(max-width: 960px\)[\s\S]*?\.b4-content\.b4-content-wide\s*\{\s*padding:\s*16px/.test(css), "Wide content gets 16px padding on mobile screens");
}
