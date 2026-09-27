import type { ReactNode } from "react";
import type { ScreenKind } from "../data/content";
import { pad } from "../lib";
import { Cycle, Grow, MONO, Packet, Wire, loop, seq, useSvgId } from "./svg";

/**
 * Animated "app" screens shown on each project's curved monitor until a real screenshot is added.
 * Drawn in the monitor's coordinates: the screen spans x 70..730, y 56..374 (content kept inside
 * x 96..704, y 100..350 so the curved edges never clip it). Sequenced motion runs on the shared
 * LOOP from ./svg, so CurvedMonitor can pause it off-screen or freeze it for reduced motion.
 */

const BG = "#170f0a";
const PANEL = "#21180f";
const LINE = "#35281f";
const TXT = "#e9e6df";
const MUT = "#8c7a68";
const OK = "#8fb58a";

/** App window chrome: traffic lights, file name and a live status. */
function Chrome({ title, status, g, children }: { title: string; status: string; g: string; children: ReactNode }) {
  return (
    <>
      <rect x="70" y="56" width="660" height="318" fill={BG} />
      <rect x="70" y="56" width="660" height="44" fill="#1c140e" />
      {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
        <circle key={c} cx={100 + i * 14} cy="86" r="4" fill={c} />
      ))}
      <text x="150" y="89.5" fill={MUT} fontSize="10" letterSpacing="0.6" {...MONO}>{title}</text>
      <circle cx="570" cy="86" r="3.5" fill={g}>
        <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <text x="580" y="89.5" fill={MUT} fontSize="9.5" letterSpacing="0.6" {...MONO}>{status}</text>
      {children}
    </>
  );
}

const Label = ({ x, y, children, anchor }: { x: number; y: number; children: ReactNode; anchor?: "end" }) => (
  <text x={x} y={y} textAnchor={anchor} fill={MUT} fontSize="9" letterSpacing="0.7" {...MONO}>{children}</text>
);

// ---------------------------------------------------------------- 1. AI check posting
function CheckScreen({ g }: { g: string }) {
  const rows = ["J. Doe", "A. Khan", "M. Ali", "S. Reed", "R. Shah"];
  return (
    <Chrome title="check-posting · worker" status="QUEUE LIVE" g={g}>
      {/* the check */}
      <rect x="96" y="114" width="252" height="120" rx="6" fill="#f3efe4" />
      <text x="108" y="132" fontSize="8" fill="#8a8373" {...MONO}>PAYER HEALTH PLAN</text>
      <text x="336" y="132" textAnchor="end" fontSize="8" fill="#8a8373" {...MONO}>No. 80321</text>
      <text x="108" y="161" fontSize="7" fill="#8a8373" {...MONO}>PAY TO</text>
      <path d="M140 160 q10 -8 20 0 t20 0 t20 0 t20 0 t20 0" stroke="#4a392c" fill="none" strokeWidth="1.6" />
      <rect x="262" y="146" width="74" height="20" rx="3" fill="#fff" stroke="#c9c2af" />
      <text x="330" y="160" textAnchor="end" fontSize="10" fill="#2b2019" {...MONO}>$1,240.00</text>
      <line x1="108" x2="222" y1="190" y2="190" stroke="#c9c2af" />
      <text x="108" y="202" fontSize="7" fill="#8a8373" {...MONO}>MEMO · PATIENT #4471</text>
      <path d="M250 214 c10 -18 18 10 26 -6 s12 12 22 -4 s10 6 24 -2" stroke="#2b2019" fill="none" strokeWidth="1.5" />
      {/* fields the OCR model finds */}
      {[[134, 148, 96, 20], [256, 141, 86, 30], [102, 180, 124, 28]].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="3" fill="none" stroke={g} strokeWidth="2" opacity="1">
          <animate attributeName="opacity" {...seq(0.12 + i * 0.12)} {...loop} />
        </rect>
      ))}
      <rect x="96" y="114" width="5" height="120" fill={g} opacity="0.75">
        <animate attributeName="x" values="96;343;96" dur="3s" repeatCount="indefinite" />
      </rect>
      {/* message queue */}
      <Label x={96} y={262}>RABBITMQ · check_posting</Label>
      <rect x="96" y="272" width="252" height="26" rx="13" fill={PANEL} stroke={LINE} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="100" y="279" width="22" height="12" rx="3" fill={g}>
          <animate attributeName="x" values="100;322" dur="2.4s" begin={`${-i * 0.8}s`} repeatCount="indefinite" />
        </rect>
      ))}
      <Label x={96} y={322}>OCR → VALIDATE → POST</Label>
      {/* patient ledger */}
      <rect x="370" y="114" width="336" height="226" rx="8" fill={PANEL} stroke={LINE} />
      <Label x={386} y={136}>PATIENT LEDGER</Label>
      {rows.map((name, i) => {
        const y = 150 + i * 36;
        return (
          <g key={name}>
            <text x="386" y={y + 14} fill={TXT} fontSize="10" {...MONO}>{name}</text>
            <text x="560" y={y + 14} textAnchor="end" fill={MUT} fontSize="10" {...MONO}>${(1240 - i * 173).toLocaleString("en-US")}.00</text>
            <rect x="598" y={y} width="94" height="20" rx="10" fill="#32261d" />
            <text x="645" y={y + 13.5} textAnchor="middle" fill={MUT} fontSize="8.5" letterSpacing="0.6" {...MONO}>PENDING</text>
            <g opacity="1">
              <animate attributeName="opacity" {...seq(0.3 + i * 0.1)} {...loop} />
              <rect x="598" y={y} width="94" height="20" rx="10" fill="#17332a" stroke={OK} strokeOpacity="0.5" />
              <text x="645" y={y + 13.5} textAnchor="middle" fill={OK} fontSize="8.5" letterSpacing="0.6" {...MONO}>POSTED ✓</text>
            </g>
          </g>
        );
      })}
    </Chrome>
  );
}

// ---------------------------------------------------------------- 2. OCR model (TrOCR)
function OcrScreen({ g }: { g: string }) {
  const id = useSvgId();
  let hand = "M118 168";
  for (let k = 0; k < 13; k++) hand += (k === 4 || k === 9 ? " m12 0" : "") + " c6 -18 14 -18 18 0 s8 16 16 0";
  const L = 900;
  return (
    <Chrome title="trocr-finetune · inference" status="GPU · 1 JOB" g={g}>
      <rect x="96" y="112" width="608" height="80" rx="8" fill="#f3efe4" />
      <text x="108" y="128" fontSize="8" fill="#8a8373" {...MONO}>INPUT · scanned_form_0931.png</text>
      <path d={hand} fill="none" stroke="#2b2019" strokeWidth="2.2" strokeLinecap="round" strokeDasharray={L} strokeDashoffset="0">
        <animate attributeName="stroke-dashoffset" values={`${L};${L};0;0;${L}`} keyTimes="0;0.02;0.4;0.93;1" {...loop} />
      </path>
      <rect x="110" y="140" width="74" height="44" rx="4" fill="none" stroke={g} strokeWidth="2">
        <animate attributeName="x" values="110;556;110" dur="4s" repeatCount="indefinite" />
      </rect>
      {/* prediction, typed out */}
      <rect x="96" y="204" width="608" height="52" rx="8" fill={PANEL} stroke={LINE} />
      <Label x={110} y={222}>TROCR OUTPUT</Label>
      <clipPath id={`type${id}`}>
        <rect x="110" y="228" width="580" height="22">
          <animate attributeName="width" {...seq(0.2, 580, 0, 0.35)} {...loop} />
        </rect>
      </clipPath>
      <text x="110" y="244" fill={TXT} fontSize="12.5" clipPath={`url(#type${id})`} {...MONO}>
        Patient: Jane Doe · DOB 04/12/1988 · Amount 1,240.00
      </text>
      {/* confidence per field */}
      <Label x={96} y={280}>CONFIDENCE</Label>
      {[0.98, 0.95, 0.99, 0.93].map((c, i) => (
        <g key={i}>
          <rect x="96" y={290 + i * 14} width="220" height="7" rx="3.5" fill={LINE} />
          <Grow x={96} y={290 + i * 14} w={220 * c} h={7} rx={3.5} fill={i === 3 ? "#e6c79c" : g} start={0.45 + i * 0.06} />
        </g>
      ))}
      {/* character error rate falling during fine-tuning */}
      <Label x={360} y={280}>CHAR ERROR RATE</Label>
      <Cycle items={["EPOCH 02", "EPOCH 06", "EPOCH 12"]} x={704} y={280} textAnchor="end" fill={MUT} fontSize="9" />
      <path d="M360 296 L704 296 M360 342 L704 342" stroke={LINE} />
      <path d="M360 298 C420 300 440 320 500 326 S620 336 704 338" fill="none" stroke={g} strokeWidth="2.5" strokeDasharray="420">
        <animate attributeName="stroke-dashoffset" values="420;420;0;0;420" keyTimes="0;0.1;0.7;0.93;1" {...loop} />
      </path>
    </Chrome>
  );
}

// ---------------------------------------------------------------- 3. SBR weekly report (22 providers)
function SbrScreen({ g }: { g: string }) {
  const cols = [{ x: 110, label: "PROVIDER" }, { x: 270, label: "VISITS" }, { x: 390, label: "BILLED" }, { x: 510, label: "COLLECTED" }, { x: 640, label: "CHECK" }];
  return (
    <Chrome title="SBR_weekly_report.xlsx" status="BUILDING" g={g}>
      <rect x="96" y="110" width="608" height="24" rx="5" fill={PANEL} />
      {cols.map((c) => (
        <Label key={c.label} x={c.x} y={126}>{c.label}</Label>
      ))}
      {Array.from({ length: 6 }, (_, r) => {
        const y = 140 + r * 28;
        const s = 0.04 + r * 0.09;
        return (
          <g key={r}>
            <line x1="96" x2="704" y1={y + 26} y2={y + 26} stroke={LINE} />
            <text x="110" y={y + 17} fill={TXT} fontSize="10" {...MONO}>PRV-{pad(r * 4 + 3)}</text>
            <Grow x={270} y={y + 10} w={40 + ((r * 23) % 50)} h={7} fill="#4d3b2e" start={s} />
            <Grow x={390} y={y + 10} w={50 + ((r * 31) % 50)} h={7} fill="#4d3b2e" start={s + 0.02} />
            <Grow x={510} y={y + 10} w={45 + ((r * 17) % 55)} h={7} fill={g} start={s + 0.04} />
            <g opacity="1">
              <animate attributeName="opacity" {...seq(s + 0.08)} {...loop} />
              <circle cx="648" cy={y + 13} r="7" fill={OK} />
              <path d={`M644.5 ${y + 13}l2.5 2.6 4.4-5`} fill="none" stroke={BG} strokeWidth="1.8" strokeLinecap="round" />
            </g>
          </g>
        );
      })}
      <rect x="96" y="316" width="608" height="6" rx="3" fill={LINE} />
      <Grow x={96} y={316} w={608} h={6} fill={g} start={0.02} />
      <Label x={96} y={340}>APPLYING BUSINESS RULES + VALIDATIONS</Label>
      <Cycle items={["PROVIDER 06/22", "PROVIDER 14/22", "PROVIDER 22/22 ✓"]} x={704} y={340} textAnchor="end" fill={TXT} fontSize="9.5" />
    </Chrome>
  );
}

// ---------------------------------------------------------------- 4. AR reports from multiple portals
function ArScreen({ g }: { g: string }) {
  const portals = ["PORTAL A", "PORTAL B", "PORTAL C", "PORTAL D"];
  const hub = { x: 300, y: 218 };
  return (
    <Chrome title="ar-consolidation · power automate" status="DAILY 07:00" g={g}>
      {portals.map((p, i) => {
        const y = 112 + i * 56;
        const d = `M216 ${y + 22} C258 ${y + 22} 258 ${hub.y} ${hub.x - 16} ${hub.y}`;
        return (
          <g key={p}>
            <Wire d={d} color={g} track={LINE} />
            <Packet d={d} color={g} r={3} offset={i * 0.45} />
            <rect x="96" y={y} width="120" height="44" rx="8" fill={PANEL} stroke={LINE} />
            <text x="110" y={y + 26} fill={TXT} fontSize="9.5" {...MONO}>{p}</text>
            <g>
              <animateTransform attributeName="transform" type="translate" values="0 -2;0 2;0 -2" dur="1.2s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
              <path d={`M198 ${y + 15}v12m-5 -5l5 5 5-5`} fill="none" stroke={g} strokeWidth="1.8" strokeLinecap="round" />
            </g>
          </g>
        );
      })}
      <circle cx={hub.x} cy={hub.y} r="16" fill={PANEL} stroke={g} strokeOpacity="0.6" />
      <g className="svc-spin" style={{ transformOrigin: `${hub.x}px ${hub.y}px` }}>
        <circle cx={hub.x} cy={hub.y} r="9" fill="none" stroke={g} strokeWidth="2.5" strokeDasharray="8 5" />
      </g>
      <path d={`M${hub.x + 16} ${hub.y} H336`} stroke={g} strokeWidth="2" />
      {/* consolidated sheet */}
      <rect x="336" y="112" width="368" height="226" rx="8" fill="#f4f7f4" />
      <rect x="336" y="112" width="368" height="24" rx="8" fill="#1e7145" />
      <text x="348" y="128" fill="#fff" fontSize="8.5" {...MONO}>AR_consolidated_daily.xlsx</text>
      {["ACCOUNT", "PAYER", "0-30", "31-60", "60+"].map((h, c) => (
        <text key={h} x={352 + c * 70} y={152} fill="#1e7145" fontSize="8" {...MONO}>{h}</text>
      ))}
      {Array.from({ length: 7 }, (_, r) => {
        const y = 160 + r * 24;
        return (
          <g key={r} opacity="1">
            <animate attributeName="opacity" {...seq(0.08 + r * 0.08)} {...loop} />
            <line x1="344" x2="696" y1={y + 22} y2={y + 22} stroke="#d5ddd7" />
            <rect x="344" y={y + 7} width="4" height="10" rx="1" fill={g} opacity={0.4 + (r % 4) * 0.2} />
            {[0, 1, 2, 3, 4].map((c) => (
              <rect key={c} x={354 + c * 70} y={y + 9} width={c < 2 ? 50 : 30 + ((r * 13 + c * 7) % 22)} height="6" rx="3" fill={c === 4 && r % 3 === 0 ? "#e0564a" : "#a7b3ac"} />
            ))}
          </g>
        );
      })}
    </Chrome>
  );
}

// ---------------------------------------------------------------- 5. Client weekly financial report
function WeeklyScreen({ g }: { g: string }) {
  const kpis = [
    { label: "COLLECTIONS", values: ["$84.2k", "$91.7k", "$96.3k"] },
    { label: "CLAIMS PAID", values: ["1,284", "1,391", "1,452"] },
    { label: "DAYS IN AR", values: ["34", "31", "28"] },
  ];
  const C = 2 * Math.PI * 50;
  return (
    <Chrome title="client_weekly_report" status="AUTO · MONDAY" g={g}>
      {kpis.map((k, i) => (
        <g key={k.label}>
          <rect x={96 + i * 206} y="112" width="196" height="62" rx="8" fill={PANEL} stroke={LINE} />
          <Label x={110 + i * 206} y={132}>{k.label}</Label>
          <Cycle items={k.values} x={110 + i * 206} y={160} fill={i === 0 ? g : TXT} fontSize="19" fontWeight="700" />
        </g>
      ))}
      <rect x="96" y="186" width="400" height="154" rx="8" fill={PANEL} stroke={LINE} />
      <Label x={110} y={206}>WEEKLY TREND</Label>
      {Array.from({ length: 7 }, (_, i) => {
        const h = 40 + ((i * 29) % 60) + i * 6;
        const x = 120 + i * 52;
        return (
          <g key={i}>
            {[0, 1].map((j) => {
              const hh = j ? h * 0.7 : h;
              return (
                <rect key={j} x={x + j * 16} y={328 - hh} width="12" height={hh} rx="3" fill={j ? "#4d3b2e" : g}>
                  <animate attributeName="height" {...seq(0.05 + i * 0.06, hh, 0, 0.12)} {...loop} />
                  <animate attributeName="y" {...seq(0.05 + i * 0.06, 328 - hh, 328, 0.12)} {...loop} />
                </rect>
              );
            })}
          </g>
        );
      })}
      <rect x="508" y="186" width="196" height="154" rx="8" fill={PANEL} stroke={LINE} />
      <Label x={522} y={206}>COLLECTION RATE</Label>
      <circle cx="606" cy="274" r="50" fill="none" stroke={LINE} strokeWidth="14" />
      <circle cx="606" cy="274" r="50" fill="none" stroke={g} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${C * 0.86} ${C}`} transform="rotate(-90 606 274)">
        <animate attributeName="stroke-dasharray" values={`0 ${C};0 ${C};${C * 0.86} ${C};${C * 0.86} ${C};0 ${C}`} keyTimes="0;0.1;0.5;0.93;1" {...loop} />
      </circle>
      <Cycle items={["41%", "73%", "86%"]} x={606} y={280} textAnchor="middle" fill={TXT} fontSize="17" fontWeight="700" />
    </Chrome>
  );
}

// ---------------------------------------------------------------- 6. Maidan: bookings + revenue
function BookingScreen({ g }: { g: string }) {
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const slots = ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
  return (
    <Chrome title="maidan · bookings dashboard" status="3 COURTS LIVE" g={g}>
      {days.map((d, i) => (
        <text key={d} x={150 + i * 42} y={124} textAnchor="middle" fill={MUT} fontSize="8" {...MONO}>{d}</text>
      ))}
      {slots.map((t, r) => (
        <g key={t}>
          <text x="96" y={152 + r * 34} fill={MUT} fontSize="8" {...MONO}>{t}</text>
          {days.map((_, d) => {
            const booked = (d * 5 + r * 3) % 7 < 5;
            const start = 0.04 + (((d * 7 + r * 13) % 29) / 29) * 0.6;
            return (
              <rect key={d} x={132 + d * 42} y={134 + r * 34} width="36" height="28" rx="5" fill={booked ? g : "#291e17"} opacity={booked ? 0.9 : 1}>
                {booked && <animate attributeName="fill" {...seq(start, g, "#291e17", 0.04)} {...loop} />}
              </rect>
            );
          })}
        </g>
      ))}
      <rect x="440" y="112" width="264" height="104" rx="8" fill={PANEL} stroke={LINE} />
      <Label x={454} y={132}>REVENUE · THIS WEEK</Label>
      <path d="M454 200 L494 190 L534 194 L574 170 L614 176 L654 150 L690 142" fill="none" stroke={g} strokeWidth="2.5" strokeDasharray="300">
        <animate attributeName="stroke-dashoffset" values="300;300;0;0;300" keyTimes="0;0.1;0.7;0.93;1" {...loop} />
      </path>
      <Cycle items={["+8%", "+14%", "+21%"]} x={690} y={132} textAnchor="end" fill={OK} fontSize="10" fontWeight="700" />
      {[{ l: "BOOKINGS TODAY", v: ["12", "19", "27"] }, { l: "OCCUPANCY", v: ["48%", "66%", "81%"] }].map((k, i) => (
        <g key={k.l}>
          <rect x={440 + i * 136} y="228" width="128" height="112" rx="8" fill={PANEL} stroke={LINE} />
          <Label x={454 + i * 136} y={248}>{k.l.split(" ")[0]}</Label>
          <Cycle items={k.v} x={454 + i * 136} y={292} fill={TXT} fontSize="26" fontWeight="700" />
          <rect x={454 + i * 136} y="314" width="100" height="6" rx="3" fill={LINE} />
          <Grow x={454 + i * 136} y={314} w={i ? 81 : 70} h={6} fill={g} start={0.1 + i * 0.1} />
        </g>
      ))}
    </Chrome>
  );
}

// ---------------------------------------------------------------- 7. Lead scraper + cold email
function LeadsScreen({ g }: { g: string }) {
  const domains = ["northwind.io", "acme-health.com", "billpro.co", "medix.net", "finhub.ai", "carecore.org"];
  const flight = "M336 220 C380 170 420 170 468 200";
  return (
    <Chrome title="lead-engine · campaign" status="SENDING" g={g}>
      <rect x="96" y="112" width="232" height="228" rx="8" fill={PANEL} stroke={LINE} />
      <Label x={110} y={132}>SCRAPED LEADS</Label>
      <Cycle items={["124", "318", "562"]} x={314} y={132} textAnchor="end" fill={g} fontSize="9.5" fontWeight="700" />
      {domains.map((d, i) => {
        const y = 144 + i * 32;
        return (
          <g key={d} opacity="1">
            <animate attributeName="opacity" {...seq(0.04 + i * 0.07)} {...loop} />
            <circle cx="120" cy={y + 13} r="9" fill="#3a2c22" />
            <rect x="136" y={y + 5} width={60 + ((i * 17) % 30)} height="6" rx="3" fill="#4d3b2e" />
            <text x="136" y={y + 23} fill={MUT} fontSize="8" {...MONO}>{d}</text>
            <circle cx="310" cy={y + 13} r="6" fill={OK} opacity="0.9" />
          </g>
        );
      })}
      {/* personalised emails flying out */}
      <path d={flight} fill="none" stroke={LINE} strokeDasharray="3 6" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <animateMotion dur="2.1s" begin={`${-i * 0.7}s`} repeatCount="indefinite" path={flight} rotate="auto" />
          <rect x="-9" y="-6" width="18" height="12" rx="2" fill={TXT} />
          <path d="M-9 -6 L0 1 L9 -6" fill="none" stroke={g} strokeWidth="1.5" />
        </g>
      ))}
      <rect x="476" y="112" width="228" height="228" rx="8" fill={PANEL} stroke={LINE} />
      <Label x={490} y={132}>CAMPAIGN · OUTREACH</Label>
      {[
        { l: "SENT", w: 180, v: ["120", "340", "560"], c: TXT },
        { l: "OPENED", w: 118, v: ["54", "171", "298"], c: g },
        { l: "REPLIED", w: 44, v: ["6", "19", "37"], c: OK },
      ].map((m, i) => (
        <g key={m.l}>
          <Label x={490} y={170 + i * 52}>{m.l}</Label>
          <Cycle items={m.v} x={690} y={170 + i * 52} textAnchor="end" fill={m.c} fontSize="11" fontWeight="700" />
          <rect x="490" y={180 + i * 52} width="200" height="8" rx="4" fill={LINE} />
          <Grow x={490} y={180 + i * 52} w={m.w} h={8} rx={4} fill={m.c} start={0.12 + i * 0.12} />
        </g>
      ))}
      <Label x={490} y={330}>AI-PERSONALISED PER LEAD</Label>
    </Chrome>
  );
}

export default function ProjectScreen({ kind, g }: { kind: ScreenKind; g: string }) {
  switch (kind) {
    case "check": return <CheckScreen g={g} />;
    case "ocr": return <OcrScreen g={g} />;
    case "sbr": return <SbrScreen g={g} />;
    case "ar": return <ArScreen g={g} />;
    case "weekly": return <WeeklyScreen g={g} />;
    case "booking": return <BookingScreen g={g} />;
    case "leads": return <LeadsScreen g={g} />;
  }
}
