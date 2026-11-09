"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { makePose, planeAPose, planeCPose, rig } from "@/lib/rig";

/**
 * Reads the scroll-driven rig and flies the camera:
 *  - blends static shots with follow-cams locked to the moving aircraft
 *  - adds pointer parallax and a mouse-drag orbit that springs back
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const v = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      tgt: new THREE.Vector3(),
      lookAt: new THREE.Vector3(rig.tx, rig.ty, rig.tz),
      tmp: new THREE.Vector3(),
      off: new THREE.Vector3(),
      right: new THREE.Vector3(),
      a: makePose(),
      c: makePose(),
    }),
    [],
  );
  const drag = useRef({ active: false, x: 0, y: 0, released: 0 });
  const first = useRef(true);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag.current = { active: true, x: e.clientX, y: e.clientY, released: 0 };
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        rig.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
        rig.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
      }
      const d = drag.current;
      if (!d.active) return;
      rig.dragYaw = THREE.MathUtils.clamp(rig.dragYaw - (e.clientX - d.x) * 0.005, -1.3, 1.3);
      rig.dragPitch = THREE.MathUtils.clamp(rig.dragPitch + (e.clientY - d.y) * 0.003, -0.35, 0.45);
      d.x = e.clientX;
      d.y = e.clientY;
      el.style.cursor = "grabbing";
    };
    const up = () => {
      if (!drag.current.active) return;
      drag.current.active = false;
      drag.current.released = performance.now();
      el.style.cursor = "";
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    // portrait screens need a wider lens to fit the same shot
    const fov = size.width / size.height < 1 ? 46 : 32;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    v.pos.set(rig.px, rig.py, rig.pz);
    v.tgt.set(rig.tx, rig.ty, rig.tz);
    v.off.set(rig.fox, rig.foy, rig.foz);

    if (rig.followA > 0.001) {
      planeAPose(rig.planeT, v.a);
      v.pos.lerp(v.tmp.copy(v.a.pos).add(v.off), rig.followA);
      v.tgt.lerp(v.a.pos, rig.followA);
    }
    if (rig.followC > 0.001) {
      planeCPose(rig.landT, v.c);
      v.pos.lerp(v.tmp.copy(v.c.pos).add(v.off), rig.followC);
      v.tgt.lerp(v.c.pos, rig.followC);
    }

    // drag orbit around the target, springing back ~1.2 s after release
    if (!drag.current.active && drag.current.released && performance.now() - drag.current.released > 1200) {
      const k = 1 - Math.exp(-dt * 2.2);
      rig.dragYaw += (0 - rig.dragYaw) * k;
      rig.dragPitch += (0 - rig.dragPitch) * k;
    }
    v.tmp.subVectors(v.pos, v.tgt);
    v.tmp.applyAxisAngle(THREE.Object3D.DEFAULT_UP, rig.dragYaw);
    const horiz = Math.hypot(v.tmp.x, v.tmp.z);
    const elev = Math.atan2(v.tmp.y, horiz) + rig.dragPitch;
    const dist = v.tmp.length();
    const clampedElev = THREE.MathUtils.clamp(elev, 0.08, 1.45);
    const yawAng = Math.atan2(v.tmp.z, v.tmp.x);
    v.tmp.set(Math.cos(yawAng) * Math.cos(clampedElev) * dist, Math.sin(clampedElev) * dist, Math.sin(yawAng) * Math.cos(clampedElev) * dist);
    v.pos.copy(v.tgt).add(v.tmp);

    // pointer parallax
    v.right.set(-v.tmp.z, 0, v.tmp.x).normalize();
    v.pos.addScaledVector(v.right, rig.pointerX * dist * 0.02);
    v.pos.y += -rig.pointerY * dist * 0.012;

    if (first.current) {
      cam.position.copy(v.pos).multiplyScalar(1.25);
      v.lookAt.copy(v.tgt);
      first.current = false;
    }
    const k = 1 - Math.exp(-dt * 3.2);
    cam.position.lerp(v.pos, k);
    v.lookAt.lerp(v.tgt, k);
    cam.lookAt(v.lookAt);
  });

  return null;
}
