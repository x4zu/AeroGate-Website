"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { busPose, makePose, PLANE_A_PARK, PLANE_B_PARK, planeAPose, planeCPose, rig, yawFrom } from "@/lib/rig";
import { useModel, type ModelName } from "./useModel";

export type SelectHandler = (key: number) => void;

/** Find named nodes once (beacons, propellers, radar...). */
function useNodes(root: THREE.Object3D, name: string) {
  return useMemo(() => {
    const out: THREE.Object3D[] = [];
    root.traverse((o) => o.name.startsWith(name) && out.push(o));
    return out;
  }, [root, name]);
}

function useBeacon(root: THREE.Object3D, phase = 0) {
  const beacons = useNodes(root, "Beacon");
  useFrame(({ clock }) => {
    const on = (clock.elapsedTime + phase) % 1.2 < 0.15;
    for (const b of beacons) {
      const m = (b as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (m) m.emissiveIntensity = on ? 4 : 0.2;
    }
  });
}

/** Hover → cursor + gentle lift; click → jump to the related step. */
export function Interactive({
  stepKey,
  onSelect,
  children,
}: {
  stepKey: number;
  onSelect: SelectHandler;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const target = hover ? 0.6 : 0;
    g.position.y += (target - g.position.y) * (1 - Math.exp(-dt * 10));
  });
  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(stepKey);
      }}
    >
      {children}
    </group>
  );
}

function Parked({
  model,
  pos,
  yaw,
  phase = 0,
  spinProps = false,
}: {
  model: ModelName;
  pos: [number, number, number];
  yaw: number;
  phase?: number;
  spinProps?: boolean;
}) {
  const obj = useModel(model);
  useBeacon(obj, phase);
  const props = useNodes(obj, "Prop");
  useFrame((_, dt) => {
    if (spinProps) for (const p of props) p.rotation.x += dt * 9;
  });
  return <primitive object={obj} position={pos} rotation-y={yaw} />;
}

/** Red airliner that performs pushback, taxi, takeoff and cruise. */
function PlaneA() {
  const plane = useModel("airliner-red");
  const tug = useModel("tug");
  useBeacon(plane);
  const pose = useMemo(makePose, []);
  const tugPos = useMemo(() => new THREE.Vector3(), []);
  const detach = useMemo(() => new THREE.Vector3(-62, 0, 42), []);
  const parked = useMemo(() => new THREE.Vector3(-64, 0, 28), []);
  useMemo(() => (plane.rotation.order = "YZX"), [plane]);
  useFrame(() => {
    const t = rig.planeT;
    planeAPose(t, pose);
    plane.position.copy(pose.pos);
    plane.rotation.y = pose.yaw;
    plane.rotation.z = pose.pitch;
    // tug is coupled to the nose wheel until pushback ends, then drives away
    if (t <= 0.2) {
      tugPos.set(Math.cos(pose.yaw) * 17.5, 0, -Math.sin(pose.yaw) * 17.5).add(pose.pos);
      tug.position.copy(tugPos);
      tug.rotation.y = pose.yaw + Math.PI;
    } else {
      const k = Math.min(1, (t - 0.2) / 0.06);
      tug.position.lerpVectors(detach, parked, k);
      tug.rotation.y = k < 1 ? yawFrom(parked.x - detach.x, parked.z - detach.z) : Math.PI / 2;
    }
  });
  return (
    <group>
      <primitive object={plane} position={PLANE_A_PARK.toArray()} rotation-y={Math.PI / 2} />
      <primitive object={tug} />
    </group>
  );
}

/** Orange airliner on final approach, visible only during the landing chapter. */
function PlaneC() {
  const plane = useModel("airliner-orange");
  useBeacon(plane, 0.4);
  const pose = useMemo(makePose, []);
  useMemo(() => (plane.rotation.order = "YZX"), [plane]);
  useFrame(() => {
    plane.visible = rig.landT > 0.001;
    planeCPose(rig.landT, pose);
    plane.position.copy(pose.pos);
    plane.rotation.y = pose.yaw;
    plane.rotation.z = pose.pitch;
  });
  return <primitive object={plane} />;
}

function ApronBus() {
  const bus = useModel("bus");
  const pose = useMemo(makePose, []);
  useFrame(() => {
    busPose(rig.busT, pose);
    bus.position.copy(pose.pos);
    bus.rotation.y = pose.yaw;
  });
  return <primitive object={bus} />;
}

/** Taxi that pulls up to the curb at the start of the story. */
function ArrivalTaxi() {
  const taxi = useModel("taxi");
  useFrame(() => {
    const k = Math.min(1, rig.arriveT / 0.6);
    const e = 1 - Math.pow(1 - k, 3);
    taxi.position.set(THREE.MathUtils.lerp(70, -40, e), 0, -42.2);
    taxi.rotation.y = Math.PI;
  });
  return <primitive object={taxi} />;
}

/** A vehicle looping forever along a closed path. */
function Looper({ model, points, speed, offset = 0 }: { model: ModelName; points: [number, number][]; speed: number; offset?: number }) {
  const obj = useModel(model);
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "catmullrom", 0.2),
    [points],
  );
  const len = useMemo(() => curve.getLength(), [curve]);
  const tan = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const u = ((clock.elapsedTime * speed) / len + offset) % 1;
    curve.getPointAt(u, obj.position);
    curve.getTangentAt(u, tan);
    obj.rotation.y = yawFrom(tan.x, tan.z);
  });
  return <primitive object={obj} />;
}

/** Cars streaming along one lane of the curb road. */
function Traffic({ z, dir, count, model }: { z: number; dir: 1 | -1; count: number; model: "taxi" | "van" }) {
  const cars = [useModel(model), useModel(model), useModel(model), useModel(model)].slice(0, count);
  useFrame(({ clock }) => {
    cars.forEach((c, i) => {
      const u = ((clock.elapsedTime * 9) / 260 + i / count) % 1;
      c.position.set(dir * (-130 + u * 260), 0, z);
      c.rotation.y = dir > 0 ? 0 : Math.PI;
    });
  });
  return (
    <group>
      {cars.map((c, i) => (
        <primitive key={i} object={c} />
      ))}
    </group>
  );
}

function VipSetup() {
  const vanA = useModel("van");
  const vanB = useModel("van");
  const ramp = Math.atan2(1.7, 2.3);
  return (
    <group>
      <primitive object={vanA} position={[61, 0, 17]} />
      <primitive object={vanB} position={[54, 0, 17]} />
      {/* red carpet */}
      <mesh rotation-x={-Math.PI / 2} position={[68, 0.03, 12.6]} receiveShadow>
        <planeGeometry args={[1.3, 6]} />
        <meshStandardMaterial color="#d62828" roughness={0.9} />
      </mesh>
      {/* integral airstair */}
      <mesh position={[68, 0.85, 8.45]} rotation-x={ramp} castShadow>
        <boxGeometry args={[1.0, 0.12, 2.86]} />
        <meshStandardMaterial color="#e9ecf2" />
      </mesh>
    </group>
  );
}

function Cones() {
  const spots: [number, number][] = [
    [-52, -2],
    [-38, -2],
    [12, -2],
    [28, -2],
    [-104, 0],
    [-86, 0],
    [74, 18],
    [92, 0],
    [104, 0],
    [-30, 26],
    [36, 26],
  ];
  return (
    <group>
      {spots.map(([x, z], i) => (
        <ConeAt key={i} x={x} z={z} />
      ))}
    </group>
  );
}

function ConeAt({ x, z }: { x: number; z: number }) {
  const c = useModel("cone");
  return <primitive object={c} position={[x, 0, z]} />;
}

export function Fleet({ onSelect }: { onSelect: SelectHandler }) {
  return (
    <group>
      <Interactive stepKey={8} onSelect={onSelect}>
        <PlaneA />
      </Interactive>
      <Interactive stepKey={11} onSelect={onSelect}>
        <PlaneC />
      </Interactive>
      <Interactive stepKey={6} onSelect={onSelect}>
        <Parked model="airliner-teal" pos={PLANE_B_PARK.toArray()} yaw={Math.PI / 2} phase={0.3} />
        <Parked model="stairs-truck" pos={[14.45, 0, 3.0]} yaw={0} />
        <ApronBus />
      </Interactive>
      <Interactive stepKey={5} onSelect={onSelect}>
        <Parked model="widebody-purple" pos={[-95, 0, 14]} yaw={Math.PI / 2} phase={0.7} />
      </Interactive>
      <Interactive stepKey={7} onSelect={onSelect}>
        <Parked model="bizjet-navy" pos={[72, 0, 6]} yaw={Math.PI} phase={0.5} />
        <VipSetup />
      </Interactive>
      <Parked model="turboprop-orange" pos={[98, 0, 10]} yaw={Math.PI / 2} phase={0.9} spinProps />
      <Interactive stepKey={1} onSelect={onSelect}>
        <ArrivalTaxi />
        <Parked model="bus" pos={[-62, 0, -42.2]} yaw={Math.PI} />
      </Interactive>

      {/* Ground support loops on the apron service road */}
      <Looper
        model="fuel-truck"
        points={[
          [-110, -9],
          [110, -9],
          [116, 0],
          [110, 30],
          [-110, 30],
          [-116, 20],
        ]}
        speed={7}
      />
      <Looper
        model="baggage-cart"
        points={[
          [-110, -9],
          [110, -9],
          [116, 0],
          [110, 30],
          [-110, 30],
          [-116, 20],
        ]}
        speed={7}
        offset={0.5}
      />
      <Looper
        model="tug"
        points={[
          [120, -40],
          [175, -40],
          [175, 5],
          [120, 5],
        ]}
        speed={5}
      />
      <Traffic z={-53.8} dir={-1} count={3} model="taxi" />
      <Traffic z={-46} dir={1} count={2} model="van" />
      <Cones />
    </group>
  );
}
