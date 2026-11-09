"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rig } from "@/lib/rig";

type Channel = "paxGate" | "paxApron" | "vipT" | "arrivePax";
type P = [number, number, number];

interface Group {
  path: P[];
  count: number;
  /** "loop": walks forever at `speed` m/s. "rig": progress comes from a scroll channel. */
  mode: "loop" | "rig";
  speed?: number;
  closed?: boolean;
  channel?: Channel;
  /** lag between consecutive agents as a fraction of the path (rig mode) */
  spread?: number;
  /** before starting: wait in a queue at the start, or stay hidden (e.g. inside a bus) */
  before?: "queue" | "hide";
  queueDir?: [number, number];
  crew?: boolean;
}

// Soft, saturated "clay figure" palette — matte colours read best at a distance.
const SHIRTS = ["#2f6fe4", "#e4572e", "#f2b544", "#1f9bb8", "#7b5cd6", "#2bb3a3", "#ec6a9c", "#3d4a63", "#f4f1ea", "#8bc34a", "#5b8def", "#f08a5d"];
const PANTS = ["#1f2a44", "#2f4a7a", "#34363c", "#c9b48a", "#ece6d8", "#5a4636", "#3c5f8f"];
const HAIR = ["#2a1b12", "#141110", "#4a2c1a", "#d9b25a", "#8a4a24", "#1d1a18", "#6b3e22"];
const SKIN = ["#f6cfaa", "#e2ab84", "#b07850", "#f8dcc0", "#cf916a", "#8d5a3b"];
const SHOES = ["#26262b", "#f2f2f0", "#5a3a26", "#26262b"];
const CREW = "#ff8a00";
const CREW_PANTS = "#28324a";
const CREW_HAT = "#ffd23f";

function buildGroups(): Group[] {
  const groups: Group[] = [];
  // --- landside curb (ambient + arrival story) ---
  for (const x of [-82, -64, -46, -10, 8]) {
    groups.push({ path: [[x, 0, -41.5], [x + 1.5, 0, -37], [x, 0, -32.6]], count: 3, mode: "loop", speed: 1.1 });
  }
  groups.push({
    path: [[-100, 0, -38.5], [100, 0, -38.5], [100, 0, -35.5], [-100, 0, -35.5]],
    count: 22,
    mode: "loop",
    speed: 1.0,
    closed: true,
  });
  groups.push({
    path: [[-38, 0, -42.3], [-35, 0, -37], [-30, 0, -32.6]],
    count: 6,
    mode: "rig",
    channel: "arrivePax",
    spread: 0.12,
    before: "hide",
  });
  // --- check-in snake → security → airside ---
  groups.push({
    path: [
      [-60, 0, -30.8], [-85, 0, -30.8], [-85, 0, -29.2], [-62, 0, -29.2], [-62, 0, -27.6], [-85, 0, -27.6],
      [-86, 0, -26.2], [-58, 0, -26.2], [-53, 0, -25], [-52, 0, -21.5], [-46, 0, -19], [-36, 0, -18.4],
    ],
    count: 34,
    mode: "loop",
    speed: 0.9,
  });
  groups.push({ path: [[-58, 0, -25.6], [-48, 0, -25], [-47, 0, -21.5], [-42, 0, -17]], count: 8, mode: "loop", speed: 0.9 });
  // --- duty-free wanderers ---
  const ring: P[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ring.push([-26 + Math.cos(a) * 9.5, 0, -18.6 + Math.sin(a) * 2.6]);
  }
  groups.push({ path: ring, count: 14, mode: "loop", speed: 0.7, closed: true });
  // --- lounge ---
  groups.push({ path: [[-3, 0, -15.6], [27, 0, -15.6], [27, 0, -21.6], [-3, 0, -21.6]], count: 7, mode: "loop", speed: 0.6, closed: true });
  // --- baggage claim exits ---
  for (const x of [2, 18]) groups.push({ path: [[x, 0, -25.5], [x + 2, 0, -29], [x, 0, -31.8]], count: 4, mode: "loop", speed: 0.9 });
  // --- AP-07 gate → jet bridge → aircraft door ---
  groups.push({
    path: [[-64, 0, -18.6], [-61, 0, -15.6], [-60, 2.6, -13.4], [-48.8, 2.6, 1.4], [-47.2, 2.6, 2.9]],
    count: 16,
    mode: "rig",
    channel: "paxGate",
    spread: 0.05,
    before: "queue",
    queueDir: [-0.85, 0],
  });
  // --- AP-08 bus → stairs → door ---
  groups.push({
    path: [[8.8, 0, 6.2], [11.5, 0, 4.2], [13.4, 0, 3.0], [17.1, 2.65, 3.0], [18.3, 2.65, 3.0]],
    count: 12,
    mode: "rig",
    channel: "paxApron",
    spread: 0.06,
    before: "hide",
  });
  // --- AP-09 VIP ---
  groups.push({
    path: [[65.5, 0, 15.6], [67.6, 0, 12], [68, 0, 9.6], [68, 1.7, 7.4]],
    count: 3,
    mode: "rig",
    channel: "vipT",
    spread: 0.18,
    before: "hide",
  });
  // --- ground crew milling around stands ---
  for (const [cx, cz] of [
    [-38, 18],
    [26, 18],
    [-90, 22],
    [100, 18],
    [-50, -9],
  ]) {
    groups.push({
      path: [[cx, 0, cz], [cx + 3, 0, cz + 1], [cx + 1, 0, cz + 3]],
      count: 2,
      mode: "loop",
      speed: 0.5,
      closed: true,
      crew: true,
    });
  }
  return groups;
}

/** Static seated / standing people. */
const STATIC: P[] = [
  // gate hold room seats
  ...Array.from({ length: 14 }, (_, i): P => [-71 + (i % 7) * 1.4, 0, -20 + Math.floor(i / 7) * 1.6]),
  // lounge sofas
  ...Array.from({ length: 10 }, (_, i): P => [1 + (i % 5) * 5, 0, -18.5 + (Math.floor(i / 5) ? 1.8 : 0)]),
  // around carousels
  ...Array.from({ length: 16 }, (_, i): P => {
    const cx = i < 8 ? 3 : 19;
    const a = (i % 8) * (Math.PI / 4);
    return [cx + Math.cos(a) * 6.2, 0, -28 + Math.sin(a) * 2.6];
  }),
];

interface Prepared extends Group {
  pts: THREE.Vector3[];
  cum: number[];
  length: number;
}

function prepare(g: Group): Prepared {
  const pts = g.path.map((p) => new THREE.Vector3(...p));
  if (g.closed) pts.push(pts[0].clone());
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { ...g, pts, cum, length: cum[cum.length - 1] };
}

function sample(g: Prepared, u: number, out: THREE.Vector3) {
  const d = u * g.length;
  let i = 1;
  while (i < g.cum.length - 1 && g.cum[i] < d) i++;
  const seg = g.cum[i] - g.cum[i - 1] || 1;
  return out.lerpVectors(g.pts[i - 1], g.pts[i], (d - g.cum[i - 1]) / seg);
}

/**
 * Body plan in metres — origin between the feet, facing +Z. Proportions are
 * slightly toy-like (big head, rounded torso) to match the clay-figure look.
 */
const HIP_Y = 0.8;
const HIP_X = 0.11;
const SHOULDER_Y = 1.3;
const SHOULDER_X = 0.27;
const PARTS = ["torso", "head", "hair", "face", "hat", "leg", "shoe", "arm", "hand"] as const;
type Part = (typeof PARTS)[number];
/** Parts that exist once per person; the rest come in left/right pairs. */
const SINGLE: Part[] = ["torso", "head", "hair", "face", "hat"];
const PAIRED: Part[] = ["leg", "shoe", "arm", "hand"];

function buildBodyGeometries(): Record<Part, THREE.BufferGeometry> {
  const eye = (x: number) => new THREE.SphereGeometry(0.03, 8, 6).scale(1, 1.25, 0.6).translate(x, 1.58, 0.196);
  return {
    torso: new RoundedBoxGeometry(0.44, 0.58, 0.27, 3, 0.11).translate(0, 1.06, 0),
    head: new THREE.SphereGeometry(0.21, 20, 16).scale(1, 1.06, 0.98).translate(0, 1.56, 0),
    hair: new THREE.SphereGeometry(0.226, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56).rotateX(-0.32).translate(0, 1.58, -0.012),
    face: mergeGeometries([eye(0.075), eye(-0.075)])!,
    hat: mergeGeometries([
      // RoundedBoxGeometry is non-indexed, so the cylinder must be too for the merge.
      new THREE.CylinderGeometry(0.2, 0.222, 0.13, 20).translate(0, 1.72, 0).toNonIndexed(),
      new RoundedBoxGeometry(0.3, 0.025, 0.14, 1, 0.01).translate(0, 1.665, 0.2),
    ])!,
    // Limbs hang from a pivot at the origin so a single rotation swings them.
    leg: new THREE.CapsuleGeometry(0.088, 0.6, 4, 10).translate(0, -0.385, 0),
    shoe: new RoundedBoxGeometry(0.14, 0.085, 0.25, 2, 0.035).translate(0, -0.762, 0.04),
    arm: new THREE.CapsuleGeometry(0.066, 0.42, 4, 8).translate(0, -0.27, 0),
    hand: new THREE.SphereGeometry(0.072, 10, 8).translate(0, -0.53, 0),
  };
}

const ROUGHNESS: Record<Part, number> = { torso: 0.62, head: 0.5, hair: 0.75, face: 0.3, hat: 0.55, leg: 0.7, shoe: 0.5, arm: 0.62, hand: 0.5 };
const SHADOW: Record<Part, boolean> = { torso: true, head: true, hair: false, face: false, hat: false, leg: true, shoe: false, arm: false, hand: false };

export function Crowd() {
  const groups = useMemo(() => buildGroups().map(prepare), []);
  const total = groups.reduce((a, g) => a + g.count, 0) + STATIC.length;
  const geo = useMemo(buildBodyGeometries, []);
  const refs = useRef<Partial<Record<Part, THREE.InstancedMesh | null>>>({});

  /** Per-agent traits, fixed for the session; yaw is eased every frame. */
  const traits = useMemo(() => {
    const hasHat = new Uint8Array(total);
    const yaw = new Float32Array(total);
    let n = 0;
    groups.forEach((g) => {
      for (let i = 0; i < g.count; i++, n++) hasHat[n] = g.crew || n % 9 === 0 || n % 13 === 0 ? 1 : 0;
    });
    for (; n < total; n++) hasHat[n] = n % 11 === 0 ? 1 : 0;
    for (let k = 0; k < total; k++) yaw[k] = (k * 2.39996) % (Math.PI * 2);
    return { hasHat, yaw };
  }, [groups, total]);

  const meshes = () => {
    const r = refs.current;
    return PARTS.every((p) => r[p]) ? (r as Record<Part, THREE.InstancedMesh>) : null;
  };

  useLayoutEffect(() => {
    const m = meshes();
    if (!m) return;
    const c = new THREE.Color();
    const paint = (n: number, crew: boolean, gi: number) => {
      const shirt = crew ? CREW : SHIRTS[(n * 7 + gi) % SHIRTS.length];
      const pants = crew ? CREW_PANTS : PANTS[(n * 5 + gi) % PANTS.length];
      const skin = SKIN[(n * 3) % SKIN.length];
      const shoes = SHOES[(n * 11) % SHOES.length];
      m.torso.setColorAt(n, c.set(shirt));
      m.head.setColorAt(n, c.set(skin));
      m.hair.setColorAt(n, c.set(HAIR[(n * 13 + gi) % HAIR.length]));
      m.face.setColorAt(n, c.set("#1b1b22"));
      m.hat.setColorAt(n, c.set(crew ? CREW_HAT : n % 2 ? "#f4f4f1" : "#24345c"));
      for (const k of [0, 1]) {
        m.leg.setColorAt(n * 2 + k, c.set(pants));
        m.shoe.setColorAt(n * 2 + k, c.set(shoes));
        m.arm.setColorAt(n * 2 + k, c.set(shirt));
        m.hand.setColorAt(n * 2 + k, c.set(skin));
      }
    };
    let n = 0;
    groups.forEach((g, gi) => {
      for (let i = 0; i < g.count; i++, n++) paint(n, !!g.crew, gi);
    });
    for (; n < total; n++) paint(n, false, 3);
    for (const p of PARTS) if (m[p].instanceColor) m[p].instanceColor!.needsUpdate = true;
  }, [groups, total]);

  const tmp = useMemo(
    () => ({
      base: new THREE.Matrix4(),
      local: new THREE.Matrix4(),
      rot: new THREE.Matrix4(),
      out: new THREE.Matrix4(),
      pos: new THREE.Vector3(),
      ahead: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      up: new THREE.Vector3(0, 1, 0),
      scale: new THREE.Vector3(0.98, 0.98, 0.98),
      zero: new THREE.Matrix4().makeScale(0, 0, 0),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const m = meshes();
    if (!m) return;
    const { base, local, rot, out, pos, ahead, q, up, scale, zero } = tmp;
    const t = clock.elapsedTime;

    /** Turn agent n toward `ahead`, eased so corners read as a turn, not a snap. */
    const faceAhead = (n: number) => {
      const dx = ahead.x - pos.x;
      const dz = ahead.z - pos.z;
      if (dx * dx + dz * dz < 1e-6) return;
      const d = Math.atan2(dx, dz) - traits.yaw[n];
      traits.yaw[n] += Math.atan2(Math.sin(d), Math.cos(d)) * 0.25;
    };

    const place = (n: number, visible: boolean, moving: boolean) => {
      if (!visible) {
        for (const p of SINGLE) m[p].setMatrixAt(n, zero);
        for (const p of PAIRED) {
          m[p].setMatrixAt(n * 2, zero);
          m[p].setMatrixAt(n * 2 + 1, zero);
        }
        return;
      }
      const phase = t * 6.2 + n * 1.7;
      const swing = moving ? Math.sin(phase) * 0.55 : Math.sin(t * 1.3 + n) * 0.04;
      if (moving) pos.y += Math.abs(Math.cos(phase)) * 0.045;
      q.setFromAxisAngle(up, traits.yaw[n]);
      base.compose(pos, q, scale);
      m.torso.setMatrixAt(n, base);
      m.head.setMatrixAt(n, base);
      m.hair.setMatrixAt(n, base);
      m.face.setMatrixAt(n, base);
      m.hat.setMatrixAt(n, traits.hasHat[n] ? base : zero);
      for (const k of [0, 1]) {
        const side = k === 0 ? 1 : -1;
        // legs swing in opposite phase per side
        local.makeTranslation(side * HIP_X, HIP_Y, 0).multiply(rot.makeRotationX(swing * side));
        out.multiplyMatrices(base, local);
        m.leg.setMatrixAt(n * 2 + k, out);
        m.shoe.setMatrixAt(n * 2 + k, out);
        // arms counter-swing the legs, hanging slightly outward
        local.makeTranslation(side * SHOULDER_X, SHOULDER_Y, 0).multiply(rot.makeRotationZ(side * 0.09));
        local.multiply(rot.makeRotationX(-swing * side * 0.8));
        out.multiplyMatrices(base, local);
        m.arm.setMatrixAt(n * 2 + k, out);
        m.hand.setMatrixAt(n * 2 + k, out);
      }
    };

    let n = 0;
    for (const g of groups) {
      const step = 0.4 / g.length;
      for (let i = 0; i < g.count; i++, n++) {
        let visible = true;
        let moving = true;
        if (g.mode === "loop") {
          const u = (((t * (g.speed ?? 1)) / g.length + i / g.count) % 1 + 1) % 1;
          sample(g, u, pos);
          sample(g, (u + step) % 1, ahead);
          faceAhead(n);
        } else {
          const spread = g.spread ?? 0.05;
          const u = rig[g.channel!] * (1 + spread * (g.count - 1)) - spread * i;
          if (u <= 0) {
            moving = false;
            if (g.before === "hide") visible = false;
            else {
              const [qx, qz] = g.queueDir ?? [-1, 0];
              pos.copy(g.pts[0]).add(ahead.set(qx * i * 0.8, 0, qz * i * 0.8 + (i % 2) * 0.35));
              ahead.copy(g.pts[0]); // the queue faces the gate
              faceAhead(n);
            }
          } else if (u >= 1) {
            visible = false;
          } else {
            sample(g, u, pos);
            sample(g, Math.min(1, u + step), ahead);
            faceAhead(n);
          }
        }
        place(n, visible, moving);
      }
    }
    for (let i = 0; i < STATIC.length; i++, n++) {
      pos.set(...STATIC[i]);
      place(n, true, false);
    }
    for (const p of PARTS) m[p].instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {PARTS.map((p) => (
        <instancedMesh
          key={p}
          ref={(el) => {
            refs.current[p] = el;
          }}
          args={[geo[p], undefined, SINGLE.includes(p) ? total : total * 2]}
          castShadow={SHADOW[p]}
          frustumCulled={false}
        >
          <meshStandardMaterial roughness={ROUGHNESS[p]} />
        </instancedMesh>
      ))}
    </group>
  );
}
