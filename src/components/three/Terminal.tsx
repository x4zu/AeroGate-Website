"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { rig } from "@/lib/rig";
import { useModel } from "./useModel";

// Footprint: x -100..30, z -32..-14, walls 9 m
const TX0 = -100;
const TX1 = 30;
const TZ0 = -32;
const TZ1 = -14;
const TH = 9;
const CX = (TX0 + TX1) / 2;
const CZ = (TZ0 + TZ1) / 2;
const W = TX1 - TX0;
const D = TZ1 - TZ0;

const navy = "#2b3a67";
const orange = "#f08a24";
const frame = "#2a3346";

type V3 = [number, number, number];

function Box({ size, pos, color, rot, ...mat }: { size: V3; pos: V3; color: string; rot?: V3 } & Partial<THREE.MeshStandardMaterialParameters>) {
  return (
    <mesh position={pos} rotation={rot} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.6} {...mat} />
    </mesh>
  );
}

function GlassWalls() {
  const glass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#9fcdf2",
        roughness: 0.05,
        metalness: 0.25,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const mullions = useMemo(() => {
    const out: V3[] = [];
    for (let x = TX0; x <= TX1; x += 3.25) {
      out.push([x, TH / 2, TZ0]);
      out.push([x, TH / 2, TZ1]);
    }
    for (let z = TZ0; z <= TZ1; z += 3) {
      out.push([TX0, TH / 2, z]);
      out.push([TX1, TH / 2, z]);
    }
    return out;
  }, []);
  return (
    <group>
      <mesh position={[CX, TH / 2, TZ0]} material={glass}>
        <planeGeometry args={[W, TH]} />
      </mesh>
      <mesh position={[CX, TH / 2, TZ1]} material={glass}>
        <planeGeometry args={[W, TH]} />
      </mesh>
      <mesh position={[TX0, TH / 2, CZ]} rotation-y={Math.PI / 2} material={glass}>
        <planeGeometry args={[D, TH]} />
      </mesh>
      <mesh position={[TX1, TH / 2, CZ]} rotation-y={Math.PI / 2} material={glass}>
        <planeGeometry args={[D, TH]} />
      </mesh>
      {mullions.map((p, i) => (
        <Box key={i} size={[0.22, TH, 0.22]} pos={p} color={frame} metalness={0.4} />
      ))}
      {/* transoms */}
      {[3.2, 6.2].map((y) => (
        <group key={y}>
          <Box size={[W, 0.16, 0.2]} pos={[CX, y, TZ0]} color={frame} />
          <Box size={[W, 0.16, 0.2]} pos={[CX, y, TZ1]} color={frame} />
        </group>
      ))}
    </group>
  );
}

function Roof() {
  const ref = useRef<THREE.Group>(null);
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const register = (m: THREE.MeshStandardMaterial | null) => {
    if (m && !mats.current.includes(m)) {
      m.transparent = true;
      mats.current.push(m);
    }
  };
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const r = rig.roof;
    g.position.y = r * 18;
    g.visible = r < 0.98;
    for (const m of mats.current) {
      m.opacity = 1 - r * 0.92;
      m.depthWrite = r < 0.05;
    }
  });
  const acUnits: V3[] = [
    [-85, 0, -26],
    [-78, 0, -26],
    [-20, 0, -27],
    [-13, 0, -27],
    [12, 0, -22],
    [20, 0, -22],
  ];
  return (
    <group ref={ref}>
      <mesh position={[CX, TH + 0.4, CZ]} castShadow receiveShadow>
        <boxGeometry args={[W + 1.6, 0.8, D + 1.6]} />
        <meshStandardMaterial ref={register} color={navy} roughness={0.7} />
      </mesh>
      {/* orange rim, echoing the illustration */}
      {(
        [
          [[W + 2.4, 1.3, 0.8], [CX, TH + 0.65, TZ0 - 0.8]],
          [[W + 2.4, 1.3, 0.8], [CX, TH + 0.65, TZ1 + 0.8]],
          [[0.8, 1.3, D + 2.4], [TX0 - 0.8, TH + 0.65, CZ]],
          [[0.8, 1.3, D + 2.4], [TX1 + 0.8, TH + 0.65, CZ]],
        ] as [V3, V3][]
      ).map(([s, p], i) => (
        <mesh key={i} position={p} castShadow>
          <boxGeometry args={s} />
          <meshStandardMaterial ref={register} color={orange} roughness={0.45} />
        </mesh>
      ))}
      {/* skylight strip */}
      <mesh position={[CX, TH + 0.85, CZ]}>
        <boxGeometry args={[W - 20, 0.12, 3]} />
        <meshStandardMaterial ref={register} color="#8fc3ef" roughness={0.1} metalness={0.3} />
      </mesh>
      {acUnits.map((p, i) => (
        <group key={i} position={[p[0], TH + 0.8, p[2]]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[4.4, 1.2, 2.6]} />
            <meshStandardMaterial ref={register} color="#e4e7ee" />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 1.1, 1.22, 0]} rotation-x={-Math.PI / 2}>
              <circleGeometry args={[0.8, 20]} />
              <meshStandardMaterial ref={register} color="#525a6b" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function stadiumShape(len: number, r: number) {
  const s = new THREE.Shape();
  const h = len / 2;
  s.moveTo(-h, -r);
  s.lineTo(h, -r);
  s.absarc(h, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-h, r);
  s.absarc(-h, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
  return s;
}

/** Point on a stadium loop for u in [0,1). */
function stadiumPoint(len: number, r: number, u: number, out: THREE.Vector3) {
  const h = len / 2;
  const straight = len;
  const arc = Math.PI * r;
  const total = 2 * straight + 2 * arc;
  let d = (((u % 1) + 1) % 1) * total;
  if (d < straight) return out.set(-h + d, 0, -r);
  d -= straight;
  if (d < arc) {
    const a = -Math.PI / 2 + d / r;
    return out.set(h + Math.cos(a) * r, 0, Math.sin(a) * r);
  }
  d -= arc;
  if (d < straight) return out.set(h - d, 0, r);
  d -= straight;
  const a = Math.PI / 2 + d / r;
  return out.set(-h + Math.cos(a) * r, 0, Math.sin(a) * r);
}

function Carousel({ x, z }: { x: number; z: number }) {
  const bags = useRef<THREE.InstancedMesh>(null);
  const len = 8;
  const r = 1.7;
  const count = 14;
  const base = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(stadiumShape(len, r + 0.5), { depth: 0.6, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const belt = useMemo(() => {
    const outer = stadiumShape(len, r + 0.45);
    const inner = stadiumShape(len, r - 0.45);
    outer.holes.push(new THREE.Path(inner.getPoints(24).reverse()));
    const g = new THREE.ExtrudeGeometry(outer, { depth: 0.05, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1), e: new THREE.Euler() }), []);
  const colors = useMemo(() => ["#2449d8", "#e4572e", "#2bb3a3", "#f2b632", "#7b5cd6", "#e94f8a", "#334155"], []);
  useFrame(({ clock }) => {
    const im = bags.current;
    if (!im) return;
    for (let i = 0; i < count; i++) {
      stadiumPoint(len, r, clock.elapsedTime * 0.035 + i / count, tmp.p);
      tmp.p.y = 0.82;
      tmp.e.set(0, i * 0.7, 0);
      tmp.q.setFromEuler(tmp.e);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      im.setMatrixAt(i, tmp.m);
    }
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={[x, 0.3, z]}>
      <mesh geometry={base} castShadow receiveShadow>
        <meshStandardMaterial color="#3a4152" roughness={0.6} />
      </mesh>
      <mesh geometry={belt} position={[0, 0.62, 0]}>
        <meshStandardMaterial color="#9aa3b5" metalness={0.6} roughness={0.3} />
      </mesh>
      <instancedMesh
        ref={(im) => {
          bags.current = im;
          if (im) {
            const c = new THREE.Color();
            for (let i = 0; i < count; i++) im.setColorAt(i, c.set(colors[i % colors.length]));
          }
        }}
        args={[undefined, undefined, count]}
        castShadow
        frustumCulled={false}
      >
        <boxGeometry args={[0.75, 0.42, 0.55]} />
        <meshStandardMaterial roughness={0.5} />
      </instancedMesh>
    </group>
  );
}

function Planter({ x, z }: { x: number; z: number }) {
  const t1 = useModel("tree");
  const t2 = useModel("tree");
  const t3 = useModel("tree");
  return (
    <group position={[x, 0.3, z]}>
      <mesh castShadow receiveShadow position={[0, 0.3, 0]} scale={[1.5, 1, 0.75]}>
        <cylinderGeometry args={[1.6, 1.7, 0.6, 24]} />
        <meshStandardMaterial color="#b98a5e" />
      </mesh>
      <primitive object={t1} position={[-0.9, 0.6, 0]} scale={1.2} />
      <primitive object={t2} position={[0.9, 0.6, 0.2]} scale={1.4} />
      <primitive object={t3} position={[0, 0.6, -0.4]} scale={1.0} />
    </group>
  );
}

function Interior() {
  const shelfColors = ["#e4572e", "#2449d8", "#f2b632", "#7b5cd6", "#2bb3a3", "#e94f8a"];
  return (
    <group>
      {/* floor */}
      <Box size={[W, 0.3, D]} pos={[CX, 0.15, CZ]} color="#f3f4f7" roughness={0.35} />
      {/* landside / airside divider with a gap for security */}
      <Box size={[42, 2.2, 0.15]} pos={[-77, 1.4, -23.5]} color="#a9d3f5" transparent opacity={0.45} />
      <Box size={[72, 2.2, 0.15]} pos={[-6, 1.4, -23.5]} color="#a9d3f5" transparent opacity={0.45} />

      {/* Check-in counters + signage */}
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[-86 + i * 3.2, 0.3, -25]}>
          <Box size={[2.4, 1.1, 0.8]} pos={[0, 0.55, 0]} color="#f7f8fb" />
          <Box size={[2.42, 0.5, 0.05]} pos={[0, 0.55, -0.41]} color="#2449d8" />
          <Box size={[2.4, 0.15, 0.9]} pos={[0, 0.2, 0.9]} color="#3a4152" />
          <Box size={[1.6, 0.7, 0.1]} pos={[0, 3.2, 0.3]} color="#1f2a52" emissive="#2449d8" emissiveIntensity={0.35} />
        </group>
      ))}
      {/* Kiosks */}
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} size={[0.6, 1.5, 0.55]} pos={[-89, 1.05, -31 + i * 1.2]} color="#2f6fe0" />
      ))}
      {/* Queue posts */}
      {Array.from({ length: 10 }, (_, i) => (
        <group key={i}>
          <Box size={[0.08, 1, 0.08]} pos={[-84 + i * 2.4, 0.8, -30]} color="#c0c6d2" metalness={0.6} />
          <Box size={[0.08, 1, 0.08]} pos={[-84 + i * 2.4, 0.8, -28.4]} color="#c0c6d2" metalness={0.6} />
        </group>
      ))}
      <Box size={[22, 0.06, 0.04]} pos={[-73.2, 1.15, -30]} color="#2449d8" />
      <Box size={[22, 0.06, 0.04]} pos={[-73.2, 1.15, -28.4]} color="#2449d8" />

      {/* Security: X-ray tunnels + walk-through arches */}
      {[-51, -47].map((x) => (
        <group key={x}>
          <Box size={[1.2, 1.4, 3.2]} pos={[x + 1.1, 1.0, -24.5]} color="#cfd5df" />
          <Box size={[1.0, 0.8, 3.25]} pos={[x + 1.1, 1.0, -24.5]} color="#1e2533" />
          <Box size={[0.15, 2.3, 0.4]} pos={[x - 0.6, 1.45, -22.6]} color="#e2e6ee" />
          <Box size={[0.15, 2.3, 0.4]} pos={[x + 0.6, 1.45, -22.6]} color="#e2e6ee" />
          <Box size={[1.35, 0.2, 0.4]} pos={[x, 2.6, -22.6]} color="#e2e6ee" />
        </group>
      ))}

      {/* Duty-free shelving along the airside glass + central planter */}
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[-39 + i * 3.6, 0.3, -14.9]}>
          <Box size={[3, 2.2, 0.6]} pos={[0, 1.1, 0]} color="#c9a37c" />
          {[0.5, 1.1, 1.7].map((y, k) => (
            <Box key={y} size={[2.8, 0.3, 0.62]} pos={[0, y, 0.02]} color={shelfColors[(i + k) % shelfColors.length]} />
          ))}
        </group>
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <Box key={i} size={[2.4, 1.1, 1.2]} pos={[-36 + i * 6.5, 0.85, -22.2]} color="#f2e2c9" />
      ))}
      <Planter x={-26} z={-18.6} />

      {/* Gate hold room */}
      {[-20, -18.4].map((z) => (
        <Box key={z} size={[10, 0.5, 0.7]} pos={[-66.8, 0.55, z - 0.4]} color="#2b3a67" />
      ))}
      <Box size={[2.2, 1.1, 0.9]} pos={[-61.5, 0.85, -16.6]} color="#f7f8fb" />
      <Box size={[2.2, 0.9, 0.12]} pos={[-61.5, 3.6, -15.4]} color="#1f2a52" emissive="#22c55e" emissiveIntensity={0.25} />

      {/* Lounge */}
      {Array.from({ length: 10 }, (_, i) => (
        <Box key={i} size={[2.4, 0.7, 1]} pos={[1 + (i % 5) * 5, 0.65, -18.5 + (Math.floor(i / 5) ? 1.8 : 0) + 0.7]} color="#9aa56b" />
      ))}
      <Box size={[1.4, 0.5, 1.4]} pos={[3.5, 0.55, -20.4]} color="#e9dcc4" />
      <Box size={[1.4, 0.5, 1.4]} pos={[13.5, 0.55, -20.4]} color="#e9dcc4" />
      <Box size={[6, 1, 1.4]} pos={[25, 0.8, -19.5]} color="#f4f0e8" />
      {["#f2b632", "#e4572e", "#8bc34a", "#f2b632"].map((c, i) => (
        <Box key={i} size={[1, 0.25, 0.8]} pos={[23 + i * 1.3, 1.42, -19.5]} color={c} />
      ))}

      {/* Baggage claim */}
      <Carousel x={3} z={-28} />
      <Carousel x={19} z={-28} />
      <Box size={[3, 1.4, 0.15]} pos={[11, 3.6, -31.6]} color="#1f2a52" emissive="#f2b632" emissiveIntensity={0.25} />
    </group>
  );
}

/** Covered walkway from the terminal facade to an aircraft door. */
export function JetBridge({ from, to, height }: { from: [number, number]; to: [number, number]; height: number }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dz, dx);
  return (
    <group>
      {/* rotunda */}
      <group position={[from[0], 0, from[1]]}>
        <mesh position={[0, height / 2, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.6, height, 12]} />
          <meshStandardMaterial color="#c3c8d2" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, height + 1.5, 0]} castShadow>
          <cylinderGeometry args={[1.9, 1.9, 3, 20]} />
          <meshStandardMaterial color="#dfe3ea" />
        </mesh>
      </group>
      {/* tunnel */}
      <group position={[from[0] + dx / 2, height, from[1] + dz / 2]} rotation-y={yaw}>
        <Box size={[len, 0.25, 2.6]} pos={[0, 0, 0]} color="#c9ced8" />
        <Box size={[len, 0.25, 2.8]} pos={[0, 2.9, 0]} color="#e9ecf2" />
        <Box size={[len, 2.6, 0.08]} pos={[0, 1.45, 1.3]} color="#8fc3ef" transparent opacity={0.4} metalness={0.3} roughness={0.1} />
        <Box size={[len, 2.6, 0.08]} pos={[0, 1.45, -1.3]} color="#8fc3ef" transparent opacity={0.4} metalness={0.3} roughness={0.1} />
        {Array.from({ length: Math.floor(len / 2.4) }, (_, i) => (
          <group key={i}>
            <Box size={[0.12, 2.8, 0.14]} pos={[-len / 2 + 1.2 + i * 2.4, 1.45, 1.32]} color="#b8bfcc" />
            <Box size={[0.12, 2.8, 0.14]} pos={[-len / 2 + 1.2 + i * 2.4, 1.45, -1.32]} color="#b8bfcc" />
          </group>
        ))}
        {/* cab */}
        <Box size={[2.4, 3.2, 3.4]} pos={[len / 2 + 0.6, 1.45, 0]} color="#d4d9e2" />
        <Box size={[0.1, 2.4, 2.2]} pos={[len / 2 + 1.82, 1.3, 0]} color="#3a4152" />
        {/* support leg + bogie */}
        <Box size={[0.35, height, 0.35]} pos={[len * 0.25, -height / 2, 0.9]} color="#9aa1ad" metalness={0.5} />
        <Box size={[0.35, height, 0.35]} pos={[len * 0.25, -height / 2, -0.9]} color="#9aa1ad" metalness={0.5} />
        <Box size={[1.2, 0.5, 2.4]} pos={[len * 0.25, -height + 0.45, 0]} color="#3a4152" />
      </group>
    </group>
  );
}

export function Terminal() {
  return (
    <group>
      <Interior />
      <GlassWalls />
      <Roof />
      {/* Landside canopy over the curb */}
      <group>
        {Array.from({ length: 6 }, (_, i) => (
          <group key={i} position={[-82 + i * 18, 0, -37]}>
            <Box size={[9, 0.25, 3.6]} pos={[0, 3.4, 0]} color="#2f5aa8" />
            <Box size={[0.2, 3.4, 0.2]} pos={[-4, 1.7, -1.4]} color="#9aa1ad" />
            <Box size={[0.2, 3.4, 0.2]} pos={[4, 1.7, -1.4]} color="#9aa1ad" />
            <Box size={[6, 0.45, 0.6]} pos={[0, 0.45, 0.8]} color="#cfd5df" />
          </group>
        ))}
      </group>
      <JetBridge from={[-60, -12.6]} to={[-48.8, 1.4]} height={2.6} />
      <JetBridge from={[-92, -12.6]} to={[-99.6, -1.6]} height={3.2} />
    </group>
  );
}
