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
            href="https://github.com/x4zu/AeroGate-Website"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Lihat source code di GitHub"
            title="Source code di GitHub"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 hover:text-sky"
          >
            <GitHubIcon className="h-5 w-5" />
          </a>
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

/** GitHub mark (simple-icons path) — lucide no longer ships brand icons. */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
