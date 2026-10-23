"use client";

import { AVS, hex } from "@/lib/world/avatar";

export function Dot({ av, name, size = 34, on, top }: { av: string; name: string; size?: number; on?: boolean; top?: number }) {
  const c = AVS.find((a) => a.id === av) || AVS[0];
  return (
    <span className="avd" style={{ width: size, height: size, background: hex(top ?? c.c), fontSize: size * 0.44 }} aria-hidden="true">
      {(name || "?").slice(0, 1).toUpperCase()}
      {on !== undefined && <i className={on ? "pres on" : "pres"} />}
    </span>
  );
}
