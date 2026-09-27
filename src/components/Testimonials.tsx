import { useRef } from "react";
import { testimonials, type Testimonial } from "../data/content";
import { useInView } from "../hooks";
import { projectId } from "../lib";
import { useSvgId } from "./svg";
import { SectionLabel } from "./ui";

/** Splits "plain *highlight* plain" into words, remembering which ones are highlighted. */
function words(quote: string) {
  return quote
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .flatMap((part) => {
      const hl = part.startsWith("*");
      return (hl ? part.slice(1, -1) : part)
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => ({ w, hl }));
    });
}

function Stars() {
  return (
    <span className="tq-stars" role="img" aria-label="Rated 5 out of 5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" style={{ ["--s" as string]: i }} aria-hidden="true">
          <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
        </svg>
      ))}
    </span>
  );
}

function Card({ t }: { t: Testimonial }) {
  const [ref, visible, seen] = useInView<HTMLElement>("0px 0px -15% 0px");
  const card = useRef<HTMLDivElement>(null);
  const gradId = useSvgId();
  const list = words(t.quote);

  // spotlight follows the cursor across the card
  const onMove = (e: React.PointerEvent) => {
    const el = card.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <figure className={`tq${seen ? " is-in" : ""}${visible ? "" : " is-paused"}`} ref={ref} style={{ ["--n" as string]: list.length }}>
      <div className="tq__card" ref={card} onPointerMove={onMove}>
        <div className="tq__glow" aria-hidden="true" />
        <svg className="tq__mark" viewBox="0 0 64 48" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#b0804a" />
              <stop offset="1" stopColor="#e6c79c" />
            </linearGradient>
          </defs>
          <path fill={`url(#${gradId})`} d="M0 48V28C0 12 8 3 24 0l3 6C18 9 14 14 14 22h12v26zm36 0V28c0-16 8-25 24-28l3 6c-9 3-13 8-13 16h12v26z" />
        </svg>

        <blockquote className="tq__quote">
          {list.map(({ w, hl }, i) => (
            <span key={i} className={`tq-word${hl ? " tq-word--hl" : ""}`} style={{ ["--i" as string]: i }}>
              {w}{" "}
            </span>
          ))}
        </blockquote>

        <figcaption className="tq__who">
          <span className="tq__avatar">
            <svg className="tq__ring" viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r="37" />
            </svg>
            <img src={t.photo} alt={t.name} width={60} height={60} loading="lazy" decoding="async" />
            <span className="tq__badge" aria-hidden="true">
              ✓
            </span>
          </span>
          <span className="tq__id">
            <strong>{t.name}</strong>
            <span className="mono dim">
              {t.role ? `${t.role}, ${t.company}` : t.company}
            </span>
          </span>
          <span className="tq__side">
            <Stars />
            <a className="tq__project mono" href={`#${projectId(t.project)}`}>
              <span className="dot" /> {t.project} <span aria-hidden="true">↗</span>
            </a>
          </span>
        </figcaption>
      </div>
    </figure>
  );
}

export default function Testimonials() {
  return (
    <section className="section tq-section" id="testimonials">
      <div className="wrap">
        <SectionLabel id="testimonials" title="Kind words" note="From clients" />
        {testimonials.map((t) => (
          <Card key={t.name} t={t} />
        ))}
      </div>
    </section>
  );
}
