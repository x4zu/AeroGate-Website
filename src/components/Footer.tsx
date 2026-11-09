import { LogoMark } from "./icons";

const COLUMNS = [
  { title: "Penumpang", links: ["Check-in online", "Bagasi", "Keamanan", "Lounge"] },
  { title: "Bandara", links: ["Peta terminal", "Transportasi", "Parkir", "Duty-free"] },
  { title: "Bantuan", links: ["Pusat bantuan", "Aksesibilitas", "Barang hilang", "Kontak"] },
];

const TICKER = ["AG 214 · DPS · Boarding", "AG 381 · KNO · Tepat waktu", "AG 102 · SUB · Gate 12", "AG 560 · UPG · Check-in", "AG 77 · BTH · Final call"];

export function Footer() {
  return (
    <footer className="bg-paper">
      <div className="overflow-hidden border-y border-ink/5 bg-white py-3">
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap font-mono text-[13px] text-ink-soft">
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-10">
              {t}
              <span className="h-1 w-1 rounded-full bg-sky" />
            </span>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-[1360px] px-5 py-16 sm:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-9 w-9" />
              <span className="text-[17px] font-semibold tracking-[-0.02em]">AeroGate</span>
            </div>
            <p className="mt-4 max-w-[300px] text-[14px] leading-[1.55] text-ink-soft">
              Panduan visual alur boarding — dari kurb keberangkatan hingga conveyor bagasi.
            </p>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="text-[13px] font-medium uppercase tracking-[0.1em] text-ink-soft">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-[15px] text-ink transition-colors hover:text-sky">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <hr className="my-10 border-ink/10" />
        <div className="flex flex-col justify-between gap-3 text-[13px] text-ink-soft sm:flex-row">
          <p>© 2026 AeroGate. Konsep demo.</p>
          <p>Ilustrasi bandara isometrik · Alur boarding interaktif</p>
        </div>
      </div>
    </footer>
  );
}
