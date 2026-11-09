"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { useModel, type ModelName } from "./useModel";

/**
 * Time-driven air traffic that runs regardless of scroll position.
 * Each aircraft flies a full circuit on runway 2 (z = 105):
 * taxi out → takeoff roll → climb → wide loop around the city → final approach →
 * touchdown → rollout → taxi to the cargo apron → park → repeat.
 */

type P = [number, number, number];

interface Seg {
  curve: THREE.CatmullRomCurve3;
  dur: number;
  ease: (t: number) => number;
}

const linear = (t: number) => t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

const curve = (pts: P[]) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal");

function buildCircuit(sx: number): Seg[] {
  const apex: P = [sx + 6, 0, 141.5];
  return [
    {
      // taxi out from the cargo stand to the western end of runway 2
      curve: curve([apex, [sx + 12, 0, 135], [sx + 12, 0, 127], [sx - 6, 0, 125], [-150, 0, 125], [-168, 0, 119], [-175, 0, 110], [-166, 0, 105.3], [-150, 0, 105]]),
      dur: 22,
      ease: smooth,
    },
    {
      // takeoff roll + rotation + initial climb
      curve: curve([[-150, 0, 105], [-60, 0, 105], [20, 0, 105], [70, 4, 105], [150, 22, 104], [240, 48, 100]]),
      dur: 11,
      ease: easeIn,
    },
    {
      // wide circuit around the airport and the city
      curve: curve([
        [240, 48, 100],
        [380, 75, 60],
        [460, 90, -80],
        [380, 100, -260],
        [120, 105, -340],
        [-200, 100, -330],
        [-430, 90, -220],
        [-520, 75, -40],
        [-500, 60, 80],
        [-420, 45, 105],
      ]),
      dur: 34,
      ease: linear,
    },
    {
      // final approach, flare, touchdown and rollout
      curve: curve([[-420, 45, 105], [-300, 22, 105], [-190, 3, 105], [-150, 0, 105], [-60, 0, 105], [40, 0, 105], [60, 0, 105]]),
      dur: 13,
      ease: easeOut,
    },
    {
      // runway exit → taxiway 3 → cargo stand
      curve: curve([[60, 0, 105], [90, 0, 108], [108, 0, 117], [100, 0, 124.5], [sx + 20, 0, 125], [sx, 0, 127], [sx, 0, 134], apex]),
      dur: 20,
      ease: smooth,
    },
  ];
}

const PARK = 12;

function useCircuitAircraft(model: ModelName, sx: number, phase: number) {
  const obj = useModel(model);
  const segs = useMemo(() => buildCircuit(sx), [sx]);
  const total = useMemo(() => segs.reduce((a, s) => a + s.dur, 0) + PARK, [segs]);
  const tan = useMemo(() => new THREE.Vector3(), []);
  const tan2 = useMemo(() => new THREE.Vector3(), []);
  const beacons = useMemo(() => {
    const out: THREE.MeshStandardMaterial[] = [];
    obj.traverse((o) => {
      if (o.name.startsWith("Beacon")) out.push((o as THREE.Mesh).material as THREE.MeshStandardMaterial);
    });
    return out;
  }, [obj]);
  useMemo(() => (obj.rotation.order = "YZX"), [obj]);

  useFrame(({ clock }) => {
    let t = (clock.elapsedTime + phase * total) % total;
    let seg: Seg | null = null;
    for (const s of segs) {
      if (t < s.dur) {
        seg = s;
        break;
      }
      t -= s.dur;
    }
    let u: number;
    if (!seg) {
      // parked at the stand
      seg = segs[segs.length - 1];
      u = 1;
    } else {
      u = seg.ease(t / seg.dur);
    }
    seg.curve.getPointAt(u, obj.position);
    seg.curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)), tan);
    seg.curve.getTangentAt(Math.min(0.999, Math.max(0.001, u + 0.01)), tan2);
    const yaw = Math.atan2(-tan.z, tan.x);
    const yaw2 = Math.atan2(-tan2.z, tan2.x);
    let dYaw = yaw2 - yaw;
    if (dYaw > Math.PI) dYaw -= Math.PI * 2;
    if (dYaw < -Math.PI) dYaw += Math.PI * 2;
    const airborne = obj.position.y > 1;
    obj.rotation.y = yaw;
    obj.rotation.z = Math.atan2(tan.y, Math.hypot(tan.x, tan.z)) + (obj.position.y > 0.2 && obj.position.y < 4 && seg.ease === easeOut ? 0.06 : 0);
    // bank into turns while flying
    obj.rotation.x = airborne ? THREE.MathUtils.clamp(-dYaw * 9, -0.45, 0.45) : 0;
    const on = (clock.elapsedTime + phase * 3) % 1.2 < 0.15;
    for (const m of beacons) m.emissiveIntensity = on ? 4 : 0.2;
  });
  return obj;
}

function CircuitPlane({ model, sx, phase }: { model: ModelName; sx: number; phase: number }) {
  const obj = useCircuitAircraft(model, sx, phase);
  return <primitive object={obj} />;
}

/** High-altitude overflights crossing the sky on a loop. */
function Overflight({ model, from, to, period, offset, scale = 1 }: { model: ModelName; from: P; to: P; period: number; offset: number; scale?: number }) {
  const obj = useModel(model);
  const a = useMemo(() => new THREE.Vector3(...from), [from]);
  const b = useMemo(() => new THREE.Vector3(...to), [to]);
  const yaw = useMemo(() => Math.atan2(-(b.z - a.z), b.x - a.x), [a, b]);
  useFrame(({ clock }) => {
    const u = ((clock.elapsedTime / period + offset) % 1 + 1) % 1;
    obj.position.lerpVectors(a, b, u);
    obj.rotation.y = yaw;
  });
  return <primitive object={obj} scale={scale} />;
}

export function AmbientTraffic() {
  return (
    <group>
      <CircuitPlane model="airliner-teal" sx={-30} phase={0} />
      <CircuitPlane model="airliner-orange" sx={30} phase={0.5} />
      <Overflight model="airliner-red" from={[-950, 150, -170]} to={[950, 165, -40]} period={46} offset={0} />
      <Overflight model="bizjet-navy" from={[950, 125, 240]} to={[-950, 135, 180]} period={38} offset={0.4} scale={1.2} />
      <Overflight model="widebody-purple" from={[300, 190, -900]} to={[-200, 200, 900]} period={60} offset={0.7} />
    </group>
  );
}
