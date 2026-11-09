/**
 * Tiny SVG sprites that live inside a 2000 × 1116 scene box and ride along
 * motion paths with SMIL <animateMotion>. Because the overlay SVG shares the
 * photo's coordinate system, sprites stay glued to the illustration while the
 * 3D camera zooms, tilts and orbits around it.
 */

const SKIN = ["#f1c7a1", "#d9a37c", "#a8714f", "#f5d3b3"];
const SHIRTS = ["#2449d8", "#e4572e", "#f2a541", "#147598", "#7b5cd6", "#26a69a", "#e94f8a", "#334155"];

interface MotionProps {
  path: string;
  dur: number;
  begin?: number;
  rotate?: "auto" | "auto-reverse" | "0";
  fade?: boolean;
}

function Motion({ path, dur, begin = 0, rotate = "0", fade = true }: MotionProps) {
  const b = `${begin.toFixed(2)}s`;
  return (
    <>
      <animateMotion path={path} dur={`${dur}s`} begin={b} repeatCount="indefinite" rotate={rotate} />
      {fade ? (
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          keyTimes="0;0.08;0.9;1"
          dur={`${dur}s`}
          begin={b}
          repeatCount="indefinite"
        />
      ) : null}
    </>
  );
}

export function PersonShape({ shirt, skin, bag }: { shirt: string; skin: string; bag?: string }) {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="4.6" ry="1.8" fill="#182240" opacity="0.16" />
      <rect x="-2.6" y="-11" width="5.2" height="9.5" rx="2.6" fill={shirt} />
      <rect x="-2.2" y="-3.2" width="1.6" height="3.4" rx="0.8" fill="#1f2937" />
      <rect x="0.6" y="-3.2" width="1.6" height="3.4" rx="0.8" fill="#1f2937" />
      <circle cx="0" cy="-13.4" r="2.6" fill={skin} />
      {bag ? <rect x="3" y="-5" width="4" height="5" rx="1" fill={bag} /> : null}
    </g>
  );
}

/** A stream of passengers walking the same path, evenly staggered. */
export function Walkers({
  path,
  count,
  dur,
  seed = 0,
  luggage = true,
}: {
  path: string;
  count: number;
  dur: number;
  seed?: number;
  luggage?: boolean;
}) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const k = i + seed;
        return (
          <g key={i} opacity="0">
            <PersonShape
              shirt={SHIRTS[k % SHIRTS.length]}
              skin={SKIN[k % SKIN.length]}
              bag={luggage && k % 3 === 0 ? SHIRTS[(k + 3) % SHIRTS.length] : undefined}
            />
            <Motion path={path} dur={dur} begin={-(dur / count) * i} />
          </g>
        );
      })}
    </g>
  );
}

function BusShape({ color = "#26a69a" }: { color?: string }) {
  return (
    <g>
      <rect x="-22" y="-6" width="46" height="16" rx="5" fill="#182240" opacity="0.18" />
      <rect x="-24" y="-9" width="46" height="16" rx="5" fill={color} />
      <rect x="-20" y="-7" width="36" height="5" rx="2" fill="#dbeafe" opacity="0.9" />
      <rect x="-20" y="2" width="36" height="2.4" rx="1.2" fill="#ffffff" opacity="0.55" />
      <rect x="17" y="-7" width="4" height="12" rx="2" fill="#bfdbfe" />
    </g>
  );
}

function CarShape({ color = "#f2c230" }: { color?: string }) {
  return (
    <g>
      <rect x="-10" y="-3" width="22" height="10" rx="4" fill="#182240" opacity="0.18" />
      <rect x="-11" y="-6" width="22" height="11" rx="4" fill={color} />
      <rect x="-5" y="-4.5" width="10" height="8" rx="2" fill="#1e293b" opacity="0.55" />
    </g>
  );
}

function TruckShape({ color = "#f2a541" }: { color?: string }) {
  return (
    <g>
      <rect x="-16" y="-3" width="34" height="12" rx="3" fill="#182240" opacity="0.18" />
      <rect x="-17" y="-7" width="24" height="12" rx="2" fill={color} />
      <rect x="8" y="-6" width="9" height="10" rx="2.5" fill="#ef4444" />
      <rect x="12" y="-4.5" width="4" height="7" rx="1" fill="#bfdbfe" />
    </g>
  );
}

export function Vehicle({
  kind,
  path,
  dur,
  begin = 0,
  color,
  fade = true,
}: {
  kind: "bus" | "car" | "truck";
  path: string;
  dur: number;
  begin?: number;
  color?: string;
  fade?: boolean;
}) {
  return (
    <g opacity={fade ? 0 : 1}>
      {kind === "bus" ? <BusShape color={color} /> : kind === "car" ? <CarShape color={color} /> : <TruckShape color={color} />}
      <Motion path={path} dur={dur} begin={begin} rotate="auto" fade={fade} />
    </g>
  );
}

export function MiniPlane({ path, dur, begin = 0, color = "#ffffff", size = 1 }: {
  path: string;
  dur: number;
  begin?: number;
  color?: string;
  size?: number;
}) {
  return (
    <g opacity="0">
      <g transform={`scale(${size})`}>
        <path
          d="M22 0 C22 -2.4 18 -3 14 -3 L4 -3 L-6 -18 L-11 -18 L-5 -3 L-15 -3 L-20 -9 L-24 -9 L-21 0 L-24 9 L-20 9 L-15 3 L-5 3 L-11 18 L-6 18 L4 3 L14 3 C18 3 22 2.4 22 0 Z"
          fill={color}
          stroke="#2449d8"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="0" r="1.6" fill="#2449d8" />
      </g>
      <Motion path={path} dur={dur} begin={begin} rotate="auto" />
    </g>
  );
}

/** Suitcases riding a closed conveyor loop. */
export function Bags({ path, count, dur }: { path: string; count: number; dur: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <g key={i}>
          <rect x="-5" y="-4" width="10" height="7" rx="2" fill={SHIRTS[(i * 3) % SHIRTS.length]} stroke="#0f172a" strokeOpacity="0.25" />
          <rect x="-1.6" y="-5.6" width="3.2" height="2" rx="1" fill="#0f172a" opacity="0.5" />
          <Motion path={path} dur={dur} begin={-(dur / count) * i} rotate="auto" fade={false} />
        </g>
      ))}
    </g>
  );
}

/** Animated dashed route that appears to flow along its path. */
export function FlowLine({
  d,
  color = "#2449d8",
  width = 3,
  dash = "10 12",
  speed = 2,
  opacity = 0.75,
}: {
  d: string;
  color?: string;
  width?: number;
  dash?: string;
  speed?: number;
  opacity?: number;
}) {
  const total = dash.split(" ").reduce((a, n) => a + Number(n), 0);
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" opacity={opacity}>
      <animate attributeName="stroke-dashoffset" from={total} to="0" dur={`${(total / 22) * (2 / speed)}s`} repeatCount="indefinite" />
    </path>
  );
}

/** Expanding ring — used for map pins, radar and the active-step beacon. */
export function Pulse({
  x,
  y,
  r = 18,
  color = "#2449d8",
  dur = 2.4,
  begin = 0,
  rx,
  ry,
}: {
  x: number;
  y: number;
  r?: number;
  color?: string;
  dur?: number;
  begin?: number;
  rx?: number;
  ry?: number;
}) {
  const ex = rx ?? r;
  const ey = ry ?? r * 0.55;
  return (
    <ellipse cx={x} cy={y} rx={ex * 0.2} ry={ey * 0.2} fill="none" stroke={color} strokeWidth="2.5">
      <animate attributeName="rx" values={`${ex * 0.2};${ex}`} dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" />
      <animate attributeName="ry" values={`${ey * 0.2};${ey}`} dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.9;0" dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" />
    </ellipse>
  );
}

export function Blink({ x, y, color = "#ef4444", r = 4, dur = 1.2 }: { x: number; y: number; color?: string; r?: number; dur?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 3} fill={color} opacity="0.25">
        <animate attributeName="opacity" values="0;0.35;0" dur={`${dur}s`} repeatCount="indefinite" />
      </circle>
      <circle cx={x} cy={y} r={r} fill={color}>
        <animate attributeName="opacity" values="0.3;1;0.3" dur={`${dur}s`} repeatCount="indefinite" />
      </circle>
    </g>
  );
}

/** Soft cloud puffs drifting slowly across the scene. */
export function Cloud({ x, y, scale = 1, drift = 60, dur = 14 }: { x: number; y: number; scale?: number; drift?: number; dur?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g opacity="0.92">
        <ellipse cx="0" cy="26" rx="44" ry="8" fill="#182240" opacity="0.08" />
        <circle cx="-18" cy="0" r="16" fill="#ffffff" />
        <circle cx="4" cy="-8" r="20" fill="#ffffff" />
        <circle cx="24" cy="2" r="14" fill="#ffffff" />
        <rect x="-34" y="0" width="70" height="14" rx="7" fill="#ffffff" />
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`0 0; ${drift} ${-drift * 0.5}; 0 0`}
          dur={`${dur}s`}
          repeatCount="indefinite"
        />
      </g>
    </g>
  );
}
