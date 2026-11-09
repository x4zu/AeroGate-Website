# AeroGate — Interactive 3D Boarding Experience

> **Made by Reivan Elsyafir Pratama**

AeroGate is a scroll-driven 3D website that follows a passenger through an airport, from the curb to the cabin and back to baggage claim. A full low-poly airport, with a terminal, two runways, a city and moving traffic, renders in real time in the browser. The camera, the passengers, the buses and the aircraft all react to scrolling.

![Stack](https://img.shields.io/badge/Next.js-16-black) ![Three.js](https://img.shields.io/badge/Three.js-0.187-049ef4) ![R3F](https://img.shields.io/badge/React%20Three%20Fiber-9-222) ![GSAP](https://img.shields.io/badge/GSAP-3-88ce02) ![Matter.js](https://img.shields.io/badge/Matter.js-0.20-4b5563)

---

## Features

- **Real-time 3D airport.** Terminal with a full interior, jet bridges, control tower, hangar, radar, two runways, taxiways, a cargo apron, a commercial district and a residential neighbourhood.
- **Scroll-driven story (GSAP ScrollTrigger).** One scrubbed timeline drives 12 boarding steps:
  arrival at the curb → check-in and security → duty-free → lounge → jet-bridge boarding → apron bus → VIP → pushback and taxi → takeoff → cruise → landing → baggage claim.
- **Dollhouse terminal.** The roof lifts away when the camera goes inside.
- **Live air traffic.** Aircraft fly full circuits on runway 2 on their own (taxi, takeoff, a loop around the city, landing, parking). Other aircraft cross the sky at cruise altitude.
- **Crowds and vehicles.** About 190 instanced passengers, ground-support vehicles, curb traffic and city cars.
- **Interactive objects.**
  - Hover an aircraft, the bus or the tower to lift it; click to jump to its step.
  - Click any `AP-xx` map label.
  - Drag with the mouse to orbit the camera; it springs back when released.
- **Physics playground (Matter.js).** Drop and throw suitcases onto a conveyor that carries them into a loading bin.
- **Responsive.** The camera lens and framing adapt on portrait and mobile screens.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4, Inter + Instrument Serif (`next/font`) |
| 3D rendering | Three.js 0.187 via React Three Fiber 9 + drei 10 |
| 3D assets | glTF binary (`.glb`) models in `public/models/` |
| Animation | GSAP 3 + ScrollTrigger |
| Physics | Matter.js 0.20 |
| Icons | lucide-react |

## Getting started

**Requirements:** Node.js **24+** and npm.

```bash
git clone https://github.com/x4zu/AeroGate-Website.git
cd AeroGate-Website
npm install
npm run dev
```

Open <http://localhost:3000> and scroll.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build (standalone output) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run check` | Lint + typecheck + build |
| `npm run build:models` | Regenerate every `.glb` in `public/models/` |

## Project structure

```
public/
  models/              17 GLB models (aircraft, vehicles, tower, props)
  images/scenes/       Isometric concept renders used in the "Zones" cards
scripts/
  build-models.mjs     Builds the low-poly models with Three.js and exports GLB
src/
  app/                 Layout, global styles, page
  components/
    BoardingExperience.tsx   Sticky 3D stage + GSAP master timeline + step UI
    BaggageSection.tsx       Matter.js physics section
    ZonesSection.tsx         Concept-art cards with pointer tilt
    Navbar / Loader / StatsSection / TicketSection / Footer
    three/
      AirportCanvas.tsx      <Canvas>, lights, environment, scene graph
      CameraRig.tsx          Scroll camera, follow-cams, drag orbit, parallax
      Ground.tsx             Procedural ground texture (runways, roads, city grid)
      Terminal.tsx           Terminal shell, interior, liftable roof, jet bridges
      Fleet.tsx              Story aircraft, parked aircraft, ground vehicles
      AmbientTraffic.tsx     Automatic takeoff/landing circuits + overflights
      City.tsx               Office towers, mall, houses, trees, city traffic
      Crowd.tsx              Instanced passengers on paths
      Landmarks.tsx          Tower, hangar, radar, trees, clouds
      Labels.tsx             Clickable AP-xx pins (drei <Html>)
      BaggagePhysics.tsx     Matter.js world rendered in 3D
    scene/                   SVG motion overlays for the concept-art cards
  lib/
    rig.ts                   Shared camera/story state + motion paths
    flow.ts                  Step content, zones, concept-art scenes
docs/
  ARCHITECTURE.md            How the scroll timeline, rig and scene fit together
```

## How it works (short version)

1. **`src/lib/rig.ts`** holds a plain mutable object, `rig`, with camera values and story channels (`roof`, `busT`, `paxGate`, `planeT`, `landT`, …).
2. **`BoardingExperience.tsx`** builds one GSAP timeline whose length equals the number of camera keys. ScrollTrigger scrubs it as the sticky section scrolls, writing into `rig`.
3. **React Three Fiber components** read `rig` every frame in `useFrame` to move the camera, aircraft, bus and passengers. React never re-renders while you scroll.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the timeline table and world layout.

## Customising

### Replace a 3D model with your own (Blender, Spline, …)

All models face **+X**, stand on **y = 0** and use **metres**. To swap one:

1. Export your model as **glTF Binary (`.glb`)** with the same orientation and scale.
2. Overwrite the file in `public/models/` with the same name, for example `airliner-red.glb`.
3. Reload. No code change is needed.

Optional named nodes are animated automatically: `Beacon*` (blinking light), `Prop*` (spinning propeller), `Radar` (rotating dish on the tower).

### Edit the boarding steps

- Text, codes and durations: `FLOW_STEPS` in `src/lib/flow.ts`.
- Camera positions per step: `SHOTS` in `src/lib/rig.ts` (one entry per key: hero, 12 steps, outro).
- Story timing: `buildTimeline()` in `src/components/BoardingExperience.tsx`.

### Change colours and type

Design tokens (`--sky`, `--ink`, `--paper`, `--ground`, …) live at the top of `src/app/globals.css`.

## Deployment

**Vercel:** import the repository; the defaults work.

**Docker:**

```bash
docker build -t aerogate .
docker run -p 3000:3000 aerogate
```

## Performance notes

- Passengers, houses, trees, clouds and city cars use `InstancedMesh`, one draw call per type.
- The shadow map is 4096² on desktop and 2048² on mobile; the device pixel ratio is capped at 1.75.
- Scroll state lives outside React, so scrolling never triggers component re-renders.

## Author

Designed and built by **Reivan Elsyafir Pratama**.

## License

[MIT](LICENSE)
