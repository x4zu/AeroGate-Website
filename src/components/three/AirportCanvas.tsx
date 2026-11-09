"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { sceneState } from "@/lib/rig";
import { AmbientTraffic } from "./AmbientTraffic";
import { CameraRig } from "./CameraRig";
import { City } from "./City";
import { Crowd } from "./Crowd";
import { Fleet, type SelectHandler } from "./Fleet";
import { Ground } from "./Ground";
import { Labels } from "./Labels";
import { Landmarks } from "./Landmarks";
import { Sky, SKY_HORIZON } from "./Sky";
import { Terminal } from "./Terminal";
import { preloadModels } from "./useModel";

preloadModels();

function Ready() {
  useEffect(() => {
    sceneState.ready = true;
  }, []);
  return null;
}

export default function AirportCanvas({ onSelect }: { onSelect: SelectHandler }) {
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  return (
    <Canvas
      shadows
      dpr={[1, mobile ? 1.5 : 1.75]}
      camera={{ fov: 32, near: 1, far: 2500, position: [190, 160, 210] }}
      gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 0.92 }}
      className="!absolute inset-0"
    >
      <fog attach="fog" args={[SKY_HORIZON, 420, 1300]} />
      <hemisphereLight args={["#cfe4ff", "#b9bfcc", 0.8]} />
      <directionalLight
        castShadow
        position={[90, 150, 70]}
        intensity={2.6}
        color="#fff6ea"
        shadow-mapSize={mobile ? [2048, 2048] : [4096, 4096]}
        shadow-camera-left={-250}
        shadow-camera-right={250}
        shadow-camera-top={230}
        shadow-camera-bottom={-230}
        shadow-camera-near={10}
        shadow-camera-far={700}
        shadow-bias={-0.0004}
        shadow-normalBias={0.06}
      />
      <Environment resolution={128}>
        <Lightformer intensity={2} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer intensity={0.8} position={[-20, 4, 10]} scale={[20, 6, 1]} color="#dbe7ff" />
        <Lightformer intensity={0.8} position={[20, 4, -10]} scale={[20, 6, 1]} color="#fff1dc" />
      </Environment>
      <Suspense fallback={null}>
        <Ground />
        <Terminal />
        <City />
        <AmbientTraffic />
        <Fleet onSelect={onSelect} />
        <Landmarks onSelect={onSelect} />
        <Sky />
        <Crowd />
        <Labels onSelect={onSelect} />
        <Ready />
      </Suspense>
      <CameraRig />
    </Canvas>
  );
}
