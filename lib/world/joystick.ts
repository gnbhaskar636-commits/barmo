/** Analog touch joystick. Returns axes in -1..1 (y up = forward). Visual + input only. */
export function addJoystick(host: HTMLElement) {
  const el = document.createElement("div");
  el.className = "joy";
  const knob = document.createElement("div");
  knob.className = "knob";
  el.appendChild(knob);
  host.appendChild(el);
  let x = 0,
    y = 0,
    id = -1;
  const R = 38;
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2),
      dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > R) {
      dx = (dx / m) * R;
      dy = (dy / m) * R;
    }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    const nx = dx / R,
      ny = -dy / R;
    x = Math.abs(nx) < 0.15 ? 0 : nx; // small dead zone
    y = Math.abs(ny) < 0.15 ? 0 : ny;
  };
  const end = () => {
    id = -1;
    x = y = 0;
    knob.style.transform = "translate(0,0)";
  };
  el.addEventListener("pointerdown", (e) => {
    id = e.pointerId;
    el.setPointerCapture(id);
    move(e);
  });
  el.addEventListener("pointermove", (e) => e.pointerId === id && move(e));
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  return { x: () => x, y: () => y, el, dispose: () => el.remove() };
}
