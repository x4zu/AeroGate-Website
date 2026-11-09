"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { sceneState } from "@/lib/rig";
import { PlaneIcon } from "./icons";

/** Full-screen loader that tracks the GLB models + textures of the 3D airport. */
export function Loader() {
  const { progress, active } = useProgress();
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);
  const shown = useRef(0);
  const real = useRef(0);
  useEffect(() => {
    real.current = active ? progress : Math.max(progress * 0.95, 0);
  }, [active, progress]);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const ready = sceneState.ready;
      const target = Math.min(ready ? 100 : Math.min(real.current, 96), ((now - start) / 1200) * 100);
      shown.current += (target - shown.current) * 0.1;
      if (ready && target >= 100 && shown.current > 99.3) shown.current = 100;
      setPct(Math.round(shown.current));
      if (shown.current >= 100 || now - start > 20000) {
        setPct(100);
        setDone(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 900);
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        done ? "pointer-events-none -translate-y-4 opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(16,19,26,0.08)" strokeWidth="3" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="#2449d8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44}
            strokeDashoffset={2 * Math.PI * 44 * (1 - pct / 100)}
          />
        </svg>
        <div
          className="absolute left-1/2 top-1/2 text-sky"
          style={{ transform: `translate(-50%, -50%) rotate(${pct * 3.6}deg) translateY(-44px) rotate(90deg)` }}
        >
          <PlaneIcon className="h-5 w-5" />
        </div>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[15px] font-medium tabular-nums text-ink">
          {pct}%
        </span>
      </div>
      <p className="mt-6 text-[14px] font-medium tracking-[-0.005em] text-ink-soft">Membangun bandara 3D</p>
    </div>
  );
}
