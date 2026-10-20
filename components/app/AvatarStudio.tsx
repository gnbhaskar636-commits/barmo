"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCS, AVS, BACKS, FACES, FITS, HAIRS, PALETTE, hex,
  type Acc, type AvatarConfig,
} from "@/lib/world/avatar";
import { runPreview } from "@/lib/world/preview";
import { cfgFromPub, cleanLook, type Look } from "@/lib/social/store";

export interface StudioValue {
  av: string;
  acc: Acc;
  top?: number;
  look: Look;
}

const pickRand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function Swatches({ list, value, onPick, label }: { list: number[]; value?: number; onPick: (c: number) => void; label: string }) {
  return (
    <div className="swatches" role="group" aria-label={label}>
      {list.map((c) => (
        <button key={c} className={"swatch" + (value === c ? " on" : "")} style={{ background: hex(c) }} onClick={() => onPick(c)} aria-label={`${label} ${hex(c)}`} />
      ))}
    </div>
  );
}

function Opts<T extends string>({ list, value, onPick }: { list: { id: T; n: string }[]; value?: T; onPick: (v: T) => void }) {
  return (
    <div className="accs">
      {list.map((o) => <button key={o.id} className={"chip" + (value === o.id ? " on" : "")} onClick={() => onPick(o.id)}>{o.n}</button>)}
    </div>
  );
}

/** Live 3D avatar customiser. */
export default function AvatarStudio({ value, onChange }: { value: StudioValue; onChange: (v: StudioValue) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const pv = useRef<ReturnType<typeof runPreview> | null>(null);
  const [tab, setTab] = useState<"base" | "hair" | "outfit" | "gear">("base");

  const cfg: AvatarConfig = useMemo(() => cfgFromPub(value), [value]);
  const base = AVS.find((a) => a.id === value.av) || AVS[0];

  useEffect(() => {
    if (!host.current) return;
    pv.current = runPreview(host.current, cfg);
    return () => { pv.current?.destroy(); pv.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { pv.current?.set(cfg); }, [cfg]);

  const L = value.look;
  const setLook = (p: Look) => onChange({ ...value, look: cleanLook({ ...L, ...p }) });
  const preset = (id: string) => onChange({ av: id, acc: "none", top: undefined, look: {} });
  const randomize = () =>
    onChange({
      av: value.av,
      acc: pickRand(ACCS).id,
      top: pickRand(PALETTE.top),
      look: cleanLook({
        skin: pickRand(PALETTE.skin), hair: pickRand(PALETTE.hair), hs: pickRand(HAIRS).id, bottom: pickRand(PALETTE.bottom),
        shoe: pickRand(PALETTE.shoe), trim: pickRand(PALETTE.trim), fit: pickRand(FITS).id, back: pickRand(BACKS).id,
        face: pickRand(FACES).id, gl: Math.random() < 0.25, h: 0.97 + Math.random() * 0.08, build: 0.95 + Math.random() * 0.2,
      }),
    });

  return (
    <div className="studio2">
      <div className="pvwrap">
        <div className="pv3d" ref={host} aria-label="3D avatar preview" />
        <div className="pvbar">
          {["wave", "dance", "clap", "jump"].map((e) => <button key={e} className="btn g sm" onClick={() => pv.current?.emote(e)}>{e === "wave" ? "👋" : e === "dance" ? "💃" : e === "clap" ? "👏" : "🤾"} {e}</button>)}
          <button className="btn g sm" onClick={randomize}>🎲 Surprise me</button>
        </div>
      </div>
      <div className="pvctl">
        <div className="tabs2" role="tablist">
          {([["base", "Body"], ["hair", "Hair & face"], ["outfit", "Outfit"], ["gear", "Gear"]] as const).map(([k, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{n}</button>
          ))}
        </div>

        {tab === "base" && (
          <>
            <span className="lbl">Starting look</span>
            <div className="avr">
              {AVS.map((a) => (
                <button key={a.id} className={"avc" + (a.id === value.av ? " on" : "")} onClick={() => preset(a.id)}><i style={{ background: hex(a.c) }} />{a.n}</button>
              ))}
            </div>
            <span className="lbl">Skin tone</span>
            <Swatches list={PALETTE.skin} value={L.skin ?? base.o.skin} onPick={(c) => setLook({ skin: c })} label="Skin" />
            <label htmlFor="sh">Height</label>
            <input id="sh" type="range" min={94} max={106} value={Math.round((L.h ?? base.o.h ?? 1) * 100)} onChange={(e) => setLook({ h: Number(e.target.value) / 100 })} />
            <label htmlFor="sb">Build</label>
            <input id="sb" type="range" min={90} max={120} value={Math.round((L.build ?? base.o.build ?? 1) * 100)} onChange={(e) => setLook({ build: Number(e.target.value) / 100 })} />
          </>
        )}

        {tab === "hair" && (
          <>
            <span className="lbl">Hairstyle</span>
            <Opts list={HAIRS} value={L.hs ?? base.o.hs ?? "short"} onPick={(v) => setLook({ hs: v })} />
            <span className="lbl">Hair colour</span>
            <Swatches list={PALETTE.hair} value={L.hair ?? base.o.hair} onPick={(c) => setLook({ hair: c })} label="Hair" />
            <span className="lbl">Expression</span>
            <Opts list={FACES} value={L.face ?? base.o.face ?? "smile"} onPick={(v) => setLook({ face: v })} />
            <span className="lbl">Glasses</span>
            <Opts list={[{ id: "off", n: "None" }, { id: "on", n: "Round glasses" }]} value={(L.gl ?? base.o.gl) ? "on" : "off"} onPick={(v) => setLook({ gl: v === "on" })} />
          </>
        )}

        {tab === "outfit" && (
          <>
            <span className="lbl">Style</span>
            <Opts list={FITS} value={L.fit ?? base.o.fit ?? "tee"} onPick={(v) => setLook({ fit: v })} />
            <span className="lbl">Top colour</span>
            <Swatches list={PALETTE.top} value={value.top ?? base.o.top} onPick={(c) => onChange({ ...value, top: c })} label="Top" />
            <span className="lbl">Trousers</span>
            <Swatches list={PALETTE.bottom} value={L.bottom} onPick={(c) => setLook({ bottom: c })} label="Trousers" />
            <span className="lbl">Shoes</span>
            <Swatches list={PALETTE.shoe} value={L.shoe} onPick={(c) => setLook({ shoe: c })} label="Shoes" />
            <span className="lbl">Accent colour</span>
            <Swatches list={PALETTE.trim} value={L.trim ?? base.o.trim} onPick={(c) => setLook({ trim: c })} label="Accent" />
          </>
        )}

        {tab === "gear" && (
          <>
            <span className="lbl">Head accessory</span>
            <Opts list={ACCS} value={value.acc} onPick={(v) => onChange({ ...value, acc: v })} />
            <span className="lbl">Back item</span>
            <Opts list={BACKS} value={L.back ?? "none"} onPick={(v) => setLook({ back: v })} />
            <p className="hint">Wings and capes use your accent colour.</p>
          </>
        )}
      </div>
    </div>
  );
}
