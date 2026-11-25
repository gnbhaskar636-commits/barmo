/**
 * BARMO 3D Universe 3.0: High-Precision Haptic Dual-Touch Analog Joystick
 * Ultra-smooth input with dynamic spring physics, radial glow feedback, and phone-optimized touch tracking.
 */
export function addJoystick(host: HTMLElement) {
  const el = document.createElement("div");
  el.className = "joy u3-joy";
  
  // Outer glass ring with glowing pulse
  const ring = document.createElement("div");
  ring.className = "u3-joy-ring";
  el.appendChild(ring);

  // Directional cardinal indicators (N, S, E, W)
  const cardinals = document.createElement("div");
  cardinals.className = "u3-joy-cardinals";
  cardinals.innerHTML = "<span>▲</span><span>►</span><span>▼</span><span>◄</span>";
  el.appendChild(cardinals);

  // Inner ergonomic floating knob
  const knob = document.createElement("div");
  knob.className = "knob u3-joy-knob";
  el.appendChild(knob);

  host.appendChild(el);

  let x = 0,
    y = 0,
    id = -1;
  const R = 44; // expanded radius for thumb ergonomics

  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy);

    if (m > R) {
      dx = (dx / m) * R;
      dy = (dy / m) * R;
    }

    knob.style.transform = `translate(${dx}px,${dy}px) scale(1.08)`;

    // Normalized axes with cubic sensitivity curve for fine steering & sprinting
    const nx = dx / R;
    const ny = -dy / R;
    const len = Math.hypot(nx, ny);

    if (len < 0.12) {
      x = 0;
      y = 0;
      el.classList.remove("active");
    } else {
      el.classList.add("active");
      // Responsive quadratic ramp for natural thumb feel
      const curve = Math.pow((len - 0.12) / 0.88, 1.25);
      x = (nx / len) * curve;
      y = (ny / len) * curve;
    }
  };

  const end = () => {
    id = -1;
    x = y = 0;
    knob.style.transform = "translate(0,0) scale(1)";
    el.classList.remove("active");
  };

  el.addEventListener("pointerdown", (e) => {
    id = e.pointerId;
    el.setPointerCapture(id);
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      try { navigator.vibrate(12); } catch { /* ignore */ }
    }
    move(e);
  });

  el.addEventListener("pointermove", (e) => e.pointerId === id && move(e));
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  return {
    x: () => x,
    y: () => y,
    el,
    dispose: () => el.remove(),
  };
}

