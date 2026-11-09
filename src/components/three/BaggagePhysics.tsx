"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import Matter from "matter-js";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * 2D rigid-body physics (Matter.js) rendered as 3D suitcases (React Three Fiber).
 * Matter works in pixels with y pointing down; S converts to metres, y flipped.
 */
const S = 40;
const toM = (x: number, y: number) => [x / S, -y / S] as const;
const toPx = (x: number, y: number) => ({ x: x * S, y: -y * S });

const COLORS = ["#2449d8", "#e4572e", "#2bb3a3", "#f2b632", "#7b5cd6", "#e94f8a", "#334155", "#8bc34a"];
const BELT = { x0: -7, x1: 4.6, y: 1.6, angle: -0.06 };
const BIN = { x0: 5, x1: 8, y0: 0, h: 0.9 };
const MAX_BAGS = 36;

interface Bag {
  id: number;
  w: number;
  h: number;
  color: string;
  body: Matter.Body;
  scored: boolean;
}

export interface BaggageHandle {
  drop: (n?: number) => void;
  reset: () => void;
}

function Suitcase({ bag, registry }: { bag: Bag; registry: Map<number, THREE.Group> }) {
  return (
    <group
      ref={(g) => {
        if (g) registry.set(bag.id, g);
        else registry.delete(bag.id);
      }}
      userData={{ bagId: bag.id }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[bag.w, bag.h, 0.55]} />
        <meshStandardMaterial color={bag.color} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.28]}>
        <boxGeometry args={[bag.w * 0.85, 0.05, 0.02]} />
        <meshStandardMaterial color="#111827" opacity={0.35} transparent />
      </mesh>
      <mesh position={[0, bag.h / 2 + 0.09, 0]} castShadow>
        <boxGeometry args={[bag.w * 0.4, 0.06, 0.12]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * bag.w * 0.18, bag.h / 2 + 0.05, 0]}>
          <boxGeometry args={[0.05, 0.1, 0.1]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
    </group>
  );
}

function BeltStripes() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = 26;
  const len = BELT.x1 - BELT.x0;
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    const im = ref.current;
    if (!im) return;
    for (let i = 0; i < n; i++) {
      const u = ((clock.elapsedTime * 1.6) / len + i / n) % 1;
      const x = BELT.x0 + u * len;
      const y = BELT.y + 0.16 + (x - (BELT.x0 + BELT.x1) / 2) * Math.tan(BELT.angle);
      m.makeRotationZ(BELT.angle).setPosition(x, y, 0);
      im.setMatrixAt(i, m);
    }
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <boxGeometry args={[0.08, 0.02, 1.15]} />
      <meshStandardMaterial color="#64748b" />
    </instancedMesh>
  );
}

const World = forwardRef<BaggageHandle, { onScore: (n: number) => void }>(function World({ onScore }, ref) {
  const engine = useMemo(() => Matter.Engine.create({ gravity: { x: 0, y: 1, scale: 0.0012 } }), []);
  const [bags, setBags] = useState<Bag[]>([]);
  const bagsRef = useRef<Bag[]>([]);
  const registry = useMemo(() => new Map<number, THREE.Group>(), []);
  const beltBody = useRef<Matter.Body | null>(null);
  const nextId = useRef(1);
  const score = useRef(0);
  const drag = useRef<Matter.Constraint | null>(null);

  // static world: floor, belt, bin, side wall
  useEffect(() => {
    const cx = (BELT.x0 + BELT.x1) / 2;
    const belt = Matter.Bodies.rectangle(toPx(cx, 0).x, toPx(0, BELT.y).y, (BELT.x1 - BELT.x0) * S, 0.3 * S, {
      isStatic: true,
      angle: -BELT.angle,
      friction: 0.9,
      label: "belt",
    });
    beltBody.current = belt;
    const floor = Matter.Bodies.rectangle(0, toPx(0, -0.25).y, 40 * S, 0.5 * S, { isStatic: true, friction: 0.8 });
    const binL = Matter.Bodies.rectangle(toPx(BIN.x0, 0).x, toPx(0, BIN.h / 2).y, 0.15 * S, BIN.h * S, { isStatic: true });
    const binR = Matter.Bodies.rectangle(toPx(BIN.x1, 0).x, toPx(0, BIN.h / 2).y, 0.15 * S, BIN.h * S, { isStatic: true });
    const wallL = Matter.Bodies.rectangle(toPx(-8.6, 0).x, toPx(0, 4).y, 0.3 * S, 12 * S, { isStatic: true });
    const wallR = Matter.Bodies.rectangle(toPx(9.4, 0).x, toPx(0, 4).y, 0.3 * S, 12 * S, { isStatic: true });
    Matter.Composite.add(engine.world, [belt, floor, binL, binR, wallL, wallR]);
    return () => {
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
    };
  }, [engine]);

  const spawn = useCallback(
    (x?: number) => {
      const w = 0.6 + Math.random() * 0.45;
      const h = 0.75 + Math.random() * 0.45;
      const px = toPx(x ?? -6.5 + Math.random() * 3.5, 6.5 + Math.random() * 1.5);
      const body = Matter.Bodies.rectangle(px.x, px.y, w * S, h * S, {
        chamfer: { radius: 4 },
        friction: 0.6,
        restitution: 0.15,
        density: 0.002,
        angle: (Math.random() - 0.5) * 0.8,
      });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);
      Matter.Composite.add(engine.world, body);
      const bag: Bag = { id: nextId.current++, w, h, color: COLORS[Math.floor(Math.random() * COLORS.length)], body, scored: false };
      let next = [...bagsRef.current, bag];
      if (next.length > MAX_BAGS) {
        const old = next.slice(0, next.length - MAX_BAGS);
        old.forEach((b) => Matter.Composite.remove(engine.world, b.body));
        next = next.slice(-MAX_BAGS);
      }
      bagsRef.current = next;
      setBags(next);
    },
    [engine],
  );

  useImperativeHandle(
    ref,
    () => ({
      drop: (n = 1) => {
        for (let i = 0; i < n; i++) setTimeout(() => spawn(), i * 140);
      },
      reset: () => {
        bagsRef.current.forEach((b) => Matter.Composite.remove(engine.world, b.body));
        bagsRef.current = [];
        setBags([]);
        score.current = 0;
        onScore(0);
      },
    }),
    [spawn, engine, onScore],
  );

  // seed a few bags on mount
  useEffect(() => {
    const ids = [0, 1, 2, 3].map((i) => setTimeout(() => spawn(), 300 + i * 260));
    return () => ids.forEach(clearTimeout);
  }, [spawn]);

  useFrame((_, dt) => {
    const belt = beltBody.current;
    // conveyor: anything resting on the belt is carried toward the bin
    if (belt) {
      for (const pair of engine.pairs.list) {
        if (!pair.isActive) continue;
        const other = pair.bodyA === belt ? pair.bodyB : pair.bodyB === belt ? pair.bodyA : null;
        if (other && !other.isStatic) {
          Matter.Body.setVelocity(other, { x: THREE.MathUtils.lerp(other.velocity.x, 2.6, 0.25), y: other.velocity.y });
        }
      }
    }
    // fixed sub-steps keep Matter.js stable (it expects <= 16.7 ms per step)
    const ms = Math.min(dt, 1 / 20) * 1000;
    const steps = Math.ceil(ms / 16.6);
    for (let i = 0; i < steps; i++) Matter.Engine.update(engine, ms / steps);
    let scored = 0;
    for (const bag of bagsRef.current) {
      const g = registry.get(bag.id);
      const [x, y] = toM(bag.body.position.x, bag.body.position.y);
      if (g) {
        g.position.set(x, y, 0);
        g.rotation.z = -bag.body.angle;
      }
      if (!bag.scored && x > BIN.x0 && x < BIN.x1 && y < BIN.h + 0.6) {
        bag.scored = true;
        scored++;
      }
      // fell out of the world → recycle
      if (y < -5) Matter.Body.setPosition(bag.body, toPx(-5, 7));
    }
    if (scored) {
      score.current += scored;
      onScore(score.current);
    }
  });

  const pointerToPx = (e: ThreeEvent<PointerEvent>) => toPx(e.point.x, e.point.y);

  return (
    <group>
      {/* invisible interaction plane at z = 0 */}
      <mesh
        position={[0.5, 4, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          const p = pointerToPx(e);
          const hit = Matter.Query.point(
            bagsRef.current.map((b) => b.body),
            p,
          )[0];
          if (hit) {
            drag.current = Matter.Constraint.create({ pointA: p, bodyB: hit, pointB: { x: 0, y: 0 }, stiffness: 0.08, damping: 0.1 });
            Matter.Composite.add(engine.world, drag.current);
            (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
            document.body.style.cursor = "grabbing";
          } else {
            spawn(THREE.MathUtils.clamp(e.point.x, -7.5, 4));
          }
        }}
        onPointerMove={(e) => {
          if (drag.current) drag.current.pointA = pointerToPx(e);
          else document.body.style.cursor = Matter.Query.point(bagsRef.current.map((b) => b.body), pointerToPx(e)).length ? "grab" : "copy";
        }}
        onPointerUp={() => {
          if (drag.current) {
            Matter.Composite.remove(engine.world, drag.current);
            drag.current = null;
          }
          document.body.style.cursor = "";
        }}
        onPointerLeave={() => {
          if (!drag.current) document.body.style.cursor = "";
        }}
      >
        <planeGeometry args={[22, 14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 20]} />
        <meshStandardMaterial color="#e6e8ee" />
      </mesh>
      {/* conveyor */}
      <group position={[(BELT.x0 + BELT.x1) / 2, BELT.y, 0]} rotation-z={BELT.angle}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[BELT.x1 - BELT.x0, 0.3, 1.3]} />
          <meshStandardMaterial color="#3a4152" />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[BELT.x1 - BELT.x0, 0.02, 1.2]} />
          <meshStandardMaterial color="#1f2533" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, 0.2, s * 0.68]}>
            <boxGeometry args={[BELT.x1 - BELT.x0, 0.12, 0.06]} />
            <meshStandardMaterial color="#f2b632" />
          </mesh>
        ))}
      </group>
      <BeltStripes />
      {[-6, -2, 2].map((x) => (
        <mesh key={x} position={[x, BELT.y / 2, 0]} castShadow>
          <boxGeometry args={[0.2, BELT.y, 0.9]} />
          <meshStandardMaterial color="#9aa1ad" metalness={0.5} />
        </mesh>
      ))}
      {/* bin */}
      <group>
        <mesh position={[(BIN.x0 + BIN.x1) / 2, 0.05, 0]} receiveShadow>
          <boxGeometry args={[BIN.x1 - BIN.x0, 0.1, 1.6]} />
          <meshStandardMaterial color="#2449d8" />
        </mesh>
        {[BIN.x0, BIN.x1].map((x) => (
          <mesh key={x} position={[x, BIN.h / 2, 0]} castShadow>
            <boxGeometry args={[0.15, BIN.h, 1.6]} />
            <meshStandardMaterial color="#2449d8" />
          </mesh>
        ))}
        <mesh position={[(BIN.x0 + BIN.x1) / 2, BIN.h / 2, -0.8]}>
          <boxGeometry args={[BIN.x1 - BIN.x0, BIN.h, 0.08]} />
          <meshStandardMaterial color="#1d3bb0" />
        </mesh>
      </group>
      {bags.map((b) => (
        <Suitcase key={b.id} bag={b} registry={registry} />
      ))}
    </group>
  );
});

export default function BaggagePhysics({ handleRef, onScore }: { handleRef: React.Ref<BaggageHandle>; onScore: (n: number) => void }) {
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0.8, 6.5, 14.5], fov: 36 }}
      onCreated={({ camera }) => camera.lookAt(0.6, 2.2, 0)} gl={{ toneMapping: THREE.NeutralToneMapping }}>
      <color attach="background" args={["#eef1f8"]} />
      <hemisphereLight args={["#ffffff", "#b9bfcc", 0.8]} />
      <directionalLight
        castShadow
        position={[6, 12, 8]}
        intensity={2.4}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-4}
      />
      <World ref={handleRef} onScore={onScore} />
    </Canvas>
  );
}
