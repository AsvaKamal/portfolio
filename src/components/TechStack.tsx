import { lazy, Suspense, useCallback, useState } from "react";
import { techStack } from "../data/content";
import { iconTitle, ToolIcon } from "../data/icons";
import { hasWebGL, pad, prefersReducedMotion } from "../lib";
import { useInView } from "../hooks";
import { SectionLabel } from "./ui";

const Archery = lazy(() => import("../three/Archery"));

export default function TechStack() {
  // mount the 3D once it's within a screen of view; render only while it's actually visible
  const [nearRef, , near] = useInView<HTMLElement>("100% 0px");
  const [visRef, visible] = useInView<HTMLDivElement>();
  // no archery without WebGL or when motion is reduced: the list is simply shown fully lit
  const [animated] = useState(() => hasWebGL() && !prefersReducedMotion());

  // Tools the archer has landed this round. The first tool landing starts a new round, so the
  // list can never drift out of step with the arrows (the archer pauses after the last one).
  const [hits, setHits] = useState<ReadonlySet<number>>(() => new Set(animated ? [] : techStack.map((_, i) => i)));
  const [last, setLast] = useState(-1);
  const onHit = useCallback((i: number) => {
    setLast(i);
    setHits((h) => (i === 0 ? new Set([0]) : new Set(h).add(i)));
  }, []);
  const complete = animated && hits.size === techStack.length;

  return (
    <section className={`stack${complete ? " is-full" : ""}`} id="stack" ref={nearRef}>
      <div className="stack__head wrap">
        <SectionLabel id="stack" title="Tech stack" note="Tools I ship with" style={{ marginBottom: 24 }} />
        <h2 className="display stack__title" data-lines>
          <span className="line-mask">
            <span>
              My <em className="serif-hl">stack</em>
            </span>
          </span>
        </h2>
      </div>
      {animated && (
        <div className="stack__canvas" ref={visRef} aria-hidden="true">
          {near && (
            <Suspense fallback={null}>
              <Archery slugs={techStack} active={visible} onHit={onHit} />
            </Suspense>
          )}
        </div>
      )}
      <div className="wrap stack__quiver">
        <div className="stack__hud">
          <div className="stack__now" aria-live="off">
            <span className="mono dim">{complete ? "Round complete" : animated ? "Just landed" : "Everything I use"}</span>
            {/* keyed so the callout re-animates for every arrow */}
            <strong key={complete ? "full" : last} className="stack__now-name">
              {complete ? (
                <>
                  Full <em className="serif-hl">quiver</em>
                </>
              ) : last >= 0 ? (
                <>
                  <span className="stack__now-icon">
                    <ToolIcon name={techStack[last]} size={22} />
                  </span>
                  {iconTitle(techStack[last])}
                </>
              ) : (
                <span className="dim">{animated ? "Drawing the first arrow…" : "Tools I ship with"}</span>
              )}
            </strong>
          </div>
          <div className="stack__score" aria-label={`${hits.size} of ${techStack.length} tools`}>
            <span key={hits.size} className="stack__score-n">{pad(hits.size)}</span>
            <span className="stack__score-of">/ {techStack.length}</span>
          </div>
        </div>
        <div className="stack__bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${hits.size / techStack.length})` }} />
        </div>
        <ul className="stack__list">
          {techStack.map((t, i) => (
            <li key={t} style={{ "--i": i } as React.CSSProperties} className={`stack__tool${hits.has(i) ? " is-hit" : ""}${i === last && hits.has(i) ? " is-last" : ""}`}>
              <span className="stack__tool-icon">
                <ToolIcon name={t} size={16} />
              </span>
              {iconTitle(t)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
