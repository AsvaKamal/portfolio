import { services, type Service } from "../data/content";
import { useInView } from "../hooks";
import { pad } from "../lib";
import { MONO, Packet, Wire, useSvgId, useSvgPlayback } from "./svg";
import { SectionLabel, SectionTitle, ToolChips } from "./ui";

const ACC = "#c9955a";
const LINE = "#3a2c22";
const TEXT = "#a8998a";
const OK = "#8fb58a";

/** Dark "live" backdrop shared by all three diagrams: a dot grid (one pattern, not 160 circles) and a status line. */
function Backdrop({ label }: { label: string }) {
  const id = useSvgId();
  return (
    <>
      <defs>
        <pattern id={id} width="25" height="25" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.8" fill="#3a2c22" />
        </pattern>
      </defs>
      <rect width="400" height="250" fill="#221811" />
      <rect width="400" height="250" fill={`url(#${id})`} />
      <circle cx="18" cy="18" r="3" fill={OK}>
        <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <text x="27" y="21.5" fill={TEXT} fontSize="8.5" letterSpacing="0.8" {...MONO}>
        {label}
      </text>
    </>
  );
}

function FlowVisual() {
  const srcs = [
    { label: "PORTAL", y: 48 },
    { label: "INBOX", y: 108 },
    { label: "SHEETS", y: 168 },
  ];
  const wires = ["M98 65 C130 65 126 125 158 125", "M98 125 H158", "M98 185 C130 185 126 125 158 125"];
  return (
    <>
      <Backdrop label="RUNNING · EVERY MONDAY 09:00" />
      {wires.map((d, i) => (
        <g key={d}>
          <Wire d={d} color={ACC} track={LINE} delay={i * 0.2} />
          <Packet d={d} color={ACC} offset={i * 0.6} />
        </g>
      ))}
      <Wire d="M242 125 H286" color={ACC} track={LINE} />
      <Packet d="M242 125 H286" color={ACC} dur={0.9} />
      {srcs.map((s) => (
        <g key={s.label}>
          <rect x="20" y={s.y} width="78" height="34" rx="7" fill="#2c2019" stroke={LINE} />
          <rect x="30" y={s.y + 13} width="8" height="8" rx="2" fill={ACC} opacity="0.8" />
          <text x="44" y={s.y + 21} fill="#f1e8da" fontSize="9" {...MONO}>
            {s.label}
          </text>
        </g>
      ))}
      {/* engine */}
      <rect x="158" y="88" width="84" height="74" rx="12" fill="#2c2019" stroke={ACC} strokeOpacity="0.6" />
      <g className="svc-spin" style={{ transformOrigin: "200px 116px" }}>
        <circle cx="200" cy="116" r="15" fill="none" stroke={ACC} strokeWidth="3" strokeDasharray="14 8" />
      </g>
      <circle cx="200" cy="116" r="5" fill={ACC}>
        <animate attributeName="r" values="4;6;4" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <text x="200" y="151" textAnchor="middle" fill="#f1e8da" fontSize="8.5" letterSpacing="0.6" {...MONO}>
        AUTOMATE
      </text>
      {/* report assembling itself */}
      <rect x="288" y="44" width="94" height="162" rx="8" fill="#f8f3ea" />
      <rect x="288" y="44" width="94" height="22" rx="8" fill="#ece2d3" />
      <text x="296" y="58.5" fill="#1a120d" fontSize="7.5" letterSpacing="0.5" {...MONO}>
        WEEKLY REPORT
      </text>
      {[70, 56, 74, 48, 66, 60].map((w, i) => (
        <rect key={i} x="298" y={78 + i * 16} height="7" rx="3.5" width="0" fill={i === 2 ? ACC : "#d8cbb8"}>
          <animate attributeName="width" values={`0;${w};${w};0`} keyTimes="0;0.25;0.9;1" dur="4s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
        </rect>
      ))}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.55;0.62;0.9;1" dur="4s" repeatCount="indefinite" />
        <circle cx="304" cy="189" r="7" fill={OK} />
        <path d="M300.5 189l2.5 2.6 4.6-5" fill="none" stroke="#1a120d" strokeWidth="1.8" strokeLinecap="round" />
        <text x="316" y="192" fill="#1a120d" fontSize="8" {...MONO}>
          VALIDATED
        </text>
      </g>
    </>
  );
}

function ChartVisual() {
  const areaId = useSvgId();
  const bars = [
    [60, 90, 70], [90, 70, 110], [75, 115, 85], [120, 95, 130], [100, 135, 105], [140, 110, 150], [125, 150, 120], [155, 130, 165],
  ];
  const line = "M52 150 L92 128 L132 136 L172 104 L212 112 L252 76 L292 84 L332 58";
  const spline = { calcMode: "spline", keySplines: "0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1", dur: "6s", repeatCount: "indefinite" } as const;
  return (
    <>
      <Backdrop label="POWER BI · REVENUE DASHBOARD" />
      {[70, 110, 150, 190].map((y) => (
        <line key={y} x1="30" x2="370" y1={y} y2={y} stroke="#33261d" strokeDasharray="3 5" />
      ))}
      {bars.map(([a, b, c], i) => (
        <rect key={i} x={40 + i * 40} width="24" rx="4" y={210 - a} height={a} fill={i === 5 ? ACC : "#3d2e24"} opacity={i === 5 ? 0.9 : 1}>
          <animate attributeName="height" values={`${a};${b};${c};${a}`} begin={`${i * 0.15}s`} {...spline} />
          <animate attributeName="y" values={`${210 - a};${210 - b};${210 - c};${210 - a}`} begin={`${i * 0.15}s`} {...spline} />
        </rect>
      ))}
      <defs>
        <linearGradient id={areaId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={ACC} stopOpacity="0.28" />
          <stop offset="1" stopColor={ACC} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L332 210 L52 210 Z`} fill={`url(#${areaId})`} className="svc-fade" />
      <path d={line} fill="none" stroke={ACC} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="svc-draw" />
      <circle r="5" fill="#fff" stroke={ACC} strokeWidth="3">
        <animateMotion dur="4s" repeatCount="indefinite" path={line} keyPoints="0;1;1" keyTimes="0;0.7;1" calcMode="linear" />
      </circle>
      {/* KPI chip with cycling value */}
      <rect x="276" y="10" width="112" height="26" rx="6" fill="#2c2019" stroke={LINE} />
      <text x="286" y="27" fill={TEXT} fontSize="8" {...MONO}>
        MoM
      </text>
      {["+12.4%", "+18.9%", "+32.8%"].map((v, i) => (
        <text key={v} x="378" y="27.5" textAnchor="end" fill={i === 2 ? ACC : "#f1e8da"} fontSize="11" fontWeight="700" {...MONO} opacity="0">
          <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.3;0.34;1" dur="6s" begin={`${i * 2}s`} repeatCount="indefinite" />
          {v}
        </text>
      ))}
    </>
  );
}

function AiVisual() {
  const layers = [
    [75, 125, 175].map((y) => [158, y]),
    [65, 105, 145, 185].map((y) => [204, y]),
    [95, 155].map((y) => [248, y]),
  ];
  const edges = layers.slice(0, -1).flatMap((L, li) => L.flatMap(([x1, y1]) => layers[li + 1].map(([x2, y2]) => `M${x1} ${y1} L${x2} ${y2}`)));
  const fields = [
    ["patient", "J. Doe"],
    ["amount", "$1,240"],
    ["check #", "80321"],
    ["synced", "CRM ✓"],
  ];
  return (
    <>
      <Backdrop label="OCR → AI → API · PROCESSING" />
      {/* document being scanned */}
      <rect x="22" y="42" width="96" height="176" rx="6" fill="#f8f3ea" />
      {[70, 52, 64, 44, 72, 58, 40, 66, 50].map((w, i) => (
        <rect key={i} x="32" y={58 + i * 17} width={w} height="6" rx="3" fill={i === 2 || i === 5 ? ACC : "#d8cbb8"} opacity={i === 2 || i === 5 ? 0.85 : 1} />
      ))}
      <rect x="22" y="44" width="96" height="12" fill={ACC} opacity="0.28">
        <animate attributeName="y" values="44;204;44" dur="2.6s" repeatCount="indefinite" />
      </rect>
      <rect x="22" y="44" width="96" height="1.6" fill={ACC}>
        <animate attributeName="y" values="50;210;50" dur="2.6s" repeatCount="indefinite" />
      </rect>
      <Wire d="M118 130 H146" color={ACC} track={LINE} />
      {/* network with signals flowing through it */}
      {edges.map((d, i) => (
        <g key={d}>
          <path d={d} stroke={LINE} strokeWidth="1.2" />
          {i % 2 === 0 && <path d={d} stroke={ACC} strokeWidth="1.6" strokeDasharray="3 14" className="svc-flow" style={{ animationDelay: `${(i % 5) * 0.15}s` }} />}
        </g>
      ))}
      {layers.flatMap((L, li) =>
        L.map(([x, y], i) => (
          <circle key={`${li}-${i}`} cx={x} cy={y} r={li === 2 ? 9 : 7} fill={li === 2 ? ACC : "#2c2019"} stroke={li === 2 ? ACC : "#5c4a3c"} strokeWidth="1.5">
            {li < 2 && <animate attributeName="stroke" values={`#5c4a3c;${ACC};#5c4a3c`} dur="1.8s" begin={`${(i + li) * 0.25}s`} repeatCount="indefinite" />}
          </circle>
        ))
      )}
      <Wire d="M257 125 H272" color={ACC} track={LINE} />
      {/* structured output */}
      <rect x="272" y="52" width="112" height="146" rx="10" fill="#2c2019" stroke={LINE} />
      <text x="284" y="72" fill={TEXT} fontSize="8" letterSpacing="0.6" {...MONO}>
        EXTRACTED
      </text>
      {fields.map(([k, v], i) => (
        <g key={k} opacity="0">
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${0.12 + i * 0.14};${0.18 + i * 0.14};0.92;1`} dur="4.4s" repeatCount="indefinite" />
          <text x="284" y={96 + i * 26} fill={TEXT} fontSize="9" {...MONO}>
            {k}
          </text>
          <text x="374" y={96 + i * 26} textAnchor="end" fill={i === 3 ? OK : "#f1e8da"} fontSize="9.5" {...MONO}>
            {v}
          </text>
        </g>
      ))}
    </>
  );
}

const VISUALS: Record<Service["visual"], () => React.JSX.Element> = { flow: FlowVisual, chart: ChartVisual, ai: AiVisual };

function ServiceRow({ s, i }: { s: Service; i: number }) {
  const [ref, visible, seen] = useInView<HTMLElement>();
  const { ref: svgRef, pausedClass } = useSvgPlayback(visible);
  const Visual = VISUALS[s.visual];
  return (
    <article className={`service${seen ? " is-in" : ""}`} ref={ref} data-reveal>
      <span className="mono service__num">
        <span className="dot" />
        {pad(i + 1, 3)}
      </span>
      <h3 className="display h-md service__title">{s.title}</h3>
      <div className="service__body">
        <p className="service__blurb">{s.blurb}</p>
        {s.flow && (
          <ol className="svc-steps mono">
            {s.flow.map((st, k) => (
              <li key={st} style={{ ["--i" as string]: k }}>
                <span>{pad(k + 1)}</span>
                {st}
              </li>
            ))}
          </ol>
        )}
        <ToolChips tools={s.tags} />
      </div>
      <div className="service__visual">
        <svg ref={svgRef} viewBox="0 0 400 250" aria-hidden="true" className={pausedClass}>
          <Visual />
        </svg>
      </div>
    </article>
  );
}

export default function Services() {
  return (
    <section className="section" id="services">
      <div className="wrap">
        <SectionLabel id="services" title="Services" note="What I do" />
        <SectionTitle lines={["Data & AI", "*for every need*"]} />
        {services.map((s, i) => (
          <ServiceRow key={s.title} s={s} i={i} />
        ))}
      </div>
    </section>
  );
}
