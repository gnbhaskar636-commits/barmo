"use client";

import { useId } from "react";

/** The BARMO mark: a brass "B" inside an orbit, on a night-blue tile. */
export function LogoMark({ size = 28, title = "BARMO" }: { size?: number; title?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg className="logomark" viewBox="0 0 512 512" width={size} height={size} role="img" aria-label={title} focusable="false">
      <defs>
        <linearGradient id={"g" + id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3dfb2" /><stop offset=".55" stopColor="#c8a26b" /><stop offset="1" stopColor="#9a7544" /></linearGradient>
        <linearGradient id={"b" + id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1c2135" /><stop offset="1" stopColor="#0c0f18" /></linearGradient>
        <radialGradient id={"r" + id} cx=".28" cy=".2" r=".85"><stop offset="0" stopColor="#2d3556" stopOpacity=".9" /><stop offset="1" stopColor="#2d3556" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#b${id})`} />
      <rect width="512" height="512" rx="112" fill={`url(#r${id})`} />
      <path d="M100.1 346 A180 180 0 0 1 383.3 128.7" fill="none" stroke={`url(#g${id})`} strokeWidth="10" strokeLinecap="round" opacity=".6" />
      <circle cx="383.3" cy="128.7" r="20" fill="#f6e6c0" />
      <g transform="translate(-22 0)"><path d="M190 128 V384 M190 128 H278 a58 58 0 0 1 0 116 H190 M190 244 H296 a70 70 0 0 1 0 140 H190" fill="none" stroke={`url(#g${id})`} strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" /></g>
    </svg>
  );
}
