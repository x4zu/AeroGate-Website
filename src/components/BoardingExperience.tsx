"use client";

import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Clock3, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLOW_STEPS, PHASES } from "@/lib/flow";
import { KEY_COUNT, rig, SHOTS } from "@/lib/rig";

const AirportCanvas = dynamic(() => import("./three/AirportCanvas"), { ssr: false });

const K = KEY_COUNT;
const HOLD = 0.4; // fraction of each key segment where the camera rests

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * One scrubbed GSAP timeline drives both the camera (static shots + follow-cams)
 * and every story channel (roof lift, bus, passengers, pushback, takeoff, landing).
 * Timeline time t = key index; key i rests for HOLD, then glides to key i+1.
 */
function buildTimeline(section: HTMLElement, onProgress: (p: number) => void) {
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.1,
      onUpdate: (self) => onProgress(self.progress),
    },
  });

  // Camera
  let carry = { pos: SHOTS[0].pos, target: SHOTS[0].target };
  let off = SHOTS[0].pos;
  for (let i = 1; i < K; i++) {
    const shot = SHOTS[i];
    if (!shot.follow) carry = { pos: shot.pos, target: shot.target };
    else off = shot.pos;
    tl.to(
      rig,
      {
        px: carry.pos[0],
        py: carry.pos[1],
        pz: carry.pos[2],
        tx: carry.target[0],
        ty: carry.target[1],
        tz: carry.target[2],
        followA: shot.follow === "A" ? 1 : 0,
        followC: shot.follow === "C" ? 1 : 0,
        fox: off[0],
        foy: off[1],
        foz: off[2],
        duration: 1 - HOLD,
      },
      i - 1 + HOLD,
    );
  }

  // Story channels
  const lin = { ease: "none" };
  tl.fromTo(rig, { arriveT: 0 }, { arriveT: 1, duration: 1.0, ...lin }, 0.3);
  tl.fromTo(rig, { arrivePax: 0 }, { arrivePax: 1, duration: 0.9, ...lin }, 0.9);
  tl.to(rig, { roof: 1, duration: 0.6 }, 1.35);
  tl.to(rig, { roof: 0, duration: 0.6 }, 4.35);
  tl.fromTo(rig, { paxGate: 0 }, { paxGate: 1, duration: 1.6, ...lin }, 4.6);
  tl.fromTo(rig, { busT: 0 }, { busT: 1, duration: 0.9, ease: "power1.inOut" }, 5.2);
  tl.fromTo(rig, { paxApron: 0 }, { paxApron: 1, duration: 1.2, ...lin }, 6.05);
  tl.fromTo(rig, { vipT: 0 }, { vipT: 1, duration: 1.0, ...lin }, 6.7);
  tl.fromTo(rig, { planeT: 0 }, { planeT: 0.3, duration: 1.1, ...lin }, 7.5);
  tl.to(rig, { planeT: 0.66, duration: 0.9, ...lin }, 8.6);
  tl.to(rig, { planeT: 1, duration: 1.2, ...lin }, 9.5);
  tl.fromTo(rig, { landT: 0 }, { landT: 1, duration: 1.3, ...lin }, 10.4);
  tl.to(rig, { roof: 1, duration: 0.6 }, 11.35);
  tl.to(rig, { roof: 0, duration: 0.5 }, 12.45);
  // pin total length to K - 1 so scroll progress maps 1:1 onto keys
  tl.set({}, {}, K - 1);
  return tl;
}

function scrollTargetForKey(section: HTMLElement, key: number) {
  const top = section.getBoundingClientRect().top + window.scrollY;
  const travel = section.offsetHeight - window.innerHeight;
  return top + ((key + HOLD * 0.5) / (K - 1)) * travel;
}

export function BoardingExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [activeKey, setActiveKey] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    gsap.registerPlugin(ScrollTrigger);
    let shown = -1;
    const onProgress = (p: number) => {
      const f = p * (K - 1);
      const i = Math.floor(f);
      const key = Math.min(K - 1, f - i >= HOLD + (1 - HOLD) / 2 ? i + 1 : i);
      rig.activeKey = key;
      if (key !== shown) {
        shown = key;
        setActiveKey(key);
      }
      const hero = heroRef.current;
      if (hero) {
        const h = 1 - clamp01(f / 0.45);
        hero.style.opacity = h.toFixed(3);
        hero.style.transform = `translateY(${(1 - h) * -40}px)`;
        hero.style.visibility = h < 0.01 ? "hidden" : "visible";
      }
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
    };
    const ctx = gsap.context(() => {
      buildTimeline(section, onProgress);
    }, section);
    onProgress(0);
    return () => ctx.revert();
  }, []);

  const goToKey = useCallback((key: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const k = Math.max(0, Math.min(K - 1, key));
    window.scrollTo({ top: scrollTargetForKey(section, k), behavior: "smooth" });
  }, []);

  const stepIndex = activeKey - 1;
  const step = stepIndex >= 0 && stepIndex < FLOW_STEPS.length ? FLOW_STEPS[stepIndex] : null;
  const activePhase = step?.phase;

  return (
    <section
      id="alur"
      ref={sectionRef}
      className="relative bg-ground"
      style={{ height: `${K * 100}svh` }}
      aria-label="Alur boarding pesawat"
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        {/* Real-time 3D airport (Three.js via React Three Fiber) */}
        <div className="absolute inset-0">
          <AirportCanvas onSelect={goToKey} />
        </div>

        {/* Hero copy */}
        <div
          ref={heroRef}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-10 sm:px-10 sm:pb-14"
        >
          {/* Scrim keeps hero copy legible over the busy illustration */}
          <div className="absolute inset-x-0 bottom-0 -z-10 h-[85svh] bg-[linear-gradient(to_top,rgba(246,248,251,0.96)_0%,rgba(246,248,251,0.82)_35%,rgba(246,248,251,0)_100%)] md:bg-[linear-gradient(to_right,rgba(246,248,251,0.95)_0%,rgba(246,248,251,0.75)_38%,rgba(246,248,251,0)_62%)]" />
          <div className="mx-auto flex max-w-[1360px] flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[640px]">
              <h1 className="text-[44px] font-semibold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[64px] lg:text-[80px]">
                Dari kurb ke kabin,
                <br />
                <span className="font-serif text-[1.08em] font-normal italic tracking-[-0.02em] text-sky">tanpa tersesat.</span>
              </h1>
              <p className="mt-5 max-w-[460px] text-[16px] leading-[1.5] text-ink-soft sm:text-[17px]">
                Gulir untuk terbang melewati bandara yang hidup — ikuti penumpang dari kedatangan, check-in, boarding, hingga mendarat
                dan mengambil bagasi.
              </p>
              <div className="pointer-events-auto mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => goToKey(1)}
                  className="group inline-flex items-center gap-2 rounded-full bg-sky px-5 py-3 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(36,73,216,0.8)] transition hover:bg-[#1c3cba]"
                >
                  Mulai perjalanan
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <a
                  href="#zona"
                  className="glass inline-flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium text-ink transition hover:bg-white"
                >
                  Lihat zona bandara
                </a>
              </div>
            </div>

            <div className="glass animate-float pointer-events-auto hidden w-[300px] rounded-[24px] !bg-white/95 p-5 md:block">
              <div className="flex items-center justify-between text-[12px] font-medium uppercase tracking-[0.08em] text-ink-soft">
                <span>Keberangkatan berikutnya</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700">Boarding</span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[30px] font-semibold leading-none tracking-[-0.03em]">CGK</p>
                  <p className="mt-1 text-[12px] text-ink-soft">Jakarta</p>
                </div>
                <svg viewBox="0 0 80 20" className="mb-3 h-5 w-20 text-sky" aria-hidden="true">
                  <path d="M2 10 H70" stroke="currentColor" strokeDasharray="3 4" strokeWidth="1.5" />
                  <path d="M70 5 L78 10 L70 15 Z" fill="currentColor" />
                </svg>
                <div className="text-right">
                  <p className="text-[30px] font-semibold leading-none tracking-[-0.03em]">DPS</p>
                  <p className="mt-1 text-[12px] text-ink-soft">Denpasar</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-ink/10 pt-4 text-[12px]">
                <div>
                  <p className="text-ink-soft">Penerbangan</p>
                  <p className="mt-0.5 font-semibold">AG 214</p>
                </div>
                <div>
                  <p className="text-ink-soft">Gate</p>
                  <p className="mt-0.5 font-semibold">07</p>
                </div>
                <div>
                  <p className="text-ink-soft">Boarding</p>
                  <p className="mt-0.5 font-semibold">09:40</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <span className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.12em] text-ink-soft">
              <ArrowDown className="animate-scroll-cue h-4 w-4" />
              Gulir untuk menjelajah
            </span>
          </div>
        </div>

        {/* Step card */}
        {step ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-4 sm:inset-x-auto sm:bottom-auto sm:left-10 sm:top-1/2 sm:-translate-y-1/2 sm:p-0">
            <article
              key={step.id}
              className="glass animate-card-in pointer-events-auto w-full rounded-[24px] p-5 sm:w-[380px] sm:p-6"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-sky px-2.5 py-1 text-[12px] font-semibold tracking-wide text-white">
                  {step.code}
                </span>
                <span className="font-mono text-[12px] text-ink-soft">
                  {String(stepIndex + 1).padStart(2, "0")} / {String(FLOW_STEPS.length).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-sky">
                <MapPin className="h-3.5 w-3.5" />
                {step.zone}
              </p>
              <h2 className="mt-1.5 font-serif text-[30px] leading-[1.02] tracking-[-0.02em] text-ink sm:text-[36px]">{step.title}</h2>
              <p className="mt-3 line-clamp-3 text-[14px] leading-[1.55] text-ink-soft sm:line-clamp-none sm:text-[15px]">{step.body}</p>
              <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
                <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft">
                  <Clock3 className="h-3.5 w-3.5" />
                  {step.duration}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => goToKey(activeKey - 1)}
                    className="rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-[13px] font-medium transition hover:bg-white"
                    aria-label="Tahap sebelumnya"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={() => goToKey(activeKey + 1)}
                    className="rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-sky"
                    aria-label="Tahap berikutnya"
                  >
                    Lanjut
                  </button>
                </div>
              </div>
            </article>
          </div>
        ) : null}

        {/* Step rail (desktop) */}
        <nav
          aria-label="Tahap boarding"
          className={cn(
            "absolute right-6 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-1 transition-opacity duration-500 lg:flex",
            step ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          {FLOW_STEPS.map((s, i) => {
            const active = i === stepIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goToKey(i + 1)}
                className="group flex items-center justify-end gap-3 py-1"
              >
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[12px] font-medium transition-all duration-300",
                    active
                      ? "glass text-ink opacity-100"
                      : "translate-x-2 text-ink-soft opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                  )}
                >
                  {s.title}
                </span>
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all duration-300",
                    active ? "w-6 bg-sky" : i < stepIndex ? "w-2 bg-sky/50" : "w-2 bg-ink/20 group-hover:bg-ink/40",
                  )}
                />
              </button>
            );
          })}
        </nav>

        {/* Phase bar */}
        <div
          className={cn(
            "absolute left-1/2 top-[84px] z-10 -translate-x-1/2 transition-opacity duration-500",
            step ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div className="glass flex items-center gap-1 rounded-full p-1">
            {PHASES.map((ph) => (
              <span
                key={ph}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-300 sm:px-4 sm:text-[13px]",
                  ph === activePhase ? "bg-ink text-white" : "text-ink-soft",
                )}
              >
                {ph}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll progress */}
        <div className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-ink/5">
          <div ref={progressRef} className="h-full origin-left bg-sky" style={{ transform: "scaleX(0)" }} />
        </div>
      </div>
    </section>
  );
}
