"use client";

import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

/**
 * World extent of the textured ground (metres).
 * North (z < -70): city — commercial district west of the boulevard, residential east.
 * South: runway 1 (z 63), runway 2 (z 105) and the cargo apron (z 130–150).
 */
export const GROUND = { X0: -200, X1: 200, Z0: -205, Z1: 160 };
const { X0, X1, Z0, Z1 } = GROUND;
const PX = 8; // canvas pixels per metre → 3200 × 2920

const PAVE = "#e6e8ee";
const TAXI = "#cfd2db";
const RUNWAY = "#5c616f";
const ROAD = "#666b7a";
const WHITE = "#f6f7fa";
const YELLOW = "#f2b632";

function drawGround(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = (X1 - X0) * PX;
  c.height = (Z1 - Z0) * PX;
  const g = c.getContext("2d")!;
  const X = (x: number) => (x - X0) * PX;
  const Z = (z: number) => (z - Z0) * PX;
  const rect = (x0: number, z0: number, x1: number, z1: number, fill: string) => {
    g.fillStyle = fill;
    g.fillRect(X(x0), Z(z0), (x1 - x0) * PX, (z1 - z0) * PX);
  };
  const line = (pts: [number, number][], color: string, width: number, dash: number[] = []) => {
    g.strokeStyle = color;
    g.lineWidth = width * PX;
    g.setLineDash(dash.map((d) => d * PX));
    g.beginPath();
    pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    g.stroke();
    g.setLineDash([]);
  };
  /** Road strip with dashed centre line. */
  const road = (x0: number, z0: number, x1: number, z1: number, lanes = true) => {
    rect(x0, z0, x1, z1, ROAD);
    if (!lanes) return;
    if (x1 - x0 > z1 - z0) line([[x0, (z0 + z1) / 2], [x1, (z0 + z1) / 2]], WHITE, 0.25, [3, 3]);
    else line([[(x0 + x1) / 2, z0], [(x0 + x1) / 2, z1]], WHITE, 0.25, [3, 3]);
  };

  // Base grass with mottling
  rect(X0, Z0, X1, Z1, "#e2e6d3");
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(${150 + Math.random() * 40},${170 + Math.random() * 30},${120 + Math.random() * 30},0.06)`;
    g.beginPath();
    g.arc(Math.random() * c.width, Math.random() * c.height, (2 + Math.random() * 8) * PX, 0, Math.PI * 2);
    g.fill();
  }

  // ---------------- City (north) ----------------
  // Commercial plaza paving
  rect(-200, -205, 12, -80, "#e3e4e9");
  // Residential lawns
  rect(34, -205, 200, -80, "#dbe5c9");
  // City park with a pond (residential side)
  rect(104, -152, 136, -133, "#cfe0b6");
  g.fillStyle = "#9cc9ef";
  g.beginPath();
  g.ellipse(X(120), Z(-142.5), 11 * PX, 6 * PX, 0, 0, Math.PI * 2);
  g.fill();
  // Ring road and boulevard
  road(-200, -80, 200, -70);
  road(-27, -205, -13, -70);
  line([[-20, -205], [-20, -70]], "#9fd18b", 1.2); // planted median
  // Commercial grid
  for (const z of [-112, -142, -172]) road(-200, z - 4, -27, z + 4);
  for (const x of [-150, -100, -60]) road(x - 4, -205, x + 4, -80);
  road(-13, -142 - 4, 12, -142 + 4);
  // Residential grid (narrower streets)
  for (const z of [-105, -130, -155, -180]) road(-13, z - 3, 200, z + 3, false);
  for (const x of [60, 100, 140, 180]) road(x - 3, -205, x + 3, -80, false);
  // sidewalks along the ring road
  rect(-200, -82, 200, -80, "#f3f4f7");
  rect(-200, -70, 200, -68, "#f3f4f7");

  // ---------------- Landside ----------------
  rect(-125, -68, 125, -14, "#eceef3");
  // Curb road: widened to 4 lanes (z -56 .. -40)
  rect(-125, -56, 125, -40, ROAD);
  line([[-125, -48], [125, -48]], WHITE, 0.3);
  line([[-125, -52], [125, -52]], WHITE, 0.22, [3, 3]);
  line([[-125, -44], [125, -44]], WHITE, 0.22, [3, 3]);
  rect(-125, -40, 125, -32, "#f5f6f9");
  // Car park
  rect(-125, -68, 125, -58, "#d9dce4");
  for (let x = -120; x < 120; x += 3.2) line([[x, -67.5], [x, -62.5]], "#ffffff", 0.15);
  // Access road from the ring road to the curb
  road(-27, -70, -13, -56);
  // Zebra crossings to the doors
  for (const cx of [-70, -30, 10]) for (let i = 0; i < 8; i++) rect(cx - 3 + i * 0.8, -55.5, cx - 2.6 + i * 0.8, -40.5, WHITE);

  // ---------------- Apron ----------------
  rect(-125, -14, 120, 35, PAVE);
  const stands: [number, number][] = [
    [-95, -6],
    [-45, -4],
    [20, -4],
    [64, 0],
    [98, -2],
  ];
  for (const [sx, stopZ] of stands) {
    line([[sx, 42], [sx, stopZ]], YELLOW, 0.3);
    line([[sx - 3, stopZ], [sx + 3, stopZ]], YELLOW, 0.5);
  }
  for (const hx of [-75, -20, 40, 80]) {
    g.save();
    g.beginPath();
    g.rect(X(hx), Z(-13), 10 * PX, 5 * PX);
    g.clip();
    for (let i = -10; i < 20; i++) line([[hx + i * 1.2, -13], [hx + i * 1.2 + 5, -8]], YELLOW, 0.18);
    g.restore();
    g.strokeStyle = YELLOW;
    g.lineWidth = 0.2 * PX;
    g.strokeRect(X(hx), Z(-13), 10 * PX, 5 * PX);
  }
  line([[-125, 33.5], [120, 33.5]], "#e5483b", 0.25, [2, 2]);

  // ---------------- Taxiways (widened to 12 m) ----------------
  rect(-180, 36, 180, 48, TAXI);
  // connectors taxiway 1 → runway 1
  for (const cx of [-60, 60]) rect(cx - 7, 48, cx + 7, 53, TAXI);
  g.fillStyle = TAXI;
  g.beginPath();
  g.moveTo(X(-180), Z(36));
  g.lineTo(X(-148), Z(36));
  g.quadraticCurveTo(X(-164), Z(45), X(-168), Z(53));
  g.lineTo(X(-188), Z(53));
  g.quadraticCurveTo(X(-188), Z(40), X(-180), Z(36));
  g.fill();
  // cross-field connectors runway 1 ↔ runway 2
  for (const cx of [-120, 120]) rect(cx - 7, 73, cx + 7, 95, TAXI);
  line([[-150, 42], [168, 42]], YELLOW, 0.3);
  line([[-140, 42], [-160, 46], [-168, 55], [-160, 62.5]], YELLOW, 0.3);
  for (const cx of [-60, 60]) line([[cx, 42], [cx, 53]], YELLOW, 0.3);
  for (const cx of [-120, 120]) line([[cx, 73], [cx, 95]], YELLOW, 0.3);

  // Taxiway 3 (south) + connectors to runway 2
  rect(-185, 119, 185, 131, TAXI);
  for (const cx of [0, 100]) rect(cx - 8, 115, cx + 8, 119, TAXI);
  g.fillStyle = TAXI;
  g.beginPath();
  g.moveTo(X(-185), Z(131));
  g.lineTo(X(-150), Z(131));
  g.quadraticCurveTo(X(-168), Z(120), X(-170), Z(115));
  g.lineTo(X(-188), Z(115));
  g.quadraticCurveTo(X(-190), Z(126), X(-185), Z(131));
  g.fill();
  line([[-150, 125], [175, 125]], YELLOW, 0.3);
  line([[-150, 125], [-170, 118], [-175, 108], [-165, 105]], YELLOW, 0.3);
  line([[60, 105], [90, 108], [110, 118], [100, 125]], YELLOW, 0.3);

  // Cargo apron
  rect(-75, 131, 75, 152, PAVE);
  for (const sx of [-30, 30]) {
    line([[sx, 125], [sx, 146]], YELLOW, 0.3);
    line([[sx - 3, 146], [sx + 3, 146]], YELLOW, 0.5);
  }

  // ---------------- Runways (widened to 20 m) ----------------
  const drawRunway = (cz: number, labels: [string, string]) => {
    rect(-194, cz - 10, 194, cz + 10, RUNWAY);
    line([[-190, cz - 9.3], [190, cz - 9.3]], WHITE, 0.35);
    line([[-190, cz + 9.3], [190, cz + 9.3]], WHITE, 0.35);
    line([[-160, cz], [160, cz]], WHITE, 0.5, [9, 7]);
    for (const end of [-1, 1]) {
      const x0 = end < 0 ? -191 : 182;
      for (let i = 0; i < 10; i++) rect(x0, cz - 8.4 + i * 1.7, x0 + 8, cz - 7.5 + i * 1.7, WHITE);
      const tz = end < 0 ? -150 : 142;
      for (const dz of [-5, 5]) rect(tz, cz + dz - 1, tz + 9, cz + dz + 1, WHITE);
    }
    g.save();
    g.fillStyle = WHITE;
    g.font = `bold ${8 * PX}px Inter, Arial, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.translate(X(-171), Z(cz));
    g.rotate(Math.PI / 2);
    g.fillText(labels[0], 0, 0);
    g.restore();
    g.save();
    g.fillStyle = WHITE;
    g.font = `bold ${8 * PX}px Inter, Arial, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.translate(X(171), Z(cz));
    g.rotate(-Math.PI / 2);
    g.fillText(labels[1], 0, 0);
    g.restore();
  };
  drawRunway(63, ["09L", "27R"]);
  drawRunway(105, ["09R", "27L"]);

  // Tower plaza, hangar apron, radar pad
  rect(70, -48, 100, -18, "#d9dce4");
  rect(125, -48, 180, 10, PAVE);
  rect(105, -58, 125, -38, "#d9dce4");
  return c;
}

export function Ground() {
  const gl = useThree((s) => s.gl);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(drawGround());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = gl.capabilities.getMaxAnisotropy();
    return t;
  }, [gl]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#e2e6d3" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(X0 + X1) / 2, 0, (Z0 + Z1) / 2]} receiveShadow>
        <planeGeometry args={[X1 - X0, Z1 - Z0]} />
        <meshStandardMaterial map={texture} roughness={0.95} />
      </mesh>
    </group>
  );
}
