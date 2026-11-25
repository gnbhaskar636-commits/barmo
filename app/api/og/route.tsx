import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get("title")?.slice(0, 80) || "BARMO LOUNGE";
    const subtitle =
      searchParams.get("subtitle")?.slice(0, 140) ||
      "7 Anti-Gravity Sectors · 5 Esports Game Engines · Spatial WebRTC Audio";
    const badge = searchParams.get("badge")?.slice(0, 40) || "CYBERPUNK GAMING UNIVERSE";
    const rawAccent = searchParams.get("accent") || "";
    const accent = /^#[0-9a-fA-F]{6}$/.test(rawAccent) ? rawAccent : "#8b5cf6";

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
            background: "radial-gradient(circle at 50% 40%, #17102e 0%, #060910 80%)",
            fontFamily: "system-ui, sans-serif",
            position: "relative",
            padding: "48px 64px",
            color: "#fff",
          }}
        >
          {/* Subtle Cyber Grid Border */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: `1px solid ${accent}44`,
              margin: "24px",
              borderRadius: "20px",
              display: "flex",
            }}
          />

          {/* Top Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${accent}66`,
              padding: "6px 18px",
              borderRadius: "999px",
              marginBottom: "20px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 800, color: accent, letterSpacing: "2px" }}>
              {badge.toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              fontSize: "60px",
              fontWeight: 900,
              letterSpacing: "-1px",
              color: "#ffffff",
              marginBottom: "14px",
              textAlign: "center",
              textShadow: `0 0 35px ${accent}88`,
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.75)",
              textAlign: "center",
              maxWidth: "840px",
              lineHeight: 1.4,
              marginBottom: "32px",
            }}
          >
            {subtitle}
          </div>

          {/* Footer Branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255, 255, 255, 0.5)" }}>
              barmo.gg
            </span>
            <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>·</span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: accent }}>
              PLAY NOW IN BROWSER
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch {
    return new Response("Failed to generate image", { status: 500 });
  }
}
