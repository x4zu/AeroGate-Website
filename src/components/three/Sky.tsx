"use client";

import { Cloud, Clouds } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

/** Horizon tint — the fog uses the same value so distant ground melts into the sky. */
export const SKY_HORIZON = "#bcdcf6";

/**
 * Clear daytime sky: a vertical gradient painted onto an equirectangular
 * background (zenith deep blue → pale horizon), so it never clips against the
 * camera far plane and costs nothing per frame.
 */
function SkyGradient() {
  const scene = useThree((s) => s.scene);
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 512;
    const g = c.getContext("2d")!;
    // Equirect: y=0 is straight up, y=0.5 is the horizon.
    const grad = g.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0.0, "#0f5fd6");
    grad.addColorStop(0.18, "#1f74e4");
    grad.addColorStop(0.36, "#4a97ee");
    grad.addColorStop(0.47, "#9ccaf5");
    grad.addColorStop(0.5, SKY_HORIZON);
    grad.addColorStop(1.0, SKY_HORIZON);
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => {
    const prev = scene.background;
    scene.background = texture;
    return () => {
      scene.background = prev;
      texture.dispose();
    };
  }, [scene, texture]);
  return null;
}

/** Deterministic pseudo-random so the cloud layout is identical on every load. */
function rng(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

/** Lambert without fog: distant cumulus should stay crisp white, not fade into the haze. */
class CloudMaterial extends THREE.MeshLambertMaterial {
  constructor(params?: THREE.MeshLambertMaterialParameters) {
    super(params);
    this.fog = false;
  }
}

type Puff = { pos: [number, number, number]; bounds: [number, number, number]; seed: number; volume: number; speed: number };

/**
 * Soft, sunlit cumulus. Billboard puffs (drei <Clouds>) lit by the scene's sun,
 * so tops read bright white and bellies pick up a cool grey — like a real
 * fair-weather sky rather than faceted geometry.
 */
function Cumulus() {
  const puffs = useMemo<Puff[]>(() => {
    const r = rng(7);
    const out: Puff[] = [];
    // Dense cruise corridor east of the airport.
    for (let i = 0; i < 16; i++) {
      out.push({
        pos: [160 + r() * 420, 34 + r() * 14, -110 + r() * 240],
        bounds: [22 + r() * 16, 5 + r() * 4, 12 + r() * 8],
        seed: i + 1,
        volume: 14 + r() * 10,
        speed: 0.08 + r() * 0.08,
      });
    }
    // Scattered high clouds framing the rest of the horizon.
    for (let i = 0; i < 12; i++) {
      const a = r() * Math.PI * 2;
      const d = 420 + r() * 380;
      out.push({
        pos: [Math.cos(a) * d, 90 + r() * 60, Math.sin(a) * d],
        bounds: [34 + r() * 24, 7 + r() * 5, 18 + r() * 12],
        seed: 100 + i,
        volume: 22 + r() * 14,
        speed: 0.05 + r() * 0.06,
      });
    }
    return out;
  }, []);

  return (
    <Clouds texture="/textures/cloud.png" limit={420} material={CloudMaterial}>
      {puffs.map((p) => (
        <Cloud
          key={p.seed}
          seed={p.seed}
          position={p.pos}
          bounds={p.bounds}
          segments={14}
          volume={p.volume}
          smallestVolume={0.35}
          concentrate="inside"
          growth={4}
          speed={p.speed}
          fade={0}
          opacity={0.95}
          color="#ffffff"
        />
      ))}
    </Clouds>
  );
}

export function Sky() {
  return (
    <>
      <SkyGradient />
      <Cumulus />
    </>
  );
}
