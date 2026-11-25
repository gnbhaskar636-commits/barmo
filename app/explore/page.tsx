"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { runWorld } from "@/lib/world/world";
import { cfgOf } from "@/lib/world/avatar";
import { ROOMS, type RoomId } from "@/lib/world/rooms";
import { getSectorGravityConfig } from "@/lib/world/physics";
import { useHub } from "@/components/HubProvider";

export default function ExplorePage() {
  const router = useRouter();
  const hub = useHub();
  const hostRef = useRef<HTMLDivElement>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomId>("lounge");

  useEffect(() => {
    if (!hostRef.current) return;
    const world = runWorld(hostRef.current, {
      full: false,
      room: selectedRoom,
      myName: hub.me?.name || "Explorer",
      myCfg: cfgOf(hub.me?.av || "atlas"),
    });
    return () => world.destroy();
  }, [selectedRoom, hub.me?.av, hub.me?.name]);

  const enterWorld = (id: RoomId) => {
    const name = hub.me?.name || "Explorer";
    const av = hub.me?.av || "atlas";
    router.push(`/world/${id}?name=${encodeURIComponent(name)}&av=${av}`);
  };

  const currentDef = ROOMS.find((r) => r.id === selectedRoom) || ROOMS[0];
  const currentGrav = getSectorGravityConfig(currentDef.id);

  return (
    <div className="stage full u3-explore-container" style={{ position: "relative", height: "100dvh", width: "100%" }}>
      {/* 3D Live Orbit Canvas */}
      <div ref={hostRef} style={{ width: "100%", height: "100%" }} />

      {/* Top Header Controls */}
      <header className="u3-explore-topbar">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn g u3-back-btn" onClick={() => router.push("/games")} title="Return to Games Launcher">
            ← Games Launcher
          </button>
          <button className="btn g u3-back-btn" onClick={() => router.push("/")} title="Exit to Portal Home">
            Portal Home
          </button>
        </div>
        <div className="u3-explore-badge">
          <span className="u3-pulse-dot" />
          <span>3D METAVERSE PREVIEW · {currentDef.name.toUpperCase()}</span>
        </div>
      </header>

      {/* Floating World Selector Carousel / Grid */}
      <aside className="u3-explore-drawer">
        <div className="u3-explore-card-head">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span className="u3-card-tag">METAVERSE WORLDS</span>
            <span
              className="u3-gravity-badge"
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.08)",
                border: `1px solid #${currentDef.color.toString(16).padStart(6, "0")}`,
                color: `#${currentDef.color.toString(16).padStart(6, "0")}`,
                fontWeight: 600,
              }}
            >
              {currentGrav.gravityFactor}g Gravity
            </span>
          </div>
          <h2>{currentDef.icon} {currentDef.name}</h2>
          <p>{currentDef.blurb}</p>
        </div>

        <div className="u3-explore-rooms-list">
          {ROOMS.map((r) => {
            const isSelected = r.id === selectedRoom;
            const rGrav = getSectorGravityConfig(r.id);
            const hexColor = `#${r.color.toString(16).padStart(6, "0")}`;
            return (
              <button
                key={r.id}
                className={`u3-room-card ${isSelected ? "on" : ""}`}
                onClick={() => setSelectedRoom(r.id)}
                style={{
                  borderLeft: isSelected ? `3px solid ${hexColor}` : undefined,
                }}
              >
                <span className="u3-room-card-icon" style={{ textShadow: `0 0 12px ${hexColor}` }}>{r.icon}</span>
                <div className="u3-room-card-text">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <b>{r.name}</b>
                    <small style={{ color: hexColor, fontWeight: 600, marginLeft: 6 }}>{rGrav.gravityFactor}g</small>
                  </div>
                  <small>{r.tag}</small>
                </div>
              </button>
            );
          })}
        </div>

        <div className="u3-explore-actions" style={{ display: "flex", gap: 8 }}>
          <button className="btn u3-btn-enter" style={{ flex: 1 }} onClick={() => enterWorld(selectedRoom)}>
            Enter {currentDef.name} →
          </button>
          <Link
            href={`/world/${selectedRoom}`}
            className="btn g"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 14px" }}
            title={`Direct link to /world/${selectedRoom}`}
          >
            Direct 🔗
          </Link>
        </div>
      </aside>
    </div>
  );
}
