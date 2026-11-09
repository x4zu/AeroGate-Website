"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { PlaneIcon } from "./icons";

/** Dark closing CTA with a boarding pass that tilts in 3D. */
export function TicketSection() {
  const passRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = passRef.current;
    if (!el) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 12}deg)`;
  };
  const onLeave = () => {
    if (passRef.current) passRef.current.style.transform = "";
  };

  return (
    <section id="tiket" className="bg-paper px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[32px] bg-ink px-6 py-20 text-white sm:px-14 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_20%,rgba(36,73,216,0.55),transparent_70%)]" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M48 0H0V48" fill="none" stroke="#fff" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div className="relative grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#8ea6ff]">Siap terbang?</p>
            <h2 className="mt-4 text-[44px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[64px]">
              Kursi Anda sudah
              <br />
              <span className="font-serif font-normal italic text-[#8ea6ff]">menunggu di gate.</span>
            </h2>
            <p className="mt-6 max-w-[440px] text-[16px] leading-[1.55] text-white/65">
              Check-in online 48 jam sebelum keberangkatan, simpan boarding pass digital, dan ikuti petunjuk gate secara langsung.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#alur"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-medium text-ink transition hover:bg-[#dfe6ff]"
              >
                Check-in sekarang
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#zona"
                className="inline-flex items-center rounded-full border border-white/15 px-5 py-3 text-[15px] font-medium text-white transition hover:bg-white/10"
              >
                Peta terminal
              </a>
            </div>
          </div>

          <div className="flex justify-center [perspective:1200px]" onPointerMove={onMove} onPointerLeave={onLeave}>
            <div
              ref={passRef}
              className="w-full max-w-[460px] transition-transform duration-300 ease-out [transform-style:preserve-3d]"
            >
              <div className="relative overflow-hidden rounded-[24px] bg-white text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between bg-sky px-6 py-4 text-white">
                  <span className="text-[14px] font-semibold tracking-[-0.01em]">AeroGate · Boarding Pass</span>
                  <PlaneIcon className="h-5 w-5 rotate-90" />
                </div>
                <div className="px-6 pb-5 pt-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[12px] text-ink-soft">Dari</p>
                      <p className="text-[44px] font-semibold leading-none tracking-[-0.04em]">CGK</p>
                      <p className="mt-1 text-[12px] text-ink-soft">Jakarta · T3</p>
                    </div>
                    <div className="mb-6 flex flex-1 items-center px-4">
                      <span className="h-px flex-1 border-t border-dashed border-ink/25" />
                      <PlaneIcon className="mx-2 h-5 w-5 rotate-90 text-sky" />
                      <span className="h-px flex-1 border-t border-dashed border-ink/25" />
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] text-ink-soft">Ke</p>
                      <p className="text-[44px] font-semibold leading-none tracking-[-0.04em]">DPS</p>
                      <p className="mt-1 text-[12px] text-ink-soft">Denpasar · Dom</p>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-4 gap-3 text-[12px]">
                    {[
                      ["Penerbangan", "AG 214"],
                      ["Gate", "07"],
                      ["Kursi", "14A"],
                      ["Boarding", "09:40"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-ink-soft">{k}</p>
                        <p className="mt-0.5 text-[15px] font-semibold">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Perforation */}
                <div className="relative flex items-center">
                  <span className="absolute -left-3 h-6 w-6 rounded-full bg-ink" />
                  <span className="mx-5 h-px flex-1 border-t-2 border-dashed border-ink/15" />
                  <span className="absolute -right-3 h-6 w-6 rounded-full bg-ink" />
                </div>
                <div className="flex items-center justify-between px-6 py-5">
                  <div>
                    <p className="text-[12px] text-ink-soft">Penumpang</p>
                    <p className="text-[15px] font-semibold">Grup 2 · Ekonomi</p>
                  </div>
                  <svg viewBox="0 0 120 32" className="h-8 w-32" aria-hidden="true">
                    {Array.from({ length: 34 }, (_, i) => (
                      <rect key={i} x={i * 3.5} y="0" width={i % 3 === 0 ? 2 : 1} height="32" fill="#10131a" />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
