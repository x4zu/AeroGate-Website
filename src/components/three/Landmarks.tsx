"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Interactive, type SelectHandler } from "./Fleet";
import { useModel } from "./useModel";

function Tower() {
  const tower = useModel("control-tower");
  const radar = useMemo(() => tower.getObjectByName("Radar"), [tower]);
  const beacon = useMemo(() => tower.getObjectByName("Beacon") as THREE.Mesh | undefined, [tower]);
  useFrame(({ clock }, dt) => {
    if (radar) radar.rotation.y += dt * 1.6;
    const m = beacon?.material as THREE.MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = clock.elapsedTime % 1.4 < 0.25 ? 5 : 0.3;
  });
  return <primitive object={tower} position={[85, 0, -33]} />;
}

function Hangar() {
  const shell = useMemo(() => {
    const g = new THREE.CylinderGeometry(15, 15, 30, 40, 1, true, -Math.PI / 2, Math.PI);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const gable = useMemo(() => new THREE.CircleGeometry(15, 40, 0, Math.PI), []);
  const crates: [number, number, string][] = [
    [-8, 22, "#c99a5b"],
    [-6, 24, "#d6a86a"],
    [-9, 25.5, "#2449d8"],
    [8, 21, "#c99a5b"],
    [10, 23, "#e4572e"],
    [7, 25, "#d6a86a"],
  ];
  return (
    <group position={[150, 0, -26]}>
      <mesh geometry={shell} castShadow receiveShadow>
        <meshStandardMaterial color="#8f9a3e" side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
      {/* roof skylight ribs */}
      {[-9, -3, 3, 9].map((z) => (
        <mesh key={z} position={[0, 15.02, z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[7, 2.4]} />
          <meshStandardMaterial color="#c9ced8" />
        </mesh>
      ))}
      <mesh geometry={gable} position={[0, 0, -15]} rotation-y={Math.PI} castShadow>
        <meshStandardMaterial color="#7d8735" />
      </mesh>
      <mesh geometry={gable} position={[0, 0, 15]} castShadow>
        <meshStandardMaterial color="#7d8735" />
      </mesh>
      <mesh position={[0, 5.5, 15.05]}>
        <planeGeometry args={[18, 11]} />
        <meshStandardMaterial color="#1e2533" />
      </mesh>
      <mesh position={[0, 11.2, 15.1]}>
        <planeGeometry args={[19, 0.5]} />
        <meshStandardMaterial color="#f2b632" />
      </mesh>
      {crates.map(([x, z, c], i) => (
        <mesh key={i} position={[x, 0.7, z]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 1.4, 1.6]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}

function Radar() {
  const dish = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (dish.current) dish.current.rotation.y += dt * 2.2;
  });
  return (
    <group position={[115, 0, -48]}>
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[7, 3.2, 7]} />
        <meshStandardMaterial color="#3a4152" />
      </mesh>
      <mesh position={[0, 3.3, 0]}>
        <boxGeometry args={[7.2, 0.3, 7.2]} />
        <meshStandardMaterial color="#f2b632" />
      </mesh>
      <mesh position={[0, 6.2, 0]} castShadow>
        <sphereGeometry args={[3.4, 32, 24]} />
        <meshStandardMaterial color="#d7dbe3" roughness={0.35} metalness={0.2} />
      </mesh>
      <group ref={dish} position={[4.5, 3.4, 4.5]}>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 3, 8]} />
          <meshStandardMaterial color="#9aa1ad" />
        </mesh>
        <mesh position={[0, 3.1, 0]}>
          <boxGeometry args={[2.4, 0.5, 0.2]} />
          <meshStandardMaterial color="#eef0f4" />
        </mesh>
      </group>
    </group>
  );
}

function TreeAt({ p, s }: { p: [number, number]; s: number }) {
  const t = useModel("tree");
  return <primitive object={t} position={[p[0], 0, p[1]]} scale={s} />;
}

const TREES: [number, number][] = [
  ...Array.from({ length: 20 }, (_, i): [number, number] => [-118 + i * 12.4, -57.5]),
  ...Array.from({ length: 6 }, (_, i): [number, number] => [-118 + i * 4.5, -10 - (i % 2) * 2]),
  [72, -46],
  [98, -46],
  [72, -20],
  [98, -20],
  [128, -50],
  [176, -50],
  [176, 8],
  [-140, -20],
  [-150, -40],
  [-160, -10],
  [140, 30],
  [160, 28],
];

export function Landmarks({ onSelect }: { onSelect: SelectHandler }) {
  return (
    <group>
      <Interactive stepKey={8} onSelect={onSelect}>
        <Tower />
      </Interactive>
      <Hangar />
      <Radar />
      {TREES.map((p, i) => (
        <TreeAt key={i} p={p} s={0.9 + ((i * 37) % 10) / 20} />
      ))}
    </group>
  );
}
