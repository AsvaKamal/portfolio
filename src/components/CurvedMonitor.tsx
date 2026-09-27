import type { ScreenKind } from "../data/content";
import ProjectScreen from "./ProjectScreens";
import { useSvgId, useSvgPlayback } from "./svg";

type Props = {
  title: string;
  glow: string;
  /** Animated screen shown until a real screenshot is set. */
  screen: ScreenKind;
  /** Project screenshot; replaces the animated screen. */
  image?: string;
  /** true while on screen: animations run */
  playing: boolean;
  /** false until first seen: the screen stays dark, then "powers on" */
  on: boolean;
};

// Curved panel seen head-on: the edges wrap towards you, so they read taller than the centre.
const SCREEN_PATH = "M70 58 Q400 92 730 58 L730 372 Q400 346 70 372 Z";
const BEZEL_PATH = "M60 46 Q400 81 740 46 L740 384 Q400 357 60 384 Z";
const DESK_PATH = "M0 430 L800 430 L800 520 L0 520 Z";

/**
 * A curved ultrawide on a desk with bias lighting. Pure SVG: crisp at any size, no downloads.
 * The glows are soft radial gradients rather than SVG blur filters, which would be re-rasterised
 * every time the animated screen repaints.
 */
export default function CurvedMonitor({ title, glow, screen, image, playing, on }: Props) {
  const id = useSvgId();
  const { ref, pausedClass } = useSvgPlayback(playing);
  const url = (name: string) => `url(#${name}${id})`;

  return (
    <svg ref={ref} className={`monitor ${on ? "is-on" : "is-off"} ${pausedClass}`} viewBox="0 0 800 520" role="img" aria-label={`${title} on a curved monitor`}>
      <defs>
        <radialGradient id={`room${id}`} cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor="#23201d" />
          <stop offset="1" stopColor="#0c0b0a" />
        </radialGradient>
        <radialGradient id={`bias${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={glow} stopOpacity="0.8" />
          <stop offset="0.35" stopColor={glow} stopOpacity="0.4" />
          <stop offset="0.7" stopColor={glow} stopOpacity="0.1" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`led${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={glow} stopOpacity="0.6" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`desk${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2b2420" />
          <stop offset="1" stopColor="#15110f" />
        </linearGradient>
        <radialGradient id={`spill${id}`} cx="50%" cy="0%" r="60%">
          <stop offset="0" stopColor={glow} stopOpacity="0.35" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        {/* darker edges + glass sheen sell the curve */}
        <linearGradient id={`curve${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <stop offset="0.18" stopColor="#000" stopOpacity="0" />
          <stop offset="0.82" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={`sheen${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <pattern id={`scan${id}`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#000" />
        </pattern>
        <linearGradient id={`sweep${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`clip${id}`}>
          <path d={SCREEN_PATH} />
        </clipPath>
      </defs>

      {/* room, bias light behind the monitor, LED strip on the wall line */}
      <rect width="800" height="520" fill={url("room")} />
      <ellipse className="monitor__bias" cx="400" cy="215" rx="400" ry="230" fill={url("bias")} />
      <ellipse cx="400" cy="429" rx="300" ry="14" fill={url("led")} />

      {/* desk */}
      <path d={DESK_PATH} fill={url("desk")} />
      <path d={DESK_PATH} fill={url("spill")} />
      <rect x="0" y="429" width="800" height="1.5" fill="#fff" opacity="0.08" />

      {/* stand */}
      <path d="M372 360 L428 360 L420 440 L380 440 Z" fill="#2a1f18" />
      <ellipse cx="400" cy="444" rx="120" ry="12" fill="#30241c" />
      <ellipse cx="400" cy="448" rx="150" ry="10" fill="#000" opacity="0.35" />

      {/* keyboard + mouse */}
      <rect x="260" y="470" width="280" height="30" rx="5" fill="#261c16" />
      <rect x="266" y="474" width="268" height="22" rx="3" fill="#3a2c22" />
      <rect x="260" y="498" width="280" height="3" rx="1.5" fill={glow} opacity="0.8" />
      <ellipse cx="600" cy="486" rx="16" ry="11" fill="#261c16" />

      {/* bezel + screen */}
      <path d={BEZEL_PATH} fill="#120c08" stroke="#3a2c22" strokeWidth="1.5" />
      <g clipPath={url("clip")}>
        <rect x="70" y="56" width="660" height="318" fill="#050608" />
        <g className="monitor__screen">
          {image ? (
            <image href={image} x="70" y="56" width="660" height="318" preserveAspectRatio="xMidYMid slice" />
          ) : (
            <ProjectScreen kind={screen} g={glow} />
          )}
        </g>
        {/* faint scanlines + a light sweep keep even static screenshots alive */}
        <rect x="70" y="56" width="660" height="318" fill={url("scan")} opacity="0.1" />
        <rect className="monitor__sweep" x="-60" y="56" width="120" height="318" fill={url("sweep")} />
        <rect x="70" y="56" width="660" height="318" fill={url("curve")} />
        <rect x="70" y="56" width="660" height="318" fill={url("sheen")} />
      </g>
      {/* power LED */}
      <circle cx="400" cy="377" r="1.8" fill={glow} />
    </svg>
  );
}
