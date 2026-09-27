import {
  siPython, siPandas, siNumpy, siScikitlearn, siFastapi, siFlask, siHuggingface, siPostgresql, siMysql,
  siRabbitmq, siClaude, siGooglegemini, siNodedotjs, siGit, siGithub, siReact, siGmail, siStreamlit, siSupabase, siMongodb,
} from "simple-icons";

/**
 * One icon registry for the whole site: tool chips (SVG), footer socials (SVG) and the badges on
 * the tech-stack arrows (drawn onto a canvas from the same path data in src/three/textures.ts).
 * All icons use a 24×24 viewBox.
 */

type BrandIcon = { title: string; hex: string; path: string };

/** A single shape of a custom icon: filled and/or stroked SVG path data. */
type IconPart = { d: string; fill?: string; stroke?: string; width?: number; opacity?: number };
type CustomIcon = { title: string; hex: string; parts: IconPart[] };

/** simple-icons brand marks, keyed by slug. */
const BRAND_ICONS: Record<string, BrandIcon> = {
  python: siPython, pandas: siPandas, numpy: siNumpy, scikitlearn: siScikitlearn, fastapi: siFastapi,
  flask: siFlask, huggingface: siHuggingface, postgresql: siPostgresql, mysql: siMysql, rabbitmq: siRabbitmq,
  claude: siClaude, googlegemini: siGooglegemini, nodedotjs: siNodedotjs, git: siGit, github: siGithub, react: siReact,
  gmail: siGmail, streamlit: siStreamlit, supabase: siSupabase, mongodb: siMongodb,
};

// path helpers
const rect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 -${2 * rx} 0z`;

/** Hand-drawn marks for tools simple-icons doesn't carry (Microsoft products, LinkedIn, generic tools). */
const CUSTOM_ICONS: Record<string, CustomIcon> = {
  excel: {
    title: "Excel",
    hex: "217346",
    parts: [{ d: rect(2, 2, 20, 20, 4), fill: "#217346" }, { d: "M8 7l8 10M16 7L8 17", stroke: "#fff", width: 2.6 }],
  },
  powerbi: {
    title: "Power BI",
    hex: "F2C811",
    parts: [
      { d: rect(3, 11, 5, 11, 1.5), fill: "#F2C811" },
      { d: rect(9.5, 6, 5, 16, 1.5), fill: "#E8B00A" },
      { d: rect(16, 2, 5, 20, 1.5), fill: "#C99A06" },
    ],
  },
  powerautomate: { title: "Power Automate", hex: "0066FF", parts: [{ d: "M3 4l7 8-7 8M12 4l7 8-7 8", stroke: "#0066FF", width: 3 }] },
  sqlserver: {
    title: "SQL Server",
    hex: "CC2927",
    parts: [
      { d: ellipse(12, 5.5, 8, 3), fill: "#CC2927" },
      { d: "M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13c0 1.7-3.6 3-8 3s-8-1.3-8-3z", fill: "#A3201F" },
      { d: "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3", stroke: "#fff", width: 1.2, opacity: 0.5 },
    ],
  },
  linkedin: {
    title: "LinkedIn",
    hex: "0A66C2",
    parts: [
      { d: rect(2, 2, 20, 20, 4), fill: "#0A66C2" },
      { d: "M6 10h2.8v8H6z", fill: "#fff" },
      { d: ellipse(7.4, 6.9, 1.6, 1.6), fill: "#fff" },
      { d: "M11 10h2.7v1.2c.5-.8 1.5-1.4 2.8-1.4 2.1 0 3 1.3 3 3.6V18h-2.8v-4.1c0-1.1-.4-1.8-1.4-1.8s-1.6.7-1.6 1.8V18H11z", fill: "#fff" },
    ],
  },
  script: { title: "Script", hex: "8B8A85", parts: [{ d: "M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14", stroke: "currentColor", width: 2 }] },
  scan: {
    title: "OCR",
    hex: "B0804A",
    parts: [{ d: "M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10", stroke: "#B0804A", width: 2 }],
  },
  antigravity: {
    title: "Antigravity",
    hex: "4285F4",
    parts: [{ d: "M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z", fill: "#4285F4" }, { d: ellipse(12, 12, 2.2, 2.2), fill: "#fff" }],
  },
  globe: {
    title: "Web",
    hex: "2FD4A3",
    parts: [
      { d: ellipse(12, 12, 9, 9), stroke: "#2FD4A3", width: 1.8 },
      { d: "M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18", stroke: "#2FD4A3", width: 1.5 },
    ],
  },
  flow: {
    title: "Workflow",
    hex: "B0804A",
    parts: [
      { d: ellipse(5, 12, 3, 3), fill: "#B0804A" },
      { d: ellipse(19, 6, 3, 3), fill: "#B0804A", opacity: 0.6 },
      { d: ellipse(19, 18, 3, 3), fill: "#B0804A", opacity: 0.6 },
      { d: "M8 12h4l4-5M12 12l4 5", stroke: "#B0804A", width: 1.8 },
    ],
  },
};

/** Tool names as written in content.ts → icon slug. */
const BY_NAME: Record<string, string> = {
  "claude ai": "claude", gemini: "googlegemini", "google gemini": "googlegemini", "ocr (trocr)": "huggingface",
  "microsoft trocr": "huggingface", "power bi": "powerbi", "power automate": "powerautomate", sql: "sqlserver",
  "etl / ssis": "sqlserver", "office scripts": "script", vbscript: "script", "node.js": "nodedotjs",
  "ocr model": "scan", "web scraping": "globe", "email automation": "gmail",
};

const slugOf = (name: string) => BY_NAME[name.toLowerCase()] ?? name.toLowerCase();

/** Looks up an icon by slug or tool name. Unknown names fall back to the generic workflow mark. */
export function getIcon(name: string): { brand: BrandIcon } | { custom: CustomIcon } {
  const slug = slugOf(name);
  const brand = BRAND_ICONS[slug];
  return brand ? { brand } : { custom: CUSTOM_ICONS[slug] ?? CUSTOM_ICONS.flow };
}

const iconOf = (name: string) => {
  const i = getIcon(name);
  return "brand" in i ? i.brand : i.custom;
};
/** Brand colour (hex without #). */
export const toolColor = (name: string) => iconOf(name).hex;
/** Human-readable name, e.g. "scikitlearn" → "scikit-learn". */
export const iconTitle = (name: string) => iconOf(name).title;

/** Small inline SVG for a tool or social icon. */
export function ToolIcon({ name, size = 16 }: { name: string; size?: number }) {
  const icon = getIcon(name);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="tool-icon">
      {"brand" in icon ? (
        <path d={icon.brand.path} fill={icon.brand.hex === "181717" ? "currentColor" : `#${icon.brand.hex}`} />
      ) : (
        icon.custom.parts.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={p.fill ?? "none"}
            stroke={p.stroke}
            strokeWidth={p.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={p.opacity}
          />
        ))
      )}
    </svg>
  );
}
