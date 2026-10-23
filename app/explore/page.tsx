"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { runWorld } from "@/lib/world/world";
import { cfgOf } from "@/lib/world/avatar";

/** Non-authenticated world preview — same 3D lounge, camera sweep, no presence. */
export default function ExplorePage() {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const world = runWorld(hostRef.current, {
      full: false,
      myName: "Guest",
      myCfg: cfgOf("atlas"),
    });
    return () => world.destroy();
  }, []);

  return (
    <div className="stage full" ref={hostRef} style={{ position: "relative", height: "100dvh" }}>
      <button className="btn g exit" onClick={() => router.push("/")}>
        Back
      </button>
      <details className="hud" open>
        <summary>
          <b>BARMO Lounge — preview</b>
        </summary>
        <span style={{ color: "var(--mute)" }}>
          Sign up to walk around as your own avatar and meet other professionals here in
          real time.
        </span>
      </details>
    </div>
  );
}
