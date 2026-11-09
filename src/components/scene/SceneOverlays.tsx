import type { SceneId } from "@/types/flow";
import { Bags, Blink, Cloud, FlowLine, MiniPlane, Pulse, Vehicle, Walkers } from "./sprites";

/** Closed stadium-shaped conveyor loop centred on the origin. */
function stadium(length: number, r: number) {
  const h = length / 2;
  return `M ${-h} ${-r} L ${h} ${-r} A ${r} ${r} 0 0 1 ${h} ${r} L ${-h} ${r} A ${r} ${r} 0 0 1 ${-h} ${-r} Z`;
}

function OverviewOverlay() {
  return (
    <g>
      {/* Passenger buses circling the terminal forecourt */}
      <Vehicle kind="bus" path="M 600 580 L 700 528 L 800 474 L 905 420" dur={9} color="#26a69a" />
      <Vehicle kind="bus" path="M 920 450 L 820 500 L 720 552 L 610 610" dur={11} begin={-5} color="#f2a541" />
      {/* Passengers at the bus shelter */}
      <Walkers path="M 640 420 L 700 395 L 760 380" count={6} dur={7} seed={1} />
      {/* Pushback route on the taxiway */}
      <FlowLine d="M 420 660 L 560 760 L 700 850 L 860 950" color="#f2a541" width={3} dash="14 12" opacity={0.85} />
      {/* Cargo trucks shuttling to the hangar */}
      <Vehicle kind="truck" path="M 1380 700 L 1480 650 L 1600 590" dur={8} color="#16a34a" />
      <Vehicle kind="truck" path="M 1260 760 L 1360 710 L 1480 650" dur={10} begin={-4} color="#f2a541" />
      {/* Ground support tug loop */}
      <Vehicle kind="car" path="M 1060 900 L 1160 850 L 1260 800" dur={6} color="#f2c230" />
      {/* Control tower beacon + radar sweep */}
      <Blink x={1213} y={128} />
      <Pulse x={1612} y={870} r={90} color="#2449d8" dur={3} />
      <Pulse x={1612} y={870} r={90} color="#2449d8" dur={3} begin={1.5} />
      {/* Map pins */}
      <Pulse x={530} y={182} />
      <Pulse x={540} y={655} begin={0.6} />
      <Pulse x={1700} y={410} begin={1.2} />
      <Pulse x={1213} y={740} begin={1.8} />
    </g>
  );
}

function TerminalOverlay() {
  return (
    <g>
      {/* Check-in → security → airside */}
      <Walkers path="M 470 480 L 540 430 L 610 380 L 680 330 L 740 285 L 800 250" count={12} dur={14} seed={0} />
      <Walkers path="M 380 420 L 450 380 L 520 340 L 600 300 L 660 260" count={8} dur={12} seed={4} />
      {/* Duty-free browsing loop */}
      <Walkers
        path="M 1200 380 C 1240 330 1320 320 1370 350 C 1410 380 1380 430 1320 440 C 1260 450 1180 430 1200 380 Z"
        count={7}
        dur={16}
        seed={2}
        luggage={false}
      />
      {/* Lounge → gate */}
      <Walkers path="M 1560 560 L 1640 600 L 1720 640 L 1790 680" count={5} dur={9} seed={6} />
      {/* Baggage carousels */}
      <g transform="translate(825 597) rotate(-28)">
        <path d={stadium(150, 20)} fill="none" stroke="#2449d8" strokeOpacity="0.25" strokeWidth="2" />
        <Bags path={stadium(150, 20)} count={9} dur={12} />
      </g>
      <g transform="translate(953 660) rotate(-28)">
        <path d={stadium(150, 20)} fill="none" stroke="#2449d8" strokeOpacity="0.25" strokeWidth="2" />
        <Bags path={stadium(150, 20)} count={9} dur={13} />
      </g>
      {/* Arrivals heading out */}
      <Walkers path="M 880 720 L 960 680 L 1040 640 L 1110 600" count={6} dur={10} seed={3} />
      {/* Skytrain tracks */}
      <FlowLine d="M 200 580 L 480 740 L 760 900 L 900 980" color="#38bdf8" width={4} dash="40 30" speed={4} opacity={0.6} />
      <FlowLine d="M 1150 960 L 1300 860 L 1440 770 L 1540 700" color="#38bdf8" width={4} dash="40 30" speed={4} opacity={0.6} />
      {/* Ground transportation */}
      <Walkers path="M 1280 900 L 1380 950 L 1480 1000 L 1590 1050" count={8} dur={12} seed={5} />
      <Vehicle kind="car" path="M 1420 1116 L 1520 1060 L 1620 1000 L 1700 950" dur={7} color="#f2c230" />
      <Vehicle kind="car" path="M 1340 1116 L 1440 1060 L 1540 1000 L 1620 950" dur={8} begin={-4} color="#f2c230" />
      {/* Map pins */}
      <Pulse x={547} y={182} />
      <Pulse x={1307} y={136} begin={0.5} />
      <Pulse x={1742} y={410} begin={1} />
      <Pulse x={945} y={518} begin={1.5} />
      <Pulse x={366} y={660} begin={2} />
      <Pulse x={1265} y={742} begin={0.8} />
    </g>
  );
}

function BoardingOverlay() {
  return (
    <g>
      {/* AP-07: gate → jet bridge → aircraft door */}
      <Walkers path="M 590 470 L 540 438 L 490 405 L 440 372 L 410 355" count={8} dur={8} seed={0} />
      {/* AP-08: apron bus arrives, passengers walk to the stairs */}
      <Vehicle kind="bus" path="M 860 610 L 960 560 L 1060 510 L 1120 480" dur={10} color="#26a69a" />
      <Walkers path="M 1150 495 L 1190 470 L 1225 445 L 1232 425 L 1215 395" count={7} dur={7} seed={2} />
      {/* AP-09: VIP car → red carpet → stairs */}
      <Walkers path="M 1770 630 L 1730 612 L 1690 596 L 1668 580" count={3} dur={6} seed={5} luggage={false} />
      {/* AP-10: catering & fuel trucks */}
      <Vehicle kind="truck" path="M 380 720 L 460 760 L 540 800" dur={7} color="#f2f2f2" />
      <Vehicle kind="truck" path="M 520 860 L 600 900 L 680 940" dur={8} begin={-3} color="#f2a541" />
      {/* AP-11: regional turboprop boarding */}
      <Walkers path="M 1160 880 L 1210 905 L 1260 930 L 1300 925" count={5} dur={6.5} seed={4} />
      {/* Service road traffic */}
      <Vehicle kind="truck" path="M 860 940 L 960 990 L 1060 1040" dur={9} color="#f2a541" />
      <FlowLine d="M 0 470 L 300 640 L 620 820 L 900 980" color="#f2a541" width={3} dash="14 12" opacity={0.7} />
      {/* Map pins */}
      <Pulse x={543} y={182} />
      <Pulse x={1280} y={136} begin={0.5} />
      <Pulse x={1716} y={410} begin={1} />
      <Pulse x={568} y={655} begin={1.5} />
      <Pulse x={1247} y={742} begin={2} />
    </g>
  );
}

function FlightOverlay() {
  return (
    <g>
      {/* AP-12: climb-out path */}
      <FlowLine d="M 290 510 C 500 480 720 380 910 85" color="#f2a541" width={3.5} dash="12 12" speed={3} opacity={0.9} />
      <MiniPlane path="M 290 510 C 500 480 720 380 910 85" dur={6} color="#ffffff" size={0.9} />
      {/* AP-13: cruise clouds drifting */}
      <Cloud x={1060} y={250} scale={0.9} drift={50} dur={16} />
      <Cloud x={1470} y={235} scale={0.8} drift={40} dur={13} />
      <Cloud x={1300} y={410} scale={0.9} drift={60} dur={18} />
      <Cloud x={1820} y={140} scale={0.7} drift={50} dur={15} />
      {/* AP-14: waypoint route */}
      <FlowLine
        d="M 588 760 C 590 700 610 670 625 660 C 700 630 780 600 830 572 C 870 530 900 520 925 525 C 1000 500 1100 510 1158 550"
        color="#2449d8"
        width={3}
        dash="8 10"
        speed={3}
      />
      <MiniPlane
        path="M 588 760 C 590 700 610 670 625 660 C 700 630 780 600 830 572 C 870 530 900 520 925 525 C 1000 500 1100 510 1158 550"
        dur={8}
        color="#e0f2fe"
        size={0.6}
      />
      {/* AP-15: banking rings */}
      <Pulse x={1690} y={560} rx={190} ry={90} color="#7b5cd6" dur={3.2} />
      <Pulse x={1690} y={560} rx={190} ry={90} color="#7b5cd6" dur={3.2} begin={1.6} />
      {/* AP-16: glide slope */}
      <FlowLine d="M 1100 1010 L 1580 700" color="#14b8a6" width={5} dash="30 22" speed={5} opacity={0.7} />
      <FlowLine d="M 1140 1030 L 1620 720" color="#14b8a6" width={3} dash="20 26" speed={4} opacity={0.5} />
      {/* Ground crew truck */}
      <Vehicle kind="truck" path="M 520 780 L 600 820 L 680 860 L 760 900" dur={9} color="#f2a541" />
      {/* Map pins */}
      <Pulse x={543} y={182} />
      <Pulse x={1282} y={136} begin={0.5} />
      <Pulse x={1716} y={410} begin={1} />
      <Pulse x={1265} y={742} begin={1.5} />
    </g>
  );
}

const OVERLAYS: Record<SceneId, () => React.JSX.Element> = {
  overview: OverviewOverlay,
  terminal: TerminalOverlay,
  boarding: BoardingOverlay,
  flight: FlightOverlay,
};

export function SceneOverlay({ scene }: { scene: SceneId }) {
  const Overlay = OVERLAYS[scene];
  return <Overlay />;
}
