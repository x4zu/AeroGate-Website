"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type * as THREE from "three";

export const MODEL_FILES = [
  "airliner-red",
  "airliner-teal",
  "airliner-orange",
  "widebody-purple",
  "turboprop-orange",
  "bizjet-navy",
  "bus",
  "taxi",
  "van",
  "tug",
  "stairs-truck",
  "fuel-truck",
  "baggage-cart",
  "control-tower",
  "tree",
  "cone",
  "suitcase",
] as const;

export type ModelName = (typeof MODEL_FILES)[number];

export const modelUrl = (name: ModelName) => `/models/${name}.glb`;

/** Load a GLB from public/models and return an independent, shadow-enabled clone. */
export function useModel(name: ModelName): THREE.Group {
  const { scene } = useGLTF(modelUrl(name));
  return useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
}

export function preloadModels() {
  for (const name of MODEL_FILES) useGLTF.preload(modelUrl(name));
}
