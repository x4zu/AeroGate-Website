"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "./icons";

const LINKS = [
  { href: "#alur", label: "Alur" },
  { href: "#zona", label: "Zona" },
  { href: "#angka", label: "Angka" },
  { href: "#tiket", label: "Tiket" },
];

function useClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const update = () => setTime(fmt.format(new Date()));
    update();
    const id = setInterval(update, 20_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function Navbar() {
  const time = useClock();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <div className="glass mx-auto flex h-14 max-w-[1360px] items-center justify-between rounded-full pl-2 pr-2 sm:pl-3">
        <a href="#" className="flex items-center gap-2.5" aria-label="AeroGate beranda">
          <LogoMark className="h-9 w-9" />
          <span className="text-[16px] font-semibold tracking-[-0.02em]">AeroGate</span>
          <span className="hidden text-[13px] text-ink-soft md:inline">· CGK {time ? `· ${time} WIB` : ""}</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-[14px] font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#tiket"
            className="hidden rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-sky sm:inline-flex"
          >
            Pesan kursi
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5 md:hidden"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "glass mx-auto mt-2 max-w-[1360px] origin-top overflow-hidden rounded-[24px] transition-all duration-300 md:hidden",
          open ? "max-h-80 opacity-100" : "pointer-events-none max-h-0 opacity-0",
        )}
      >
        <nav className="flex flex-col p-2" aria-label="Navigasi seluler">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-2xl px-4 py-3 text-[16px] font-medium hover:bg-ink/5"
            >
              {l.label}
            </a>
          ))}
          <a href="#tiket" onClick={() => setOpen(false)} className="mt-1 rounded-2xl bg-ink px-4 py-3 text-center text-[16px] font-medium text-white">
            Pesan kursi
          </a>
        </nav>
      </div>
    </header>
  );
}
