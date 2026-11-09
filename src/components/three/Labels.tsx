"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { rig } from "@/lib/rig";
import type { SelectHandler } from "./Fleet";

interface Pin {
  code: string;
  name: string;
  pos: [number, number, number];
  /** step key to jump to on click */
  stepKey: number;
  /** interior pins only show while the roof is lifted */
  interior?: boolean;
  /** hide once the red airliner leaves its stand */
  parkedOnly?: boolean;
}

const PINS: Pin[] = [
  { code: "AP-01", name: "Main Terminal", pos: [-35, 13, -23], stepKey: 2 },
  { code: "AP-02", name: "Control Tower", pos: [85, 46, -33], stepKey: 8 },
  { code: "AP-03", name: "Passenger Jet", pos: [-45, 13, 14], stepKey: 8, parkedOnly: true },
  { code: "AP-04", name: "Cargo Hangar", pos: [150, 19, -26], stepKey: 13 },
  { code: "AP-06", name: "Radar Station", pos: [115, 12, -48], stepKey: 13 },
  { code: "AP-08", name: "Apron Boarding", pos: [20, 12, 12], stepKey: 6 },
  { code: "AP-09", name: "VIP Boarding", pos: [70, 8, 6], stepKey: 7 },
  { code: "AP-10", name: "Multi-Gate Boarding", pos: [-95, 16, 14], stepKey: 5 },
  { code: "AP-11", name: "Regional Boarding", pos: [98, 9, 10], stepKey: 13 },
  { code: "AP-22", name: "Ground Transportation", pos: [-48, 6, -46], stepKey: 1 },
  { code: "AP-17", name: "Departure & Security", pos: [-70, 5, -27], stepKey: 2, interior: true },
  { code: "AP-18", name: "Commercial & Duty-Free", pos: [-26, 5, -18], stepKey: 3, interior: true },
  { code: "AP-20", name: "Lounge & Transit", pos: [12, 5, -18], stepKey: 4, interior: true },
  { code: "AP-19", name: "Baggage Claim & Arrival", pos: [11, 5, -28], stepKey: 12, interior: true },
  { code: "AP-07", name: "Gate Boarding", pos: [-54, 9, -6], stepKey: 5 },
  { code: "AP-23", name: "Commercial District", pos: [-90, 70, -140], stepKey: 13 },
  { code: "AP-24", name: "Residential Area", pos: [120, 14, -142], stepKey: 13 },
  { code: "AP-25", name: "Runway 09R / 27L", pos: [90, 4, 105], stepKey: 13 },
];

function PinLabel({ pin, onSelect }: { pin: Pin; onSelect: SelectHandler }) {
  const ref = useRef<HTMLButtonElement>(null);
  const last = useRef({ o: -1, active: false });
  useFrame(() => {
    const el = ref.current;
    if (!el) return;
    let o = 1;
    if (pin.interior) o = rig.roof;
    else if (pin.code === "AP-01") o = 1 - rig.roof;
    if (pin.parkedOnly) o *= rig.planeT < 0.01 ? 1 : 0;
    const active = rig.activeKey === pin.stepKey;
    o = Math.round(o * 20) / 20;
    if (o !== last.current.o) {
      el.style.opacity = String(o);
      el.style.pointerEvents = o > 0.3 ? "auto" : "none";
      last.current.o = o;
    }
    if (active !== last.current.active) {
      el.dataset.active = active ? "true" : "false";
      last.current.active = active;
    }
  });
  return (
    <Html position={pin.pos} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
      <button
        ref={ref}
        type="button"
        onClick={() => onSelect(pin.stepKey)}
        data-active="false"
        className="group flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/80 bg-white/85 py-1 pl-1 pr-3 text-[12px] font-medium text-[#182240] shadow-[0_8px_24px_-10px_rgba(24,34,64,0.45)] backdrop-blur-md transition-[transform,background-color,box-shadow] duration-300 hover:scale-105 data-[active=true]:scale-110 data-[active=true]:bg-white data-[active=true]:shadow-[0_0_0_4px_rgba(36,73,216,0.25),0_12px_30px_-10px_rgba(36,73,216,0.6)]"
      >
        <span className="rounded-full bg-[#2449d8] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">{pin.code}</span>
        {pin.name}
      </button>
    </Html>
  );
}

export function Labels({ onSelect }: { onSelect: SelectHandler }) {
  return (
    <group>
      {PINS.map((p) => (
        <PinLabel key={p.code} pin={p} onSelect={onSelect} />
      ))}
    </group>
  );
}
