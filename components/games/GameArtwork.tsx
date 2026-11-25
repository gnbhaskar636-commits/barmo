"use client";

import React from "react";

export function GameCover({ id, className = "" }: { id: string; className?: string }) {
  switch (id) {
    case "race":
      return (
        <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="race-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e0b2b" />
              <stop offset="50%" stopColor="#0d1326" />
              <stop offset="100%" stopColor="#05070f" />
            </linearGradient>
            <linearGradient id="neon-track" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="car-body" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <radialGradient id="warp-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="240" fill="url(#race-bg)" />
          {/* Track Grid Lines (Perspective) */}
          <path d="M 200 40 L 0 240" stroke="url(#neon-track)" strokeWidth="1.5" opacity="0.6" />
          <path d="M 200 40 L 80 240" stroke="url(#neon-track)" strokeWidth="1.5" opacity="0.6" />
          <path d="M 200 40 L 160 240" stroke="url(#neon-track)" strokeWidth="1.5" opacity="0.8" />
          <path d="M 200 40 L 240 240" stroke="url(#neon-track)" strokeWidth="1.5" opacity="0.8" />
          <path d="M 200 40 L 320 240" stroke="url(#neon-track)" strokeWidth="1.5" opacity="0.6" />
          <path d="M 200 40 L 400 240" stroke="url(#neon-track)" strokeWidth="1.5" opacity="0.6" />
          {/* Horizontal Grid lines */}
          <line x1="170" y1="80" x2="230" y2="80" stroke="#f43f5e" strokeWidth="1" opacity="0.3" />
          <line x1="140" y1="120" x2="260" y2="120" stroke="#f43f5e" strokeWidth="1.2" opacity="0.4" />
          <line x1="90" y1="170" x2="310" y2="170" stroke="#06b6d4" strokeWidth="1.5" opacity="0.5" />
          <line x1="20" y1="225" x2="380" y2="225" stroke="#06b6d4" strokeWidth="2" opacity="0.7" />
          {/* Speed Streaks */}
          <line x1="40" y1="30" x2="140" y2="30" stroke="#06b6d4" strokeWidth="2" strokeDasharray="15 30" opacity="0.5" />
          <line x1="260" y1="25" x2="380" y2="25" stroke="#f43f5e" strokeWidth="2" strokeDasharray="20 40" opacity="0.5" />
          <line x1="10" y1="90" x2="90" y2="90" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="10 20" opacity="0.4" />
          {/* Warp Glow Horizon */}
          <circle cx="200" cy="50" r="90" fill="url(#warp-glow)" />
          {/* Anti-Grav Racer Silhouette */}
          <g transform="translate(140, 115)">
            {/* Plasma Thruster Flames */}
            <path d="M 40 55 L 30 78 L 46 60 Z" fill="#06b6d4" />
            <path d="M 80 55 L 74 60 L 90 78 Z" fill="#06b6d4" />
            <ellipse cx="60" cy="55" rx="14" ry="4" fill="#f43f5e" />
            {/* Aerodynamic Chassis */}
            <path d="M 60 0 L 78 28 L 105 48 L 96 56 L 60 52 L 24 56 L 15 48 L 42 28 Z" fill="url(#car-body)" />
            {/* Cockpit Canopy */}
            <path d="M 60 8 L 70 26 L 60 32 L 50 26 Z" fill="#06090e" stroke="#06b6d4" strokeWidth="1.5" />
            {/* Anti-Grav Winglets */}
            <path d="M 15 44 L 0 52 L 20 54 Z" fill="#3b82f6" />
            <path d="M 105 44 L 120 52 L 100 54 Z" fill="#3b82f6" />
            {/* Neon Accent Lines */}
            <line x1="45" y1="35" x2="75" y2="35" stroke="#f43f5e" strokeWidth="2" />
          </g>
          {/* Overlay Text Pill */}
          <rect x="24" y="20" width="85" height="22" rx="4" fill="rgba(6,9,14,0.7)" stroke="rgba(244,63,94,0.6)" />
          <text x="32" y="35" fill="#f43f5e" fontSize="10" fontWeight="800" letterSpacing="1">WARP GP</text>
        </svg>
      );

    case "dice":
      return (
        <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="dice-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#150d2a" />
              <stop offset="50%" stopColor="#0b0f1d" />
              <stop offset="100%" stopColor="#05070d" />
            </linearGradient>
            <linearGradient id="cube-f1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
            <linearGradient id="cube-f2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="cube-f3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5b21b6" />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>
          </defs>
          <rect width="400" height="240" fill="url(#dice-bg)" />
          {/* Floating Quantum Rings */}
          <ellipse cx="200" cy="120" rx="140" ry="60" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="6 8" opacity="0.3" transform="rotate(-15 200 120)" />
          <ellipse cx="200" cy="120" rx="160" ry="70" stroke="#06b6d4" strokeWidth="1" strokeDasharray="8 12" opacity="0.2" transform="rotate(25 200 120)" />
          {/* 3D Isometric Cyber Cube (Die 1) */}
          <g transform="translate(145, 60)">
            {/* Top Face */}
            <path d="M 55 0 L 110 32 L 55 64 L 0 32 Z" fill="url(#cube-f2)" stroke="#c4b5fd" strokeWidth="1.5" />
            {/* Left Face */}
            <path d="M 0 32 L 55 64 L 55 128 L 0 96 Z" fill="url(#cube-f1)" stroke="#8b5cf6" strokeWidth="1.5" />
            {/* Right Face */}
            <path d="M 55 64 L 110 32 L 110 96 L 55 128 Z" fill="url(#cube-f3)" stroke="#7c3aed" strokeWidth="1.5" />
            {/* Top Pips (Die 6) */}
            <circle cx="35" cy="22" r="4" fill="#fff" filter="drop-shadow(0 0 6px #fff)" />
            <circle cx="55" cy="32" r="4" fill="#fff" filter="drop-shadow(0 0 6px #fff)" />
            <circle cx="75" cy="42" r="4" fill="#fff" filter="drop-shadow(0 0 6px #fff)" />
            {/* Left Pips */}
            <circle cx="28" cy="62" r="4" fill="#06b6d4" />
            <circle cx="28" cy="98" r="4" fill="#06b6d4" />
            {/* Right Pips */}
            <circle cx="82" cy="78" r="4" fill="#f59e0b" />
          </g>
          {/* Secondary Mini Cube */}
          <g transform="translate(70, 130) scale(0.6)">
            <path d="M 55 0 L 110 32 L 55 64 L 0 32 Z" fill="#06b6d4" opacity="0.8" />
            <path d="M 0 32 L 55 64 L 55 128 L 0 96 Z" fill="#0891b2" opacity="0.8" />
            <path d="M 55 64 L 110 32 L 110 96 L 55 128 Z" fill="#0e7490" opacity="0.8" />
          </g>
          <rect x="24" y="20" width="85" height="22" rx="4" fill="rgba(6,9,14,0.7)" stroke="rgba(139,92,246,0.6)" />
          <text x="32" y="35" fill="#a78bfa" fontSize="10" fontWeight="800" letterSpacing="1">DICE DUEL</text>
        </svg>
      );

    case "quiz":
      return (
        <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="quiz-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#061c24" />
              <stop offset="50%" stopColor="#08141d" />
              <stop offset="100%" stopColor="#05090f" />
            </linearGradient>
            <linearGradient id="brain-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <rect width="400" height="240" fill="url(#quiz-bg)" />
          {/* Neural Synapse Grid */}
          <g stroke="#06b6d4" strokeWidth="1.2" opacity="0.5">
            <line x1="80" y1="70" x2="140" y2="110" />
            <line x1="140" y1="110" x2="200" y2="70" />
            <line x1="200" y1="70" x2="260" y2="110" />
            <line x1="260" y1="110" x2="320" y2="70" />
            <line x1="140" y1="110" x2="140" y2="170" />
            <line x1="200" y1="70" x2="200" y2="170" />
            <line x1="260" y1="110" x2="260" y2="170" />
            <line x1="140" y1="170" x2="200" y2="170" />
            <line x1="200" y1="170" x2="260" y2="170" />
          </g>
          {/* Glowing Synapse Nodes */}
          {[
            { cx: 80, cy: 70 }, { cx: 140, cy: 110 }, { cx: 200, cy: 70 }, { cx: 260, cy: 110 }, { cx: 320, cy: 70 },
            { cx: 140, cy: 170 }, { cx: 200, cy: 170 }, { cx: 260, cy: 170 }
          ].map((pt, i) => (
            <circle key={i} cx={pt.cx} cy={pt.cy} r="5" fill="#10b981" stroke="#06b6d4" strokeWidth="2" filter="drop-shadow(0 0 8px #06b6d4)" />
          ))}
          {/* Central Neural Pulse */}
          <circle cx="200" cy="120" r="32" fill="none" stroke="url(#brain-grad)" strokeWidth="3" />
          <circle cx="200" cy="120" r="16" fill="rgba(6,182,212,0.2)" stroke="#06b6d4" strokeWidth="1.5" />
          <text x="194" y="126" fill="#fff" fontSize="16" fontWeight="900">?</text>
          <rect x="24" y="20" width="85" height="22" rx="4" fill="rgba(6,9,14,0.7)" stroke="rgba(6,182,212,0.6)" />
          <text x="32" y="35" fill="#06b6d4" fontSize="10" fontWeight="800" letterSpacing="1">QUIZ ARENA</text>
        </svg>
      );

    case "memory":
      return (
        <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="mem-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#081c15" />
              <stop offset="50%" stopColor="#081318" />
              <stop offset="100%" stopColor="#04090b" />
            </linearGradient>
          </defs>
          <rect width="400" height="240" fill="url(#mem-bg)" />
          {/* Concentric Cipher Rings */}
          <circle cx="200" cy="120" r="75" stroke="#10b981" strokeWidth="2" strokeDasharray="12 18" opacity="0.4" />
          <circle cx="200" cy="120" r="55" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="6 8" opacity="0.6" />
          <circle cx="200" cy="120" r="35" stroke="#34d399" strokeWidth="2" opacity="0.8" />
          {/* Memory Glyph Grid (4 quadrants) */}
          <rect x="135" y="70" width="45" height="45" rx="8" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
          <rect x="220" y="70" width="45" height="45" rx="8" fill="rgba(6,182,212,0.2)" stroke="#06b6d4" strokeWidth="1.5" />
          <rect x="135" y="130" width="45" height="45" rx="8" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="1.5" />
          <rect x="220" y="130" width="45" height="45" rx="8" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" strokeWidth="1.5" />
          {/* Center Lock Core */}
          <circle cx="200" cy="120" r="10" fill="#10b981" filter="drop-shadow(0 0 10px #10b981)" />
          <rect x="24" y="20" width="85" height="22" rx="4" fill="rgba(6,9,14,0.7)" stroke="rgba(16,185,129,0.6)" />
          <text x="32" y="35" fill="#34d399" fontSize="10" fontWeight="800" letterSpacing="1">MATRIX LOCK</text>
        </svg>
      );

    case "cybercode":
      return (
        <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="code-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a0c24" />
              <stop offset="50%" stopColor="#0c0e1a" />
              <stop offset="100%" stopColor="#04060c" />
            </linearGradient>
          </defs>
          <rect width="400" height="240" fill="url(#code-bg)" />
          {/* Terminal Window Header */}
          <rect x="60" y="45" width="280" height="150" rx="10" fill="rgba(10,14,24,0.85)" stroke="rgba(139,92,246,0.4)" strokeWidth="1.5" />
          <circle cx="78" cy="60" r="4" fill="#f43f5e" />
          <circle cx="92" cy="60" r="4" fill="#f59e0b" />
          <circle cx="106" cy="60" r="4" fill="#10b981" />
          <line x1="60" y1="72" x2="340" y2="72" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          {/* Code Lines */}
          <text x="80" y="96" fill="#8b5cf6" fontSize="11" fontFamily="monospace" fontWeight="700">fn execute_quantum_drift() &#123;</text>
          <text x="100" y="116" fill="#06b6d4" fontSize="11" fontFamily="monospace">let mut warp = Core::init();</text>
          <text x="100" y="136" fill="#10b981" fontSize="11" fontFamily="monospace">warp.surge_nitro(150.ms);</text>
          <text x="100" y="156" fill="#f59e0b" fontSize="11" fontFamily="monospace">assert_eq!(rival.rank, 2);</text>
          <text x="80" y="176" fill="#8b5cf6" fontSize="11" fontFamily="monospace">&#125;</text>
          <rect x="24" y="20" width="85" height="22" rx="4" fill="rgba(6,9,14,0.7)" stroke="rgba(139,92,246,0.6)" />
          <text x="32" y="35" fill="#c084fc" fontSize="10" fontWeight="800" letterSpacing="1">DEV SPEEDRUN</text>
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ width: "100%", height: "100%" }}>
          <rect width="400" height="240" fill="#0b101a" />
          <circle cx="200" cy="120" r="40" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" strokeWidth="2" />
        </svg>
      );
  }
}
