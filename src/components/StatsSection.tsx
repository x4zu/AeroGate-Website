"use client";

import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 12, suffix: "", label: "Tahap boarding yang dipetakan", note: "dari kurb hingga bagasi" },
  { value: 38, suffix: "", label: "Gate & parking stand", note: "garbarata dan apron" },
  { value: 18, suffix: " mnt", label: "Rata-rata waktu boarding", note: "untuk narrow-body" },
  { value: 24, suffix: "/7", label: "Operasional terminal", note: "termasuk lounge transit" },
];

function CountUp({ to, run }: { to: number; run: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400);
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);
  return <>{n}</>;
}

export function StatsSection() {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="angka" ref={ref} className="border-y border-ink/5 bg-white px-5 py-20 sm:px-10">
      <div className="mx-auto grid max-w-[1360px] grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className="border-l border-ink/10 pl-5 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "none" : "translateY(16px)",
              transitionDelay: `${i * 90}ms`,
            }}
          >
            <p className="text-[48px] font-semibold leading-none tracking-[-0.04em] tabular-nums sm:text-[64px]">
              <CountUp to={s.value} run={inView} />
              <span className="text-sky">{s.suffix}</span>
            </p>
            <p className="mt-3 text-[15px] font-medium">{s.label}</p>
            <p className="mt-1 text-[13px] text-ink-soft">{s.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
