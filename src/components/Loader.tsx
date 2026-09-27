import { useEffect, useRef } from "react";
import { fullName, profile } from "../data/content";
import { pad } from "../lib";
import { BrandMark } from "./ui";

const MIN_MS = 1500; // long enough for the name to decode
const MAX_MS = 2800; // never block longer than this; the 3D fades in later if it isn't ready
const TICKS = 36;
const GLYPHS = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*<>/";
const STATUS = [
  [0, "Loading datasets"],
  [22, "Cleaning records"],
  [44, "Training model"],
  [66, "Building workflows"],
  [88, "Automating reports"],
  [100, "Ready"],
] as const;
const EXPO_IN = "cubic-bezier(0.7, 0, 0.84, 0)";
const EXPO_IN_OUT = "cubic-bezier(0.87, 0, 0.13, 1)";

type Props = { ready: boolean; onDone: () => void };

export default function Loader({ ready, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);
  const pctFill = useRef<HTMLDivElement>(null);
  const pctText = useRef<(HTMLSpanElement | null)[]>([]);
  const ticks = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const el = root.current!;
    document.body.classList.add("is-loading");
    const start = performance.now();
    let value = 0;
    let exiting = false;
    let done = false;
    let lastScramble = 0;
    let raf = 0;
    const tickEls = ticks.current ? Array.from(ticks.current.children) : [];

    const finish = () => {
      if (done) return;
      done = true;
      document.body.classList.remove("is-loading");
      onDoneRef.current();
    };

    const render = (now: number) => {
      const v = Math.min(100, Math.max(0, value));
      const txt = pad(Math.round(v));
      for (const t of pctText.current) if (t) t.textContent = txt;
      if (pctFill.current) pctFill.current.style.clipPath = `inset(${100 - v}% 0 0 0)`;
      if (glow.current) glow.current.style.opacity = String(0.25 + (v / 100) * 0.75);
      const lit = Math.round((v / 100) * TICKS);
      tickEls.forEach((t, i) => t.classList.toggle("is-on", i < lit));
      let label: string = STATUS[0][1];
      for (const [at, l] of STATUS) if (v >= at) label = l;
      if (status.current && status.current.textContent !== label) status.current.textContent = label;
      // decode: each letter locks in once progress passes its slot; until then it cycles random glyphs
      if (now - lastScramble > 55) {
        lastScramble = now;
        letters.current.forEach((l, i) => {
          if (!l) return;
          const ch = fullName[i];
          const locked = ch === " " || v >= 15 + (i / fullName.length) * 70;
          l.textContent = locked ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          l.classList.toggle("is-locked", locked);
        });
      }
    };

    // Exit: letters fly up, chrome fades, then the ink and accent panels wipe upwards.
    const leave = () => {
      const opts = (o: KeyframeAnimationOptions): KeyframeAnimationOptions => ({ fill: "forwards", ...o });
      const letterEls = el.querySelectorAll(".loader__letter");
      letterEls.forEach((l, i) =>
        l.animate([{ transform: "translateY(-110%)", opacity: 0 }], opts({ duration: 450, delay: 50 + i * 15, easing: EXPO_IN }))
      );
      el.querySelectorAll(".loader__chrome").forEach((c) => c.animate([{ opacity: 0 }], opts({ duration: 300, delay: 50 })));
      const panelsAt = 50 + (letterEls.length - 1) * 15 + 450 - 250;
      el.querySelector(".loader__panel--ink")!.animate([{ transform: "translateY(-100%)" }], opts({ duration: 750, delay: panelsAt, easing: EXPO_IN_OUT }));
      el.querySelector(".loader__panel--accent")!
        .animate([{ transform: "translateY(-100%)" }], opts({ duration: 750, delay: panelsAt + 100, easing: EXPO_IN_OUT }))
        .finished.then(finish, finish);
    };

    // Count the last stretch to 100 quickly, then leave.
    const exit = () => {
      exiting = true;
      const from = value;
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / 300);
        value = from + (100 - from) * (1 - (1 - k) * (1 - k));
        render(now + 1000);
        if (k < 1) raf = requestAnimationFrame(step);
        else leave();
      };
      raf = requestAnimationFrame(step);
    };

    // Ease towards 92% while waiting; finish once the scene is ready (or at the cap).
    // Uses performance.now(), not the rAF timestamp: that can be slightly *earlier* than `start`,
    // which once made progress negative and froze the loader.
    const tick = () => {
      if (exiting) return;
      const now = performance.now();
      const elapsed = Math.max(0, now - start);
      value += (Math.min(92, (elapsed / MIN_MS) * 92) - value) * 0.08;
      render(now);
      if (elapsed > MIN_MS && (readyRef.current || elapsed > MAX_MS)) exit();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Safety net: whatever happens (an error, a stalled animation), never trap the visitor here.
    const bailout = window.setTimeout(finish, MAX_MS + 2500);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(bailout);
      document.body.classList.remove("is-loading");
    };
  }, []);

  return (
    <div className="loader" ref={root} aria-hidden="true">
      <div className="loader__panel loader__panel--accent" />
      <div className="loader__panel loader__panel--ink">
        <div className="loader__grid" />
        <div className="loader__scan" />
        <div className="loader__glow" ref={glow} />

        <div className="loader__top loader__chrome mono">
          <span className="loader__brand">
            <BrandMark />
          </span>
          <span className="dim loader__hide-sm">{profile.role}</span>
          <span className="dim">{profile.location}</span>
        </div>

        <div className="loader__center">
          <p className="mono loader__status loader__chrome">
            <span className="loader__prompt">&gt;</span> <span ref={status}>{STATUS[0][1]}</span>
            <span className="loader__caret" />
          </p>
          <h2 className="loader__name">
            {fullName.split("").map((ch, i) => (
              <span key={i} className="loader__letter" ref={(l) => { letters.current[i] = l; }}>
                {ch === " " ? " " : GLYPHS[i % GLYPHS.length]}
              </span>
            ))}
          </h2>
        </div>

        <div className="loader__bottom loader__chrome">
          <div className="loader__bar">
            <div className="loader__ticks" ref={ticks}>
              {Array.from({ length: TICKS }, (_, i) => (
                <span key={i} />
              ))}
            </div>
            <div className="mono dim loader__bar-labels">
              <span>Portfolio ©{new Date().getFullYear()}</span>
              <span>{profile.title}</span>
            </div>
          </div>
          <div className="loader__pct">
            <span className="loader__pct-outline" ref={(t) => { pctText.current[0] = t; }}>00</span>
            <div className="loader__pct-fill" ref={pctFill}>
              <span ref={(t) => { pctText.current[1] = t; }}>00</span>
            </div>
            <span className="loader__pct-sign">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
