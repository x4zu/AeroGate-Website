/**
 * Builds the low-poly airport models used by the 3D scene and exports them as
 * binary glTF (.glb) into public/models/.
 *
 *   node scripts/build-models.mjs
 *
 * Every model faces +X (nose / front), sits on y = 0 and uses metres.
 * Materials carry stable names ("Livery", "Tail", "Shell", ...) so the browser
 * can recolour instances without needing separate files.
 * Replace any file with a Blender export of the same name to upgrade the art.
 */
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// --- Node polyfill: GLTFExporter reads Blobs through FileReader -------------
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(buf).toString("base64")}`;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    });
  }
};

const OUT = path.resolve("public/models");
fs.mkdirSync(OUT, { recursive: true });

// --- helpers -----------------------------------------------------------------
const matCache = new Map();
function mat(name, color, { roughness = 0.55, metalness = 0.05, opacity = 1, emissive } = {}) {
  const key = `${name}|${color}|${roughness}|${metalness}|${opacity}|${emissive ?? ""}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ name, color, roughness, metalness });
  if (opacity < 1) {
    m.transparent = true;
    m.opacity = opacity;
  }
  if (emissive) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = 1;
  }
  matCache.set(key, m);
  return m;
}

function mesh(geo, material, name, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, material);
  m.name = name;
  m.position.set(...pos);
  m.rotation.set(...rot);
  return m;
}

/** Extruded flat shape lying in the XZ plane (shape y → world -z), thickness along +y. */
function flatPlate(points, thickness) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** Extruded shape standing in the XY plane, thickness centred on z = 0. */
function finPlate(points, thickness) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.translate(0, 0, -thickness / 2);
  return geo;
}

function wheel(r, w, pos, name = "Wheel") {
  const g = new THREE.CylinderGeometry(r, r, w, 16);
  g.rotateX(Math.PI / 2);
  return mesh(g, mat("Tyre", "#1f2329", { roughness: 0.9 }), name, pos);
}

function box(w, h, d, material, name, pos, rot) {
  return mesh(new THREE.BoxGeometry(w, h, d), material, name, pos, rot);
}

function shadowAll(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return root;
}

// --- aircraft -------------------------------------------------------------------
function aircraft({
  name,
  length = 36,
  radius = 1.95,
  span = 34,
  engines = "wing", // "wing" | "rear" | "prop"
  highWing = false,
  livery = "#e4572e",
  tail = livery,
  body = "#f4f5f8",
  engineColor = "#dfe2e8",
}) {
  const g = new THREE.Group();
  g.name = name;
  const r = radius;
  const bodyM = mat("Body", body, { roughness: 0.4, metalness: 0.15 });
  const liveryM = mat("Livery", livery, { roughness: 0.45, metalness: 0.1 });
  const tailM = mat("Tail", tail, { roughness: 0.45, metalness: 0.1 });
  const windowM = mat("Window", "#1c2640", { roughness: 0.2, metalness: 0.3 });
  const metalM = mat("Metal", "#a9afbb", { roughness: 0.35, metalness: 0.7 });
  const engineM = mat("Engine", engineColor, { roughness: 0.35, metalness: 0.3 });
  const intakeM = mat("Intake", "#2a2f3a", { roughness: 0.4, metalness: 0.5 });

  const yC = r + (engines === "wing" ? 1.45 : 1.0); // fuselage centre height
  const cyl = length * 0.62;
  const tailLen = length * 0.22;
  const noseLen = r * 1.75;

  // Fuselage
  const fus = new THREE.CylinderGeometry(r, r, cyl, 40, 1, true);
  fus.rotateZ(Math.PI / 2);
  g.add(mesh(fus, bodyM, "Fuselage", [0, yC, 0]));

  // Nose (hemisphere stretched forward)
  const nose = new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  nose.rotateZ(-Math.PI / 2);
  nose.scale(noseLen / r, 1, 1);
  g.add(mesh(nose, bodyM, "Nose", [cyl / 2, yC, 0]));

  // Tail cone with upsweep
  const cone = new THREE.CylinderGeometry(r * 0.18, r, tailLen, 40, 8, true);
  cone.rotateZ(Math.PI / 2); // narrow end → -X
  const p = cone.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const t = (tailLen / 2 - x) / tailLen; // 0 at joint, 1 at tip
    p.setY(i, p.getY(i) + t * t * r * 0.75);
  }
  cone.computeVertexNormals();
  g.add(mesh(cone, bodyM, "TailCone", [-cyl / 2 - tailLen / 2, yC, 0]));
  const tailCap = new THREE.CircleGeometry(r * 0.18, 20);
  tailCap.rotateY(-Math.PI / 2);
  g.add(mesh(tailCap, bodyM, "TailCap", [-cyl / 2 - tailLen, yC + r * 0.75, 0]));

  // Livery: forward band + belly swoosh
  const band = new THREE.CylinderGeometry(r * 1.006, r * 1.006, length * 0.12, 40, 1, true, Math.PI * 0.15, Math.PI * 1.1);
  band.rotateZ(Math.PI / 2);
  g.add(mesh(band, liveryM, "LiveryBand", [cyl / 2 - length * 0.1, yC, 0]));
  const aft = new THREE.CylinderGeometry(r * 1.006, r * 1.006, length * 0.16, 40, 1, true, Math.PI * 1.25, Math.PI * 0.5);
  aft.rotateZ(Math.PI / 2);
  g.add(mesh(aft, liveryM, "LiveryAft", [-cyl / 2 + length * 0.08, yC, 0]));

  // Window band + cockpit
  g.add(box(cyl * 0.86, r * 0.16, r * 2 + 0.05, windowM, "Windows", [-cyl * 0.02, yC + r * 0.32, 0]));
  g.add(box(r * 0.55, r * 0.22, r * 1.25, windowM, "Cockpit", [cyl / 2 + noseLen * 0.5, yC + r * 0.48, 0], [0, 0, -0.45]));
  // Doors (thin outline blocks on port side, -z)
  for (const dx of [cyl / 2 - 2.2, -cyl / 2 + 1.5]) {
    g.add(box(0.9, r * 0.95, 0.06, mat("Door", "#d4d8e0"), "Door", [dx, yC + r * 0.05, -r - 0.01]));
  }

  // Wings
  const wy = highWing ? yC + r * 0.75 : yC - r * 0.55;
  const rootLE = length * 0.1;
  const rootTE = -length * 0.11;
  const tipTE = -length * 0.27;
  const tipLE = -length * 0.22;
  const half = span / 2;
  const wingStar = flatPlate(
    [
      [rootLE, -r * 0.5],
      [rootTE, -r * 0.5],
      [tipTE, -half],
      [tipLE, -half],
    ],
    0.36,
  );
  const wingPort = flatPlate(
    [
      [rootLE, r * 0.5],
      [tipLE, half],
      [tipTE, half],
      [rootTE, r * 0.5],
    ],
    0.36,
  );
  g.add(mesh(wingStar, bodyM, "WingR", [0, wy, 0], [0.05, 0, 0]));
  g.add(mesh(wingPort, bodyM, "WingL", [0, wy, 0], [-0.05, 0, 0]));
  // Wing root fairing
  g.add(box(length * 0.22, r * 0.5, r * 1.8, bodyM, "Fairing", [-length * 0.01, highWing ? yC + r * 0.7 : yC - r * 0.68, 0]));
  // Winglets
  for (const s of [1, -1]) {
    const wl = finPlate(
      [
        [0, 0],
        [-1.6, 0],
        [-2.0, 1.8],
        [-1.2, 1.8],
      ],
      0.2,
    );
    g.add(mesh(wl, tailM, "Winglet", [tipLE + 0.2, wy + 0.3 + half * 0.05, s * half]));
  }

  // Engines
  const addNacelle = (x, y, z, rad, len, nameSuffix) => {
    const n = new THREE.CylinderGeometry(rad * 0.85, rad, len, 28);
    n.rotateZ(Math.PI / 2);
    g.add(mesh(n, engineM, `Nacelle${nameSuffix}`, [x, y, z]));
    const lip = new THREE.TorusGeometry(rad * 0.93, rad * 0.12, 10, 28);
    lip.rotateY(Math.PI / 2);
    g.add(mesh(lip, metalM, `Lip${nameSuffix}`, [x + len / 2, y, z]));
    const fan = new THREE.CircleGeometry(rad * 0.88, 28);
    fan.rotateY(Math.PI / 2);
    g.add(mesh(fan, intakeM, `Fan${nameSuffix}`, [x + len / 2 - 0.05, y, z]));
  };
  if (engines === "wing") {
    const ez = span * 0.18;
    const ex = rootLE - (rootLE - tipLE) * (ez / half) + 1.2;
    for (const s of [1, -1]) {
      addNacelle(ex, wy - 1.05, s * ez, 1.0, 3.8, s > 0 ? "R" : "L");
      g.add(box(2.2, 0.9, 0.3, bodyM, "Pylon", [ex - 0.8, wy - 0.45, s * ez]));
    }
  } else if (engines === "rear") {
    for (const s of [1, -1]) {
      addNacelle(-cyl / 2 + 0.6, yC + r * 0.55, s * (r + 0.9), 0.7, 3.2, s > 0 ? "R" : "L");
      g.add(box(1.6, 0.25, 0.9, bodyM, "Pylon", [-cyl / 2 + 0.6, yC + r * 0.55, s * (r + 0.35)]));
    }
  } else {
    // turboprop nacelles on a high wing, with named propellers for spinning
    const ez = span * 0.2;
    for (const s of [1, -1]) {
      const nac = new THREE.CylinderGeometry(0.55, 0.7, 4.2, 20);
      nac.rotateZ(Math.PI / 2);
      g.add(mesh(nac, engineM, "Nacelle", [rootLE - 1.4, wy - 0.25, s * ez]));
      const spinner = new THREE.ConeGeometry(0.45, 1.0, 16);
      spinner.rotateZ(-Math.PI / 2);
      g.add(mesh(spinner, tailM, "Spinner", [rootLE + 1.15, wy - 0.25, s * ez]));
      const prop = new THREE.Group();
      prop.name = "Prop";
      prop.position.set(rootLE + 0.85, wy - 0.25, s * ez);
      for (let b = 0; b < 6; b++) {
        const blade = box(0.08, 3.6, 0.32, intakeM, "Blade", [0, 0, 0], [b * (Math.PI / 3), 0, 0]);
        prop.add(blade);
      }
      g.add(prop);
    }
  }

  // Horizontal stabiliser
  const hsX = -cyl / 2 - tailLen * 0.55;
  const hsHalf = span * 0.2;
  const hsY = engines === "rear" ? yC + r + 5.6 : yC + r * 0.5;
  const hsStar = flatPlate(
    [
      [hsX + 2.2, -0.2],
      [hsX - 1.6, -0.2],
      [hsX - 3.6, -hsHalf],
      [hsX - 2.2, -hsHalf],
    ],
    0.26,
  );
  const hsPort = flatPlate(
    [
      [hsX + 2.2, 0.2],
      [hsX - 2.2, hsHalf],
      [hsX - 3.6, hsHalf],
      [hsX - 1.6, 0.2],
    ],
    0.26,
  );
  g.add(mesh(hsStar, tailM, "StabR", [0, hsY, 0]));
  g.add(mesh(hsPort, tailM, "StabL", [0, hsY, 0]));

  // Vertical fin
  const finBase = -cyl / 2 - tailLen * 0.15;
  const finTop = yC + r + (engines === "rear" ? 5.8 : 6.4);
  const fin = finPlate(
    [
      [finBase, yC + r * 0.6],
      [-cyl / 2 - tailLen * 0.98, yC + r * 1.1],
      [-cyl / 2 - tailLen - 1.4, finTop],
      [-cyl / 2 - tailLen * 0.55, finTop],
    ],
    0.38,
  );
  g.add(mesh(fin, tailM, "Fin", [0, 0, 0]));

  // Landing gear
  const gearM = mat("Gear", "#8a909c", { roughness: 0.4, metalness: 0.6 });
  const gearTop = yC - r * 0.8;
  const noseX = cyl / 2 - 0.8;
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, gearTop - 0.4, 8), gearM, "NoseStrut", [noseX, (gearTop + 0.4) / 2, 0]));
  g.add(wheel(0.4, 0.25, [noseX, 0.4, 0.18]));
  g.add(wheel(0.4, 0.25, [noseX, 0.4, -0.18]));
  for (const s of [1, -1]) {
    const mx = -length * 0.06;
    const mz = s * (r * 1.15);
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, gearTop - 0.55, 8), gearM, "MainStrut", [mx, (gearTop + 0.55) / 2, mz]));
    g.add(wheel(0.55, 0.35, [mx + 0.55, 0.55, mz]));
    g.add(wheel(0.55, 0.35, [mx - 0.55, 0.55, mz]));
  }

  // Beacon light (blinks in browser via name)
  g.add(mesh(new THREE.SphereGeometry(0.18, 10, 8), mat("Beacon", "#ff3b30", { emissive: "#ff3b30" }), "Beacon", [0, yC + r + 0.1, 0]));
  return shadowAll(g);
}

// --- ground vehicles -----------------------------------------------------------
function bus({ name = "Bus", color = "#2bb3a3" } = {}) {
  const g = new THREE.Group();
  g.name = name;
  const shell = mat("Shell", color, { roughness: 0.45 });
  const glass = mat("Glass", "#1d2a44", { roughness: 0.15, metalness: 0.4 });
  const white = mat("Roof", "#f5f6f8");
  g.add(box(12, 2.4, 2.6, shell, "Body", [0, 1.75, 0]));
  g.add(box(11.8, 0.25, 2.5, white, "Roof", [0, 3.05, 0]));
  g.add(box(10.4, 1.0, 2.64, glass, "Windows", [-0.3, 2.25, 0]));
  g.add(box(0.1, 1.4, 2.3, glass, "Windshield", [6.02, 2.1, 0]));
  g.add(box(0.1, 2.2, 1.1, glass, "Door", [2, 1.55, 1.31], [0, Math.PI / 2, 0]));
  g.add(box(0.1, 2.2, 1.1, glass, "Door", [-2.5, 1.55, 1.31], [0, Math.PI / 2, 0]));
  g.add(box(12.05, 0.2, 2.65, mat("Trim", "#f5f6f8"), "Stripe", [0, 1.3, 0]));
  for (const x of [4, -4]) for (const z of [1.15, -1.15]) g.add(wheel(0.55, 0.4, [x, 0.55, z]));
  g.add(box(0.12, 0.25, 0.5, mat("Lamp", "#fff7d6", { emissive: "#fff2b3" }), "Lamp", [6.05, 0.95, 0.9]));
  g.add(box(0.12, 0.25, 0.5, mat("Lamp", "#fff7d6", { emissive: "#fff2b3" }), "Lamp", [6.05, 0.95, -0.9]));
  return shadowAll(g);
}

function car({ name = "Car", color = "#f5c518", sign = true, length = 4.5 } = {}) {
  const g = new THREE.Group();
  g.name = name;
  const shell = mat("Shell", color, { roughness: 0.35, metalness: 0.2 });
  const glass = mat("Glass", "#1d2a44", { roughness: 0.15, metalness: 0.4 });
  g.add(box(length, 0.8, 1.8, shell, "Body", [0, 0.75, 0]));
  g.add(box(length * 0.55, 0.65, 1.66, glass, "Cabin", [-0.2, 1.45, 0]));
  g.add(box(length * 0.5, 0.08, 1.6, shell, "Roof", [-0.2, 1.8, 0]));
  if (sign) g.add(box(0.5, 0.25, 0.9, mat("Sign", "#ffffff", { emissive: "#fff6c2" }), "Sign", [-0.2, 1.95, 0]));
  for (const x of [length * 0.32, -length * 0.32]) for (const z of [0.85, -0.85]) g.add(wheel(0.35, 0.25, [x, 0.35, z]));
  return shadowAll(g);
}

function tug({ name = "Tug" } = {}) {
  const g = new THREE.Group();
  g.name = name;
  const shell = mat("Shell", "#2bb3a3");
  g.add(box(4.6, 1.0, 2.6, shell, "Body", [0, 0.85, 0]));
  g.add(box(1.4, 0.9, 2.0, mat("Glass", "#1d2a44", { roughness: 0.15, metalness: 0.4 }), "Cab", [-1.4, 1.8, 0]));
  g.add(box(0.3, 0.5, 2.4, mat("Bumper", "#2a2f3a"), "Bumper", [2.4, 0.6, 0]));
  for (const x of [1.5, -1.5]) for (const z of [1.2, -1.2]) g.add(wheel(0.45, 0.4, [x, 0.45, z]));
  return shadowAll(g);
}

function stairsTruck({ name = "StairsTruck" } = {}) {
  const g = new THREE.Group();
  g.name = name;
  const yellow = mat("Shell", "#f2b632");
  const grey = mat("Steel", "#c3c8d2", { roughness: 0.4, metalness: 0.6 });
  g.add(box(6.5, 0.9, 2.3, yellow, "Chassis", [0, 0.9, 0]));
  g.add(box(1.6, 1.4, 2.1, yellow, "Cab", [-2.6, 2.0, 0]));
  g.add(box(0.1, 0.8, 1.8, mat("Glass", "#1d2a44", { roughness: 0.15 }), "Windshield", [-3.42, 2.2, 0]));
  // Inclined stair flight rising toward +X (aircraft door side)
  const rise = 1.3;
  const run = 3.6;
  const ang = Math.atan2(rise, run);
  const flight = new THREE.Group();
  flight.name = "Flight";
  flight.position.set(-1.2, 1.35, 0);
  flight.rotation.z = ang;
  const len = Math.hypot(rise, run);
  flight.add(box(len, 0.15, 1.5, grey, "Ramp", [len / 2, 0, 0]));
  for (let i = 0; i < 12; i++) flight.add(box(0.12, 0.12, 1.5, yellow, "Step", [0.2 + (i * (len - 0.4)) / 11, 0.12, 0]));
  for (const s of [0.75, -0.75]) flight.add(box(len, 0.06, 0.06, grey, "Rail", [len / 2, 1.0, s]));
  g.add(flight);
  g.add(box(1.2, 0.15, 1.6, grey, "Platform", [-1.2 + run + 0.5, 1.35 + rise, 0]));
  for (const x of [2, -2]) for (const z of [1.05, -1.05]) g.add(wheel(0.45, 0.35, [x, 0.45, z]));
  return shadowAll(g);
}

function fuelTruck({ name = "FuelTruck" } = {}) {
  const g = new THREE.Group();
  g.name = name;
  const tank = new THREE.CylinderGeometry(1.2, 1.2, 6.5, 24);
  tank.rotateZ(Math.PI / 2);
  g.add(mesh(tank, mat("Tank", "#f29c38", { roughness: 0.35, metalness: 0.3 }), "Tank", [-0.9, 2.05, 0]));
  g.add(box(2.0, 1.8, 2.3, mat("Shell", "#e8453c"), "Cab", [3.4, 1.65, 0]));
  g.add(box(0.1, 0.9, 2.0, mat("Glass", "#1d2a44", { roughness: 0.15 }), "Windshield", [4.42, 2.0, 0]));
  g.add(box(8.8, 0.4, 2.2, mat("Chassis", "#3a3f4a"), "Chassis", [0, 0.75, 0]));
  for (const x of [3.3, -1.5, -3.2]) for (const z of [1.05, -1.05]) g.add(wheel(0.5, 0.35, [x, 0.5, z]));
  return shadowAll(g);
}

function baggageCart({ name = "BaggageCart" } = {}) {
  const g = new THREE.Group();
  g.name = name;
  g.add(box(3.2, 0.25, 1.6, mat("Steel", "#9aa1ad", { metalness: 0.5 }), "Bed", [0, 0.6, 0]));
  const colors = ["#2449d8", "#e4572e", "#2bb3a3", "#f2b632", "#7b5cd6"];
  let i = 0;
  for (const x of [-1, 0, 1]) for (const z of [-0.4, 0.4]) {
    g.add(box(0.8, 0.55 + (i % 2) * 0.15, 0.6, mat(`Bag${i % 5}`, colors[i % 5]), "Bag", [x, 1.0, z]));
    i++;
  }
  for (const x of [1.2, -1.2]) for (const z of [0.7, -0.7]) g.add(wheel(0.25, 0.15, [x, 0.25, z]));
  return shadowAll(g);
}

// --- structures & props ------------------------------------------------------------
function controlTower({ name = "ControlTower" } = {}) {
  const g = new THREE.Group();
  g.name = name;
  const red = mat("Red", "#e5483b", { roughness: 0.5 });
  const white = mat("White", "#f4f5f8", { roughness: 0.5 });
  const glass = mat("Glass", "#7fb8e6", { roughness: 0.05, metalness: 0.4, opacity: 0.75 });
  const dark = mat("Frame", "#2a3346", { roughness: 0.4, metalness: 0.4 });
  g.add(box(14, 1.2, 14, mat("Base", "#c9cdd7"), "Plinth", [0, 0.6, 0]));
  g.add(box(9, 4, 9, white, "Lobby", [0, 3.2, 0]));
  g.add(box(9.1, 1.2, 9.1, glass, "LobbyGlass", [0, 3.4, 0]));
  const segs = 7;
  const h = 3.4;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    // hourglass taper: wide at base, slimmer in the middle, flaring at the top
    const rad = (t) => 3.1 - Math.sin(t * Math.PI) * 0.9 + t * 0.4;
    const geo = new THREE.CylinderGeometry(rad(t1), rad(t0), h, 28);
    g.add(mesh(geo, i % 2 === 0 ? red : white, `Shaft${i}`, [0, 5.2 + h * i + h / 2, 0]));
  }
  const top = 5.2 + h * segs;
  g.add(mesh(new THREE.CylinderGeometry(4.6, 3.5, 1.2, 8), white, "Gallery", [0, top + 0.6, 0]));
  g.add(mesh(new THREE.TorusGeometry(4.55, 0.08, 6, 8), dark, "Railing", [0, top + 1.6, 0], [Math.PI / 2, 0, Math.PI / 8]));
  g.add(mesh(new THREE.CylinderGeometry(4.0, 3.6, 3.0, 8, 1, true), glass, "Cab", [0, top + 2.7, 0]));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    g.add(box(0.18, 3.0, 0.18, dark, "Mullion", [Math.cos(a) * 3.85, top + 2.7, Math.sin(a) * 3.85]));
  }
  g.add(mesh(new THREE.CylinderGeometry(4.5, 4.3, 0.8, 8), red, "Roof", [0, top + 4.6, 0]));
  g.add(mesh(new THREE.CylinderGeometry(2.4, 3.0, 0.8, 8), white, "RoofCap", [0, top + 5.4, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 8), dark, "Mast", [0, top + 7.0, 0]));
  const radar = new THREE.Group();
  radar.name = "Radar";
  radar.position.set(0, top + 8.0, 0);
  radar.add(box(2.6, 0.5, 0.25, mat("RadarDish", "#e9ecf2", { metalness: 0.3 }), "Dish", [0, 0, 0]));
  g.add(radar);
  g.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), mat("Beacon", "#ff3b30", { emissive: "#ff3b30" }), "Beacon", [0, top + 8.5, 0]));
  return shadowAll(g);
}

function tree({ name = "Tree" } = {}) {
  const g = new THREE.Group();
  g.name = name;
  g.add(mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.6, 8), mat("Trunk", "#8a6a4a"), "Trunk", [0, 0.8, 0]));
  g.add(mesh(new THREE.IcosahedronGeometry(1.1, 1), mat("Leaves", "#86c96b", { roughness: 0.8 }), "Crown", [0, 2.2, 0]));
  return shadowAll(g);
}

function cone({ name = "Cone" } = {}) {
  const g = new THREE.Group();
  g.name = name;
  g.add(box(0.6, 0.06, 0.6, mat("ConeBase", "#e8632b"), "Base", [0, 0.03, 0]));
  g.add(mesh(new THREE.ConeGeometry(0.24, 0.8, 16), mat("ConeBody", "#f2742f"), "Body", [0, 0.45, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.12, 16), mat("ConeBand", "#ffffff"), "Band", [0, 0.5, 0]));
  return shadowAll(g);
}

function suitcase({ name = "Suitcase" } = {}) {
  const g = new THREE.Group();
  g.name = name;
  const shell = mat("Shell", "#2449d8", { roughness: 0.4 });
  g.add(box(0.7, 1.0, 0.4, shell, "Body", [0, 0.6, 0]));
  g.add(box(0.72, 0.06, 0.42, mat("Seam", "#1b2238"), "Seam", [0, 0.6, 0]));
  const handle = mat("Handle", "#2a2f3a", { metalness: 0.5 });
  g.add(box(0.05, 0.4, 0.05, handle, "Pole", [-0.15, 1.3, 0]));
  g.add(box(0.05, 0.4, 0.05, handle, "Pole", [0.15, 1.3, 0]));
  g.add(box(0.35, 0.05, 0.06, handle, "Grip", [0, 1.5, 0]));
  for (const x of [0.25, -0.25]) g.add(wheel(0.07, 0.06, [x, 0.07, 0.15]));
  return shadowAll(g);
}

// --- export -------------------------------------------------------------------
const MODELS = {
  "airliner-red": aircraft({ name: "AirlinerRed", livery: "#e4572e", tail: "#e4572e" }),
  "airliner-teal": aircraft({ name: "AirlinerTeal", livery: "#22b5b0", tail: "#f2b632", engineColor: "#f2c84b" }),
  "widebody-purple": aircraft({
    name: "WidebodyPurple",
    length: 52,
    radius: 2.9,
    span: 50,
    livery: "#8e6fe0",
    tail: "#8e6fe0",
    body: "#e9eaf2",
    engineColor: "#b9a6f0",
  }),
  "turboprop-orange": aircraft({
    name: "TurbopropOrange",
    length: 24,
    radius: 1.4,
    span: 25,
    engines: "prop",
    highWing: true,
    livery: "#f08a24",
    tail: "#1f3a7a",
    body: "#f08a24",
  }),
  "bizjet-navy": aircraft({
    name: "BizjetNavy",
    length: 20,
    radius: 1.15,
    span: 17,
    engines: "rear",
    livery: "#c99a3b",
    tail: "#c99a3b",
    body: "#1f3460",
    engineColor: "#1f3460",
  }),
  "airliner-orange": aircraft({ name: "AirlinerOrange", livery: "#1f3a7a", tail: "#1f3a7a", body: "#f08a24", engineColor: "#1f3a7a" }),
  bus: bus(),
  taxi: car({ name: "Taxi" }),
  van: car({ name: "Van", color: "#1e2330", sign: false, length: 5.2 }),
  tug: tug(),
  "stairs-truck": stairsTruck(),
  "fuel-truck": fuelTruck(),
  "baggage-cart": baggageCart(),
  "control-tower": controlTower(),
  tree: tree(),
  cone: cone(),
  suitcase: suitcase(),
};

const exporter = new GLTFExporter();
let total = 0;
for (const [file, root] of Object.entries(MODELS)) {
  const scene = new THREE.Scene();
  scene.add(root);
  const glb = await exporter.parseAsync(scene, { binary: true });
  const buf = Buffer.from(glb);
  fs.writeFileSync(path.join(OUT, `${file}.glb`), buf);
  total += buf.length;
  let meshes = 0;
  root.traverse((o) => o.isMesh && meshes++);
  console.log(`${file}.glb`.padEnd(24), `${(buf.length / 1024).toFixed(1)} KB`.padStart(10), `${meshes} meshes`);
}
console.log(`\n${Object.keys(MODELS).length} models, ${(total / 1024).toFixed(1)} KB total → ${OUT}`);
