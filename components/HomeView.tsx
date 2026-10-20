"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { runWorld } from "@/lib/world/world";
import { AVS, cfgOf, hex } from "@/lib/world/avatar";
import { useHub } from "@/components/HubProvider";

export default function HomeView() {
  const router = useRouter();
  const hub = useHub();
  const hostRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [av, setAv] = useState("atlas");

  // Prefill from a saved profile so returning visitors keep their identity.
  useEffect(() => {
    if (hub.me) {
      setName((n) => n || hub.me!.name);
      setAv(hub.me.av);
    }
  }, [hub.me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hostRef.current) return;
    const w = runWorld(hostRef.current, { full: false, myName: name.trim() || "You", myCfg: cfgOf(av) });
    return () => w.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [av]);

  const enter = () => {
    const n = (name.trim() || "Guest").slice(0, 20);
    hub.saveProfile({ name: n, av });
    router.push(`/world?name=${encodeURIComponent(n)}&av=${av}`);
  };

  return (
    <div className="home">
      <header className="top">
        <span className="logo">BARMO</span>
        <span className="pill">Open lounge · no sign-up</span>
      </header>
      <section className="hero">
        <div className="join">
          <h1>Meet people where the conversation happens.</h1>
          <p>A shared 3D lounge. Pick a name and an avatar, walk in, and see everyone who is there right now.</p>
          <label className="lbl" htmlFor="nm">Your name</label>
          <input id="nm" className="inp" maxLength={20} placeholder="e.g. Bhaskar" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enter()} />
          <span className="lbl">Your avatar</span>
          <div className="avr">
            {AVS.map((a) => (
              <button key={a.id} className={"avc" + (a.id === av ? " on" : "")} onClick={() => setAv(a.id)}>
                <i style={{ background: hex(a.c) }} />{a.n}
              </button>
            ))}
          </div>
          <div className="row">
            <button className="btn" onClick={enter}>Enter the lounge</button>
            <button className="btn g" onClick={() => router.push("/explore")}>Just look around</button>
            <button className="btn g" onClick={() => router.push("/community")}>Community</button>
          </div>
        </div>
        <div className="stage" ref={hostRef} style={{ height: 440 }} />
      </section>
    </div>
  );
}
