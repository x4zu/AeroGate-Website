"use client";

import Image from "next/image";
import { useRef } from "react";
import { SCENES, SCENE_H, SCENE_W, ZONES } from "@/lib/flow";
import type { Zone } from "@/types/flow";
import { SceneOverlay } from "./scene/SceneOverlays";

/** Card whose scene plate tilts in 3D toward the pointer. */
function ZoneCard({ zone, index }: { zone: Zone; index: number }) {
  const plateRef = useRef<HTMLDivElement>(null);
  const scene = SCENES[zone.scene];

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = plateRef.current;
    if (!el) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateX(${24 - y * 10}deg) rotateZ(${-6 + x * 6}deg) scale(1.08) translateY(-6px)`;
  };
  const onLeave = () => {
    if (plateRef.current) plateRef.current.style.transform = "";
  };

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-[26px] border border-white bg-white/80 shadow-[0_20px_60px_-30px_rgba(24,34,64,0.35)]"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-ground [perspective:1100px]">
        <div
          ref={plateRef}
          className="scene-mask absolute inset-[-8%] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:rotateX(18deg)_rotateZ(-4deg)_scale(1.02)]"
        >
          <Image src={scene.src} alt={scene.alt} fill sizes="(max-width: 768px) 100vw, 50vw" placeholder="blur" className="object-fill" />
          <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <SceneOverlay scene={zone.scene} />
          </svg>
        </div>
        <span className="glass absolute left-4 top-4 rounded-full px-3 py-1 font-mono text-[12px] font-medium text-sky-deep">
          {zone.codes}
        </span>
        <span className="absolute right-4 top-4 font-mono text-[12px] text-ink-soft">0{index + 1}</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-serif text-[30px] leading-none tracking-[-0.02em]">{zone.title}</h3>
        <p className="mt-3 text-[15px] leading-[1.55] text-ink-soft">{zone.body}</p>
        <ul className="mt-5 flex flex-wrap gap-1.5">
          {zone.items.map((item) => (
            <li key={item} className="rounded-full bg-ground px-3 py-1 text-[12px] font-medium text-ink-soft">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function ZonesSection() {
  return (
    <section id="zona" className="relative bg-paper px-5 py-24 sm:px-10 sm:py-32">
      <div className="mx-auto max-w-[1360px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-sky">Zona bandara</p>
            <h2 className="mt-3 max-w-[720px] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[56px]">
              Empat lapisan, <span className="font-serif font-normal italic text-sky">satu alur.</span>
            </h2>
          </div>
          <p className="max-w-[420px] text-[16px] leading-[1.55] text-ink-soft">
            Arahkan kursor ke setiap peta untuk memiringkannya. Semua yang bergerak — penumpang, bus, bagasi, pesawat — mengikuti jalur
            nyata di dalam ilustrasi.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {ZONES.map((z, i) => (
            <ZoneCard key={z.scene} zone={z} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
