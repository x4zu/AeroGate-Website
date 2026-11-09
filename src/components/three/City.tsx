"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** Deterministic pseudo-random so the skyline is identical on every load. */
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Repeating façade texture: a grid of lit / unlit windows. */
function makeWindowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 128, 128);
  const r = rng(11);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const lit = r() > 0.7;
      g.fillStyle = lit ? "#fff3cf" : "#9fb6d6";
      g.fillRect(x * 32 + 4, y * 32 + 6, 24, 20);
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(x * 32 + 4, y * 32 + 6, 24, 4);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

interface Tower {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  crown: boolean;
}

const TOWER_COLORS = ["#c9d6e8", "#b7c8de", "#d7dde6", "#a9c6d6", "#e2d6c6", "#c4cfdc", "#9fb4cf"];

/** Office towers packed into the commercial blocks (west of the boulevard). */
function planTowers(): Tower[] {
  const r = rng(42);
  const xs: [number, number][] = [
    [-196, -154],
    [-146, -104],
    [-96, -64],
    [-56, -27],
  ];
  const zs: [number, number][] = [
    [-108, -84],
    [-138, -116],
    [-168, -146],
    [-200, -176],
  ];
  const out: Tower[] = [];
  for (const [x0, x1] of xs) {
    for (const [z0, z1] of zs) {
      const cols = x1 - x0 > 36 ? 2 : 1;
      const rows = 2;
      const cw = (x1 - x0) / cols;
      const rd = (z1 - z0) / rows;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (r() < 0.12) continue; // leave a plaza now and then
          const w = cw * (0.55 + r() * 0.3);
          const d = rd * (0.55 + r() * 0.3);
          // taller towards the boulevard and the middle of the district
          const nearBlvd = 1 - Math.min(1, Math.abs((x0 + x1) / 2 + 20) / 180);
          const h = 10 + r() * 16 + nearBlvd * 26 + (z0 < -140 ? 12 : 0);
          out.push({
            x: x0 + cw * (i + 0.5),
            z: z0 + rd * (j + 0.5),
            w,
            d,
            h,
            color: TOWER_COLORS[Math.floor(r() * TOWER_COLORS.length)],
            crown: h > 40,
          });
        }
      }
    }
  }
  return out;
}

function TowerMesh({ t, tex }: { t: Tower; tex: THREE.Texture }) {
  const mats = useMemo(() => {
    const side = (len: number) => {
      const m = tex.clone();
      m.needsUpdate = true;
      m.repeat.set(Math.max(1, Math.round(len / 7)), Math.max(1, Math.round(t.h / 7)));
      return new THREE.MeshStandardMaterial({ map: m, color: t.color, roughness: 0.35, metalness: 0.25 });
    };
    const roof = new THREE.MeshStandardMaterial({ color: "#8d96a8", roughness: 0.8 });
    const sx = side(t.d);
    const sz = side(t.w);
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    return [sx, sx, roof, roof, sz, sz];
  }, [t, tex]);
  return (
    <group position={[t.x, 0, t.z]}>
      <mesh position={[0, t.h / 2, 0]} material={mats} castShadow receiveShadow>
        <boxGeometry args={[t.w, t.h, t.d]} />
      </mesh>
      {/* podium */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[t.w + 2, 4, t.d + 2]} />
        <meshStandardMaterial color="#eef0f4" roughness={0.6} />
      </mesh>
      {/* rooftop plant + crown */}
      <mesh position={[t.w * 0.15, t.h + 1, -t.d * 0.1]} castShadow>
        <boxGeometry args={[t.w * 0.35, 2, t.d * 0.3]} />
        <meshStandardMaterial color="#d4d8e0" />
      </mesh>
      {t.crown ? (
        <group position={[0, t.h, 0]}>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[t.w * 0.9, 1.2, t.d * 0.9]} />
            <meshStandardMaterial color="#f08a24" />
          </mesh>
          <mesh position={[0, 5, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 8, 6]} />
            <meshStandardMaterial color="#9aa1ad" />
          </mesh>
          <mesh position={[0, 9.2, 0]}>
            <sphereGeometry args={[0.35, 8, 6]} />
            <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={2} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function Mall() {
  return (
    <group position={[-2, 0, -110]}>
      <mesh position={[0, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[22, 10, 50]} />
        <meshStandardMaterial color="#f4efe6" />
      </mesh>
      <mesh position={[0, 10.2, 0]}>
        <boxGeometry args={[20, 0.4, 48]} />
        <meshStandardMaterial color="#9fd18b" />
      </mesh>
      <mesh position={[-11.05, 4, 0]}>
        <boxGeometry args={[0.2, 5, 46]} />
        <meshStandardMaterial color="#8fc3ef" metalness={0.3} roughness={0.1} />
      </mesh>
      <mesh position={[-11.2, 8.4, 0]}>
        <boxGeometry args={[0.3, 1.6, 30]} />
        <meshStandardMaterial color="#2449d8" emissive="#2449d8" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

/** Instanced houses (walls + pyramid roofs) on the residential grid. */
function Houses() {
  const walls = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const lots = useMemo(() => {
    const r = rng(7);
    const out: { x: number; z: number; rot: number; s: number; wall: string; roof: string }[] = [];
    const xs: [number, number][] = [
      [-10, 57],
      [63, 97],
      [103, 137],
      [143, 177],
      [183, 199],
    ];
    const zs: [number, number][] = [
      [-102, -84],
      [-127, -108],
      [-152, -133],
      [-177, -158],
      [-203, -183],
    ];
    const wallsC = ["#f6efe2", "#f1e4d0", "#e9eef5", "#f7e9e4", "#eef3e6", "#fff8ec"];
    const roofsC = ["#c8553d", "#b5483a", "#4f6d8f", "#6b7a8f", "#d9822b", "#7a5c48"];
    for (const [x0, x1] of xs) {
      for (const [z0, z1] of zs) {
        // park block + apartment block stay free
        if (x0 === 103 && z0 === -152) continue;
        if (x0 === -10) continue;
        for (let x = x0 + 6; x <= x1 - 5; x += 11) {
          for (const z of [z0 + 5, z1 - 5]) {
            if (r() < 0.08) continue;
            out.push({
              x: x + (r() - 0.5) * 1.5,
              z,
              rot: z === z0 + 5 ? 0 : Math.PI,
              s: 0.85 + r() * 0.35,
              wall: wallsC[Math.floor(r() * wallsC.length)],
              roof: roofsC[Math.floor(r() * roofsC.length)],
            });
          }
        }
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const w = walls.current;
    const rf = roofs.current;
    if (!w || !rf) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    lots.forEach((l, i) => {
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, l.rot);
      p.set(l.x, 2.2 * l.s, l.z);
      s.set(l.s, l.s, l.s);
      m.compose(p, q, s);
      w.setMatrixAt(i, m);
      w.setColorAt(i, c.set(l.wall));
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, l.rot + Math.PI / 4);
      p.set(l.x, 4.4 * l.s + 1.5 * l.s, l.z);
      m.compose(p, q, s);
      rf.setMatrixAt(i, m);
      rf.setColorAt(i, c.set(l.roof));
    });
    w.instanceMatrix.needsUpdate = true;
    rf.instanceMatrix.needsUpdate = true;
    if (w.instanceColor) w.instanceColor.needsUpdate = true;
    if (rf.instanceColor) rf.instanceColor.needsUpdate = true;
  }, [lots]);

  return (
    <group>
      <instancedMesh ref={walls} args={[undefined, undefined, lots.length]} castShadow receiveShadow>
        <boxGeometry args={[7, 4.4, 7]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[undefined, undefined, lots.length]} castShadow>
        <coneGeometry args={[5.6, 3, 4]} />
        <meshStandardMaterial roughness={0.7} flatShading />
      </instancedMesh>
    </group>
  );
}

function Apartments({ tex }: { tex: THREE.Texture }) {
  const blocks: Tower[] = [
    { x: 17, z: -93, w: 10, d: 14, h: 18, color: "#f3e3d3", crown: false },
    { x: 30, z: -93, w: 10, d: 14, h: 22, color: "#e3ecf3", crown: false },
    { x: 17, z: -118, w: 10, d: 14, h: 15, color: "#eef3e6", crown: false },
    { x: 30, z: -118, w: 10, d: 14, h: 20, color: "#f7e9e4", crown: false },
    { x: 17, z: -165, w: 22, d: 12, h: 16, color: "#e9eef5", crown: false },
    { x: 17, z: -192, w: 22, d: 12, h: 24, color: "#f1e4d0", crown: false },
  ];
  return (
    <group>
      {blocks.map((b, i) => (
        <TowerMesh key={i} t={b} tex={tex} />
      ))}
    </group>
  );
}

/** Instanced street trees + park trees. */
function CityTrees() {
  const crowns = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const r = rng(3);
    const out: [number, number, number][] = [];
    for (let z = -200; z <= -84; z += 9) out.push([-20, z, 1.1]); // boulevard median
    for (let x = -195; x <= 195; x += 10) out.push([x, -84, 0.9]);
    for (let i = 0; i < 26; i++) out.push([106 + r() * 28, -150 + r() * 15, 0.9 + r() * 0.6]); // park
    for (let i = 0; i < 40; i++) out.push([40 + r() * 158, -200 + r() * 115, 0.7 + r() * 0.5]); // gardens
    return out.filter(([x, z]) => !(Math.abs(x - 120) < 11 && Math.abs(z + 142.5) < 6.5));
  }, []);
  useLayoutEffect(() => {
    const cr = crowns.current;
    const tr = trunks.current;
    if (!cr || !tr) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    spots.forEach(([x, z, s], i) => {
      m.compose(new THREE.Vector3(x, 2.4 * s, z), q, new THREE.Vector3(s, s, s));
      cr.setMatrixAt(i, m);
      cr.setColorAt(i, c.set(i % 3 ? "#86c96b" : "#6fb85a"));
      m.compose(new THREE.Vector3(x, 0.8 * s, z), q, new THREE.Vector3(s, s, s));
      tr.setMatrixAt(i, m);
    });
    cr.instanceMatrix.needsUpdate = true;
    tr.instanceMatrix.needsUpdate = true;
    if (cr.instanceColor) cr.instanceColor.needsUpdate = true;
  }, [spots]);
  return (
    <group>
      <instancedMesh ref={crowns} args={[undefined, undefined, spots.length]} castShadow>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, spots.length]}>
        <cylinderGeometry args={[0.15, 0.22, 1.6, 6]} />
        <meshStandardMaterial color="#8a6a4a" />
      </instancedMesh>
    </group>
  );
}

/** Instanced cars looping on the city roads. */
function CityTraffic() {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const cabins = useRef<THREE.InstancedMesh>(null);
  const routes = useMemo(() => {
    const mk = (pts: [number, number][]) => {
      const v = pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
      const cum = [0];
      for (let i = 1; i < v.length; i++) cum.push(cum[i - 1] + v[i].distanceTo(v[i - 1]));
      return { v, cum, len: cum[cum.length - 1] };
    };
    return [
      mk([[-200, -77], [200, -77]]),
      mk([[200, -73], [-200, -73]]),
      mk([[-23, -205], [-23, -58]]),
      mk([[-17, -58], [-17, -205]]),
      mk([[-200, -110], [-27, -110]]),
      mk([[-27, -144], [-200, -144]]),
      mk([[-148, -80], [-148, -205]]),
      mk([[-62, -205], [-62, -80]]),
      mk([[-13, -130], [200, -130]]),
      mk([[200, -156], [-13, -156]]),
      mk([[99, -80], [99, -205]]),
      mk([[-125, -54], [125, -54]]),
    ];
  }, []);
  const cars = useMemo(() => {
    const r = rng(19);
    const colors = ["#f5c518", "#2449d8", "#e4572e", "#f4f5f8", "#1e2330", "#2bb3a3", "#9aa1ad"];
    const out: { route: number; offset: number; speed: number; color: string }[] = [];
    routes.forEach((_, ri) => {
      const n = ri < 4 ? 6 : 3;
      for (let i = 0; i < n; i++) out.push({ route: ri, offset: i / n + r() * 0.05, speed: 8 + r() * 5, color: colors[Math.floor(r() * colors.length)] });
    });
    return out;
  }, [routes]);
  useLayoutEffect(() => {
    const b = bodies.current;
    if (!b) return;
    const c = new THREE.Color();
    cars.forEach((car, i) => b.setColorAt(i, c.set(car.color)));
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
  }, [cars]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1), up: new THREE.Vector3(0, 1, 0) }), []);
  useFrame(({ clock }) => {
    const b = bodies.current;
    const cb = cabins.current;
    if (!b || !cb) return;
    cars.forEach((car, i) => {
      const rt = routes[car.route];
      const d = (((clock.elapsedTime * car.speed) / rt.len + car.offset) % 1) * rt.len;
      let k = 1;
      while (k < rt.cum.length - 1 && rt.cum[k] < d) k++;
      const a = rt.v[k - 1];
      const bb = rt.v[k];
      tmp.p.lerpVectors(a, bb, (d - rt.cum[k - 1]) / (rt.cum[k] - rt.cum[k - 1]));
      tmp.q.setFromAxisAngle(tmp.up, Math.atan2(-(bb.z - a.z), bb.x - a.x));
      tmp.p.y = 0.7;
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      b.setMatrixAt(i, tmp.m);
      tmp.p.y = 1.45;
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      cb.setMatrixAt(i, tmp.m);
    });
    b.instanceMatrix.needsUpdate = true;
    cb.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, cars.length]} castShadow frustumCulled={false}>
        <boxGeometry args={[4.4, 0.9, 1.8]} />
        <meshStandardMaterial roughness={0.35} metalness={0.2} />
      </instancedMesh>
      <instancedMesh ref={cabins} args={[undefined, undefined, cars.length]} frustumCulled={false}>
        <boxGeometry args={[2.4, 0.65, 1.62]} />
        <meshStandardMaterial color="#1d2a44" roughness={0.2} metalness={0.4} />
      </instancedMesh>
    </group>
  );
}

export function City() {
  const tex = useMemo(() => makeWindowTexture(), []);
  const towers = useMemo(() => planTowers(), []);
  return (
    <group>
      {towers.map((t, i) => (
        <TowerMesh key={i} t={t} tex={tex} />
      ))}
      <Mall />
      <Apartments tex={tex} />
      <Houses />
      <CityTrees />
      <CityTraffic />
    </group>
  );
}
