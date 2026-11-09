"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
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

const SHIRTS = ["#2449d8", "#e4572e", "#f2a541", "#147598", "#7b5cd6", "#26a69a", "#e94f8a", "#334155", "#f4f5f8", "#8bc34a"];
const SKIN = ["#f1c7a1", "#d9a37c", "#a8714f", "#f5d3b3", "#c68863"];
const CREW = "#ff8a00";

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

export function Crowd() {
  const groups = useMemo(() => buildGroups().map(prepare), []);
  const total = groups.reduce((a, g) => a + g.count, 0) + STATIC.length;
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);

  const bodyGeo = useMemo(() => new THREE.CapsuleGeometry(0.24, 0.72, 4, 10).translate(0, 0.6, 0), []);
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.18, 12, 10).translate(0, 1.42, 0), []);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const head = headRef.current;
    if (!body || !head) return;
    const c = new THREE.Color();
    let n = 0;
    groups.forEach((g, gi) => {
      for (let i = 0; i < g.count; i++, n++) {
        body.setColorAt(n, c.set(g.crew ? CREW : SHIRTS[(n * 7 + gi) % SHIRTS.length]));
        head.setColorAt(n, c.set(SKIN[(n * 3) % SKIN.length]));
      }
    });
    for (let i = 0; i < STATIC.length; i++, n++) {
      body.setColorAt(n, c.set(SHIRTS[(n * 5) % SHIRTS.length]));
      head.setColorAt(n, c.set(SKIN[n % SKIN.length]));
    }
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
    if (head.instanceColor) head.instanceColor.needsUpdate = true;
  }, [groups]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const one = useMemo(() => new THREE.Vector3(1.08, 1.08, 1.08), []);
  const zero = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame(({ clock }) => {
    const body = bodyRef.current;
    const head = headRef.current;
    if (!body || !head) return;
    const t = clock.elapsedTime;
    let n = 0;
    for (const g of groups) {
      for (let i = 0; i < g.count; i++, n++) {
        let visible = true;
        let moving = true;
        if (g.mode === "loop") {
          const u = (((t * (g.speed ?? 1)) / g.length + i / g.count) % 1 + 1) % 1;
          sample(g, u, pos);
        } else {
          const spread = g.spread ?? 0.05;
          const u = rig[g.channel!] * (1 + spread * (g.count - 1)) - spread * i;
          if (u <= 0) {
            moving = false;
            if (g.before === "hide") visible = false;
            else {
              const [qx, qz] = g.queueDir ?? [-1, 0];
              pos.copy(g.pts[0]).add(new THREE.Vector3(qx * i * 0.8, 0, qz * i * 0.8 + (i % 2) * 0.35));
            }
          } else if (u >= 1) {
            visible = false;
          } else {
            sample(g, u, pos);
          }
        }
        if (visible && moving) pos.y += Math.abs(Math.sin(t * 7 + n)) * 0.06;
        m.compose(pos, q, visible ? one : zero);
        body.setMatrixAt(n, m);
        head.setMatrixAt(n, m);
      }
    }
    for (let i = 0; i < STATIC.length; i++, n++) {
      pos.set(...STATIC[i]);
      m.compose(pos, q, one);
      body.setMatrixAt(n, m);
      head.setMatrixAt(n, m);
    }
    body.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[bodyGeo, undefined, total]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[headGeo, undefined, total]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
    </group>
  );
}
