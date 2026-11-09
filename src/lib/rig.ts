import * as THREE from "three";

/**
 * Shared mutable state between the GSAP scroll timeline (writes) and the
 * React Three Fiber render loop (reads). Kept outside React so scrubbing the
 * timeline never triggers re-renders.
 *
 * World units are metres. Ground plane is XZ, +Y up.
 * Layout: runway z≈63, taxiway z≈42, apron z -14..34, terminal z -32..-14,
 * landside curb road z≈-47.
 */

export type Vec3 = [number, number, number];

export interface Shot {
  pos: Vec3;
  target: Vec3;
  /** Follow a moving aircraft; `pos` is then an offset from the aircraft. */
  follow?: "A" | "C";
}

/** One shot per camera key: hero, 12 flow steps (same order as FLOW_STEPS), outro. */
export const SHOTS: Shot[] = [
  { pos: [175, 150, 205], target: [-14, 0, -6] }, // hero overview
  { pos: [-4, 28, -96], target: [-40, 0, -44] }, // AP-22 arrive at curb
  { pos: [-58, 48, -58], target: [-71, 0, -26] }, // AP-17 check-in & security
  { pos: [-14, 44, 8], target: [-27, 0, -20] }, // AP-18 duty-free
  { pos: [24, 42, 8], target: [11, 0, -20] }, // AP-20 lounge
  { pos: [-8, 36, 42], target: [-52, 2, -4] }, // AP-07 gate / jet bridge
  { pos: [44, 44, 36], target: [12, 0, 6] }, // AP-08 apron bus
  { pos: [90, 16, 36], target: [64, 1, 9] }, // AP-09 VIP
  { pos: [-8, 46, 88], target: [-62, 0, 30] }, // AP-03 pushback & taxi
  { pos: [-52, 15, 44], target: [0, 0, 0], follow: "A" }, // AP-12 takeoff
  { pos: [-62, 22, 58], target: [0, 0, 0], follow: "A" }, // AP-13 cruise
  { pos: [50, 16, 52], target: [0, 0, 0], follow: "C" }, // AP-16 landing
  { pos: [24, 46, -56], target: [11, 0, -27] }, // AP-19 baggage claim
  { pos: [250, 240, 300], target: [0, 0, -30] }, // outro
];

export const KEY_COUNT = SHOTS.length;

export const rig = {
  // static camera
  px: SHOTS[0].pos[0],
  py: SHOTS[0].pos[1],
  pz: SHOTS[0].pos[2],
  tx: SHOTS[0].target[0],
  ty: SHOTS[0].target[1],
  tz: SHOTS[0].target[2],
  // follow-cam weights and offset
  followA: 0,
  followC: 0,
  fox: -36,
  foy: 10,
  foz: 30,
  // story channels (0..1), driven by the scroll timeline
  roof: 0,
  arriveT: 0,
  arrivePax: 0,
  paxGate: 0,
  busT: 0,
  paxApron: 0,
  vipT: 0,
  planeT: 0,
  landT: 0,
  // pointer / drag
  pointerX: 0,
  pointerY: 0,
  dragYaw: 0,
  dragPitch: 0,
  /** index of the focused step (1..12) or 0 / 13 for hero / outro */
  activeKey: 0,
};

export const sceneState = { ready: false };

// ---------------------------------------------------------------------------
// Motion paths
// ---------------------------------------------------------------------------

export interface Pose {
  pos: THREE.Vector3;
  yaw: number; // rotation.y — models face +X
  pitch: number; // rotation.z (nose up positive)
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** yaw so that a +X-facing model points along (dx, dz) */
export const yawFrom = (dx: number, dz: number) => Math.atan2(-dz, dx);

export const PLANE_A_PARK = new THREE.Vector3(-45, 0, 12);
export const PLANE_B_PARK = new THREE.Vector3(20, 0, 12);

const taxiCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-45, 0, 42),
    new THREE.Vector3(-90, 0, 42),
    new THREE.Vector3(-140, 0, 42),
    new THREE.Vector3(-160, 0, 46),
    new THREE.Vector3(-168, 0, 55),
    new THREE.Vector3(-160, 0, 62.5),
    new THREE.Vector3(-140, 0, 63),
  ],
  false,
  "centripetal",
);

const tmpTangent = new THREE.Vector3();

/** Red airliner: pushback → taxi → takeoff roll → climb → cruise. */
export function planeAPose(t: number, out: Pose): Pose {
  if (t <= 0.2) {
    // Pushback: tail swings east so the nose ends pointing west on the taxiway
    const k = smooth(t / 0.2);
    out.pos.set(PLANE_A_PARK.x - Math.sin(k * Math.PI) * 4, 0, lerp(PLANE_A_PARK.z, 42, k));
    out.yaw = lerp(Math.PI / 2, Math.PI, k);
    out.pitch = 0;
  } else if (t <= 0.5) {
    const k = smooth((t - 0.2) / 0.3);
    taxiCurve.getPointAt(k, out.pos);
    taxiCurve.getTangentAt(Math.min(0.999, Math.max(0.001, k)), tmpTangent);
    out.yaw = yawFrom(tmpTangent.x, tmpTangent.z);
    out.pitch = 0;
  } else if (t <= 0.7) {
    // Takeoff roll accelerates; rotation + liftoff in the last 30 %
    const k = (t - 0.5) / 0.2;
    const x = lerp(-140, 40, k * k);
    const lift = clamp01((k - 0.7) / 0.3);
    out.pos.set(x, smooth(lift) * 7, 63);
    out.yaw = 0;
    out.pitch = THREE.MathUtils.degToRad(10) * smooth(clamp01((k - 0.62) / 0.25));
  } else {
    const k = (t - 0.7) / 0.3;
    const e = 1 - Math.pow(1 - k, 2);
    out.pos.set(lerp(40, 430, k), lerp(7, 78, e), lerp(63, 40, smooth(k)));
    out.yaw = yawFrom(1, lerp(0, -0.12, smooth(k)));
    out.pitch = THREE.MathUtils.degToRad(lerp(10, 1.5, smooth(k)));
  }
  return out;
}

/** Orange airliner: final approach from the east → touchdown → rollout. */
export function planeCPose(t: number, out: Pose): Pose {
  if (t <= 0.6) {
    const k = t / 0.6;
    out.pos.set(lerp(430, 120, k), lerp(62, 0, smooth(Math.min(1, k * 1.02))), 63);
    out.pitch = THREE.MathUtils.degToRad(lerp(2, 4.5, k));
  } else {
    const k = (t - 0.6) / 0.4;
    out.pos.set(lerp(120, -10, 1 - Math.pow(1 - k, 2)), 0, 63);
    out.pitch = THREE.MathUtils.degToRad(4.5 * (1 - smooth(clamp01(k * 3))));
  }
  out.yaw = Math.PI;
  return out;
}

const busCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-30, 0, -8),
    new THREE.Vector3(-10, 0, -8),
    new THREE.Vector3(2, 0, -5),
    new THREE.Vector3(7, 0, 2),
    new THREE.Vector3(7, 0, 9),
  ],
  false,
  "centripetal",
);

/** Apron bus: terminal stand → parked beside the teal aircraft's stairs. */
export function busPose(t: number, out: Pose): Pose {
  const k = smooth(clamp01(t));
  busCurve.getPointAt(k, out.pos);
  busCurve.getTangentAt(Math.min(0.999, Math.max(0.001, k)), tmpTangent);
  out.yaw = yawFrom(tmpTangent.x, tmpTangent.z);
  out.pitch = 0;
  return out;
}

export function makePose(): Pose {
  return { pos: new THREE.Vector3(), yaw: 0, pitch: 0 };
}
