/** Fixed author credit — plain text, no badge background. */
export function Watermark() {
  return (
    <p
      aria-label="Made by Reivan Elsyafir Pratama"
      className="pointer-events-none fixed bottom-3 right-5 z-40 hidden select-none text-[11px] font-medium tracking-[0.02em] text-ink/45 mix-blend-multiply lg:block"
    >
      Made by <span className="font-serif text-[13px] italic text-ink/65">Reivan Elsyafir Pratama</span>
    </p>
  );
}
