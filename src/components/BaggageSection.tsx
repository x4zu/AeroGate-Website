"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { Luggage, RotateCcw } from "lucide-react";
import type { BaggageHandle } from "./three/BaggagePhysics";

const BaggagePhysics = dynamic(() => import("./three/BaggagePhysics"), { ssr: false });

export function BaggageSection() {
  const handle = useRef<BaggageHandle>(null);
  const [score, setScore] = useState(0);
  const onScore = useCallback((n: number) => setScore(n), []);

  return (
    <section id="bagasi" className="bg-paper px-5 py-24 sm:px-10 sm:py-28">
      <div className="mx-auto grid max-w-[1360px] items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-sky">Bagasi · Matter.js</p>
          <h2 className="mt-3 text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            Koper Anda, <span className="font-serif font-normal italic text-sky">ditangani fisika nyata.</span>
          </h2>
          <p className="mt-5 max-w-[440px] text-[16px] leading-[1.55] text-ink-soft">
            Klik area kosong untuk menjatuhkan koper, seret koper untuk melemparnya. Conveyor membawa setiap koper ke bin pemuatan —
            persis seperti yang terjadi di bawah terminal.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handle.current?.drop(5)}
              className="inline-flex items-center gap-2 rounded-full bg-sky px-5 py-3 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(36,73,216,0.8)] transition hover:bg-[#1c3cba]"
            >
              <Luggage className="h-4 w-4" />
              Jatuhkan 5 koper
            </button>
            <button
              type="button"
              onClick={() => handle.current?.reset()}
              className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-5 py-3 text-[15px] font-medium transition hover:bg-ground"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
          <div className="mt-8 inline-flex items-baseline gap-3 rounded-2xl border border-ink/5 bg-white px-5 py-4">
            <span className="text-[40px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{score}</span>
            <span className="text-[14px] text-ink-soft">koper masuk bin pemuatan</span>
          </div>
        </div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-white bg-ground shadow-[0_30px_80px_-40px_rgba(24,34,64,0.45)] sm:aspect-[16/10]">
          <BaggagePhysics handleRef={handle} onScore={onScore} />
        </div>
      </div>
    </section>
  );
}
