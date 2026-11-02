import { cleanControls, clamp, moveVector, nextCamMode, orbitOffset } from "@/lib/world/controls";
import { check, near, section } from "./_t";

export async function run() {
  section("controls: walking relative to the camera");
  let m = moveVector(1, 0, 0);
  check(near(m.x, 0) && near(m.z, 1) && m.amt === 1, "yaw 0: forward goes +z");
  m = moveVector(0, 1, 0);
  check(near(m.x, -1) && near(m.z, 0), "yaw 0: right goes -x");
  m = moveVector(1, 0, Math.PI / 2);
  check(near(m.x, 1) && near(m.z, 0), "camera turned 90 degrees: forward follows it");
  m = moveVector(1, 1, 0.7);
  check(near(Math.hypot(m.x, m.z), 1), "diagonal is not faster");
  check(moveVector(0, 0, 1).amt === 0, "no input, no movement");
  for (const c of [0, 1, 2.5, -3]) {
    const v = moveVector(1, 0, c);
    check(near(v.x, Math.sin(c)) && near(v.z, Math.cos(c)), `forward follows camera yaw ${c}`);
  }
  const o = orbitOffset(1.3, 0.3, 4);
  const fw = moveVector(1, 0, 1.3);
  check(near(-o.x / Math.hypot(o.x, o.z), fw.x) && near(-o.z / Math.hypot(o.x, o.z), fw.z), "forward walks directly away from the camera");
  check(cleanControls({ sens: 99, invertY: "yes", classic: true }).sens === 2.5, "settings are clamped");
  check(cleanControls(null).sens === 1 && cleanControls({ sens: NaN }).sens === 1, "bad saved settings fall back");
  check(nextCamMode("follow") === "first" && nextCamMode("top") === "follow", "camera modes cycle");
  check(clamp(5, 0, 1) === 1, "clamp");
}
