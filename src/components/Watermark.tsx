/** Fixed author credit — plain text, no badge background; links to the author's site. */
export function Watermark() {
  return (
    <a
      href="https://www.x2zu.net/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Made by Reivan Elsyafir Pratama — buka x2zu.net"
      className="group fixed bottom-3 right-5 z-40 hidden select-none text-[11px] font-medium tracking-[0.02em] text-ink/45 mix-blend-multiply transition-colors hover:text-ink/70 lg:block"
    >
      Made by{" "}
      <span className="font-serif text-[13px] italic text-ink/65 underline-offset-2 transition-colors group-hover:text-sky group-hover:underline">
        Reivan Elsyafir Pratama
      </span>
    </a>
  );
}
