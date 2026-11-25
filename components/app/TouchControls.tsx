"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import type { RoomId } from "@/lib/world/rooms";

export interface JoystickVector {
  x: number;
  y: number;
  len: number;
  magnitude: number;
  active: boolean;
  angle: number;
}

export interface TouchControlsProps {
  onMove?: (vec: JoystickVector) => void;
  onJump?: () => void;
  onTeleport?: (toRoom?: RoomId) => void;
  onResetCamera?: () => void;
  onToggleMute?: () => void;
  onOrbit?: (dYaw: number, dPitch: number) => void;
  onZoom?: (newZoom: number) => void;
  radius?: number;
  deadzone?: number;
  showDock?: boolean;
  isMuted?: boolean;
}

/**
 * Pure Mathematical Model for Virtual Analog Joystick.
 */
export function computeJoystickVector(
  dx: number,
  dy: number,
  R = 44,
  deadzone = 8,
  gamma = 1.25
): JoystickVector {
  const m = Math.hypot(dx, dy);
  if (m <= deadzone) {
    return { x: 0, y: 0, len: 0, magnitude: 0, active: false, angle: 0 };
  }

  const mClamped = Math.min(m, R);
  const ux = dx / m;
  const uy = -dy / m; // Invert screen Y so upward drag is positive Y

  const lambda = (mClamped - deadzone) / (R - deadzone);
  const curve = Math.pow(lambda, gamma);

  const x = Number((ux * curve).toFixed(4));
  const y = Number((uy * curve).toFixed(4));
  const magnitude = Number(curve.toFixed(4));
  const angle = Math.atan2(y, x);

  return {
    x,
    y,
    len: magnitude,
    magnitude,
    active: true,
    angle,
  };
}

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function computePinchDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Calculates new camera zoom scale from pinch distance delta.
 */
export function computePinchZoom(
  prevDist: number,
  currentDist: number,
  currentZoom: number,
  minZoom = 0.45,
  maxZoom = 2.2
): number {
  if (prevDist <= 1e-4 || currentDist <= 1e-4) return currentZoom;
  const ratio = prevDist / currentDist;
  const nextZoom = currentZoom * ratio;
  return Math.min(maxZoom, Math.max(minZoom, Number(nextZoom.toFixed(4))));
}

/**
 * Calculates orbit yaw and pitch deltas from touch drag offsets.
 */
export function computeOrbitDelta(
  dx: number,
  dy: number,
  sens = 1.0,
  invertY = false
): { dYaw: number; dPitch: number } {
  const dYaw = -dx * 0.006 * sens;
  const dPitch = dy * 0.005 * sens * (invertY ? -1 : 1);
  return {
    dYaw: Number(dYaw.toFixed(6)),
    dPitch: Number(dPitch.toFixed(6)),
  };
}

/**
 * Clamps vertical camera pitch within safe bounds to prevent flip.
 */
export function clampPitch(
  pitch: number,
  minPitch = -1.3963, // -80 deg
  maxPitch = 1.3963  // +80 deg
): number {
  return Math.min(maxPitch, Math.max(minPitch, pitch));
}

/**
 * Applies exponential friction damping to camera angular velocity.
 */
export function applyCameraMomentum(
  velocity: number,
  decay = 0.88,
  dt = 1 / 60,
  cutoff = 1e-4
): number {
  const next = velocity * Math.pow(decay, dt * 60);
  if (Math.abs(next) < cutoff) return 0;
  return Number(next.toFixed(6));
}

/**
 * Distinguishes tap action from camera drag gesture.
 */
export function isDragGesture(dx: number, dy: number, threshold = 8): boolean {
  return Math.hypot(dx, dy) >= threshold;
}

/**
 * Multi-touch state machine managing isolated pointer IDs.
 */
export class MultiTouchTracker {
  private primaryPointerId: number | null = null;
  private pointerPositions = new Map<number, { x: number; y: number }>();

  public onPointerDown(id: number, x: number, y: number): boolean {
    this.pointerPositions.set(id, { x, y });
    if (this.primaryPointerId === null) {
      this.primaryPointerId = id;
      return true; // Claimed by joystick
    }
    return false; // Handled as secondary/gesture
  }

  public onPointerMove(id: number, x: number, y: number): { isPrimary: boolean; prevX?: number; prevY?: number } {
    const prev = this.pointerPositions.get(id);
    this.pointerPositions.set(id, { x, y });
    return {
      isPrimary: this.primaryPointerId === id,
      prevX: prev?.x,
      prevY: prev?.y,
    };
  }

  public onPointerUp(id: number): boolean {
    this.pointerPositions.delete(id);
    if (this.primaryPointerId === id) {
      this.primaryPointerId = null;
      return true; // Primary released, reset joystick
    }
    return false;
  }

  public getPrimaryId(): number | null {
    return this.primaryPointerId;
  }

  public getActiveCount(): number {
    return this.pointerPositions.size;
  }

  public getPointer(id: number): { x: number; y: number } | undefined {
    return this.pointerPositions.get(id);
  }

  public reset(): void {
    this.primaryPointerId = null;
    this.pointerPositions.clear();
  }
}

/**
 * TouchControls Component
 * Provides haptic virtual joystick, touch camera surface, action triggers, and mobile dock.
 */
export default function TouchControls({
  onMove,
  onJump,
  onTeleport,
  onResetCamera,
  onToggleMute,
  radius = 44,
  deadzone = 8,
  showDock = true,
  isMuted = false,
}: TouchControlsProps) {
  const joyRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const [isActive, setIsActive] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== null) return;
      activePointerId.current = e.pointerId;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback in headless/shim environments
      }

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(12);
        } catch {
          // Ignore
        }
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const vec = computeJoystickVector(dx, dy, radius, deadzone);

      setIsActive(vec.active);
      if (knobRef.current) {
        const m = Math.hypot(dx, dy);
        const clampedM = Math.min(m, radius);
        const kx = m > 0 ? (dx / m) * clampedM : 0;
        const ky = m > 0 ? (dy / m) * clampedM : 0;
        knobRef.current.style.transform = `translate(${kx}px, ${ky}px) scale(1.08)`;
      }
      onMove?.(vec);
    },
    [radius, deadzone, onMove]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== e.pointerId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const vec = computeJoystickVector(dx, dy, radius, deadzone);

      setIsActive(vec.active);
      if (knobRef.current) {
        const m = Math.hypot(dx, dy);
        const clampedM = Math.min(m, radius);
        const kx = m > 0 ? (dx / m) * clampedM : 0;
        const ky = m > 0 ? (dy / m) * clampedM : 0;
        knobRef.current.style.transform = `translate(${kx}px, ${ky}px) scale(1.08)`;
      }
      onMove?.(vec);
    },
    [radius, deadzone, onMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
      activePointerId.current = null;
      setIsActive(false);
      if (knobRef.current) {
        knobRef.current.style.transform = "translate(0px, 0px) scale(1)";
      }
      onMove?.({ x: 0, y: 0, len: 0, magnitude: 0, active: false, angle: 0 });
    },
    [onMove]
  );

  return (
    <div className="b4-touch-controls-root" style={{ pointerEvents: "none" }}>
      {/* Virtual Analog Joystick */}
      <div
        ref={joyRef}
        className={`joy u3-joy ${isActive ? "active" : ""}`}
        style={{ pointerEvents: "auto", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="u3-joy-ring" />
        <div className="u3-joy-cardinals">
          <span>▲</span>
          <span>►</span>
          <span>▼</span>
          <span>◄</span>
        </div>
        <div ref={knobRef} className="knob u3-joy-knob" />
      </div>

      {/* Floating Action Buttons */}
      <div
        className="b4-touch-actions"
        style={{
          position: "fixed",
          right: 16,
          bottom: showDock ? 80 : 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          pointerEvents: "auto",
          zIndex: 100,
        }}
      >
        <button
          className="btn b4-touch-btn"
          onClick={onJump}
          style={{ width: 48, height: 48, borderRadius: "50%", minWidth: 44, minHeight: 44 }}
          aria-label="Jump Action"
          title="Jump"
        >
          🦘
        </button>
        <button
          className="btn b4-touch-btn"
          onClick={onResetCamera}
          style={{ width: 48, height: 48, borderRadius: "50%", minWidth: 44, minHeight: 44 }}
          aria-label="Reset Camera"
          title="Reset Camera"
        >
          📷
        </button>
      </div>

      {/* Mobile Console Dock */}
      {showDock && (
        <nav className="b4-mobile-dock" aria-label="Console Navigation" style={{ pointerEvents: "auto" }}>
          <button
            className="b4-mobile-tab"
            onClick={() => onTeleport?.()}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <span style={{ fontSize: 18 }}>🌀</span>
            <small style={{ fontSize: 10 }}>Sectors</small>
          </button>
          <button
            className="b4-mobile-tab"
            onClick={onJump}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <span style={{ fontSize: 18 }}>⬆️</span>
            <small style={{ fontSize: 10 }}>Jump</small>
          </button>
          <button
            className="b4-mobile-tab"
            onClick={onResetCamera}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <span style={{ fontSize: 18 }}>🎯</span>
            <small style={{ fontSize: 10 }}>Center</small>
          </button>
          <button
            className="b4-mobile-tab"
            onClick={onToggleMute}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <span style={{ fontSize: 18 }}>{isMuted ? "🔇" : "🎙️"}</span>
            <small style={{ fontSize: 10 }}>{isMuted ? "Muted" : "Voice"}</small>
          </button>
        </nav>
      )}
    </div>
  );
}
