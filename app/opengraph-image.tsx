import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BARMO Lounge v2.4 — AAA Cyberpunk Gaming Universe";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 40%, #1e1338 0%, #080c14 70%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          padding: "48px 64px",
          color: "#fff",
        }}
      >
        {/* Subtle Cyber Grid Glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: "1px solid rgba(139, 92, 246, 0.25)",
            margin: "24px",
            borderRadius: "20px",
            display: "flex",
          }}
        />

        {/* Top Tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(139, 92, 246, 0.15)",
            border: "1px solid rgba(139, 92, 246, 0.4)",
            padding: "8px 20px",
            borderRadius: "999px",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#c45cff", letterSpacing: "2px" }}>
            AAA NEXT-GEN MULTIPLAYER PLATFORM
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: "64px",
            fontWeight: 900,
            letterSpacing: "-1px",
            color: "#ffffff",
            marginBottom: "16px",
            textShadow: "0 0 40px rgba(139, 92, 246, 0.6)",
          }}
        >
          BARMO LOUNGE
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            fontSize: "24px",
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.75)",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
            marginBottom: "36px",
          }}
        >
          7 Anti-Gravity Sectors · 5 Esports Game Engines · Spatial WebRTC Audio · Cyber Armory
        </div>

        {/* Feature Pills */}
        <div
          style={{
            display: "flex",
            gap: "14px",
          }}
        >
          {[
            ["7 3D SECTORS", "#06b6d4"],
            ["ESPORTS BRACKETS", "#8b5cf6"],
            ["PROCEDURAL WEBAUDIO", "#ec4899"],
            ["TOKEN ECONOMY", "#10b981"],
          ].map(([text, color]) => (
            <div
              key={text}
              style={{
                display: "flex",
                padding: "8px 18px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.05)",
                border: `1px solid ${color}66`,
                color,
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "1px",
              }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
