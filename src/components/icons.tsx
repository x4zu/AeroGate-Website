import type { SVGProps } from "react";

export function PlaneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z" />
    </svg>
  );
}

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="10" fill="#2449d8" />
      <path d="M8 21.5 24 10.5" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.6" strokeDasharray="2 2.4" strokeLinecap="round" />
      <path
        d="M23.6 9.2c.6-.4 1.4.4 1 1l-3.3 4.6.9 5.6-1.3 1-2.4-4.3-3 2.1.2 2-1 .8-1.2-2.8-2.8-1.2.8-1 2 .2 2.1-3-4.3-2.4 1-1.3 5.6.9 4.6-3.2Z"
        fill="#fff"
      />
    </svg>
  );
}
